import assert from "node:assert/strict";
import test from "node:test";
import { dueTimes, parsePushRecord, reminderSafe, scheduleTimes } from "./push-schedule";
import { reminderText } from "./web-push";
import { LANGS } from "./types";

test("a push schedule keeps clock times and drops anything else", () => {
  assert.deepEqual(scheduleTimes(["morning_after", "bedtime", "Amlodipine", "脈優"]), ["08:00", "21:30"]);
  const saved = JSON.stringify(scheduleTimes(["evening_after"]));
  assert.equal(saved.includes("Amlodipine"), false);
  assert.equal(saved.includes("脈優"), false);
});

test("a stored reminder is rejected when a field is not a clock time", () => {
  const bad = parsePushRecord({
    id: "device-device-device",
    endpoint: "https://push.example/sub",
    p256dh: "abc",
    auth: "def",
    lang: "id",
    times: ["08:00", "脈優 5mg"],
    sent: {},
  });
  assert.equal(bad, null);
});

test("reminder copy never names a medicine", () => {
  for (const lang of LANGS) {
    const text = `${reminderText(lang).title} ${reminderText(lang).body}`;
    assert.equal(/amlodipine|脈優|mg/i.test(text), false);
    assert.equal(reminderSafe(text), true);
  }
});

test("a due time is the twenty minutes after the clock in Taipei", () => {
  const record = parsePushRecord({
    id: "device-device-device",
    endpoint: "https://push.example/sub",
    p256dh: "abc",
    auth: "def",
    lang: "zh",
    times: ["08:00"],
    sent: {},
  });
  assert.ok(record);
  const atEight = new Date("2026-10-24T00:05:00.000Z");
  assert.deepEqual(dueTimes(record!, atEight), ["08:00"]);
  record!.sent["08:00"] = "2026-10-24";
  assert.deepEqual(dueTimes(record!, atEight), []);
});
