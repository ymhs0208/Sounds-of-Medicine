import { bagFromExtraction } from "./build-bag";
import { checkImageBytes } from "./image-guard";
import { sealDoseEvent, type DoseAction, type DoseEvent } from "./line-events";
import { LINE_DISCLAIMER, addLabel, forwardLabel, noticeFlex, photoFlex, recordedText, translateFlex } from "./line-messages";
import { openJson, sealJson } from "./line-seal";
import { verifyLineSignature } from "./line-sign";
import type { LineStore } from "./line-store";
import { takeMemory } from "./rate-limit";
import { isSlot } from "./slots";
import type { Lang } from "./types";
import type { Extraction } from "./extraction";

export type LinePush = (to: string, messages: unknown[]) => Promise<boolean>;

export type WebhookDeps = {
  secret: string | null;
  store: LineStore;
  now: Date;
  reply: LinePush;
  push: LinePush;
  signingKey: string | null;
  dataKey: string | null;
  liffId?: string | null;
  limit?: (userId: string, kind: "extract" | "translate") => { ok: boolean };
  extract?: (dataUrl: string, lang: Lang) => Promise<{ ok: true; extraction: Extraction } | { ok: false }>;
  translate?: (text: string, to: Lang, from: Lang) => Promise<string | null>;
  getContent?: (messageId: string) => Promise<{ bytes: Uint8Array; mime: string } | null>;
};

type LineSource = { type?: string; userId?: string; groupId?: string };
type LineEvent = {
  type?: string;
  replyToken?: string;
  source?: LineSource;
  message?: { type?: string; id?: string; text?: string };
  postback?: { data?: string };
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function doseData(action: DoseAction, input: { circleId: string; date: string; slot: string; id: string; one: boolean }): string {
  const params = new URLSearchParams({ a: action, c: input.circleId, d: input.date, s: input.slot, id: input.id });
  if (input.one) params.set("one", "1");
  return params.toString();
}

export function parsePostback(data: string):
  | { action: DoseAction; circleId: string; date: string; slot: import("./slots").Slot; id: string; one: boolean }
  | { action: "forward"; id: string }
  | null {
  const params = new URLSearchParams(data);
  const action = params.get("a");
  if (action === "forward") {
    const id = params.get("id") || "";
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(id)) return null;
    return { action: "forward", id };
  }
  if (action !== "taken" && action !== "skipped") return null;
  const circleId = params.get("c") || "";
  const date = params.get("d") || "";
  const slot = params.get("s") || "";
  const id = params.get("id") || "";
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(circleId) || !DATE.test(date) || !isSlot(slot)) return null;
  if (!/^[A-Za-z0-9_:-]{4,96}$/.test(id)) return null;
  return { action, circleId, date, slot, id, one: params.get("one") === "1" };
}

function liffUrl(liffId: string, path: string): string {
  return `https://liff.line.me/${liffId}${path}`;
}

function extractionLines(extraction: Extraction, lang: Lang): string {
  return extraction.drugs
    .map((drug) => {
      const translated = lang !== "zh" ? drug.translation : null;
      const name = translated?.name || drug.nameZh || "";
      const dose = translated?.dose || drug.doseZh || "";
      const usage = translated?.usage || drug.usageZh || "";
      return [name, dose, usage].filter(Boolean).join(" · ");
    })
    .filter(Boolean)
    .join("\n")
    .slice(0, 500);
}

async function rememberDose(deps: WebhookDeps, event: DoseEvent, circleId: string) {
  if (!deps.signingKey) return;
  const sealed = await sealDoseEvent(event, deps.signingKey);
  await deps.store.addEvent({
    id: `e${crypto.randomUUID().replace(/-/g, "")}`.slice(0, 40),
    circleId,
    createdAt: event.at,
    body: sealed.body,
    sig: sealed.sig,
  });
}

export async function handleLineBody(body: string, signature: string | null, deps: WebhookDeps): Promise<{ status: number }> {
  if (!deps.secret) return { status: 503 };
  if (!(await verifyLineSignature(body, signature, deps.secret))) return { status: 401 };
  let payload: { events?: LineEvent[] };
  try {
    payload = JSON.parse(body) as { events?: LineEvent[] };
  } catch {
    return { status: 400 };
  }
  for (const event of payload.events || []) {
    try {
      await handleEvent(event, deps);
    } catch {
      /* One bad event must not make LINE retry the whole batch. */
    }
  }
  return { status: 200 };
}

async function handleEvent(event: LineEvent, deps: WebhookDeps) {
  const now = deps.now.toISOString();
  const userId = event.source?.userId || "";
  const groupId = event.source?.type === "group" ? event.source.groupId || "" : "";
  const replyToken = event.replyToken || "";

  if (event.type === "postback" && event.postback?.data) {
    await onPostback(event.postback.data, userId, replyToken, deps, now);
    return;
  }
  if (event.type === "message" && event.message?.type === "text") {
    await onText(event.message.text || "", userId, groupId, replyToken, deps, now);
    return;
  }
  if (event.type === "message" && event.message?.type === "image" && event.message.id) {
    await onImage(event.message.id, userId, replyToken, deps, now);
    return;
  }
  if ((event.type === "join" || event.type === "follow") && replyToken) {
    await deps.reply(replyToken, [{ type: "text", text: "請打開藥聲的設定，取得連結碼後傳給我。請詢問醫師或藥師。" }]);
  }
}

async function onPostback(data: string, userId: string, replyToken: string, deps: WebhookDeps, now: string) {
  const parsed = parsePostback(data);
  if (!parsed) return;
  const link = userId ? deps.store.linkForUser(userId) : null;
  const lang = link?.lang || "zh";
  if (parsed.action === "forward") {
    const relay = await deps.store.takeRelay(parsed.id, now);
    const opened = relay && deps.dataKey ? await openJson<{ text?: string; circleId?: string }>(relay.cipher, deps.dataKey) : null;
    const text = opened?.text?.slice(0, 500) || "";
    if (text) await fanout(deps, opened?.circleId || relay?.circleId || "", "family", noticeFlex(lang, text));
    if (replyToken) await deps.reply(replyToken, [{ type: "text", text: `${forwardLabel(lang)}。${LINE_DISCLAIMER[lang]}` }]);
    return;
  }
  if (!link || link.circleId !== parsed.circleId) return;
  const hits = await deps.store.resolveDoses({
    circleId: parsed.circleId,
    date: parsed.date,
    slot: parsed.slot,
    status: parsed.action,
    onlyId: parsed.one ? parsed.id : undefined,
    now,
  });
  const settings = deps.store.settingsFor(parsed.circleId);
  let eventDrug: string | undefined;
  if (parsed.one && settings.detailOptIn && deps.dataKey && hits[0]?.labelCipher) {
    const sealed = await openJson<{ drugId?: string }>(hits[0].labelCipher, deps.dataKey);
    if (sealed?.drugId && /^[A-Za-z0-9_:-]{4,80}$/.test(sealed.drugId)) eventDrug = sealed.drugId;
  }
  await rememberDose(
    deps,
    { v: 1, kind: "dose", date: parsed.date, slot: parsed.slot, action: parsed.action, at: now, ...(eventDrug ? { drugId: eventDrug } : {}) },
    parsed.circleId,
  );
  if (replyToken) await deps.reply(replyToken, [{ type: "text", text: recordedText(lang) }]);
}

async function onText(text: string, userId: string, groupId: string, replyToken: string, deps: WebhookDeps, now: string) {
  const trimmed = text.trim().slice(0, 600);
  const code = trimmed.toUpperCase();
  if (/^[A-Z0-9]{8}$/.test(code)) {
    const redeemed = await deps.store.redeemCode({ code, userId: userId || null, groupId: groupId || null, now });
    if (redeemed.ok && replyToken) {
      const note = redeemed.kind === "group" ? "已把這個群組接到照護圈。" : "已連結這支 LINE。";
      await deps.reply(replyToken, [{ type: "text", text: `${note}${LINE_DISCLAIMER.zh}` }]);
      return;
    }
  }
  const link = userId ? deps.store.linkForUser(userId) : null;
  if (!link || !deps.translate) {
    if (replyToken) await deps.reply(replyToken, [{ type: "text", text: "請先在藥聲設定裡連結 LINE。" }]);
    return;
  }
  const limited = (deps.limit || defaultLimit)(userId, "translate");
  if (!limited.ok) {
    if (replyToken) await deps.reply(replyToken, [{ type: "text", text: recordedText(link.lang) }]);
    return;
  }
  if (link.role === "caregiver") {
    const chinese = await deps.translate(trimmed, "zh", link.lang);
    if (!chinese) return;
    let forwardData: string | undefined;
    if (deps.dataKey) {
      const id = `r${crypto.randomUUID().replace(/-/g, "")}`.slice(0, 40);
      const expires = new Date(deps.now.getTime() + 60 * 60 * 1000).toISOString();
      await deps.store.putRelay({ id, circleId: link.circleId, cipher: await sealJson({ text: chinese, circleId: link.circleId }, deps.dataKey), expiresAt: expires });
      forwardData = `a=forward&id=${id}`;
    }
    if (replyToken) await deps.reply(replyToken, [translateFlex({ lang: link.lang, body: chinese, forwardData })]);
    if (groupId) await deps.push(groupId, [translateFlex({ lang: "zh", body: chinese })]);
    return;
  }
  const caregivers = deps.store.linksForCircle(link.circleId).filter((item) => item.role === "caregiver" && item.lineUserId);
  const target = caregivers[0]?.lang || "id";
  const translated = await deps.translate(trimmed, target, "zh");
  if (!translated) return;
  if (replyToken) await deps.reply(replyToken, [translateFlex({ lang: link.lang, body: translated })]);
  for (const caregiver of caregivers) {
    if (caregiver.lineUserId) await deps.push(caregiver.lineUserId, [translateFlex({ lang: caregiver.lang, body: translated })]);
  }
}

async function onImage(messageId: string, userId: string, replyToken: string, deps: WebhookDeps, now: string) {
  const link = userId ? deps.store.linkForUser(userId) : null;
  const lang = link?.lang || "zh";
  if (!deps.getContent || !deps.extract) {
    if (replyToken) await deps.reply(replyToken, [{ type: "text", text: recordedText(lang) }]);
    return;
  }
  const limited = (deps.limit || defaultLimit)(userId || messageId, "extract");
  if (!limited.ok) {
    if (replyToken) await deps.reply(replyToken, [{ type: "text", text: recordedText(lang) }]);
    return;
  }
  const content = await deps.getContent(messageId);
  if (!content || !checkImageBytes(content.bytes, content.mime)) {
    if (replyToken) await deps.reply(replyToken, [{ type: "text", text: recordedText(lang) }]);
    return;
  }
  const dataUrl = toDataUrl(content.bytes, content.mime);
  const extracted = await deps.extract(dataUrl, lang);
  if (!extracted.ok) {
    if (replyToken) await deps.reply(replyToken, [{ type: "text", text: recordedText(lang) }]);
    return;
  }
  const spoken = extractionLines(extracted.extraction, lang);
  let readUri: string | undefined;
  let addUri: string | undefined;
  if (deps.dataKey && deps.liffId && link) {
    const expires = new Date(deps.now.getTime() + 60 * 60 * 1000).toISOString();
    const speakId = `s${crypto.randomUUID().replace(/-/g, "")}`.slice(0, 40);
    const bagId = `b${crypto.randomUUID().replace(/-/g, "")}`.slice(0, 40);
    await deps.store.putDraft({ id: speakId, lineUserId: userId, kind: "speak", cipher: await sealJson({ text: spoken }, deps.dataKey), expiresAt: expires });
    const bag = bagFromExtraction(extracted.extraction, undefined, lang);
    await deps.store.putDraft({ id: bagId, lineUserId: userId, kind: "bag", cipher: await sealJson(bag, deps.dataKey), expiresAt: expires });
    readUri = liffUrl(deps.liffId, `/line/speak?draft=${speakId}`);
    addUri = liffUrl(deps.liffId, `/review?draft=${bagId}`);
  }
  if (replyToken) await deps.reply(replyToken, [photoFlex({ lang, body: spoken || addLabel(lang), readUri, addUri })]);
  void now;
}

async function fanout(deps: WebhookDeps, circleId: string, who: "family" | "caregiver", message: unknown) {
  const links = deps.store.linksForCircle(circleId).filter((link) => link.lineUserId && (who === "caregiver" ? link.role === "caregiver" : link.role !== "caregiver"));
  for (const link of links) {
    if (link.lineUserId) await deps.push(link.lineUserId, [message]);
  }
  const group = deps.store.groupFor(circleId);
  if (group && who === "family") await deps.push(group.groupId, [message]);
}

function defaultLimit(userId: string, kind: "extract" | "translate") {
  const rule = kind === "extract" ? { limit: 8, windowMs: 10 * 60 * 1000 } : { limit: 30, windowMs: 10 * 60 * 1000 };
  return takeMemory(`line:${kind}:${userId}`, rule.limit, rule.windowMs);
}

function toDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export async function linePush(token: string, to: string, messages: unknown[]): Promise<boolean> {
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, messages }),
    signal: AbortSignal.timeout(10_000),
  });
  return response.ok;
}

export async function lineReply(token: string, replyToken: string, messages: unknown[]): Promise<boolean> {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ replyToken, messages }),
    signal: AbortSignal.timeout(10_000),
  });
  return response.ok;
}

export function lineContent(token: string, messageId: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  return fetch(`https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  }).then(async (response) => {
    if (!response.ok) return null;
    const mime = response.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { bytes, mime: mime.split(";")[0] || "image/jpeg" };
  }).catch(() => null);
}

export function messagingConfigured(env?: { LINE_MESSAGING_CHANNEL_SECRET?: string; LINE_MESSAGING_ACCESS_TOKEN?: string }): boolean {
  const source = env ?? process.env;
  return Boolean(source.LINE_MESSAGING_CHANNEL_SECRET && source.LINE_MESSAGING_ACCESS_TOKEN);
}
