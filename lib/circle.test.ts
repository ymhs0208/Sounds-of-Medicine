import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { EMPTY_DATA } from "./backup";
import { cabinetFromRecords, snapshotRecords } from "./circle-records";
import { decryptPayload, encryptPayload, generateCircleKey, parseCircleFragment, parseRecoveryCode, recoveryCode } from "./circle-crypto";
import { memoryStore, parseEnvelope } from "./circle-store";
import { finishLineLogin } from "./line-auth";
import { openSession, sealJson, sealSession } from "./session";
import { decidePush, mergeEnvelope, type Envelope } from "./sync-merge";
import type { Bag } from "./types";

const bag: Bag = {
  id: "bag-bag-bag-bag1",
  source: "photo",
  hospitalZh: "醫院",
  hospitalShort: "醫院",
  pharmacyZh: "藥局",
  patientZh: "林秀英",
  dispensingDate: null,
  dispensingLabel: "",
  theme: "pine",
  photoDataUrl: "data:image/jpeg;base64,AAAA",
  drugs: [],
  createdAt: "2026-10-24T00:00:00.000Z",
};

function envelope(partial: Partial<Envelope> & Pick<Envelope, "id" | "vector" | "updatedAt" | "deviceId">): Envelope {
  return {
    generation: 1,
    cipher: "cipher-cipher-cipher",
    size: 20,
    ...partial,
  };
}

test("a circle key round-trips and the recovery code restores it", async () => {
  const token = await generateCircleKey();
  const packed = await encryptPayload(token, { patientName: "林秀英", note: "早上" });
  assert.equal(packed.includes("林秀英"), false);
  const opened = await decryptPayload(token, packed) as { patientName: string };
  assert.equal(opened.patientName, "林秀英");
  const code = await recoveryCode(token);
  assert.equal(await parseRecoveryCode(code), token);
  assert.equal(await parseRecoveryCode(`${code}X`), null);
});

test("rotating the key makes the previous ciphertext unreadable", async () => {
  const first = await generateCircleKey();
  const packed = await encryptPayload(first, { hello: "kept" });
  const second = await generateCircleKey();
  await assert.rejects(() => decryptPayload(second, packed));
  const rotated = await encryptPayload(second, await decryptPayload(first, packed));
  assert.deepEqual(await decryptPayload(second, rotated), { hello: "kept" });
  await assert.rejects(() => decryptPayload(first, rotated));
});

test("sync snapshots drop photos and keep a local thumbnail on merge", () => {
  const data = { ...EMPTY_DATA, patientName: "林秀英", bags: [bag] };
  const records = snapshotRecords(data);
  const plain = JSON.stringify(records);
  assert.equal(plain.includes("photoDataUrl"), false);
  assert.equal(plain.includes("data:image"), false);
  const next = cabinetFromRecords(data, records);
  assert.equal(next.bags[0].photoDataUrl, bag.photoDataUrl);
  assert.equal(next.patientName, "林秀英");
});

test("a dominated remote wins and a concurrent edit keeps the later timestamp", () => {
  const local = envelope({ id: "profile", vector: { "device-device-device": 1 }, updatedAt: "2026-10-24T01:00:00.000Z", deviceId: "device-device-device" });
  const remote = envelope({ id: "profile", vector: { "device-device-device": 2 }, updatedAt: "2026-10-24T00:00:00.000Z", deviceId: "other-device-device" });
  assert.equal(mergeEnvelope(local, remote).reason, "remote");
  const left = envelope({ id: "bag:1", vector: { "device-device-aaaa": 1 }, updatedAt: "2026-10-24T03:00:00.000Z", deviceId: "device-device-aaaa" });
  const right = envelope({ id: "bag:1", vector: { "device-device-bbbb": 1 }, updatedAt: "2026-10-24T02:00:00.000Z", deviceId: "device-device-bbbb" });
  const conflict = mergeEnvelope(left, right);
  assert.equal(conflict.conflict, true);
  assert.equal(conflict.reason, "lww-local");
  assert.equal(decidePush(right, left), "replace");
});

test("a higher key generation replaces older ciphertext", () => {
  const old = envelope({ id: "profile", vector: { "device-device-device": 9 }, updatedAt: "2026-10-24T09:00:00.000Z", deviceId: "device-device-device", generation: 1 });
  const next = envelope({ id: "profile", vector: {}, updatedAt: "2026-10-24T01:00:00.000Z", deviceId: "device-device-device", generation: 2 });
  assert.equal(mergeEnvelope(old, next).winner, next);
});

test("removing a member rotates the generation and account deletion drops a sole circle", async () => {
  const store = memoryStore();
  const now = "2026-10-24T00:00:00.000Z";
  await store.upsertUser("owner-sub", "家屬", now);
  await store.upsertUser("care-sub", "看護", now);
  const created = await store.createCircle({ circleId: "circle-circle-circle", ownerSub: "owner-sub", ownerName: "家屬", memberId: "member-owner-owner1", now });
  assert.equal("error" in created, false);
  await store.join({ circleId: "circle-circle-circle", sub: "care-sub", name: "看護", memberId: "member-care-care12", role: "caregiver", now });
  const cipher = await encryptPayload(await generateCircleKey(), { v: 1, lang: "zh" });
  const pushed = await store.push({
    sub: "owner-sub",
    generation: 1,
    records: [
      {
        id: "profile",
        vector: { "device-device-device": 1 },
        updatedAt: now,
        deviceId: "device-device-device",
        generation: 1,
        cipher,
        size: cipher.length,
      },
    ],
  });
  assert.equal("ok" in pushed, true);
  const removed = await store.removeMember({ actorSub: "owner-sub", memberId: "member-care-care12", now });
  assert.equal("generation" in removed && removed.generation, 2);
  const pulled = await store.pull("owner-sub", null);
  assert.equal("records" in pulled && pulled.records.length, 0);
  await store.deleteAccount("owner-sub");
  assert.equal(await store.membership("owner-sub"), null);
  const again = memoryStore();
  await again.createCircle({ circleId: "circle-circle-circle", ownerSub: "owner-sub", ownerName: "家屬", memberId: "member-owner-owner1", now });
  await again.join({ circleId: "circle-circle-circle", sub: "care-sub", name: "看護", memberId: "member-care-care12", role: "family", now });
  await again.deleteAccount("owner-sub");
  const left = await again.membership("care-sub");
  assert.equal(left?.role, "owner");
});

test("a plaintext photo is refused and the invite keeps the key in the fragment", () => {
  assert.equal(parseEnvelope({ id: "bag:x", vector: { "device-device-device": 1 }, updatedAt: "2026-10-24T00:00:00.000Z", deviceId: "device-device-device", cipher: "data:image/jpeg;base64,AAAA" }, 1), null);
  const link = parseCircleFragment("#c=circle-circle-circle&k=abcdefghijklmnopqrstuvwxyz012345&g=1");
  assert.equal(link?.key, "abcdefghijklmnopqrstuvwxyz012345");
  const source = readFileSync(new URL("../app/api/extract/route.ts", import.meta.url), "utf8");
  assert.equal(/console\./.test(source), false);
});

test("the LINE callback keeps sub and name and drops email", async () => {
  const result = await finishLineLogin({
    expectedState: "state-state-state",
    expectedNonce: "nonce-nonce-nonce",
    state: "state-state-state",
    code: "code-from-line",
    exchange: async () => ({ idToken: "header.payload.sig" }),
    verify: async () => ({ sub: "Uabc", name: "阿花", email: "a@example.com", nonce: "nonce-nonce-nonce" }),
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.profile.sub, "Uabc");
    assert.equal(result.profile.name, "阿花");
    assert.equal(JSON.stringify(result.profile).includes("example.com"), false);
  }
  const mismatch = await finishLineLogin({
    expectedState: "state-state-state",
    expectedNonce: "nonce-nonce-nonce",
    state: "other",
    code: "code-from-line",
    exchange: async () => {
      throw new Error("should not call LINE");
    },
    verify: async () => ({ sub: "Uabc", nonce: "nonce-nonce-nonce" }),
  });
  assert.deepEqual(mismatch, { ok: false, error: "state" });
});

test("the auth callback redirects when state does not match", async () => {
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret";
  const txn = await sealJson({ state: "state-state-state", nonce: "nonce-nonce-nonce", verifier: "verifier-verifier", exp: Date.now() + 60_000 }, process.env.SESSION_SECRET);
  const { GET } = await import("../app/api/auth/line/callback/route.ts");
  const response = await GET(new Request("https://yaosheng.example/api/auth/line/callback?state=nope&code=abc", { headers: { cookie: `yaosheng-oauth=${encodeURIComponent(txn)}` } }));
  assert.equal(response.status, 307);
  assert.match(response.headers.get("location") || "", /auth=state/);
  const session = await sealSession({ sub: "Uabc", name: "阿花", exp: Date.now() + 1000 }, process.env.SESSION_SECRET);
  assert.equal((await openSession(session, process.env.SESSION_SECRET))?.name, "阿花");
  assert.equal(await openSession(session, "other-secret-other-secret-other"), null);
});
