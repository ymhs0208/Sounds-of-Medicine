export type ShareSnapshot = {
  v: 1;
  at: string;
  day: string;
  patientName: string;
  familyContact: string;
  allergies: string;
  adherence: { given: number; missed: number; pending: number; total: number; percent: number | null };
  meds: { name: string; hospital: string; usage: string }[];
  symptoms: { kind: string; noteZh: string; value?: string; at: string }[];
  duplicates: string[];
};

function bytesToUrl(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function importAes(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function seal(key: CryptoKey, snapshot: ShareSnapshot): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(snapshot))),
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return bytesToUrl(packed);
}

async function open(key: CryptoKey, packed: string): Promise<ShareSnapshot> {
  const bytes = urlToBytes(packed);
  const iv = bytes.slice(0, 12);
  const cipher = bytes.slice(12);
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  const parsed = JSON.parse(new TextDecoder().decode(clear)) as ShareSnapshot;
  if (parsed.v !== 1 || !Array.isArray(parsed.meds)) throw new Error("bad snapshot");
  return parsed;
}

export async function encryptSnapshot(snapshot: ShareSnapshot): Promise<{ key: string; cipher: string }> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const key = await importAes(raw);
  return { key: bytesToUrl(raw), cipher: await seal(key, snapshot) };
}

export async function decryptSnapshot(key: string, cipher: string): Promise<ShareSnapshot> {
  return open(await importAes(urlToBytes(key)), cipher);
}

export async function encryptWithPassphrase(snapshot: ShareSnapshot, passphrase: string): Promise<{ salt: string; cipher: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  return { salt: bytesToUrl(salt), cipher: await seal(key, snapshot) };
}

export async function decryptWithPassphrase(passphrase: string, salt: string, cipher: string): Promise<ShareSnapshot> {
  return open(await deriveKey(passphrase, urlToBytes(salt)), cipher);
}
