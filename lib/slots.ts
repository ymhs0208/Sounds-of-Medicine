export const SLOT_ORDER = [
  "morning_before",
  "morning",
  "morning_after",
  "noon_before",
  "noon",
  "noon_after",
  "evening_before",
  "evening",
  "evening_after",
  "bedtime",
] as const;

export type Slot = (typeof SLOT_ORDER)[number];

export const SLOT_TIME: Record<Slot, string> = {
  morning_before: "07:00",
  morning: "07:30",
  morning_after: "08:00",
  noon_before: "11:30",
  noon: "12:00",
  noon_after: "12:30",
  evening_before: "17:30",
  evening: "18:00",
  evening_after: "19:00",
  bedtime: "21:30",
};

export function isSlot(value: string): value is Slot {
  return (SLOT_ORDER as readonly string[]).includes(value);
}

export function slotTiming(slot: Slot): "before" | "after" | "none" {
  if (slot.endsWith("_before")) return "before";
  if (slot.endsWith("_after")) return "after";
  return "none";
}

export function slotDayPart(slot: Slot): "morning" | "noon" | "evening" | "bedtime" {
  if (slot.startsWith("morning")) return "morning";
  if (slot.startsWith("noon")) return "noon";
  if (slot.startsWith("evening")) return "evening";
  return "bedtime";
}
