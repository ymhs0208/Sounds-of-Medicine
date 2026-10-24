import type { Bag, DoseLog, Drug } from "./types";

export type RefillLevel = 7 | 3;

export type NextFill = {
  which: 2 | 3;
  windowStart: string;
  windowEnd: string;
};

export type RefillInfo = {
  drugId: string;
  bagId: string;
  nameZh: string;
  hospitalZh: string;
  start: string;
  daysSupplied: number;
  dosesPerDay: number;
  suppliedDoses: number;
  taken: number;
  remainingDoses: number;
  daysLeft: number;
  runOut: string;
  level: RefillLevel | null;
  chronic: boolean;
  fill: 1 | 2 | 3 | null;
  nextFill: NextFill | null;
};

export function addDays(iso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days);
  return new Date(utc).toISOString().slice(0, 10);
}

/** 7-day and 3-day reminders before the recorded supply runs out. Zero or past is not a reminder. */
export function remindLevel(daysLeft: number): RefillLevel | null {
  if (daysLeft <= 3 && daysLeft > 0) return 3;
  if (daysLeft <= 7 && daysLeft > 3) return 7;
  return null;
}

/**
 * 連續處方箋 pickup window: the 10 days ending on the last day of this supply.
 * This restates the printed dates. It is not an instruction to pick up medicine.
 */
export function chronicWindow(start: string, days: number, fill: 1 | 2 | 3 | null | undefined): NextFill | null {
  if (fill !== 1 && fill !== 2) return null;
  if (days < 1) return null;
  const windowEnd = addDays(start, days - 1);
  const windowStart = days > 10 ? addDays(windowEnd, -9) : start;
  return { which: fill === 1 ? 2 : 3, windowStart, windowEnd };
}

export function refillForDrug(bag: Bag, drug: Drug, logs: DoseLog[], today: string): RefillInfo | null {
  if (!bag.dispensingDate || !bag.days || bag.days < 1) return null;
  const start = bag.dispensingDate;
  const dosesPerDay = Math.max(1, drug.slots.length);
  const suppliedDoses = bag.days * dosesPerDay;
  const taken = logs.filter((log) => log.drugId === drug.id && log.status === "given" && log.date >= start).length;
  const remainingDoses = Math.max(0, suppliedDoses - taken);
  const daysLeft = Math.ceil(remainingDoses / dosesPerDay);
  const fill = bag.chronicFill === 1 || bag.chronicFill === 2 || bag.chronicFill === 3 ? bag.chronicFill : null;
  return {
    drugId: drug.id,
    bagId: bag.id,
    nameZh: drug.nameZh,
    hospitalZh: bag.hospitalZh,
    start,
    daysSupplied: bag.days,
    dosesPerDay,
    suppliedDoses,
    taken,
    remainingDoses,
    daysLeft,
    runOut: daysLeft === 0 ? today : addDays(today, daysLeft),
    level: remindLevel(daysLeft),
    chronic: Boolean(bag.chronic),
    fill,
    nextFill: bag.chronic ? chronicWindow(start, bag.days, fill) : null,
  };
}

export function refillStatuses(bags: Bag[], logs: DoseLog[], today: string): RefillInfo[] {
  const rows: RefillInfo[] = [];
  for (const bag of bags) {
    for (const drug of bag.drugs) {
      const row = refillForDrug(bag, drug, logs, today);
      if (row) rows.push(row);
    }
  }
  rows.sort((a, b) => a.daysLeft - b.daysLeft || a.nameZh.localeCompare(b.nameZh, "zh-Hant"));
  return rows;
}
