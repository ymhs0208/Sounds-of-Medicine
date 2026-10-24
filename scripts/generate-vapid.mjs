import { webcrypto } from "node:crypto";

function bytesToUrl(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

const key = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const rawPublic = new Uint8Array(await webcrypto.subtle.exportKey("raw", key.publicKey));
const jwk = await webcrypto.subtle.exportKey("jwk", key.privateKey);

console.log("Add these as Worker secrets. Do not commit them.");
console.log(`VAPID_PUBLIC_KEY=${bytesToUrl(rawPublic)}`);
console.log(`VAPID_PRIVATE_KEY=${jwk.d}`);
console.log("VAPID_SUBJECT=mailto:【待填】");
