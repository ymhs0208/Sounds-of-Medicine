import assert from "node:assert/strict";
import test from "node:test";
import { asBuffer, bytesToUrl } from "./bytes";
import { encryptPushPayload, vapidJwt } from "./web-push";

async function vapidPair() {
  const key = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const rawPublic = new Uint8Array(await crypto.subtle.exportKey("raw", key.publicKey));
  const jwk = (await crypto.subtle.exportKey("jwk", key.privateKey)) as { d: string };
  return { publicKey: bytesToUrl(rawPublic), privateKey: jwk.d, verify: key.publicKey };
}

test("a vapid token is a signed ES256 jwt for the push service origin", async () => {
  const pair = await vapidPair();
  const token = await vapidJwt("https://fcm.googleapis.com/fcm/send/abc", pair.publicKey, pair.privateKey, "mailto:care@example.com");
  const [header, body, signature] = token.split(".");
  assert.equal(token.split(".").length, 3);
  const payload = JSON.parse(Buffer.from(body, "base64url").toString());
  assert.equal(payload.aud, "https://fcm.googleapis.com");
  assert.equal(payload.sub, "mailto:care@example.com");
  assert.equal(JSON.stringify(payload).includes("Amlodipine"), false);
  const signed = new TextEncoder().encode(`${header}.${body}`);
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    pair.verify,
    asBuffer(Buffer.from(signature, "base64url")),
    asBuffer(signed),
  );
  assert.equal(ok, true);
  const decodedHeader = JSON.parse(Buffer.from(header, "base64url").toString());
  assert.equal(decodedHeader.alg, "ES256");
});

test("push encryption produces an aes128gcm body", async () => {
  const user = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", user.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const body = await encryptPushPayload(new TextEncoder().encode("hello"), {
    endpoint: "https://push.example/sub",
    p256dh: bytesToUrl(raw),
    auth: bytesToUrl(auth),
  });
  assert.ok(body.byteLength > 16 + 4 + 1 + 65);
  assert.equal(body[20], 65);
});
