import { bagActiveOn } from "./bag-draft";
import { duplicateDrugIds } from "./duplicates";
import { SLOT_ORDER, SLOT_TIME, type Slot } from "./slots";
import type { AppData, Bag, DoseLog, DoseNotice, DoseStatus, Drug, Report } from "./types";

export type TimelineItem = {
  drug: Drug;
  bag: Bag;
  slot: Slot;
  status: DoseStatus | "pending";
  duplicate: boolean;
};

export function buildTimeline(bags: Bag[], logs: DoseLog[], date: string): TimelineItem[] {
  const active = bags.filter((bag) => bagActiveOn(bag, date));
  const dupes = duplicateDrugIds(active);
  const items: TimelineItem[] = [];
  for (const bag of active) {
    for (const drug of bag.drugs) {
      for (const slot of drug.slots) {
        const log = logs.find(
          (entry) => entry.drugId === drug.id && entry.date === date && entry.slot === slot,
        );
        items.push({
          drug,
          bag,
          slot,
          status: log?.status ?? "pending",
          duplicate: dupes.has(drug.id),
        });
      }
    }
  }
  const order = new Map(SLOT_ORDER.map((slot, index) => [slot, index]));
  items.sort((a, b) => {
    const slotDelta = (order.get(a.slot) ?? 0) - (order.get(b.slot) ?? 0);
    if (slotDelta !== 0) return slotDelta;
    if (a.duplicate !== b.duplicate) return a.duplicate ? -1 : 1;
    return a.drug.ingredient.localeCompare(b.drug.ingredient) || a.drug.nameZh.localeCompare(b.drug.nameZh, "zh-Hant");
  });
  return items;
}

export function groupTimeline(items: TimelineItem[]): { slot: Slot; items: TimelineItem[] }[] {
  const groups: { slot: Slot; items: TimelineItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (!last || last.slot !== item.slot) groups.push({ slot: item.slot, items: [item] });
    else last.items.push(item);
  }
  return groups;
}

export function adherence(bags: Bag[], logs: DoseLog[], date: string): {
  given: number;
  missed: number;
  pending: number;
  total: number;
} {
  const items = buildTimeline(bags, logs, date);
  return {
    given: items.filter((item) => item.status === "given").length,
    missed: items.filter((item) => item.status === "missed").length,
    pending: items.filter((item) => item.status === "pending").length,
    total: items.length,
  };
}

export function applyDose(
  current: AppData,
  input: {
    drugId: string;
    slot: Slot;
    status: DoseStatus | null;
    date: string;
    at: string;
    reportId: string;
  },
): AppData {
  const logs = current.logs.filter(
    (log) => !(log.drugId === input.drugId && log.date === input.date && log.slot === input.slot),
  );
  const reports = current.reports.filter(
    (report) =>
      !(
        report.source === "timeline" &&
        report.drugId === input.drugId &&
        report.date === input.date &&
        report.slot === input.slot
      ),
  );
  if (!input.status) return { ...current, logs, reports };
  const report: Report = {
    id: input.reportId,
    at: input.at,
    date: input.date,
    kind: input.status,
    drugId: input.drugId,
    slot: input.slot,
    source: "timeline",
    replies: [],
  };
  const log: DoseLog = {
    drugId: input.drugId,
    date: input.date,
    slot: input.slot,
    status: input.status,
    at: input.at,
  };
  return { ...current, logs: [...logs, log], reports: [...reports, report] };
}

export function dueItems(items: TimelineItem[], date: string, now: Date, notified: DoseNotice[]): TimelineItem[] {
  const minute = now.getHours() * 60 + now.getMinutes();
  const fired = new Set(
    notified.filter((notice) => notice.date === date).map((notice) => `${notice.drugId}:${notice.slot}`),
  );
  return items.filter((item) => {
    if (item.status !== "pending") return false;
    const [hour, mins] = SLOT_TIME[item.slot].split(":").map(Number);
    if (minute < hour * 60 + mins) return false;
    return !fired.has(`${item.drug.id}:${item.slot}`);
  });
}

export type CabinetMode = "empty" | "demo" | "real";

export function cabinetMode(bags: Bag[]): CabinetMode {
  if (bags.length === 0) return "empty";
  return bags.some((bag) => bag.source !== "demo") ? "real" : "demo";
}

/** Demo bags and real bags must never share a cabinet. */
export function admitBag(bags: Bag[], source: Bag["source"]): "ok" | "mixed" {
  const mode = cabinetMode(bags);
  if (mode === "empty") return "ok";
  const incomingDemo = source === "demo";
  if (incomingDemo && mode === "real") return "mixed";
  if (!incomingDemo && mode === "demo") return "mixed";
  return "ok";
}
