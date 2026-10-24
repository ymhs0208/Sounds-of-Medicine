import { openText, sealText, deviceKey } from "./at-rest";
import { EMPTY_DATA, normalizeData } from "./backup";
import type { AppData } from "./types";

export const STORAGE_KEY = "yaosheng.v1";

export async function loadStored(): Promise<{ data: AppData; writable: boolean }> {
  if (typeof localStorage === "undefined") return { data: EMPTY_DATA, writable: false };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { data: EMPTY_DATA, writable: true };
  try {
    const json = raw.startsWith("enc:v1:") ? await openText(await deviceKey(), raw) : raw;
    return { data: normalizeData(JSON.parse(json) as AppData), writable: true };
  } catch {
    return { data: EMPTY_DATA, writable: false };
  }
}

export async function saveStored(data: AppData): Promise<void> {
  const json = JSON.stringify(data);
  try {
    localStorage.setItem(STORAGE_KEY, await sealText(await deviceKey(), json));
    return;
  } catch {
    /* Keep a readable copy if the device key is unavailable. */
  }
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch {
    const slim: AppData = {
      ...data,
      bags: data.bags.map((bag) => {
        const next = { ...bag };
        delete next.photoDataUrl;
        return next;
      }),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch {
      /* Leave the previous copy in place. */
    }
  }
}

export function clearStored(): void {
  localStorage.removeItem(STORAGE_KEY);
}
