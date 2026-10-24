import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_DATA } from "./backup";
import { buildVisitSummary } from "./summary";
import type { AppData, Bag, Drug } from "./types";

function drug(partial: Partial<Drug> & Pick<Drug, "id" | "nameZh" | "ingredient">): Drug {
  return {
    doseZh: "5mg",
    quantityZh: "",
    usageZh: "早餐後",
    indicationZh: "",
    warningsZh: [],
    slots: ["morning_after"],
    i18n: {},
    ...partial,
  };
}

function bag(partial: Partial<Bag> & Pick<Bag, "id" | "hospitalZh" | "drugs">): Bag {
  return {
    source: "manual",
    hospitalShort: partial.hospitalZh.slice(0, 4),
    pharmacyZh: "",
    patientZh: "林秀英",
    dispensingDate: "2026-10-20",
    dispensingLabel: "2026-10-20",
    theme: "#1b5e45",
    days: 28,
    createdAt: "2026-10-20T00:00:00.000Z",
    ...partial,
  };
}

test("the visit summary is recorded data and duplicate flags, with no advice field", () => {
  const data: AppData = {
    ...EMPTY_DATA,
    onboarded: true,
    patientName: "林秀英",
    familyContact: "女兒 0912",
    allergies: "penicillin",
    allergiesZh: "盤尼西林",
    bags: [
      bag({
        id: "a",
        hospitalZh: "臺大醫院",
        drugs: [drug({ id: "d1", nameZh: "脈優", ingredient: "Amlodipine" })],
      }),
      bag({
        id: "b",
        hospitalZh: "國泰醫院",
        drugs: [drug({ id: "d2", nameZh: "脈優", ingredient: "Amlodipine besylate" })],
      }),
    ],
    logs: [
      { drugId: "d1", date: "2026-10-24", slot: "morning_after", status: "missed", at: "2026-10-24T01:00:00.000Z" },
      { drugId: "d2", date: "2026-10-24", slot: "morning_after", status: "given", at: "2026-10-24T01:00:00.000Z" },
    ],
    symptoms: [
      {
        id: "s1",
        at: "2026-10-24T02:00:00.000Z",
        date: "2026-10-24",
        kind: "vomit",
        note: "今天吐了",
        noteZh: "今天吐了",
      },
    ],
  };
  const summary = buildVisitSummary(data, "2026-10-24", 1);
  assert.equal(summary.patientName, "林秀英");
  assert.equal(summary.meds.length, 2);
  assert.equal(summary.meds[0]?.hospitalZh, "臺大醫院");
  assert.equal(summary.duplicates.length, 1);
  assert.equal(summary.duplicates[0]?.ingredient.toLowerCase().includes("amlodipine"), true);
  assert.equal(summary.missed.length, 1);
  assert.equal(summary.missed[0]?.nameZh, "脈優");
  assert.equal(summary.symptoms.length, 1);
  assert.equal(summary.symptoms[0]?.noteZh, "今天吐了");
  assert.equal(summary.adherence.given, 1);
  assert.equal(summary.adherence.missed, 1);
  assert.equal(summary.adherence.total, 2);
  assert.equal(summary.adherence.percent, 50);
  assert.equal(summary.allergiesZh, "盤尼西林");
  assert.equal("recommendation" in summary, false);
  assert.equal("advice" in summary, false);
});
