import { signPayload, verifyPayload } from "./line-sign";
import { isSlot, type Slot } from "./slots";

export type DoseAction = "taken" | "skipped";

export type DoseEvent = {
  v: 1;
  kind: "dose";
  date: string;
  slot: Slot;
  action: DoseAction;
  at: string;
  drugId?: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function canonicalDoseEvent(event: DoseEvent): string {
  return JSON.stringify({
    v: 1,
    kind: "dose",
    date: event.date,
    slot: event.slot,
    action: event.action,
    at: event.at,
    ...(event.drugId ? { drugId: event.drugId } : {}),
  });
}

export function parseDoseEvent(raw: unknown): DoseEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<DoseEvent>;
  if (value.v !== 1 || value.kind !== "dose") return null;
  if (typeof value.date !== "string" || !DATE.test(value.date)) return null;
  if (typeof value.slot !== "string" || !isSlot(value.slot)) return null;
  if (value.action !== "taken" && value.action !== "skipped") return null;
  if (typeof value.at !== "string" || Number.isNaN(Date.parse(value.at))) return null;
  const event: DoseEvent = { v: 1, kind: "dose", date: value.date, slot: value.slot, action: value.action, at: value.at };
  if (typeof value.drugId === "string" && /^[A-Za-z0-9_:-]{4,80}$/.test(value.drugId)) event.drugId = value.drugId;
  return event;
}

export async function sealDoseEvent(event: DoseEvent, secret: string): Promise<{ body: string; sig: string }> {
  const body = canonicalDoseEvent(event);
  return { body, sig: await signPayload(body, secret) };
}

export async function openDoseEvent(body: string, sig: string, secret: string): Promise<DoseEvent | null> {
  if (!(await verifyPayload(body, sig, secret))) return null;
  try {
    return parseDoseEvent(JSON.parse(body) as unknown);
  } catch {
    return null;
  }
}
