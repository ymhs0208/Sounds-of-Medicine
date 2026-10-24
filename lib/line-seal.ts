import { asBuffer, bytesToUrl, concatBytes, urlToBytes } from "./bytes";

async function aesKey(secret: string): Promise<CryptoKey> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)));
  return crypto.subtle.importKey("raw", asBuffer(digest), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** Encrypts JSON at rest. The key stays in the worker env and is never sent to the browser. */
export async function sealJson(value: unknown, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(secret);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBuffer(iv) }, key, new TextEncoder().encode(JSON.stringify(value))),
  );
  return bytesToUrl(concatBytes([iv, cipher]));
}

export async function openJson<T>(token: string, secret: string): Promise<T | null> {
  try {
    const bytes = urlToBytes(token);
    if (bytes.byteLength < 13) return null;
    const key = await aesKey(secret);
    const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: asBuffer(bytes.subarray(0, 12)) }, key, asBuffer(bytes.subarray(12)));
    return JSON.parse(new TextDecoder().decode(clear)) as T;
  } catch {
    return null;
  }
}
