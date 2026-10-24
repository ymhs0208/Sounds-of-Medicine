import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PHRASES } from "./phrases";

test("precached phrase cards match the in-app sentences", () => {
  const file = JSON.parse(readFileSync(new URL("../public/phrases.json", import.meta.url), "utf8")) as typeof PHRASES;
  assert.deepEqual(file, PHRASES);
});
