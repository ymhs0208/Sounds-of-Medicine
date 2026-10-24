import { normalizeData } from "./backup";
import type { AppData, Bag, DoseLog, DoseNotice, RefillNotice, Report, SymptomLog, TalkCard } from "./types";

export type SyncBody = { id: string; body: Record<string, unknown> };

function withoutPhoto(bag: Bag): Bag {
  const next = { ...bag };
  delete next.photoDataUrl;
  return next;
}

/** Plain records ready to encrypt. Photos and demo bags stay on the device. */
export function snapshotRecords(data: AppData): SyncBody[] {
  const records: SyncBody[] = [
    {
      id: "profile",
      body: {
        v: 1,
        lang: data.lang,
        patientName: data.patientName,
        familyContact: data.familyContact,
        allergies: data.allergies,
        allergiesZh: data.allergiesZh,
        largeText: data.largeText,
        pictograms: data.pictograms,
        consentAt: data.consentAt,
        consentVersion: data.consentVersion,
      },
    },
  ];
  for (const bag of data.bags) {
    if (bag.source === "demo") continue;
    records.push({ id: `bag:${bag.id}`, body: { v: 1, bag: withoutPhoto(bag) } });
  }
  for (const log of data.logs) records.push({ id: `log:${log.drugId}:${log.date}:${log.slot}`, body: { v: 1, log } });
  for (const report of data.reports) records.push({ id: `report:${report.id}`, body: { v: 1, report } });
  for (const symptom of data.symptoms) records.push({ id: `symptom:${symptom.id}`, body: { v: 1, symptom } });
  for (const talk of data.talks) records.push({ id: `talk:${talk.id}`, body: { v: 1, talk } });
  for (const notice of data.refillNotified) {
    records.push({ id: `refill:${notice.drugId}:${notice.level}:${notice.runOut}`, body: { v: 1, notice } });
  }
  for (const notice of data.notified) {
    records.push({ id: `notice:${notice.drugId}:${notice.date}:${notice.slot}`, body: { v: 1, notice } });
  }
  return records;
}

export function tombstone(id: string): SyncBody {
  return { id, body: { v: 1, tombstone: true } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Rebuild the cabinet from decrypted records. Local photos and demo bags are kept. */
export function cabinetFromRecords(current: AppData, records: SyncBody[]): AppData {
  const photos = new Map(current.bags.map((bag) => [bag.id, bag.photoDataUrl]));
  const demo = current.bags.filter((bag) => bag.source === "demo");
  const bags: Bag[] = [];
  const logs: DoseLog[] = [];
  const reports: Report[] = [];
  const symptoms: SymptomLog[] = [];
  const talks: TalkCard[] = [];
  const refillNotified: RefillNotice[] = [];
  const notified: DoseNotice[] = [];
  let profile: Record<string, unknown> | null = null;
  for (const record of records) {
    if (!isRecord(record.body) || record.body.tombstone === true) continue;
    if (record.id === "profile") profile = record.body;
    else if (record.id.startsWith("bag:") && isRecord(record.body.bag)) {
      const bag = { ...(record.body.bag as Bag) };
      delete bag.photoDataUrl;
      const local = photos.get(bag.id);
      if (local) bag.photoDataUrl = local;
      if (bag.source !== "demo") bags.push(bag);
    } else if (record.id.startsWith("log:") && isRecord(record.body.log)) logs.push(record.body.log as DoseLog);
    else if (record.id.startsWith("report:") && isRecord(record.body.report)) reports.push(record.body.report as Report);
    else if (record.id.startsWith("symptom:") && isRecord(record.body.symptom)) symptoms.push(record.body.symptom as SymptomLog);
    else if (record.id.startsWith("talk:") && isRecord(record.body.talk)) talks.push(record.body.talk as TalkCard);
    else if (record.id.startsWith("refill:") && isRecord(record.body.notice)) refillNotified.push(record.body.notice as RefillNotice);
    else if (record.id.startsWith("notice:") && isRecord(record.body.notice)) notified.push(record.body.notice as DoseNotice);
  }
  return normalizeData({
    ...current,
    lang: typeof profile?.lang === "string" ? (profile.lang as AppData["lang"]) : current.lang,
    patientName: typeof profile?.patientName === "string" ? profile.patientName : current.patientName,
    familyContact: typeof profile?.familyContact === "string" ? profile.familyContact : current.familyContact,
    allergies: typeof profile?.allergies === "string" ? profile.allergies : current.allergies,
    allergiesZh: typeof profile?.allergiesZh === "string" ? profile.allergiesZh : current.allergiesZh,
    largeText: typeof profile?.largeText === "boolean" ? profile.largeText : current.largeText,
    pictograms: typeof profile?.pictograms === "boolean" ? profile.pictograms : current.pictograms,
    consentAt: typeof profile?.consentAt === "string" || profile?.consentAt === null ? (profile.consentAt as string | null) : current.consentAt,
    consentVersion:
      typeof profile?.consentVersion === "string" || profile?.consentVersion === null
        ? (profile.consentVersion as string | null)
        : current.consentVersion,
    bags: [...demo, ...bags],
    logs,
    reports,
    symptoms,
    talks,
    refillNotified,
    notified,
    onboarded: current.onboarded,
  });
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
