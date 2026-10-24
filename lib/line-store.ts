import { validId } from "./circle-store";
import type { CircleDatabase } from "./circle-store";
import { openJson, sealJson } from "./line-seal";
import type { PlanAlert, PlanDose, PlanRefill } from "./line-plan";
import { isLang, type Lang } from "./types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function lineCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export type LineRole = "owner" | "family" | "caregiver";

export type LineLink = {
  id: string;
  circleId: string;
  memberId: string;
  lineSub: string;
  lineUserId: string | null;
  lang: Lang;
  role: LineRole;
  notifyDose: boolean;
  notifyMissed: boolean;
  notifyDigest: boolean;
  notifyRefill: boolean;
  quietStart: string;
  quietEnd: string;
};

export type LineSettings = {
  circleId: string;
  detailOptIn: boolean;
  missedWindowMin: number;
  digestTime: string;
  lastDigestDate: string | null;
  visitDate: string | null;
  supplyDays: number | null;
  observationCount: number;
};

export type DoseRow = {
  id: string;
  circleId: string;
  date: string;
  time: string;
  slot: string;
  status: "open" | "taken" | "skipped";
  remindedAt: string | null;
  missedAlertedAt: string | null;
  labelCipher: string | null;
};

export type RefillRow = {
  id: string;
  circleId: string;
  kind: "supply" | "chronic" | "visit";
  dueDate: string;
  sent7: boolean;
  sent3: boolean;
  labelCipher: string | null;
};

export type AlertRow = {
  id: string;
  circleId: string;
  kind: "fall" | "duplicate";
  sentAt: string | null;
  labelCipher: string | null;
};

export type StoredEvent = { id: string; circleId: string; createdAt: string; body: string; sig: string };

type CodeRow = { code: string; circleId: string; memberId: string | null; kind: "user" | "group"; expiresAt: string; usedAt: string | null };
type DraftRow = { id: string; lineUserId: string; kind: "bag" | "speak"; cipher: string; expiresAt: string };
type RelayRow = { id: string; circleId: string; cipher: string; expiresAt: string };

export type LineStore = ReturnType<typeof createApi>;

function bool(value: number | boolean): boolean {
  return value === true || value === 1;
}

function defaultSettings(circleId: string): LineSettings {
  return {
    circleId,
    detailOptIn: false,
    missedWindowMin: 30,
    digestTime: "21:00",
    lastDigestDate: null,
    visitDate: null,
    supplyDays: null,
    observationCount: 0,
  };
}

type Memory = {
  links: LineLink[];
  codes: CodeRow[];
  groups: { circleId: string; groupId: string }[];
  settings: LineSettings[];
  doses: DoseRow[];
  refills: RefillRow[];
  alerts: AlertRow[];
  events: StoredEvent[];
  relays: RelayRow[];
  drafts: DraftRow[];
};

function createApi(data: Memory, db: CircleDatabase | null) {
  async function labelFor(name: string | undefined, drugId: string | undefined, detail: boolean, dataKey: string | null): Promise<string | null> {
    if (!detail || !dataKey || (!name && !drugId)) return null;
    return sealJson({ name: name || "", drugId: drugId || "" }, dataKey);
  }

  return {
    async ensureLink(input: {
      id: string;
      circleId: string;
      memberId: string;
      lineSub: string;
      lang: Lang;
      role: LineRole;
      now: string;
    }): Promise<LineLink> {
      const found = data.links.find((link) => link.circleId === input.circleId && link.memberId === input.memberId);
      if (found) {
        found.lang = input.lang;
        found.role = input.role;
        found.lineSub = input.lineSub;
        return found;
      }
      const link: LineLink = {
        id: input.id,
        circleId: input.circleId,
        memberId: input.memberId,
        lineSub: input.lineSub,
        lineUserId: null,
        lang: input.lang,
        role: input.role,
        notifyDose: true,
        notifyMissed: true,
        notifyDigest: true,
        notifyRefill: true,
        quietStart: "22:00",
        quietEnd: "07:00",
      };
      data.links.push(link);
      if (db) {
        await db.exec(
          `INSERT INTO line_links (id, circle_id, member_id, line_sub, line_user_id, lang, role, notify_dose, notify_missed, notify_digest, notify_refill, quiet_start, quiet_end, created_at, updated_at)
           VALUES (?, ?, ?, ?, NULL, ?, ?, 1, 1, 1, 1, '22:00', '07:00', ?, ?)`,
          link.id,
          link.circleId,
          link.memberId,
          link.lineSub,
          link.lang,
          link.role,
          input.now,
          input.now,
        );
      }
      return link;
    },
    async issueCode(input: { circleId: string; memberId: string | null; kind: "user" | "group"; now: string }): Promise<string> {
      const code = lineCode();
      const expiresAt = new Date(Date.parse(input.now) + 30 * 60 * 1000).toISOString();
      data.codes.push({ code, circleId: input.circleId, memberId: input.memberId, kind: input.kind, expiresAt, usedAt: null });
      if (db) {
        await db.exec(
          "INSERT INTO line_codes (code, circle_id, member_id, kind, expires_at, used_at) VALUES (?, ?, ?, ?, ?, NULL)",
          code,
          input.circleId,
          input.memberId,
          input.kind,
          expiresAt,
        );
      }
      return code;
    },
    async redeemCode(input: { code: string; userId?: string | null; groupId?: string | null; now: string }) {
      const row = data.codes.find((item) => item.code === input.code.trim().toUpperCase());
      if (!row) return { ok: false as const, error: "missing" as const };
      if (row.usedAt) return { ok: false as const, error: "used" as const };
      if (row.expiresAt <= input.now) return { ok: false as const, error: "expired" as const };
      if (row.kind === "group") {
        if (!input.groupId || !validId(input.groupId)) return { ok: false as const, error: "missing" as const };
        const existing = data.groups.find((group) => group.circleId === row.circleId);
        if (existing) existing.groupId = input.groupId;
        else data.groups.push({ circleId: row.circleId, groupId: input.groupId });
        if (db) {
          await db.exec(
            `INSERT INTO line_groups (circle_id, group_id, bound_at) VALUES (?, ?, ?)
             ON CONFLICT(circle_id) DO UPDATE SET group_id = excluded.group_id, bound_at = excluded.bound_at`,
            row.circleId,
            input.groupId,
            input.now,
          );
        }
      } else {
        if (!input.userId || !validId(input.userId)) return { ok: false as const, error: "missing" as const };
        const link = data.links.find((item) => item.circleId === row.circleId && item.memberId === row.memberId);
        if (!link) return { ok: false as const, error: "missing" as const };
        link.lineUserId = input.userId;
        if (db) await db.exec("UPDATE line_links SET line_user_id = ?, updated_at = ? WHERE id = ?", input.userId, input.now, link.id);
      }
      row.usedAt = input.now;
      if (db) await db.exec("UPDATE line_codes SET used_at = ? WHERE code = ?", input.now, row.code);
      return { ok: true as const, kind: row.kind, circleId: row.circleId };
    },
    linkForMember(circleId: string, memberId: string) {
      return data.links.find((link) => link.circleId === circleId && link.memberId === memberId) ?? null;
    },
    linkForUser(userId: string) {
      return data.links.find((link) => link.lineUserId === userId) ?? null;
    },
    linksForSub(lineSub: string) {
      return data.links.filter((link) => link.lineSub === lineSub);
    },
    linksForCircle(circleId: string) {
      return data.links.filter((link) => link.circleId === circleId);
    },
    allLinks() {
      return data.links;
    },
    async updateLink(link: LineLink, now: string) {
      const index = data.links.findIndex((item) => item.id === link.id);
      if (index >= 0) data.links[index] = link;
      if (db) {
        await db.exec(
          `UPDATE line_links SET lang = ?, role = ?, notify_dose = ?, notify_missed = ?, notify_digest = ?, notify_refill = ?, quiet_start = ?, quiet_end = ?, line_user_id = ?, updated_at = ? WHERE id = ?`,
          link.lang,
          link.role,
          link.notifyDose ? 1 : 0,
          link.notifyMissed ? 1 : 0,
          link.notifyDigest ? 1 : 0,
          link.notifyRefill ? 1 : 0,
          link.quietStart,
          link.quietEnd,
          link.lineUserId,
          now,
          link.id,
        );
      }
    },
    async unlinkSub(lineSub: string, now: string) {
      const mine = data.links.filter((link) => link.lineSub === lineSub);
      const userIds = mine.map((link) => link.lineUserId).filter((id): id is string => Boolean(id));
      for (const link of mine) link.lineUserId = null;
      data.drafts = data.drafts.filter((draft) => !userIds.includes(draft.lineUserId));
      if (db) {
        await db.exec("UPDATE line_links SET line_user_id = NULL, updated_at = ? WHERE line_sub = ?", now, lineSub);
        for (const userId of userIds) await db.exec("DELETE FROM line_drafts WHERE line_user_id = ?", userId);
      }
    },
    settingsFor(circleId: string): LineSettings {
      return data.settings.find((item) => item.circleId === circleId) ?? defaultSettings(circleId);
    },
    allSettings() {
      return data.settings;
    },
    async saveSettings(next: LineSettings, now: string) {
      const index = data.settings.findIndex((item) => item.circleId === next.circleId);
      if (index >= 0) data.settings[index] = next;
      else data.settings.push(next);
      if (db) {
        await db.exec(
          `INSERT INTO line_settings (circle_id, detail_opt_in, missed_window_min, digest_time, last_digest_date, visit_date, supply_days, observation_count, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(circle_id) DO UPDATE SET detail_opt_in = excluded.detail_opt_in, missed_window_min = excluded.missed_window_min,
             digest_time = excluded.digest_time, last_digest_date = excluded.last_digest_date, visit_date = excluded.visit_date,
             supply_days = excluded.supply_days, observation_count = excluded.observation_count, updated_at = excluded.updated_at`,
          next.circleId,
          next.detailOptIn ? 1 : 0,
          next.missedWindowMin,
          next.digestTime,
          next.lastDigestDate,
          next.visitDate,
          next.supplyDays,
          next.observationCount,
          now,
        );
      }
    },
    dosesFor(circleId: string) {
      return data.doses.filter((dose) => dose.circleId === circleId);
    },
    dosesOn(date: string) {
      return data.doses.filter((dose) => dose.date === date);
    },
    async replacePlan(input: {
      circleId: string;
      detail: boolean;
      dataKey: string | null;
      doses: PlanDose[];
      refills: PlanRefill[];
      alerts: PlanAlert[];
      now: string;
    }) {
      const previous = data.doses.filter((dose) => dose.circleId === input.circleId);
      const nextDoses: DoseRow[] = [];
      for (const dose of input.doses) {
        const prev = previous.find((item) => item.id === dose.id);
        nextDoses.push({
          id: dose.id,
          circleId: input.circleId,
          date: dose.date,
          time: dose.time,
          slot: dose.slot,
          status: prev && prev.status !== "open" ? prev.status : "open",
          remindedAt: prev?.remindedAt ?? null,
          missedAlertedAt: prev?.missedAlertedAt ?? null,
          labelCipher: await labelFor(dose.name, dose.drugId, input.detail, input.dataKey),
        });
      }
      for (const prev of previous) {
        if (prev.status !== "open" && !nextDoses.some((dose) => dose.id === prev.id)) nextDoses.push(prev);
      }
      data.doses = data.doses.filter((dose) => dose.circleId !== input.circleId).concat(nextDoses);
      const nextRefills: RefillRow[] = [];
      for (const refill of input.refills) {
        const prev = data.refills.find((item) => item.circleId === input.circleId && item.id === refill.id);
        nextRefills.push({
          id: refill.id,
          circleId: input.circleId,
          kind: refill.kind,
          dueDate: refill.due,
          sent7: prev?.sent7 ?? false,
          sent3: prev?.sent3 ?? false,
          labelCipher: await labelFor(refill.name, undefined, input.detail, input.dataKey),
        });
      }
      data.refills = data.refills.filter((item) => item.circleId !== input.circleId).concat(nextRefills);
      for (const alert of input.alerts) {
        if (data.alerts.some((item) => item.circleId === input.circleId && item.id === alert.id)) continue;
        data.alerts.push({
          id: alert.id,
          circleId: input.circleId,
          kind: alert.kind,
          sentAt: null,
          labelCipher: await labelFor(alert.name, undefined, input.detail, input.dataKey),
        });
      }
      if (db) {
        await db.exec("DELETE FROM line_doses WHERE circle_id = ?", input.circleId);
        for (const dose of nextDoses) {
          await db.exec(
            `INSERT INTO line_doses (id, circle_id, date, time, slot, status, reminded_at, missed_alerted_at, label_cipher, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            dose.id,
            dose.circleId,
            dose.date,
            dose.time,
            dose.slot,
            dose.status,
            dose.remindedAt,
            dose.missedAlertedAt,
            dose.labelCipher,
            input.now,
          );
        }
        await db.exec("DELETE FROM line_refills WHERE circle_id = ?", input.circleId);
        for (const refill of nextRefills) {
          await db.exec(
            "INSERT INTO line_refills (id, circle_id, kind, due_date, sent_7, sent_3, label_cipher) VALUES (?, ?, ?, ?, ?, ?, ?)",
            refill.id,
            refill.circleId,
            refill.kind,
            refill.dueDate,
            refill.sent7 ? 1 : 0,
            refill.sent3 ? 1 : 0,
            refill.labelCipher,
          );
        }
        for (const alert of data.alerts.filter((item) => item.circleId === input.circleId)) {
          await db.exec(
            `INSERT INTO line_alerts (id, circle_id, kind, sent_at, label_cipher) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(circle_id, id) DO NOTHING`,
            alert.id,
            alert.circleId,
            alert.kind,
            alert.sentAt,
            alert.labelCipher,
          );
        }
      }
    },
    async resolveDoses(input: { circleId: string; date: string; slot: string; status: "taken" | "skipped"; onlyId?: string; now: string }) {
      const hits = data.doses.filter((dose) => {
        if (dose.circleId !== input.circleId || dose.date !== input.date || dose.slot !== input.slot) return false;
        if (input.onlyId && dose.id !== input.onlyId) return false;
        return dose.status === "open" || dose.id === input.onlyId;
      });
      for (const dose of hits) dose.status = input.status;
      if (db) {
        for (const dose of hits) {
          await db.exec("UPDATE line_doses SET status = ?, updated_at = ? WHERE id = ?", dose.status, input.now, dose.id);
        }
      }
      return hits;
    },
    async markReminded(ids: string[], now: string) {
      for (const dose of data.doses) if (ids.includes(dose.id)) dose.remindedAt = now;
      if (db) for (const id of ids) await db.exec("UPDATE line_doses SET reminded_at = ? WHERE id = ?", now, id);
    },
    async markMissed(ids: string[], now: string) {
      for (const dose of data.doses) if (ids.includes(dose.id)) dose.missedAlertedAt = now;
      if (db) for (const id of ids) await db.exec("UPDATE line_doses SET missed_alerted_at = ? WHERE id = ?", now, id);
    },
    refillsFor(circleId: string) {
      return data.refills.filter((item) => item.circleId === circleId);
    },
    allRefills() {
      return data.refills;
    },
    async markRefill(circleId: string, id: string, which: 7 | 3) {
      const row = data.refills.find((item) => item.circleId === circleId && item.id === id);
      if (!row) return;
      if (which === 7) row.sent7 = true;
      else row.sent3 = true;
      if (db) await db.exec(`UPDATE line_refills SET ${which === 7 ? "sent_7" : "sent_3"} = 1 WHERE circle_id = ? AND id = ?`, circleId, id);
    },
    pendingAlerts() {
      return data.alerts.filter((alert) => !alert.sentAt);
    },
    async markAlert(circleId: string, id: string, now: string) {
      const row = data.alerts.find((alert) => alert.circleId === circleId && alert.id === id);
      if (row) row.sentAt = now;
      if (db) await db.exec("UPDATE line_alerts SET sent_at = ? WHERE circle_id = ? AND id = ?", now, circleId, id);
    },
    groupFor(circleId: string) {
      return data.groups.find((group) => group.circleId === circleId) ?? null;
    },
    allGroups() {
      return data.groups;
    },
    async clearGroup(circleId: string) {
      data.groups = data.groups.filter((group) => group.circleId !== circleId);
      if (db) await db.exec("DELETE FROM line_groups WHERE circle_id = ?", circleId);
    },
    async addEvent(event: StoredEvent) {
      data.events.push(event);
      if (db) {
        await db.exec(
          "INSERT INTO line_events (id, circle_id, created_at, body, sig) VALUES (?, ?, ?, ?, ?)",
          event.id,
          event.circleId,
          event.createdAt,
          event.body,
          event.sig,
        );
      }
    },
    eventsSince(circleId: string, since: string | null) {
      return data.events.filter((event) => event.circleId === circleId && (!since || event.createdAt > since));
    },
    async putRelay(row: RelayRow) {
      data.relays.push(row);
      if (db) await db.exec("INSERT INTO line_relays (id, circle_id, cipher, expires_at) VALUES (?, ?, ?, ?)", row.id, row.circleId, row.cipher, row.expiresAt);
    },
    async takeRelay(id: string, now: string) {
      const row = data.relays.find((item) => item.id === id);
      data.relays = data.relays.filter((item) => item.id !== id);
      if (db) await db.exec("DELETE FROM line_relays WHERE id = ?", id);
      if (!row || row.expiresAt <= now) return null;
      return row;
    },
    async putDraft(row: DraftRow) {
      data.drafts = data.drafts.filter((item) => item.id !== row.id);
      data.drafts.push(row);
      if (db) {
        await db.exec(
          `INSERT INTO line_drafts (id, line_user_id, kind, cipher, expires_at) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET cipher = excluded.cipher, expires_at = excluded.expires_at`,
          row.id,
          row.lineUserId,
          row.kind,
          row.cipher,
          row.expiresAt,
        );
      }
    },
    peekDraft(id: string, now: string) {
      const row = data.drafts.find((item) => item.id === id);
      if (!row || row.expiresAt <= now) return null;
      return row;
    },
    async takeDraft(id: string, now: string) {
      const row = data.drafts.find((item) => item.id === id);
      data.drafts = data.drafts.filter((item) => item.id !== id);
      if (db) await db.exec("DELETE FROM line_drafts WHERE id = ?", id);
      if (!row || row.expiresAt <= now) return null;
      return row;
    },
    async readLabel(cipher: string | null, dataKey: string | null): Promise<string> {
      if (!cipher || !dataKey) return "";
      const opened = await openJson<{ name?: string }>(cipher, dataKey);
      return opened?.name?.slice(0, 80) || "";
    },
    async wipeCircle(circleId: string) {
      data.links = data.links.filter((link) => link.circleId !== circleId);
      data.codes = data.codes.filter((code) => code.circleId !== circleId);
      data.groups = data.groups.filter((group) => group.circleId !== circleId);
      data.settings = data.settings.filter((item) => item.circleId !== circleId);
      data.doses = data.doses.filter((dose) => dose.circleId !== circleId);
      data.refills = data.refills.filter((item) => item.circleId !== circleId);
      data.alerts = data.alerts.filter((item) => item.circleId !== circleId);
      data.events = data.events.filter((event) => event.circleId !== circleId);
      data.relays = data.relays.filter((item) => item.circleId !== circleId);
      if (!db) return;
      for (const table of ["line_links", "line_codes", "line_groups", "line_settings", "line_doses", "line_refills", "line_alerts", "line_events", "line_relays"]) {
        await db.exec(`DELETE FROM ${table} WHERE circle_id = ?`, circleId);
      }
    },
    async purgeAccount(lineSub: string, deletedCircles: string[]) {
      for (const circleId of deletedCircles) await this.wipeCircle(circleId);
      const mine = data.links.filter((link) => link.lineSub === lineSub);
      const userIds = mine.map((link) => link.lineUserId).filter((id): id is string => Boolean(id));
      const memberIds = new Set(mine.map((link) => link.memberId));
      data.links = data.links.filter((link) => link.lineSub !== lineSub);
      data.codes = data.codes.filter((code) => !code.memberId || !memberIds.has(code.memberId));
      data.drafts = data.drafts.filter((draft) => !userIds.includes(draft.lineUserId));
      if (db) {
        await db.exec("DELETE FROM line_links WHERE line_sub = ?", lineSub);
        for (const memberId of memberIds) await db.exec("DELETE FROM line_codes WHERE member_id = ?", memberId);
        for (const userId of userIds) await db.exec("DELETE FROM line_drafts WHERE line_user_id = ?", userId);
      }
    },
  };
}

export function memoryLineStore() {
  const data: Memory = { links: [], codes: [], groups: [], settings: [], doses: [], refills: [], alerts: [], events: [], relays: [], drafts: [] };
  return createApi(data, null);
}

type LinkSql = {
  id: string;
  circle_id: string;
  member_id: string;
  line_sub: string;
  line_user_id: string | null;
  lang: string;
  role: LineRole;
  notify_dose: number;
  notify_missed: number;
  notify_digest: number;
  notify_refill: number;
  quiet_start: string;
  quiet_end: string;
};

function linkFrom(row: LinkSql): LineLink | null {
  if (!isLang(row.lang)) return null;
  return {
    id: row.id,
    circleId: row.circle_id,
    memberId: row.member_id,
    lineSub: row.line_sub,
    lineUserId: row.line_user_id,
    lang: row.lang,
    role: row.role,
    notifyDose: bool(row.notify_dose),
    notifyMissed: bool(row.notify_missed),
    notifyDigest: bool(row.notify_digest),
    notifyRefill: bool(row.notify_refill),
    quietStart: row.quiet_start,
    quietEnd: row.quiet_end,
  };
}

/** Loads the D1 rows into the same store the tests use, then writes through. */
export async function d1LineStore(db: CircleDatabase) {
  const data: Memory = { links: [], codes: [], groups: [], settings: [], doses: [], refills: [], alerts: [], events: [], relays: [], drafts: [] };
  const links = await db.all<LinkSql>("SELECT * FROM line_links");
  data.links = links.map(linkFrom).filter((link): link is LineLink => Boolean(link));
  data.codes = (await db.all<{ code: string; circle_id: string; member_id: string | null; kind: "user" | "group"; expires_at: string; used_at: string | null }>("SELECT * FROM line_codes")).map((row) => ({
    code: row.code,
    circleId: row.circle_id,
    memberId: row.member_id,
    kind: row.kind,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
  }));
  data.groups = (await db.all<{ circle_id: string; group_id: string }>("SELECT circle_id, group_id FROM line_groups")).map((row) => ({
    circleId: row.circle_id,
    groupId: row.group_id,
  }));
  data.settings = (
    await db.all<{
      circle_id: string;
      detail_opt_in: number;
      missed_window_min: number;
      digest_time: string;
      last_digest_date: string | null;
      visit_date: string | null;
      supply_days: number | null;
      observation_count: number;
    }>("SELECT * FROM line_settings")
  ).map((row) => ({
    circleId: row.circle_id,
    detailOptIn: bool(row.detail_opt_in),
    missedWindowMin: row.missed_window_min,
    digestTime: row.digest_time,
    lastDigestDate: row.last_digest_date,
    visitDate: row.visit_date,
    supplyDays: row.supply_days,
    observationCount: row.observation_count,
  }));
  data.doses = (
    await db.all<{
      id: string;
      circle_id: string;
      date: string;
      time: string;
      slot: string;
      status: "open" | "taken" | "skipped";
      reminded_at: string | null;
      missed_alerted_at: string | null;
      label_cipher: string | null;
    }>("SELECT * FROM line_doses")
  ).map((row) => ({
    id: row.id,
    circleId: row.circle_id,
    date: row.date,
    time: row.time,
    slot: row.slot,
    status: row.status,
    remindedAt: row.reminded_at,
    missedAlertedAt: row.missed_alerted_at,
    labelCipher: row.label_cipher,
  }));
  data.refills = (
    await db.all<{ id: string; circle_id: string; kind: "supply" | "chronic" | "visit"; due_date: string; sent_7: number; sent_3: number; label_cipher: string | null }>(
      "SELECT * FROM line_refills",
    )
  ).map((row) => ({
    id: row.id,
    circleId: row.circle_id,
    kind: row.kind,
    dueDate: row.due_date,
    sent7: bool(row.sent_7),
    sent3: bool(row.sent_3),
    labelCipher: row.label_cipher,
  }));
  data.alerts = (await db.all<{ id: string; circle_id: string; kind: "fall" | "duplicate"; sent_at: string | null; label_cipher: string | null }>("SELECT * FROM line_alerts")).map(
    (row) => ({ id: row.id, circleId: row.circle_id, kind: row.kind, sentAt: row.sent_at, labelCipher: row.label_cipher }),
  );
  data.events = (await db.all<StoredEvent & { circle_id: string; created_at: string }>("SELECT id, circle_id, created_at, body, sig FROM line_events")).map((row) => ({
    id: row.id,
    circleId: row.circle_id,
    createdAt: row.created_at,
    body: row.body,
    sig: row.sig,
  }));
  data.relays = (await db.all<{ id: string; circle_id: string; cipher: string; expires_at: string }>("SELECT id, circle_id, cipher, expires_at FROM line_relays")).map((row) => ({
    id: row.id,
    circleId: row.circle_id,
    cipher: row.cipher,
    expiresAt: row.expires_at,
  }));
  data.drafts = (await db.all<{ id: string; line_user_id: string; kind: "bag" | "speak"; cipher: string; expires_at: string }>("SELECT id, line_user_id, kind, cipher, expires_at FROM line_drafts")).map(
    (row) => ({ id: row.id, lineUserId: row.line_user_id, kind: row.kind, cipher: row.cipher, expiresAt: row.expires_at }),
  );
  return createApi(data, db);
}
