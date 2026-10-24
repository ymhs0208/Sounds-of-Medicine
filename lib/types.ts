import type { Slot } from "./slots";

export const LANGS = ["id", "vi", "fil", "th", "en", "zh"] as const;
export type Lang = (typeof LANGS)[number];

export const CAREGIVER_LANGS = ["id", "vi", "fil", "th", "en", "zh"] as const;

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

export type DrugText = {
  name: string;
  dose: string;
  quantity: string;
  usage: string;
  indication: string;
  warnings: string[];
};

export type Drug = {
  id: string;
  nameZh: string;
  ingredient: string;
  doseZh: string;
  quantityZh: string;
  usageZh: string;
  indicationZh: string;
  warningsZh: string[];
  slots: Slot[];
  /** Printed frequency, such as 每日兩次. The schedule itself is `slots`. */
  frequencyZh?: string;
  i18n: Partial<Record<Exclude<Lang, "zh">, DrugText>>;
};

export type Bag = {
  id: string;
  source: "demo" | "photo" | "manual";
  demoKey?: string;
  hospitalZh: string;
  hospitalShort: string;
  pharmacyZh: string;
  patientZh: string;
  dispensingDate: string | null;
  dispensingLabel: string;
  theme: string;
  photoDataUrl?: string;
  /** Days supplied, counted from `dispensingDate`. Empty means every day. */
  days?: number | null;
  drugs: Drug[];
  createdAt: string;
};

export type DoseStatus = "given" | "missed";

export type DoseLog = {
  drugId: string;
  date: string;
  slot: Slot;
  status: DoseStatus;
  at: string;
};

export type DoseNotice = {
  drugId: string;
  date: string;
  slot: Slot;
};

export type ReportKind = "given" | "missed" | "observation";
export type Observation =
  | "dizzy"
  | "nausea"
  | "stomach"
  | "rash"
  | "bleeding"
  | "drowsy";
export type ReplyTemplate = "thanks" | "tonight" | "watch" | "pharmacist";

export type FamilyReply = {
  id: string;
  at: string;
  template: ReplyTemplate;
  seen: boolean;
};

export type Report = {
  id: string;
  at: string;
  date: string;
  kind: ReportKind;
  drugId: string;
  slot?: Slot;
  observation?: Observation;
  source: "timeline" | "form";
  replies: FamilyReply[];
};

export type AppData = {
  version: 1;
  onboarded: boolean;
  lang: Lang;
  consentAt: string | null;
  patientName: string;
  familyContact: string;
  bags: Bag[];
  logs: DoseLog[];
  reports: Report[];
  notified: DoseNotice[];
};
