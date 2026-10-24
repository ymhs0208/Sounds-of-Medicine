import { asBuffer, bytesToUrl, concatBytes, urlToBytes } from "./bytes";
import type { Lang } from "./types";

export type PushSubscriptionKeys = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

const REMINDER: Record<Lang, { title: string; body: string }> = {
  zh: { title: "藥聲", body: "該吃藥了。請打開藥聲，依藥袋上的字查看。" },
  id: { title: "YaoSheng", body: "Sudah waktunya minum obat. Buka YaoSheng dan lihat tulisan pada kemasan." },
  vi: { title: "YaoSheng", body: "Đã đến giờ uống thuốc. Mở YaoSheng và xem chữ trên túi thuốc." },
  fil: { title: "YaoSheng", body: "Oras na para inumin ang gamot. Buksan ang YaoSheng at tingnan ang nakasulat sa supot." },
  th: { title: "ยาเสียง", body: "ถึงเวลาทานยาแล้ว เปิดยาเสียงแล้วดูตัวหนังสือบนซองยา" },
  en: { title: "YaoSheng", body: "It is time for the medicine. Open YaoSheng and read the words on the bag." },
};

export function reminderText(lang: Lang): { title: string; body: string } {
  return REMINDER[lang];
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", asBuffer(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, asBuffer(data)));
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const prk = await hmac(salt.byteLength ? salt : new Uint8Array(32), ikm);
  const out = new Uint8Array(length);
  let prev: Uint8Array = new Uint8Array(0);
  let offset = 0;
  let counter = 1;
  while (offset < length) {
    prev = await hmac(prk, concatBytes([prev, info, new Uint8Array([counter])]));
    const take = Math.min(prev.byteLength, length - offset);
    out.set(prev.subarray(0, take), offset);
    offset += take;
    counter += 1;
  }
  return out;
}

/** aes128gcm body for one Web Push record. RFC 8291. */
export async function encryptPushPayload(payload: Uint8Array, subscription: PushSubscriptionKeys): Promise<Uint8Array> {
  const userPublic = urlToBytes(subscription.p256dh);
  const auth = urlToBytes(subscription.auth);
  if (userPublic.byteLength !== 65 || auth.byteLength < 16) throw new Error("bad subscription");
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const userKey = await crypto.subtle.importKey("raw", asBuffer(userPublic), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: userKey }, local.privateKey, 256));
  const localPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const infoPrefix = new TextEncoder().encode("WebPush: info\0");
  const ikm = await hkdf(auth, shared, concatBytes([infoPrefix, userPublic, localPublic]), 32);
  const cekBytes = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: nonce\0"), 12);
  const cek = await crypto.subtle.importKey("raw", asBuffer(cekBytes), { name: "AES-GCM" }, false, ["encrypt"]);
  const record = concatBytes([payload, new Uint8Array([2])]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: asBuffer(nonce) }, cek, asBuffer(record)));
  const rs = record.byteLength + 16;
  const header = new Uint8Array(16 + 4 + 1 + localPublic.byteLength);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = localPublic.byteLength;
  header.set(localPublic, 21);
  return concatBytes([header, cipher]);
}

export async function vapidJwt(endpoint: string, publicKey: string, privateKey: string, subject: string): Promise<string> {
  const pub = urlToBytes(publicKey);
  if (pub.byteLength !== 65) throw new Error("bad vapid public key");
  const header = bytesToUrl(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const audience = new URL(endpoint).origin;
  const body = bytesToUrl(
    new TextEncoder().encode(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: subject })),
  );
  const jwk = { kty: "EC", crv: "P-256", d: privateKey, x: bytesToUrl(pub.subarray(1, 33)), y: bytesToUrl(pub.subarray(33, 65)) };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signed = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, asBuffer(new TextEncoder().encode(`${header}.${body}`))),
  );
  return `${header}.${body}.${bytesToUrl(signed)}`;
}

export async function sendWebPush(subscription: PushSubscriptionKeys, lang: Lang, vapid: { publicKey: string; privateKey: string; subject: string }): Promise<boolean> {
  const text = reminderText(lang);
  const payload = new TextEncoder().encode(JSON.stringify({ title: text.title, body: text.body, url: "/today" }));
  const body = await encryptPushPayload(payload, subscription);
  const token = await vapidJwt(subscription.endpoint, vapid.publicKey, vapid.privateKey, vapid.subject);
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${token}, k=${vapid.publicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "120",
    },
    body: asBuffer(body),
    signal: AbortSignal.timeout(10_000),
  });
  return response.status === 201 || response.status === 200 || response.status === 202;
}
