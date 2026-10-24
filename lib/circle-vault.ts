export type CircleRole = "owner" | "family" | "caregiver";

export type CircleVault = {
  circleId: string;
  generation: number;
  role: CircleRole;
  memberId: string;
  deviceId: string;
  keyToken: string;
  vectors: Record<string, Record<string, number>>;
  hashes: Record<string, string>;
  updatedAt: Record<string, string>;
  lastSyncAt: string | null;
};

const DB = "yaosheng-circle";
const STORE = "vault";
const KEY = "local";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadVault(): Promise<CircleVault | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve((request.result as CircleVault | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveVault(vault: CircleVault): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(vault, KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearVault(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
