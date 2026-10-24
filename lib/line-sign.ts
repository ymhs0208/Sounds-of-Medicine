import { asBuffer, bytesToUrl, urlToBytes } from "./bytes";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

/** LINE signs the raw webhook body with HMAC-SHA256 and base64. */
export async function lineSignature(body: string, secret: string): Promise<string> {
  return bytesToBase64(await hmac(secret, body));
}

function same(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
}

export async function verifyLineSignature(body: string, header: string | null, secret: string): Promise<boolean> {
  if (!header || !secret) return false;
  const expected = await lineSignature(body, secret);
  return same(expected, header.trim());
}

export async function signPayload(payload: string, secret: string): Promise<string> {
  return bytesToUrl(await hmac(secret, payload));
}

export async function verifyPayload(payload: string, signature: string, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  try {
    return crypto.subtle.verify("HMAC", key, asBuffer(urlToBytes(signature)), new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}
