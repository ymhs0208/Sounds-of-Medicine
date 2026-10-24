import { buildTimeline } from "./doses";
import { duplicateDrugIds } from "./duplicates";
import { addDays, refillForDrug } from "./refill";
import { SLOT_TIME, isSlot } from "./slots";
import type { AppData } from "./types";

export type PlanDose = { id: string; date: string; time: string; slot: string; drugId?: string; name?: string };
export type PlanRefill = { id: string; kind: "supply" | "chronic" | "visit"; due: string; name?: string };
export type PlanAlert = { id: string; kind: "fall" | "duplicate"; name?: string };

export type LinePlan = {
  doses: PlanDose[];
  refills: PlanRefill[];
  alerts: PlanAlert[];
  supplyDays: number | null;
  observationCount: number;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function clip(value: string): string {
  return value.replace(/[\r\n\t]/g, " ").trim().slice(0, 80);
}

/** Builds the upload. Names are included only when the family owner has opted in. */
export function buildLinePlan(data: AppData, today: string, detail: boolean, visitDate?: string | null): LinePlan {
  const doses: PlanDose[] = [];
  for (const date of [today, addDays(today, 1)]) {
    for (const item of buildTimeline(data.bags, data.logs, date)) {
      if (item.bag.source === "demo") continue;
      const row: PlanDose = {
        id: `d:${date}:${item.slot}:${item.drug.id}`.slice(0, 96),
        date,
        time: SLOT_TIME[item.slot],
        slot: item.slot,
      };
      if (detail) {
        row.drugId = item.drug.id;
        row.name = clip(item.drug.nameZh);
      }
      doses.push(row);
    }
  }
  const refills: PlanRefill[] = [];
  let supplyDays: number | null = null;
  for (const bag of data.bags) {
    if (bag.source === "demo") continue;
    for (const drug of bag.drugs) {
      const info = refillForDrug(bag, drug, data.logs, today);
      if (!info) continue;
      supplyDays = supplyDays === null ? info.daysLeft : Math.min(supplyDays, info.daysLeft);
      if (info.daysLeft > 0) {
        refills.push({
          id: `s:${drug.id}:${info.runOut}`.slice(0, 96),
          kind: "supply",
          due: info.runOut,
          ...(detail ? { name: clip(drug.nameZh) } : {}),
        });
      }
      if (info.nextFill) {
        refills.push({
          id: `c:${drug.id}:${info.nextFill.windowStart}`.slice(0, 96),
          kind: "chronic",
          due: info.nextFill.windowStart,
          ...(detail ? { name: clip(drug.nameZh) } : {}),
        });
      }
    }
  }
  if (visitDate && DATE.test(visitDate)) refills.push({ id: `v:${visitDate}`, kind: "visit", due: visitDate });
  const alerts: PlanAlert[] = [];
  for (const symptom of data.symptoms) {
    if (symptom.kind !== "fall" || symptom.date < addDays(today, -2)) continue;
    alerts.push({ id: `f:${symptom.id}`.slice(0, 96), kind: "fall", ...(detail && symptom.noteZh ? { name: clip(symptom.noteZh) } : {}) });
  }
  if (duplicateDrugIds(data.bags.filter((bag) => bag.source !== "demo")).size) alerts.push({ id: "dup:open", kind: "duplicate" });
  const observationCount =
    data.reports.filter((report) => report.kind === "observation" && report.date === today).length +
    data.symptoms.filter((symptom) => symptom.date === today).length;
  return {
    doses: doses.slice(0, 200),
    refills: refills.slice(0, 80),
    alerts: alerts.slice(0, 40),
    supplyDays,
    observationCount,
  };
}

export function validPlanDose(raw: unknown): PlanDose | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<PlanDose>;
  if (typeof value.id !== "string" || !/^[A-Za-z0-9_:-]{4,96}$/.test(value.id)) return null;
  if (typeof value.date !== "string" || !DATE.test(value.date)) return null;
  if (typeof value.slot !== "string" || !isSlot(value.slot)) return null;
  if (typeof value.time !== "string" || value.time !== SLOT_TIME[value.slot]) return null;
  const dose: PlanDose = { id: value.id, date: value.date, time: value.time, slot: value.slot };
  if (typeof value.drugId === "string" && /^[A-Za-z0-9_:-]{4,80}$/.test(value.drugId)) dose.drugId = value.drugId;
  if (typeof value.name === "string" && value.name.trim()) dose.name = clip(value.name);
  return dose;
}

export function validPlanRefill(raw: unknown): PlanRefill | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<PlanRefill>;
  if (typeof value.id !== "string" || !/^[A-Za-z0-9_:-]{4,96}$/.test(value.id)) return null;
  if (value.kind !== "supply" && value.kind !== "chronic" && value.kind !== "visit") return null;
  if (typeof value.due !== "string" || !DATE.test(value.due)) return null;
  const row: PlanRefill = { id: value.id, kind: value.kind, due: value.due };
  if (typeof value.name === "string" && value.name.trim()) row.name = clip(value.name);
  return row;
}

export function validPlanAlert(raw: unknown): PlanAlert | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<PlanAlert>;
  if (typeof value.id !== "string" || !/^[A-Za-z0-9_:-]{4,96}$/.test(value.id)) return null;
  if (value.kind !== "fall" && value.kind !== "duplicate") return null;
  const row: PlanAlert = { id: value.id, kind: value.kind };
  if (typeof value.name === "string" && value.name.trim()) row.name = clip(value.name);
  return row;
}
