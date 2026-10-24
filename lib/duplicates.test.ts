import assert from "node:assert/strict";
import test from "node:test";
import { allDemoBags } from "./demo-data";
import { duplicateDrugIds, duplicateGroups, ingredientKey } from "./duplicates";
import { buildTimeline } from "./schedule";

test("ingredient key ignores salt names", () => {
  assert.equal(ingredientKey("Amlodipine besylate"), "amlodipine");
  assert.equal(ingredientKey("Amlodipine"), ingredientKey("amlodipine hydrochloride"));
});

test("demo bags flag the two amlodipine packs and leave the others", () => {
  const bags = allDemoBags();
  const groups = duplicateGroups(bags);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.key, "amlodipine");
  const ids = duplicateDrugIds(bags);
  assert.equal(ids.has("demo-cathay-1"), true);
  assert.equal(ids.has("demo-daan-1"), true);
  assert.equal(ids.has("demo-tpech-1"), false);
  assert.equal(ids.has("demo-femh-1"), false);
});

test("today's schedule follows the printed slots", () => {
  const items = buildTimeline(allDemoBags(), [], "2026-10-24");
  const slots = items.map((item) => `${item.drug.id}:${item.slot}`);
  assert.deepEqual(slots, [
    "demo-femh-1:morning",
    "demo-daan-1:morning_after",
    "demo-cathay-1:morning_after",
    "demo-tpech-1:morning_after",
    "demo-femh-1:evening",
    "demo-tpech-1:evening_after",
  ]);
});
