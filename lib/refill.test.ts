import assert from "node:assert/strict";
import test from "node:test";
import { addDays, chronicWindow, refillForDrug, remindLevel } from "./refill";
import type { Bag, DoseLog, Drug } from "./types";

function drug(slots: Drug["slots"]): Drug {
  return {
    id: "d1",
    nameZh: "脈優",
    ingredient: "Amlodipine",
    doseZh: "5mg",
    quantityZh: "",
    usageZh: "早餐後",
    indicationZh: "",
    warningsZh: [],
    slots,
    i18n: {},
  };
}

function pack(partial: Partial<Bag> = {}): Bag {
  return {
    id: "b1",
    source: "manual",
    hospitalZh: "臺大醫院",
    hospitalShort: "臺大",
    pharmacyZh: "",
    patientZh: "林秀英",
    dispensingDate: "2026-01-01",
    dispensingLabel: "2026-01-01",
    theme: "#1b5e45",
    days: 28,
    createdAt: "2026-01-01T00:00:00.000Z",
    drugs: [drug(["morning_after"])],
    ...partial,
  };
}

function taken(dates: string[]): DoseLog[] {
  return dates.map((date) => ({
    drugId: "d1",
    date,
    slot: "morning_after" as const,
    status: "given" as const,
    at: `${date}T08:00:00.000Z`,
  }));
}

function rowFor(item: Bag, logs: DoseLog[], today: string) {
  const drugItem = item.drugs[0];
  if (!drugItem) throw new Error("missing drug");
  return refillForDrug(item, drugItem, logs, today);
}

test("a full unused supply has no reminder", () => {
  const row = rowFor(pack(), [], "2026-01-01");
  assert.ok(row);
  assert.equal(row.suppliedDoses, 28);
  assert.equal(row.taken, 0);
  assert.equal(row.daysLeft, 28);
  assert.equal(row.level, null);
  assert.equal(row.runOut, "2026-01-29");
});

test("seven days of supply left is the first reminder", () => {
  const dates = Array.from({ length: 21 }, (_, index) => addDays("2026-01-01", index));
  const row = rowFor(pack(), taken(dates), "2026-01-22");
  assert.ok(row);
  assert.equal(row.taken, 21);
  assert.equal(row.remainingDoses, 7);
  assert.equal(row.daysLeft, 7);
  assert.equal(remindLevel(row.daysLeft), 7);
  assert.equal(row.runOut, "2026-01-29");
});

test("three days left is the second reminder", () => {
  const dates = Array.from({ length: 25 }, (_, index) => addDays("2026-01-01", index));
  const row = rowFor(pack(), taken(dates), "2026-01-26");
  assert.ok(row);
  assert.equal(row.daysLeft, 3);
  assert.equal(row.level, 3);
});

test("skipped doses leave more recorded supply", () => {
  const dates = Array.from({ length: 10 }, (_, index) => addDays("2026-01-01", index));
  const row = rowFor(pack(), taken(dates), "2026-01-22");
  assert.ok(row);
  assert.equal(row.taken, 10);
  assert.equal(row.daysLeft, 18);
  assert.equal(row.level, null);
});

test("two doses a day divide the remaining tablets", () => {
  const row = rowFor(
    pack({ drugs: [drug(["morning_after", "evening_after"])], days: 10 }),
    taken(["2026-01-01", "2026-01-01"]),
    "2026-01-02",
  );
  assert.ok(row);
  assert.equal(row.dosesPerDay, 2);
  assert.equal(row.suppliedDoses, 20);
  assert.equal(row.taken, 2);
  assert.equal(row.daysLeft, 9);
});

test("a chronic script lists the next pickup window from the printed dates", () => {
  assert.deepEqual(chronicWindow("2026-01-01", 30, 1), {
    which: 2,
    windowStart: "2026-01-21",
    windowEnd: "2026-01-30",
  });
  assert.equal(chronicWindow("2026-01-01", 30, 2)?.which, 3);
  assert.equal(chronicWindow("2026-01-01", 30, 3), null);
  const marked = rowFor(pack({ days: 30, chronic: true, chronicFill: 1 }), [], "2026-01-01");
  assert.equal(marked?.nextFill?.which, 2);
  const unlabeled = rowFor(pack({ days: 30, chronic: true }), [], "2026-01-01");
  assert.equal(unlabeled?.nextFill, null);
  const plain = rowFor(pack({ days: 30, chronicFill: 1 }), [], "2026-01-01");
  assert.equal(plain?.nextFill, null);
});

test("a bag without a day count is not a refill row", () => {
  assert.equal(rowFor(pack({ days: null }), [], "2026-01-01"), null);
});
