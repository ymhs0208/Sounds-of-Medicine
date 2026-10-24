import { asBuffer, bytesToUrl, concatBytes, urlToBytes } from "./bytes";

const DB = "yaosheng-keys";
const STORE = "keys";
const KEY_ID = "device";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readKey(): Promise<CryptoKey | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(KEY_ID);
    request.onsuccess = () => resolve((request.result as CryptoKey | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function writeKey(key: CryptoKey): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(key, KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deviceKey(): Promise<CryptoKey> {
  const existing = await readKey();
  if (existing) return existing;
  const created = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await writeKey(created);
  return created;
}

export async function sealText(key: CryptoKey, text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBuffer(iv) }, key, asBuffer(new TextEncoder().encode(text))),
  );
  return `enc:v1:${bytesToUrl(concatBytes([iv, cipher]))}`;
}

export async function openText(key: CryptoKey, packed: string): Promise<string> {
  const bytes = urlToBytes(packed.replace(/^enc:v1:/, ""));
  const iv = bytes.subarray(0, 12);
  const cipher = bytes.subarray(12);
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: asBuffer(iv) }, key, asBuffer(cipher));
  return new TextDecoder().decode(clear);
}
