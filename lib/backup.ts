import { normalizeDrugLabels } from "./display-name";
import { isLang, type AppData, type Bag, type Drug } from "./types";

export const DATA_VERSION = 3;

export const EMPTY_DATA: AppData = {
  version: DATA_VERSION,
  onboarded: false,
  lang: "zh",
  consentAt: null,
  consentVersion: null,
  lastExportAt: null,
  backupSnoozeUntil: null,
  patientName: "",
  familyContact: "",
  allergies: "",
  allergiesZh: "",
  largeText: false,
  pictograms: true,
  bags: [],
  logs: [],
  reports: [],
  notified: [],
  symptoms: [],
  talks: [],
  refillNotified: [],
};

function knownVersion(version: unknown): boolean {
  return version === 1 || version === 2 || version === DATA_VERSION || (typeof version === "number" && version > DATA_VERSION);
}

/** Keep saved bags across versions. Unknown future versions are not wiped or downgraded. */
export function normalizeData(parsed: Partial<AppData> | null | undefined): AppData {
  if (!parsed || !knownVersion(parsed.version) || !Array.isArray(parsed.bags)) return EMPTY_DATA;
  const incoming = parsed.version;
  return {
    ...EMPTY_DATA,
    ...parsed,
    version: typeof incoming === "number" && incoming > DATA_VERSION ? incoming : DATA_VERSION,
    lang: parsed.lang && isLang(parsed.lang) ? parsed.lang : "zh",
    patientName: typeof parsed.patientName === "string" ? parsed.patientName : "",
    familyContact: typeof parsed.familyContact === "string" ? parsed.familyContact : "",
    allergies: typeof parsed.allergies === "string" ? parsed.allergies : "",
    allergiesZh: typeof parsed.allergiesZh === "string" ? parsed.allergiesZh : "",
    largeText: Boolean(parsed.largeText),
    pictograms: parsed.pictograms !== false,
    bags: parsed.bags.filter(isBag).map((bag) => (typeof incoming === "number" && incoming <= DATA_VERSION ? migrateBag(bag) : bag)),
    logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    notified: Array.isArray(parsed.notified) ? parsed.notified : [],
    symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
    talks: Array.isArray(parsed.talks) ? parsed.talks : [],
    refillNotified: Array.isArray(parsed.refillNotified) ? parsed.refillNotified : [],
    onboarded: Boolean(parsed.onboarded),
    consentAt: typeof parsed.consentAt === "string" ? parsed.consentAt : null,
    consentVersion: typeof parsed.consentVersion === "string" ? parsed.consentVersion : null,
    lastExportAt: typeof parsed.lastExportAt === "string" ? parsed.lastExportAt : null,
    backupSnoozeUntil: typeof parsed.backupSnoozeUntil === "string" ? parsed.backupSnoozeUntil : null,
  };
}

function isBag(value: unknown): value is Bag {
  if (!value || typeof value !== "object") return false;
  const bag = value as Bag;
  return typeof bag.id === "string" && Array.isArray(bag.drugs);
}

function migrateBag(bag: Bag): Bag {
  return {
    ...bag,
    drugs: bag.drugs.map((drug) => normalizeDrugLabels(drug as Drug)),
  };
}

/** JSON backup of saved fields only. The device key and in-memory store methods stay out. */
export function backupJson(data: AppData, exportedAt = new Date().toISOString()): string {
  const snapshot: AppData = {
    version: data.version,
    onboarded: data.onboarded,
    lang: data.lang,
    consentAt: data.consentAt,
    consentVersion: data.consentVersion,
    lastExportAt: exportedAt,
    backupSnoozeUntil: data.backupSnoozeUntil,
    patientName: data.patientName,
    familyContact: data.familyContact,
    allergies: data.allergies,
    allergiesZh: data.allergiesZh,
    largeText: data.largeText,
    pictograms: data.pictograms,
    bags: data.bags,
    logs: data.logs,
    reports: data.reports,
    notified: data.notified,
    symptoms: data.symptoms,
    talks: data.talks,
    refillNotified: data.refillNotified,
  };
  return JSON.stringify(snapshot, null, 2);
}

export function parseBackup(raw: string): AppData | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (!knownVersion(parsed.version) || !Array.isArray(parsed.bags)) return null;
    return normalizeData(parsed);
  } catch {
    return null;
  }
}
