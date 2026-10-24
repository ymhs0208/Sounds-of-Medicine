import { coerceISO } from "./format";
import { uid } from "./id";
import type { Extraction } from "./extraction";
import type { Bag, Drug, Lang } from "./types";

export function bagFromExtraction(
  data: Extraction,
  photoDataUrl: string | undefined,
  lang: Lang,
): Bag {
  const drugs: Drug[] = data.drugs
    .filter((drug) => drug.nameZh || drug.usageZh || drug.doseZh)
    .map((drug) => {
      const nameZh = drug.nameZh ?? "";
      const built: Drug = {
        id: uid(),
        nameZh,
        ingredient: drug.ingredient ?? "",
        doseZh: drug.doseZh ?? "",
        quantityZh: drug.quantityZh ?? "",
        usageZh: drug.usageZh ?? "",
        indicationZh: drug.indicationZh ?? "",
        warningsZh: drug.warningsZh,
        slots: drug.slots,
        i18n: {},
      };
      if (lang !== "zh" && drug.translation) {
        built.i18n[lang] = {
          name: drug.translation.name || nameZh,
          dose: drug.translation.dose || built.doseZh,
          quantity: drug.translation.quantity || built.quantityZh,
          usage: drug.translation.usage || built.usageZh,
          indication: drug.translation.indication || built.indicationZh,
          warnings: drug.translation.warnings.length ? drug.translation.warnings : built.warningsZh,
        };
      }
      return built;
    });

  const hospital = data.hospital ?? "";
  return {
    id: uid(),
    source: "photo",
    hospitalZh: hospital,
    hospitalShort: hospital.slice(0, 6) || "藥袋",
    pharmacyZh: data.pharmacy ?? "",
    patientZh: data.patientName ?? "",
    dispensingDate: coerceISO(data.dispensingDateISO) ?? coerceISO(data.dispensingLabel),
    dispensingLabel: data.dispensingLabel ?? data.dispensingDateISO ?? "",
    theme: "#334155",
    photoDataUrl,
    drugs,
    createdAt: new Date().toISOString(),
  };
}
