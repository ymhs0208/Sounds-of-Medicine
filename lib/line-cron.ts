import { fromD1 } from "./circle-db";
import { linePush, type LinePush } from "./line-bot";
import { doseData } from "./line-bot";
import {
  digestBody,
  digestTitle,
  doseFlex,
  duplicateText,
  fallText,
  missedText,
  noticeFlex,
  refillText,
} from "./line-messages";
import { digestDue, inQuietHours, missedDue, refillDue, reminderDue } from "./line-schedule";
import { d1LineStore, type LineLink, type LineSettings, type LineStore } from "./line-store";
import { taipeiParts } from "./push-schedule";
import { isSlot } from "./slots";

type D1Database = {
  prepare(sql: string): {
    bind(...values: unknown[]): { first<T>(): Promise<T | null>; all<T>(): Promise<{ results?: T[] }>; run(): Promise<unknown> };
    first<T>(): Promise<T | null>;
    all<T>(): Promise<{ results?: T[] }>;
    run(): Promise<unknown>;
  };
};

export type LineCronEnv = {
  YAOSHENG_DB?: D1Database;
  YAOSHENG_DB_ENABLED?: string;
  LINE_MESSAGING_ACCESS_TOKEN?: string;
  LINE_DATA_KEY?: string;
};

function caregivers(links: LineLink[]): LineLink[] {
  const care = links.filter((link) => link.role === "caregiver" && link.lineUserId && link.notifyDose);
  if (care.length) return care;
  return links.filter((link) => link.role === "owner" && link.lineUserId && link.notifyDose);
}

function family(links: LineLink[], flag: "notifyMissed" | "notifyDigest" | "notifyRefill"): LineLink[] {
  return links.filter((link) => link.lineUserId && (link.role === "family" || link.role === "owner") && link[flag]);
}

async function deliver(push: LinePush, targets: string[], message: unknown): Promise<boolean> {
  let ok = false;
  for (const target of targets) {
    if (await push(target, [message]).catch(() => false)) ok = true;
  }
  return ok;
}

export async function runLineCron(
  env: LineCronEnv,
  now = new Date(),
  injected?: { store: LineStore; push: LinePush },
): Promise<{ sent: number; reason?: string }> {
  const token = env.LINE_MESSAGING_ACCESS_TOKEN;
  if (!token && !injected) return { sent: 0, reason: "unconfigured" };
  const store = injected?.store ?? (await storeFromEnv(env));
  if (!store || (!token && !injected)) return { sent: 0, reason: "unconfigured" };
  const push = injected?.push ?? ((to, messages) => linePush(token || "", to, messages));
  const dataKey = env.LINE_DATA_KEY || null;
  const parts = taipeiParts(now);
  let sent = 0;

  for (const dose of store.dosesOn(parts.date)) {
    const settings = store.settingsFor(dose.circleId);
    const links = store.linksForCircle(dose.circleId);
    if (reminderDue(dose, now) && isSlot(dose.slot)) {
      const targets = caregivers(links).filter((link) => !inQuietHours(parts.minutes, link.quietStart, link.quietEnd));
      const detail = settings.detailOptIn ? await store.readLabel(dose.labelCipher, dataKey) : "";
      const one = Boolean(detail);
      const message = doseFlex({
        lang: targets[0]?.lang || "zh",
        time: dose.time,
        detail: detail || undefined,
        dataTaken: doseData("taken", { circleId: dose.circleId, date: dose.date, slot: dose.slot, id: dose.id, one }),
        dataSkip: doseData("skipped", { circleId: dose.circleId, date: dose.date, slot: dose.slot, id: dose.id, one }),
      });
      const perLang = new Map<string, LineLink[]>();
      for (const link of targets) {
        const list = perLang.get(link.lang) || [];
        list.push(link);
        perLang.set(link.lang, list);
      }
      let ok = false;
      for (const [lang, group] of perLang) {
        const localized = lang === (targets[0]?.lang || "zh") ? message : doseFlex({
          lang: lang as LineLink["lang"],
          time: dose.time,
          detail: detail || undefined,
          dataTaken: doseData("taken", { circleId: dose.circleId, date: dose.date, slot: dose.slot, id: dose.id, one }),
          dataSkip: doseData("skipped", { circleId: dose.circleId, date: dose.date, slot: dose.slot, id: dose.id, one }),
        });
        if (await deliver(push, group.map((link) => link.lineUserId || ""), localized)) ok = true;
      }
      if (ok) {
        await store.markReminded([dose.id], now.toISOString());
        sent += 1;
      }
    }
    if (missedDue(dose, now, settings.missedWindowMin)) {
      const detail = settings.detailOptIn ? await store.readLabel(dose.labelCipher, dataKey) : "";
      const targets = family(links, "notifyMissed").map((link) => link.lineUserId || "");
      const group = store.groupFor(dose.circleId);
      if (group) targets.push(group.groupId);
      const lang = family(links, "notifyMissed")[0]?.lang || "zh";
      const message = noticeFlex(lang, missedText(lang), detail || undefined);
      if (await deliver(push, targets, message)) {
        await store.markMissed([dose.id], now.toISOString());
        sent += 1;
      }
    }
  }

  for (const settings of store.allSettings()) {
    if (!digestDue(settings.digestTime, settings.lastDigestDate, now)) continue;
    const doses = store.dosesFor(settings.circleId).filter((dose) => dose.date === parts.date);
    const links = store.linksForCircle(settings.circleId);
    const people = family(links, "notifyDigest");
    const lang = people[0]?.lang || "zh";
    const names = settings.detailOptIn
      ? (await Promise.all(doses.map((dose) => store.readLabel(dose.labelCipher, dataKey)))).filter(Boolean).slice(0, 8).join("、")
      : "";
    const body = `${digestTitle(lang)}\n${digestBody(lang, doses.filter((dose) => dose.status !== "open").length, doses.length, settings.observationCount, settings.supplyDays)}`;
    const targets = people.map((link) => link.lineUserId || "");
    const group = store.groupFor(settings.circleId);
    if (group) targets.push(group.groupId);
    const hasNews = doses.length > 0 || settings.observationCount > 0 || settings.supplyDays !== null;
    const delivered = hasNews ? await deliver(push, targets, noticeFlex(lang, body, names || undefined)) : true;
    if (delivered) {
      if (hasNews) sent += 1;
      const next: LineSettings = { ...settings, lastDigestDate: parts.date };
      await store.saveSettings(next, now.toISOString());
    }
  }

  for (const refill of store.allRefills()) {
    const which = refillDue(refill.dueDate, parts.date, refill.sent7, refill.sent3);
    if (!which) continue;
    const settings = store.settingsFor(refill.circleId);
    const links = store.linksForCircle(refill.circleId);
    const people = family(links, "notifyRefill");
    const lang = people[0]?.lang || "zh";
    const detail = settings.detailOptIn ? await store.readLabel(refill.labelCipher, dataKey) : "";
    const dayNote = which === 7 ? "7" : "3";
    const targets = people.map((link) => link.lineUserId || "");
    const group = store.groupFor(refill.circleId);
    if (group) targets.push(group.groupId);
    if (await deliver(push, targets, noticeFlex(lang, `${dayNote} · ${refillText(lang)}`, detail || undefined))) {
      await store.markRefill(refill.circleId, refill.id, which);
      sent += 1;
    }
  }

  for (const alert of store.pendingAlerts()) {
    const settings = store.settingsFor(alert.circleId);
    const links = store.linksForCircle(alert.circleId);
    const people = family(links, "notifyMissed");
    const lang = people[0]?.lang || "zh";
    const detail = settings.detailOptIn ? await store.readLabel(alert.labelCipher, dataKey) : "";
    const text = alert.kind === "fall" ? fallText(lang) : duplicateText(lang);
    const targets = people.map((link) => link.lineUserId || "");
    const group = store.groupFor(alert.circleId);
    if (group) targets.push(group.groupId);
    if (await deliver(push, targets, noticeFlex(lang, text, detail || undefined))) {
      await store.markAlert(alert.circleId, alert.id, now.toISOString());
      sent += 1;
    }
  }

  return { sent };
}

async function storeFromEnv(env: LineCronEnv): Promise<LineStore | null> {
  if (env.YAOSHENG_DB_ENABLED !== "1" || !env.YAOSHENG_DB) return null;
  try {
    return await d1LineStore(fromD1(env.YAOSHENG_DB as Parameters<typeof fromD1>[0]));
  } catch {
    return null;
  }
}
