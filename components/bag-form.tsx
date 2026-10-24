"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DAY_PARTS, scheduleFromSlots, slotsFromSchedule, type DayPart, type MealChoice } from "@/lib/bag-draft";
import { uid } from "@/lib/id";
import { slotLabel, ui } from "@/lib/i18n";
import type { Bag, Drug, Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

type DrugDraft = {
  id: string;
  nameZh: string;
  ingredient: string;
  doseZh: string;
  quantityZh: string;
  frequencyZh: string;
  usageZh: string;
  indicationZh: string;
  warnings: string;
  times: DayPart[];
  meal: MealChoice;
  trName: string;
  trDose: string;
  trUsage: string;
  trWarnings: string;
};

const inputClass = "mt-1 w-full rounded-2xl border border-border bg-background px-3 py-3 text-base";

function blankDrug(): DrugDraft {
  return {
    id: uid(),
    nameZh: "",
    ingredient: "",
    doseZh: "",
    quantityZh: "",
    frequencyZh: "",
    usageZh: "",
    indicationZh: "",
    warnings: "",
    times: [],
    meal: "after",
    trName: "",
    trDose: "",
    trUsage: "",
    trWarnings: "",
  };
}

function fromDrug(drug: Drug, lang: Lang): DrugDraft {
  const schedule = scheduleFromSlots(drug.slots);
  const text = lang === "zh" ? undefined : drug.i18n[lang];
  return {
    id: drug.id,
    nameZh: drug.nameZh,
    ingredient: drug.ingredient,
    doseZh: drug.doseZh,
    quantityZh: drug.quantityZh,
    frequencyZh: drug.frequencyZh ?? "",
    usageZh: drug.usageZh,
    indicationZh: drug.indicationZh,
    warnings: drug.warningsZh.join("\n"),
    times: schedule.times,
    meal: schedule.meal,
    trName: text?.name ?? "",
    trDose: text?.dose ?? "",
    trUsage: text?.usage ?? "",
    trWarnings: text?.warnings.join("\n") ?? "",
  };
}

function lines(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function BagForm({
  initial,
  lang,
  patientDefault,
  requireConfirm,
  submitLabel,
  onSubmit,
}: {
  initial: Bag | null;
  lang: Lang;
  patientDefault: string;
  requireConfirm: boolean;
  submitLabel: string;
  onSubmit: (bag: Bag) => void;
}) {
  const t = ui[lang];
  const [patientZh, setPatientZh] = useState(initial?.patientZh || patientDefault);
  const [hospitalZh, setHospitalZh] = useState(initial?.hospitalZh ?? "");
  const [pharmacyZh, setPharmacyZh] = useState(initial?.pharmacyZh ?? "");
  const [dispensingDate, setDispensingDate] = useState(initial?.dispensingDate ?? "");
  const [days, setDays] = useState(initial?.days ? String(initial.days) : "");
  const [drugs, setDrugs] = useState<DrugDraft[]>(
    initial?.drugs.length ? initial.drugs.map((drug) => fromDrug(drug, lang)) : [blankDrug()],
  );
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const generated = useMemo(
    () =>
      drugs.map((drug) => {
        const slots = slotsFromSchedule(drug.times, drug.meal);
        const when = slots.map((slot) => slotLabel.zh[slot]).join("、");
        return [drug.frequencyZh.trim(), when].filter(Boolean).join("，");
      }),
    [drugs],
  );

  function patch(index: number, next: Partial<DrugDraft>) {
    setDrugs((current) => current.map((drug, i) => (i === index ? { ...drug, ...next } : drug)));
  }

  function toggleTime(index: number, part: DayPart) {
    const drug = drugs[index];
    const times = drug.times.includes(part) ? drug.times.filter((item) => item !== part) : [...drug.times, part];
    patch(index, { times });
  }

  function save() {
    const named = drugs.filter((drug) => drug.nameZh.trim());
    if (!named.length) {
      setError(t.needDrugName);
      return;
    }
    if (named.some((drug) => drug.times.length === 0)) {
      setError(t.needTime);
      return;
    }
    if (requireConfirm && !confirmed) {
      setError(t.confirmRead);
      return;
    }
    const parsedDays = Number(days);
    const bag: Bag = {
      id: initial?.id ?? uid(),
      source: initial?.source ?? "manual",
      demoKey: initial?.demoKey,
      hospitalZh: hospitalZh.trim(),
      hospitalShort: hospitalZh.trim().slice(0, 8) || "藥袋",
      pharmacyZh: pharmacyZh.trim(),
      patientZh: patientZh.trim(),
      dispensingDate: dispensingDate || null,
      dispensingLabel: dispensingDate,
      days: Number.isFinite(parsedDays) && parsedDays > 0 ? Math.round(parsedDays) : null,
      theme: initial?.theme ?? "#1b5e45",
      photoDataUrl: initial?.photoDataUrl,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      drugs: named.map((drug) => {
        const slots = slotsFromSchedule(drug.times, drug.meal);
        const usageZh = drug.usageZh.trim() || generated[drugs.indexOf(drug)] || "";
        const warningsZh = lines(drug.warnings);
        const built: Drug = {
          id: drug.id,
          nameZh: drug.nameZh.trim(),
          ingredient: drug.ingredient.trim(),
          doseZh: drug.doseZh.trim(),
          quantityZh: drug.quantityZh.trim(),
          usageZh,
          indicationZh: drug.indicationZh.trim(),
          warningsZh,
          slots,
          frequencyZh: drug.frequencyZh.trim(),
          i18n: initial?.drugs.find((item) => item.id === drug.id)?.i18n ?? {},
        };
        if (lang !== "zh") {
          const trWarnings = lines(drug.trWarnings);
          built.i18n = {
            ...built.i18n,
            [lang]: {
              name: drug.trName.trim() || built.nameZh,
              dose: drug.trDose.trim() || built.doseZh,
              quantity: built.quantityZh,
              usage: drug.trUsage.trim() || usageZh,
              indication: built.indicationZh,
              warnings: trWarnings.length ? trWarnings : warningsZh,
            },
          };
        }
        return built;
      }),
    };
    onSubmit(bag);
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-3xl bg-card p-4 ring-1 ring-border">
        <label className="block text-sm font-semibold text-pine">
          {t.fieldPatient}
          <input className={inputClass} value={patientZh} onChange={(event) => setPatientZh(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-pine">
          {t.fieldHospital}
          <input className={inputClass} value={hospitalZh} onChange={(event) => setHospitalZh(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold text-pine">
          {t.fieldPharmacy}
          <input className={inputClass} value={pharmacyZh} onChange={(event) => setPharmacyZh(event.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm font-semibold text-pine">
            {t.fieldDate}
            <input className={inputClass} type="date" value={dispensingDate} onChange={(event) => setDispensingDate(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold text-pine">
            {t.fieldDays}
            <input className={inputClass} inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} />
          </label>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{t.daysOptional}</p>
      </section>
      {drugs.map((drug, index) => (
        <section key={drug.id} className="space-y-3 rounded-3xl bg-card p-4 ring-1 ring-border">
          <label className="block text-sm font-semibold text-pine">
            {t.fieldDrug}
            <input className={inputClass} value={drug.nameZh} onChange={(event) => patch(index, { nameZh: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-pine">
            {t.fieldIngredient}
            <input className={inputClass} value={drug.ingredient} onChange={(event) => patch(index, { ingredient: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-pine">
            {t.fieldDose}
            <input className={inputClass} value={drug.doseZh} onChange={(event) => patch(index, { doseZh: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-pine">
            {t.fieldQuantity}
            <input className={inputClass} value={drug.quantityZh} onChange={(event) => patch(index, { quantityZh: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-pine">
            {t.fieldFrequency}
            <input
              className={inputClass}
              value={drug.frequencyZh}
              placeholder="每日一次"
              onChange={(event) => patch(index, { frequencyZh: event.target.value })}
            />
          </label>
          <div>
            <p className="text-sm font-semibold text-pine">{t.fieldTimes}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DAY_PARTS.map((part) => {
                const label = part === "morning" ? t.partMorning : part === "noon" ? t.partNoon : part === "evening" ? t.partEvening : t.partBed;
                const on = drug.times.includes(part);
                return (
                  <button
                    key={part}
                    type="button"
                    className={cn("h-12 rounded-2xl border text-base font-semibold", on ? "border-pine bg-accent" : "border-border")}
                    onClick={() => toggleTime(index, part)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-pine">{t.fieldMealTiming}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  ["before", t.beforeMeal],
                  ["after", t.afterMeal],
                  ["none", t.mealWithout],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "h-12 rounded-2xl border px-1 text-sm font-semibold",
                    drug.meal === value ? "border-pine bg-accent" : "border-border",
                  )}
                  onClick={() => patch(index, { meal: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm font-semibold text-pine">
            {t.fieldUsage}
            <textarea className={inputClass} rows={2} value={drug.usageZh} onChange={(event) => patch(index, { usageZh: event.target.value })} />
          </label>
          <p className="text-sm text-muted-foreground">{generated[index]}</p>
          <label className="block text-sm font-semibold text-pine">
            {t.fieldIndication}
            <input className={inputClass} value={drug.indicationZh} onChange={(event) => patch(index, { indicationZh: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-pine">
            {t.fieldWarnings}
            <textarea className={inputClass} rows={3} value={drug.warnings} onChange={(event) => patch(index, { warnings: event.target.value })} />
          </label>
          {lang !== "zh" ? (
            <div className="space-y-2 rounded-2xl bg-secondary p-3">
              <p className="text-sm font-semibold text-pine">{t.yourLanguage}</p>
              <input className={inputClass} placeholder={t.fieldDrug} value={drug.trName} onChange={(event) => patch(index, { trName: event.target.value })} />
              <input className={inputClass} placeholder={t.fieldDose} value={drug.trDose} onChange={(event) => patch(index, { trDose: event.target.value })} />
              <textarea className={inputClass} rows={2} placeholder={t.fieldUsage} value={drug.trUsage} onChange={(event) => patch(index, { trUsage: event.target.value })} />
              <textarea className={inputClass} rows={2} placeholder={t.fieldWarnings} value={drug.trWarnings} onChange={(event) => patch(index, { trWarnings: event.target.value })} />
            </div>
          ) : null}
          {drugs.length > 1 ? (
            <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => setDrugs((current) => current.filter((_, i) => i !== index))}>
              {t.removeDrug}
            </Button>
          ) : null}
        </section>
      ))}
      <Button type="button" variant="outline" className="h-12 w-full rounded-2xl" onClick={() => setDrugs((current) => [...current, blankDrug()])}>
        {t.addDrug}
      </Button>
      {requireConfirm ? (
        <label className="flex gap-3 rounded-3xl bg-card p-4 ring-1 ring-border">
          <Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(Boolean(checked))} className="mt-1 size-6" aria-label={t.confirmRead} />
          <span>
            <span className="block text-base font-semibold">{t.confirmRead}</span>
            <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{t.confirmReadHint}</span>
          </span>
        </label>
      ) : null}
      {error ? <p className="text-sm font-semibold text-rose">{error}</p> : null}
      <Button type="button" className="h-14 w-full rounded-2xl text-lg" onClick={save}>
        {submitLabel}
      </Button>
    </div>
  );
}
