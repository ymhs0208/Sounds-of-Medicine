import assert from "node:assert/strict";
import test from "node:test";
import { resetMemoryLimits, takeMemory } from "./rate-limit";
import { originAllowed } from "./api-guard";
import { checkImageDataUrl } from "./image-guard";
import { apiMessage } from "./api-messages";

test("the in-memory window blocks the next call after the limit", () => {
  resetMemoryLimits();
  assert.equal(takeMemory("extract:ip:a", 2, 60_000, 1_000).ok, true);
  assert.equal(takeMemory("extract:ip:a", 2, 60_000, 1_100).ok, true);
  const blocked = takeMemory("extract:ip:a", 2, 60_000, 1_200);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.ok(blocked.retryAfter > 0);
  assert.equal(takeMemory("extract:ip:b", 2, 60_000, 1_200).ok, true);
});

test("a paid request must come from the same host", () => {
  const allowed = new Request("https://yaosheng.example/api/extract", { headers: { origin: "https://yaosheng.example", host: "yaosheng.example" } });
  const blocked = new Request("https://yaosheng.example/api/extract", { headers: { origin: "https://evil.example", host: "yaosheng.example" } });
  const missing = new Request("https://yaosheng.example/api/extract", { headers: { host: "yaosheng.example" } });
  assert.equal(originAllowed(allowed), true);
  assert.equal(originAllowed(blocked), false);
  assert.equal(originAllowed(missing), false);
});

test("only jpeg png and webp data urls pass", () => {
  const jpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43]).toString("base64")}`;
  const png = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString("base64")}`;
  const text = `data:image/jpeg;base64,${Buffer.from("hello").toString("base64")}`;
  const gif = "data:image/gif;base64,R0lGODlh";
  assert.equal(checkImageDataUrl(jpeg).ok, true);
  assert.equal(checkImageDataUrl(png).ok, true);
  assert.equal(checkImageDataUrl(text).ok, false);
  assert.equal(checkImageDataUrl(gif).ok, false);
});

test("limit errors exist in every caregiver language", () => {
  for (const lang of ["zh", "id", "vi", "fil", "th", "en"] as const) {
    assert.ok(apiMessage(lang, "rate_limited").length > 4);
    assert.ok(apiMessage(lang, "too_large").length > 4);
  }
});
