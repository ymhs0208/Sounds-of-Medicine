import { adherence } from "./doses";
import { duplicateGroups, type DuplicateGroup } from "./duplicates";
import { addDays, refillForDrug, type RefillInfo } from "./refill";
import { bagActiveOn } from "./bag-draft";
import type { AppData, DoseLog, SymptomLog } from "./types";

export type SummaryMed = {
  drugId: string;
  nameZh: string;
  doseZh: string;
  usageZh: string;
  hospitalZh: string;
  ingredient: string;
  refill: RefillInfo | null;
};

export type VisitSummary = {
  day: string;
  patientName: string;
  familyContact: string;
  allergies: string;
  allergiesZh: string;
  meds: SummaryMed[];
  adherence: {
    given: number;
    missed: number;
    pending: number;
    total: number;
    percent: number | null;
    days: number;
  };
  missed: { date: string; drugId: string; nameZh: string; slot: string }[];
  symptoms: SymptomLog[];
  duplicates: DuplicateGroup[];
};

function drugName(data: AppData, drugId: string): string {
  for (const bag of data.bags) {
    const drug = bag.drugs.find((item) => item.id === drugId);
    if (drug) return drug.nameZh;
  }
  return drugId;
}

export function windowAdherence(data: Pick<AppData, "bags" | "logs">, endDay: string, days = 7) {
  let given = 0;
  let missed = 0;
  let pending = 0;
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const row = adherence(data.bags, data.logs, addDays(endDay, -offset));
    given += row.given;
    missed += row.missed;
    pending += row.pending;
  }
  const total = given + missed + pending;
  return {
    given,
    missed,
    pending,
    total,
    percent: total ? Math.round((given / total) * 100) : null,
    days,
  };
}

/** Facts from the cabinet and the logs. No recommendation field. */
export function buildVisitSummary(data: AppData, day: string, days = 7): VisitSummary {
  const start = addDays(day, -(days - 1));
  const current = data.bags.filter((bag) => bagActiveOn(bag, day));
  const meds: SummaryMed[] = current.flatMap((bag) =>
    bag.drugs.map((drug) => ({
      drugId: drug.id,
      nameZh: drug.nameZh,
      doseZh: drug.doseZh,
      usageZh: drug.usageZh,
      hospitalZh: bag.hospitalZh,
      ingredient: drug.ingredient,
      refill: refillForDrug(bag, drug, data.logs, day),
    })),
  );
  const missed = data.logs
    .filter((log): log is DoseLog => log.status === "missed" && log.date >= start && log.date <= day)
    .map((log) => ({ date: log.date, drugId: log.drugId, nameZh: drugName(data, log.drugId), slot: log.slot }));
  const symptoms = data.symptoms.filter((item) => item.date >= start && item.date <= day);
  return {
    day,
    patientName: data.patientName,
    familyContact: data.familyContact,
    allergies: data.allergies,
    allergiesZh: data.allergiesZh,
    meds,
    adherence: windowAdherence(data, day, days),
    missed,
    symptoms,
    duplicates: duplicateGroups(current),
  };
}
