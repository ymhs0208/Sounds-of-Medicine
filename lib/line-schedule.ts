import { addDays } from "./refill";
import { taipeiParts } from "./push-schedule";

export function clockMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Quiet hours may cross midnight, for example 22:00–07:00. */
export function inQuietHours(minutes: number, start: string, end: string): boolean {
  const from = clockMinutes(start);
  const to = clockMinutes(end);
  if (from === null || to === null || from === to) return false;
  if (from < to) return minutes >= from && minutes < to;
  return minutes >= from || minutes < to;
}

export type DoseClock = {
  date: string;
  time: string;
  status: "open" | "taken" | "skipped";
  remindedAt: string | null;
  missedAlertedAt: string | null;
};

/** The 15-minute cron sends a dose reminder in the first 20 minutes after the clock time. */
export function reminderDue(job: DoseClock, now: Date): boolean {
  if (job.status !== "open" || job.remindedAt) return false;
  const parts = taipeiParts(now);
  if (parts.date !== job.date) return false;
  const slot = clockMinutes(job.time);
  if (slot === null) return false;
  const late = parts.minutes - slot;
  return late >= 0 && late <= 20;
}

/** One missed-dose alert after the window, on the same Taipei date. */
export function missedDue(job: DoseClock, now: Date, windowMin: number): boolean {
  if (job.status !== "open" || job.missedAlertedAt) return false;
  const parts = taipeiParts(now);
  if (parts.date !== job.date) return false;
  const slot = clockMinutes(job.time);
  if (slot === null) return false;
  return parts.minutes >= slot + windowMin;
}

export function digestDue(digestTime: string, lastDate: string | null, now: Date): boolean {
  const parts = taipeiParts(now);
  if (lastDate === parts.date) return false;
  const slot = clockMinutes(digestTime);
  if (slot === null) return false;
  const late = parts.minutes - slot;
  return late >= 0 && late <= 20;
}

/** 7 and 3 days before a run-out, a 慢箋 pickup window, or a 回診 date. */
export function refillDue(due: string, today: string, sent7: boolean, sent3: boolean): 7 | 3 | null {
  if (!sent7 && addDays(today, 7) === due) return 7;
  if (!sent3 && addDays(today, 3) === due) return 3;
  return null;
}
