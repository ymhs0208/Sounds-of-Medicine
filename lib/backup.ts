import { isLang, type AppData, type Bag } from "./types";

export const EMPTY_DATA: AppData = {
  version: 1,
  onboarded: false,
  lang: "zh",
  consentAt: null,
  patientName: "",
  familyContact: "",
  bags: [],
  logs: [],
  reports: [],
  notified: [],
};

export function normalizeData(parsed: Partial<AppData> | null | undefined): AppData {
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.bags)) return EMPTY_DATA;
  return {
    ...EMPTY_DATA,
    ...parsed,
    version: 1,
    lang: parsed.lang && isLang(parsed.lang) ? parsed.lang : "zh",
    patientName: typeof parsed.patientName === "string" ? parsed.patientName : "",
    familyContact: typeof parsed.familyContact === "string" ? parsed.familyContact : "",
    bags: parsed.bags.filter(isBag),
    logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    notified: Array.isArray(parsed.notified) ? parsed.notified : [],
    onboarded: Boolean(parsed.onboarded),
    consentAt: typeof parsed.consentAt === "string" ? parsed.consentAt : null,
  };
}

function isBag(value: unknown): value is Bag {
  if (!value || typeof value !== "object") return false;
  const bag = value as Bag;
  return typeof bag.id === "string" && Array.isArray(bag.drugs);
}

export function parseBackup(raw: string): AppData | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (parsed.version !== 1 || !Array.isArray(parsed.bags)) return null;
    return normalizeData(parsed);
  } catch {
    return null;
  }
}
