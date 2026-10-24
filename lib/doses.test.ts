import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_DATA } from "./backup";
import { slotsFromSchedule } from "./bag-draft";
import { adherence, admitBag, applyDose, buildTimeline, dueItems } from "./doses";
import { drugText } from "./format";
import type { Bag, Drug } from "./types";

function drug(partial: Partial<Drug> & Pick<Drug, "id" | "nameZh" | "slots">): Drug {
  return {
    ingredient: "",
    doseZh: "",
    quantityZh: "",
    usageZh: "",
    indicationZh: "",
    warningsZh: [],
    i18n: {},
    ...partial,
  };
}

function bag(partial: Partial<Bag> & Pick<Bag, "id" | "drugs">): Bag {
  return {
    source: "manual",
    hospitalZh: "醫院",
    hospitalShort: "醫院",
    pharmacyZh: "",
    patientZh: "林秀英",
    dispensingDate: null,
    dispensingLabel: "",
    theme: "#1b5e45",
    createdAt: "2026-10-01T00:00:00.000Z",
    ...partial,
  };
}

test("a typed bag schedules only the chosen times", () => {
  const slots = slotsFromSchedule(["morning", "evening"], "after");
  assert.deepEqual(slots, ["morning_after", "evening_after"]);
  const items = buildTimeline(
    [
      bag({
        id: "real-1",
        drugs: [drug({ id: "d1", nameZh: "脈優", ingredient: "Amlodipine", slots })],
      }),
    ],
    [],
    "2026-10-24",
  );
  assert.deepEqual(
    items.map((item) => item.slot),
    ["morning_after", "evening_after"],
  );
});

test("a course with a start date and day count drops off the schedule", () => {
  const meds = bag({
    id: "course",
    dispensingDate: "2026-10-01",
    days: 3,
    drugs: [drug({ id: "d1", nameZh: "格華止", slots: ["morning_after"] })],
  });
  assert.equal(buildTimeline([meds], [], "2026-10-01").length, 1);
  assert.equal(buildTimeline([meds], [], "2026-10-03").length, 1);
  assert.equal(buildTimeline([meds], [], "2026-10-04").length, 0);
});

test("marking a dose taken then skipped keeps one log", () => {
  const base = {
    ...EMPTY_DATA,
    onboarded: true,
    bags: [bag({ id: "b", drugs: [drug({ id: "d1", nameZh: "藥", slots: ["morning"] })] })],
  };
  const given = applyDose(base, {
    drugId: "d1",
    slot: "morning",
    status: "given",
    date: "2026-10-24",
    at: "2026-10-24T08:00:00.000Z",
    reportId: "r1",
  });
  const missed = applyDose(given, {
    drugId: "d1",
    slot: "morning",
    status: "missed",
    date: "2026-10-24",
    at: "2026-10-24T09:00:00.000Z",
    reportId: "r2",
  });
  assert.equal(missed.logs.length, 1);
  assert.equal(missed.logs[0]?.status, "missed");
  assert.equal(missed.reports.length, 1);
  assert.equal(missed.reports[0]?.kind, "missed");
  const summary = adherence(missed.bags, missed.logs, "2026-10-24");
  assert.deepEqual(summary, { given: 0, missed: 1, pending: 0, total: 1 });
});

test("a due reminder is listed once until it is marked sent", () => {
  const items = buildTimeline(
    [bag({ id: "b", drugs: [drug({ id: "d1", nameZh: "藥", slots: ["morning_after"] })] })],
    [],
    "2026-10-24",
  );
  const early = dueItems(items, "2026-10-24", new Date(2026, 9, 24, 7, 0), []);
  assert.equal(early.length, 0);
  const due = dueItems(items, "2026-10-24", new Date(2026, 9, 24, 8, 5), []);
  assert.equal(due.length, 1);
  const again = dueItems(items, "2026-10-24", new Date(2026, 9, 24, 8, 5), [
    { drugId: "d1", date: "2026-10-24", slot: "morning_after" },
  ]);
  assert.equal(again.length, 0);
});

test("demo bags are refused while real bags are stored", () => {
  const real = bag({ id: "real", source: "manual", drugs: [drug({ id: "d1", nameZh: "藥", slots: ["morning"] })] });
  const demo = bag({ id: "demo", source: "demo", drugs: [drug({ id: "d2", nameZh: "範例", slots: ["morning"] })] });
  assert.equal(admitBag([real], "demo"), "mixed");
  assert.equal(admitBag([demo], "photo"), "mixed");
  assert.equal(admitBag([real], "photo"), "ok");
  assert.equal(admitBag([], "demo"), "ok");
});

test("the same ingredient on two real bags is flagged", async () => {
  const { duplicateDrugIds } = await import("./duplicates");
  const bags = [
    bag({
      id: "h1",
      drugs: [drug({ id: "a", nameZh: "脈優", ingredient: "Amlodipine besylate", slots: ["morning_after"] })],
    }),
    bag({
      id: "h2",
      hospitalZh: "藥局",
      drugs: [drug({ id: "b", nameZh: "安脈優", ingredient: "Amlodipine", slots: ["morning_after"] })],
    }),
  ];
  const ids = duplicateDrugIds(bags);
  assert.equal(ids.has("a"), true);
  assert.equal(ids.has("b"), true);
});

test("Indonesian still reads a drug that has no translation object", () => {
  const bare = drug({ id: "bare", nameZh: "脈優", slots: ["morning_after"] });
  delete (bare as { i18n?: Drug["i18n"] }).i18n;
  const items = buildTimeline([bag({ id: "h", drugs: [bare] })], [], "2026-10-24");
  assert.equal(items.length, 1);
  assert.equal(drugText(bare, "id").name, "脈優");
});
