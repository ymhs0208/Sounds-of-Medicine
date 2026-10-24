import type { Bag, Drug, DrugText, Lang } from "./types";

export function drugText(drug: Drug, lang: Lang): DrugText {
  if (lang !== "zh") {
    const translated = drug.i18n?.[lang];
    if (translated) return translated;
  }
  return {
    name: drug.nameZh,
    dose: drug.doseZh,
    quantity: drug.quantityZh,
    usage: drug.usageZh,
    indication: drug.indicationZh,
    warnings: drug.warningsZh,
  };
}

export function hasTranslation(drug: Drug, lang: Lang): boolean {
  return lang === "zh" || Boolean(drug.i18n?.[lang]);
}

export function spokenScript(drug: Drug, lang: Lang): string {
  const text = drugText(drug, lang);
  const parts = [text.name, text.dose, text.usage, ...text.warnings]
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.join(lang === "zh" ? "。" : ". ");
}

export function findDrug(bags: Bag[], drugId: string): { bag: Bag; drug: Drug } | null {
  for (const bag of bags) {
    const drug = bag.drugs.find((item) => item.id === drugId);
    if (drug) return { bag, drug };
  }
  return null;
}

export function patientName(bags: Bag[], profile?: string): string {
  if (profile?.trim()) return profile.trim();
  return bags.find((bag) => bag.patientZh.trim())?.patientZh.trim() ?? "";
}

export function namesDiffer(bags: Bag[], nextName: string): boolean {
  const current = patientName(bags);
  if (!current || !nextName.trim()) return false;
  return current.replace(/\s/g, "") !== nextName.replace(/\s/g, "");
}

export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

const LOCALE: Record<Lang, string> = {
  zh: "zh-TW",
  id: "id-ID",
  vi: "vi-VN",
  fil: "fil-PH",
  th: "th-TH",
  en: "en-US",
};

export function formatLongDate(isoDate: string, lang: Lang): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Intl.DateTimeFormat(LOCALE[lang], {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(y, m - 1, d));
}

export function formatDateTime(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE[lang], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function rocLabel(iso: string | null, fallback: string): string {
  if (!iso) return fallback;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return fallback || iso;
  const year = Number(match[1]) - 1911;
  return `${year}年${Number(match[2])}月${Number(match[3])}日`;
}

export function coerceISO(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const roc = /(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})/.exec(trimmed);
  if (!roc) return null;
  const year = Number(roc[1]) + 1911;
  const month = String(Number(roc[2])).padStart(2, "0");
  const day = String(Number(roc[3])).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function clean(value: string | null | undefined): string {
  return (value ?? "").trim();
}
