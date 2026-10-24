import assert from "node:assert/strict";
import test from "node:test";
import { scrubErrorText } from "./scrub";

test("error text drops query strings, mail, and local cabinet dumps", () => {
  const cleaned = scrubErrorText("failed https://yaosheng.example/today?name=林秀英 user@example.com 0912345678 yaosheng.v1 {\"bags\":[]}");
  assert.equal(cleaned.includes("林秀英"), false);
  assert.equal(cleaned.includes("user@"), false);
  assert.equal(cleaned.includes("0912"), false);
  assert.equal(cleaned.includes("bags"), false);
  assert.match(cleaned, /https:\/\/yaosheng\.example\/today/);
});
