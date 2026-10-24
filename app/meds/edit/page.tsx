"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BagForm } from "@/components/bag-form";
import { Disclaimer } from "@/components/disclaimer";
import { ui } from "@/lib/i18n";
import { paidPost } from "@/lib/paid-client";
import { staticDemo } from "@/lib/routes";
import { useStore } from "@/lib/store";
import type { Bag, Lang } from "@/lib/types";

function EditForm() {
  const params = useSearchParams();
  const router = useRouter();
  const store = useStore();
  const t = ui[store.lang];
  const bagId = params.get("bag");
  const existing = store.bags.find((bag) => bag.id === bagId) ?? null;
  const [busy, setBusy] = useState(false);

  async function fillTranslation(bag: Bag, lang: Lang): Promise<Bag> {
    if (lang === "zh" || staticDemo) return bag;
    const lines: string[] = [];
    for (const drug of bag.drugs) {
      lines.push(drug.nameZh, drug.doseZh, drug.usageZh, drug.indicationZh, drug.warningsZh.join("\n"));
    }
    if (lines.every((line) => !line.trim())) return bag;
    try {
      const response = await paidPost("/api/translate", { language: lang, lines }, lang);
      if (response.status === 503) {
        toast(t.savedWithoutTranslation);
        return bag;
      }
      if (response.status === 429 || response.status === 413) {
        toast(typeof response.body.message === "string" ? response.body.message : t.savedWithoutTranslation);
        return bag;
      }
      if (response.status !== 200) return bag;
      const body = response.body as { lines?: string[] };
      if (!body.lines || body.lines.length !== lines.length) return bag;
      let cursor = 0;
      return {
        ...bag,
        drugs: bag.drugs.map((drug) => {
          const [name, dose, usage, indication, warnings] = body.lines!.slice(cursor, cursor + 5);
          cursor += 5;
          const current = drug.i18n?.[lang];
          return {
            ...drug,
            i18n: {
              ...drug.i18n,
              [lang]: {
                name: current?.name && current.name !== drug.nameZh ? current.name : name || drug.nameZh,
                dose: current?.dose && current.dose !== drug.doseZh ? current.dose : dose || drug.doseZh,
                quantity: drug.quantityZh,
                usage: current?.usage && current.usage !== drug.usageZh ? current.usage : usage || drug.usageZh,
                indication: indication || drug.indicationZh,
                warnings: warnings ? warnings.split("\n").map((line) => line.trim()).filter(Boolean) : drug.warningsZh,
              },
            },
          };
        }),
      };
    } catch {
      return bag;
    }
  }

  async function save(bag: Bag) {
    if (busy) return;
    setBusy(true);
    const withText = await fillTranslation(bag, store.lang);
    const result = existing ? store.updateBag(withText) : store.addBag(withText);
    setBusy(false);
    if (result === "mixed") {
      toast(t.realBlockedDemo);
      return;
    }
    toast(t.added);
    router.push("/meds");
  }

  if (bagId && store.ready && !existing) {
    return <p className="py-8 text-lg">{t.noMeds}</p>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-8">
      <h1 className="text-3xl font-semibold">{existing ? t.editBag : t.manualEntry}</h1>
      <p className="text-base leading-relaxed text-muted-foreground">{t.confirmHint}</p>
      <BagForm
        initial={existing}
        lang={store.lang}
        patientDefault={store.patientName}
        requireConfirm={existing?.source === "photo"}
        submitLabel={existing ? t.saveChanges : t.addCabinet}
        onSubmit={(bag) => void save(bag)}
      />
      <Disclaimer lang={store.lang} />
    </div>
  );
}

export default function EditBagPage() {
  return (
    <Suspense fallback={null}>
      <EditForm />
    </Suspense>
  );
}
