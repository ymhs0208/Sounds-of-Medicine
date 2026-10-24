import { slotDayPart, slotTiming, SLOT_ORDER, type Slot } from "./slots";

export const DAY_PARTS = ["morning", "noon", "evening", "bedtime"] as const;
export type DayPart = (typeof DAY_PARTS)[number];
export type MealChoice = "before" | "after" | "none";

export function slotsFromSchedule(times: DayPart[], meal: MealChoice): Slot[] {
  const selected = new Set(times);
  return SLOT_ORDER.filter((slot) => {
    const part = slotDayPart(slot);
    if (!selected.has(part)) return false;
    if (part === "bedtime") return true;
    return slotTiming(slot) === meal;
  });
}

export function scheduleFromSlots(slots: Slot[]): { times: DayPart[]; meal: MealChoice } {
  const times: DayPart[] = [];
  for (const part of DAY_PARTS) {
    if (slots.some((slot) => slotDayPart(slot) === part)) times.push(part);
  }
  const timed = slots.filter((slot) => slotDayPart(slot) !== "bedtime");
  const before = timed.filter((slot) => slotTiming(slot) === "before").length;
  const after = timed.filter((slot) => slotTiming(slot) === "after").length;
  const meal: MealChoice = after > before ? "after" : before > 0 ? "before" : "none";
  return { times, meal };
}

export function bagActiveOn(bag: { dispensingDate: string | null; days?: number | null }, date: string): boolean {
  if (!bag.days || bag.days < 1 || !bag.dispensingDate) return true;
  const start = Date.parse(`${bag.dispensingDate}T00:00:00`);
  const day = Date.parse(`${date}T00:00:00`);
  if (Number.isNaN(start) || Number.isNaN(day)) return true;
  return day >= start && day < start + bag.days * 86_400_000;
}
