import { SLOT_TIME, isSlot } from "./slots";
import { isLang, type Lang } from "./types";

const ALLOWED_TIMES = new Set(Object.values(SLOT_TIME));

export type PushRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  lang: Lang;
  /** Clock times only, such as 08:00. Never a drug or patient name. */
  times: string[];
  /** date a time was last sent, keyed by HH:MM. */
  sent: Record<string, string>;
};

export function scheduleTimes(slots: string[]): string[] {
  const times = new Set<string>();
  for (const slot of slots) {
    if (isSlot(slot)) times.add(SLOT_TIME[slot]);
  }
  return [...times].sort();
}

export function parsePushRecord(raw: unknown): PushRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<PushRecord>;
  if (typeof value.id !== "string" || !/^[A-Za-z0-9_-]{16,80}$/.test(value.id)) return null;
  if (typeof value.endpoint !== "string" || !value.endpoint.startsWith("https://")) return null;
  if (typeof value.p256dh !== "string" || typeof value.auth !== "string") return null;
  if (!value.lang || !isLang(value.lang)) return null;
  if (!Array.isArray(value.times) || value.times.some((time) => !ALLOWED_TIMES.has(time))) return null;
  const sent = value.sent && typeof value.sent === "object" ? value.sent : {};
  return {
    id: value.id,
    endpoint: value.endpoint,
    p256dh: value.p256dh,
    auth: value.auth,
    lang: value.lang,
    times: [...new Set(value.times)].slice(0, 12),
    sent: Object.fromEntries(Object.entries(sent).filter((entry) => ALLOWED_TIMES.has(entry[0]) && typeof entry[1] === "string")),
  };
}

export function taipeiParts(now = new Date()): { date: string; minutes: number } {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const date = shifted.toISOString().slice(0, 10);
  const minutes = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return { date, minutes };
}

export function reminderSafe(text: string): boolean {
  return !/amlodipine|脈優|\d+\s*mg/i.test(text);
}

export function dueTimes(record: PushRecord, now = new Date()): string[] {
  const { date, minutes } = taipeiParts(now);
  return record.times.filter((time) => {
    const [hour, mins] = time.split(":").map(Number);
    const slot = hour * 60 + mins;
    const late = minutes - slot;
    if (late < 0 || late > 20) return false;
    return record.sent[time] !== date;
  });
}
