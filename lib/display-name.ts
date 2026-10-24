import type { Drug, DrugText, Lang } from "./types";

const PURPOSE = [
  /\s+untuk\s+/i,
  /\s+for\s+/i,
  /\s+dùng\s+cho\s+/i,
  /\s+para\s+sa\s+/i,
  /สำหรับ/,
  /用於/,
  /用以/,
  /治療/,
];

const INSTRUCTION = [
  /\s+yang\s+harus\b/i,
  /\s+diminum\b/i,
  /\s+sesuai\b/i,
  /\s+setiap\s+hari\b/i,
  /\s+tanpa\s+jeda\b/i,
  /\s+minum\b/i,
  /\s+take\b/i,
  /\s+every\s+day\b/i,
  /\s+uống\b/i,
  /\s+inumin\b/i,
  /ต้องกิน/,
  /กินตาม/,
  /每日/,
  /一天/,
  /飯前/,
  /飯後/,
  /服用/,
  /請依/,
  /睡前/,
];

const CAREGIVER_LANGS = ["id", "vi", "fil", "th", "en"] as const;

function earliest(text: string, patterns: RegExp[]): number {
  let at = -1;
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && (at < 0 || match.index < at)) at = match.index;
  }
  return at;
}

export function clipDisplay(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 48) return cleaned;
  const slice = cleaned.slice(0, 48);
  const space = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("　"));
  return (space > 12 ? slice.slice(0, space) : slice).trim();
}

function tidy(value: string): string {
  return value.replace(/[\s,，、:：;；\-–—(（]+$/u, "").trim();
}

/**
 * A display name is the generic plus brand, short enough for a card title.
 * Purpose moves into indication and instructions into usage when those fields are empty.
 */
export function partitionLabel(name: string, indication: string, usage: string): { name: string; indication: string; usage: string } {
  const original = name.trim();
  const currentIndication = indication.trim();
  const currentUsage = usage.trim();
  if (!original) return { name: original, indication: currentIndication, usage: currentUsage };

  const purposeAt = earliest(original, PURPOSE);
  const instructionAt = earliest(original, INSTRUCTION);
  let cut = -1;
  if (purposeAt >= 0 && instructionAt >= 0) cut = Math.min(purposeAt, instructionAt);
  else cut = Math.max(purposeAt, instructionAt);
  if (cut < 0 && original.length > 48) {
    const punct = original.search(/[。！？.!?；;]/);
    cut = punct > 8 ? punct : 48;
  }
  if (cut <= 0) return { name: clipDisplay(original), indication: currentIndication, usage: currentUsage };

  let head = tidy(original.slice(0, cut));
  const tail = original.slice(cut).replace(/^[\s,，、:：;；\-–—]+/u, "").trim();
  if (head.length < 2) head = clipDisplay(original);
  else head = clipDisplay(head);

  let nextIndication = currentIndication;
  let nextUsage = currentUsage;
  if (tail) {
    const inner = earliest(tail, INSTRUCTION);
    const startedAsPurpose = purposeAt >= 0 && (instructionAt < 0 || purposeAt <= instructionAt);
    const purposePart = inner > 0 ? tidy(tail.slice(0, inner)) : startedAsPurpose ? tail : "";
    const instructPart = inner > 0 ? tail.slice(inner).trim() : !startedAsPurpose ? tail : "";
    if (!nextIndication && purposePart) nextIndication = purposePart;
    if (!nextUsage && instructPart) nextUsage = instructPart;
    if (!purposePart && !instructPart) {
      if (!nextIndication) nextIndication = tail;
      else if (!nextUsage) nextUsage = tail;
    }
  }
  return { name: head, indication: nextIndication, usage: nextUsage };
}

function hanHeavy(value: string): boolean {
  const han = (value.match(/\p{Script=Han}/gu) ?? []).length;
  const latin = (value.match(/[A-Za-z]/g) ?? []).length;
  return han >= 2 && han >= latin;
}

export function normalizeDrugLabels(drug: Drug): Drug {
  if (!drug || typeof drug.nameZh !== "string") return drug;
  const zh = partitionLabel(drug.nameZh, drug.indicationZh ?? "", drug.usageZh ?? "");
  const i18n: Drug["i18n"] = { ...(drug.i18n ?? {}) };
  for (const code of CAREGIVER_LANGS) {
    const text = i18n[code];
    if (!text || typeof text.name !== "string") continue;
    const next = partitionLabel(text.name, text.indication ?? "", text.usage ?? "");
    i18n[code] = { ...text, name: next.name, indication: next.indication, usage: next.usage };
  }
  return {
    ...drug,
    nameZh: zh.name,
    indicationZh: zh.indication,
    usageZh: zh.usage,
    i18n,
  };
}

export function presentDrugText(drug: Drug, lang: Lang, raw: DrugText): DrugText {
  const split = partitionLabel(raw.name ?? "", raw.indication ?? "", raw.usage ?? "");
  let name = split.name;
  if (lang !== "zh" && hanHeavy(name) && drug.ingredient.trim()) {
    name = clipDisplay(drug.ingredient.split(/[;,/]/)[0] || drug.ingredient);
  }
  return {
    ...raw,
    name,
    indication: split.indication,
    usage: split.usage,
    warnings: raw.warnings ?? [],
  };
}
