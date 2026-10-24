import { duplicateDrugIds } from "./duplicates";
import { SLOT_ORDER, type Slot } from "./slots";
import type { Bag, DoseLog, DoseStatus, Drug } from "./types";

export type TimelineItem = {
  drug: Drug;
  bag: Bag;
  slot: Slot;
  status: DoseStatus | "pending";
  duplicate: boolean;
};

export function buildTimeline(bags: Bag[], logs: DoseLog[], date: string): TimelineItem[] {
  const dupes = duplicateDrugIds(bags);
  const items: TimelineItem[] = [];
  for (const bag of bags) {
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
