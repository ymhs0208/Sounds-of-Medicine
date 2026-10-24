import { z } from "zod";
import { isSlot, type Slot } from "./slots";

const drugSchema = z.object({
  nameZh: z.string().nullish(),
  ingredient: z.string().nullish(),
  doseZh: z.string().nullish(),
  quantityZh: z.string().nullish(),
  usageZh: z.string().nullish(),
  indicationZh: z.string().nullish(),
  warningsZh: z.array(z.string()).nullish(),
  slots: z.array(z.string()).nullish(),
  translation: z
    .object({
      name: z.string().nullish(),
      dose: z.string().nullish(),
      quantity: z.string().nullish(),
      usage: z.string().nullish(),
      indication: z.string().nullish(),
      warnings: z.array(z.string()).nullish(),
    })
    .nullish(),
});

export const extractionSchema = z.object({
  patientName: z.string().nullish(),
  hospital: z.string().nullish(),
  pharmacy: z.string().nullish(),
  dispensingDateISO: z.string().nullish(),
  dispensingLabel: z.string().nullish(),
  drugs: z.array(drugSchema).nullish(),
});

export type Extraction = {
  patientName: string | null;
  hospital: string | null;
  pharmacy: string | null;
  dispensingDateISO: string | null;
  dispensingLabel: string | null;
  drugs: {
    nameZh: string | null;
    ingredient: string | null;
    doseZh: string | null;
    quantityZh: string | null;
    usageZh: string | null;
    indicationZh: string | null;
    warningsZh: string[];
    slots: Slot[];
    translation: {
      name: string | null;
      dose: string | null;
      quantity: string | null;
      usage: string | null;
      indication: string | null;
      warnings: string[];
    } | null;
  }[];
};

function text(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : null;
}

function lines(value: string[] | null | undefined): string[] {
  return (value ?? []).map((line) => line.trim()).filter(Boolean);
}

export function sanitizeExtraction(input: unknown): Extraction | null {
  const parsed = extractionSchema.safeParse(input);
  if (!parsed.success) return null;
  const data = parsed.data;
  return {
    patientName: text(data.patientName),
    hospital: text(data.hospital),
    pharmacy: text(data.pharmacy),
    dispensingDateISO: text(data.dispensingDateISO),
    dispensingLabel: text(data.dispensingLabel),
    drugs: (data.drugs ?? []).map((drug) => ({
      nameZh: text(drug.nameZh),
      ingredient: text(drug.ingredient),
      doseZh: text(drug.doseZh),
      quantityZh: text(drug.quantityZh),
      usageZh: text(drug.usageZh),
      indicationZh: text(drug.indicationZh),
      warningsZh: lines(drug.warningsZh),
      slots: lines(drug.slots).filter(isSlot),
      translation: drug.translation
        ? {
            name: text(drug.translation.name),
            dose: text(drug.translation.dose),
            quantity: text(drug.translation.quantity),
            usage: text(drug.translation.usage),
            indication: text(drug.translation.indication),
            warnings: lines(drug.translation.warnings),
          }
        : null,
    })),
  };
}

export function extractionHasContent(data: Extraction): boolean {
  if (data.patientName || data.hospital || data.pharmacy) return true;
  return data.drugs.some((drug) => drug.nameZh || drug.usageZh || drug.doseZh);
}
