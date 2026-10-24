import type { Bag } from "./types";
import type { DemoKey } from "./demo-data";

export type Pending =
  | { kind: "demo"; key: DemoKey }
  | { kind: "extract"; bag: Bag };

const KEY = "yaosheng.pending";
let memory: Pending | null = null;

export function setPending(pending: Pending): void {
  memory = pending;
  if (typeof sessionStorage === "undefined") return;
  try {
    if (pending.kind === "demo") {
      sessionStorage.setItem(KEY, JSON.stringify(pending));
      sessionStorage.removeItem(`${KEY}.photo`);
      return;
    }
    const { photoDataUrl, ...rest } = pending.bag;
    sessionStorage.setItem(KEY, JSON.stringify({ kind: "extract", bag: rest }));
    if (photoDataUrl) sessionStorage.setItem(`${KEY}.photo`, photoDataUrl);
    else sessionStorage.removeItem(`${KEY}.photo`);
  } catch {
    /* The in-memory copy still carries the photo for this visit. */
  }
}

export function readPending(): Pending | null {
  if (memory) return memory;
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Pending;
    if (parsed.kind === "extract") {
      const photo = sessionStorage.getItem(`${KEY}.photo`);
      if (photo) parsed.bag.photoDataUrl = photo;
    }
    memory = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  memory = null;
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(KEY);
  sessionStorage.removeItem(`${KEY}.photo`);
}
