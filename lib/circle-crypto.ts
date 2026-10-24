import { asBuffer, bytesToUrl, concatBytes, urlToBytes } from "./bytes";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export type CircleLink = { circleId: string; key: string; generation: number };

export async function generateCircleKey(): Promise<string> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return bytesToUrl(raw);
}

export async function importCircleKey(token: string): Promise<CryptoKey> {
  const raw = urlToBytes(token);
  if (raw.byteLength !== 32) throw new Error("bad circle key");
  return crypto.subtle.importKey("raw", asBuffer(raw), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptPayload(token: string, value: unknown): Promise<string> {
  const key = await importCircleKey(token);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const clear = new TextEncoder().encode(JSON.stringify(value));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, clear));
  return bytesToUrl(concatBytes([iv, cipher]));
}

export async function decryptPayload(token: string, packed: string): Promise<unknown> {
  const key = await importCircleKey(token);
  const bytes = urlToBytes(packed);
  if (bytes.byteLength < 13) throw new Error("bad payload");
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return JSON.parse(new TextDecoder().decode(clear)) as unknown;
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Uint8Array | null {
  const clean = text
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/[^0123456789ABCDEFGHJKMNPQRSTVWXYZ]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

function group(compact: string): string {
  return compact.match(/.{1,4}/g)?.join("-") ?? compact;
}

export async function recoveryCode(token: string): Promise<string> {
  const raw = urlToBytes(token);
  if (raw.byteLength !== 32) throw new Error("bad circle key");
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", asBuffer(raw)));
  return group(`${base32Encode(raw)}${base32Encode(digest).slice(0, 4)}`);
}

export async function parseRecoveryCode(code: string): Promise<string | null> {
  const compact = code.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (compact.length < 8) return null;
  const body = compact.slice(0, -4);
  const check = compact.slice(-4);
  const raw = base32Decode(body);
  if (!raw || raw.byteLength < 32) return null;
  const key = raw.slice(0, 32);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", asBuffer(key)));
  if (base32Encode(digest).slice(0, 4) !== check) return null;
  return bytesToUrl(key);
}

export function parseCircleFragment(hash: string): CircleLink | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const circleId = params.get("c") || "";
  const key = params.get("k") || "";
  const generation = Number(params.get("g") || "0");
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(circleId)) return null;
  if (!/^[A-Za-z0-9_-]{32,80}$/.test(key)) return null;
  if (!Number.isInteger(generation) || generation < 1 || generation > 10_000) return null;
  return { circleId, key, generation };
}

export function circleInvite(origin: string, link: CircleLink): string {
  const url = new URL("/circle", origin);
  url.hash = `c=${link.circleId}&k=${link.key}&g=${link.generation}`;
  return url.toString();
}

/** Reject a blob that is still a photo or a readable cabinet, before it is stored. */
export function cipherLooksPlain(cipher: string): boolean {
  return cipher.includes("photoDataUrl") || cipher.includes("data:image") || cipher.includes("patientName");
}
