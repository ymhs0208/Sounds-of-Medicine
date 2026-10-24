import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("deploy config leaves optional bindings commented and keeps the cron worker", () => {
  const text = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const code = text
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
  assert.equal(code.includes("kv_namespaces"), false);
  assert.equal(code.includes("d1_databases"), false);
  assert.equal(code.includes("ratelimits"), false);
  assert.match(code, /cloudflare\/worker\.ts/);
  assert.match(code, /"crons": \["\*\/15 \* \* \* \*"\]/);
  assert.match(code, /sounds-of-medicine/);
});
