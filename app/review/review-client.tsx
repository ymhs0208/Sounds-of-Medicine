"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BagFace } from "@/components/bag-artwork";
import { Bilingual } from "@/components/bilingual";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { getDemoBag, isDemoKey } from "@/lib/demo-data";
import { drugText, hasTranslation, namesDiffer, rocLabel } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { readPending, type Pending } from "@/lib/pending";
import { useStore } from "@/lib/store";
import type { Bag } from "@/lib/types";

export default function ReviewClient() {
  const store = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const t = ui[store.lang];
  const [bag, setBag] = useState<Bag | null>(null);
  const [showBag, setShowBag] = useState(true);

  useEffect(() => {
    const demo = params.get("demo");
    const pending: Pending | null = demo && isDemoKey(demo) ? { kind: "demo", key: demo } : readPending();
    if (!pending) return;
    setBag(pending.kind === "demo" ? getDemoBag(pending.key) : pending.bag);
  }, [params]);

  if (!bag) {
    return (
      <div className="py-10 text-center">
        <p className="text-lg">{t.scanLead}</p>
        <Button type="button" className="mt-4 h-12 rounded-2xl" onClick={() => router.push("/scan")}>
          {t.rescan}
        </Button>
      </div>
    );
  }

  const saved = Boolean(bag.demoKey && store.bags.some((item) => item.demoKey === bag.demoKey));
  const mismatch = namesDiffer(store.bags, bag.patientZh);

  return (
    <div className="space-y-4 pb-8">
      <div>
        <p className="text-sm font-semibold text-pine">{t.fromBag}</p>
        <h1 className="text-3xl font-semibold">{t.reviewTitle}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t.reviewLead}</p>
      </div>
      <button type="button" className="text-sm font-semibold text-pine" onClick={() => setShowBag((value) => !value)}>
        {showBag ? t.hideBag : t.viewBag}
      </button>
      {showBag ? (
        <div className="overflow-hidden rounded-3xl ring-1 ring-border">
          <BagFace bag={bag} />
        </div>
      ) : null}
      {mismatch ? <p className="rounded-2xl bg-amber-bg px-3 py-2 text-sm leading-relaxed text-amber-ink">{t.patientMismatch}</p> : null}
      <article className="rounded-3xl bg-card px-4 py-2 ring-1 ring-foreground/10">
        <Bilingual label={t.fieldPatient} primary={bag.patientZh} showOriginal={false} originalLabel={t.zhOriginal} />
        <Bilingual label={t.fieldHospital} primary={bag.hospitalZh} showOriginal={false} originalLabel={t.zhOriginal} />
        <Bilingual label={t.fieldPharmacy} primary={bag.pharmacyZh || t.missing} showOriginal={false} originalLabel={t.zhOriginal} />
        <Bilingual
          label={t.fieldDate}
          primary={bag.dispensingLabel || rocLabel(bag.dispensingDate, t.missing)}
          showOriginal={false}
          originalLabel={t.zhOriginal}
        />
      </article>
      {bag.drugs.map((drug) => {
        const text = drugText(drug, store.lang);
        const showZh = store.lang !== "zh" && hasTranslation(drug, store.lang);
        return (
          <article key={drug.id} className="rounded-3xl bg-card px-4 py-2 ring-1 ring-foreground/10">
            {!showZh && store.lang !== "zh" ? (
              <p className="pt-3 text-sm text-amber-ink">{t.missingTranslation}</p>
            ) : null}
            <Bilingual label={t.fieldDrug} primary={text.name} original={drug.nameZh} showOriginal={showZh} originalLabel={t.zhOriginal} />
            <Bilingual label={t.ingredient} primary={drug.ingredient || t.missing} showOriginal={false} originalLabel={t.zhOriginal} />
            <Bilingual label={t.fieldDose} primary={text.dose || t.missing} original={drug.doseZh} showOriginal={showZh} originalLabel={t.zhOriginal} />
            <Bilingual label={t.fieldQuantity} primary={text.quantity || t.missing} original={drug.quantityZh} showOriginal={showZh} originalLabel={t.zhOriginal} />
            <Bilingual label={t.fieldUsage} primary={text.usage || t.missing} original={drug.usageZh} showOriginal={showZh} originalLabel={t.zhOriginal} />
            <Bilingual label={t.fieldIndication} primary={text.indication || t.missing} original={drug.indicationZh} showOriginal={showZh} originalLabel={t.zhOriginal} />
            <Bilingual
              label={t.fieldWarnings}
              primary={text.warnings.length ? text.warnings.join(" / ") : t.missing}
              original={drug.warningsZh.join(" / ")}
              showOriginal={showZh}
              originalLabel={t.zhOriginal}
            />
          </article>
        );
      })}
      <p className="text-sm leading-relaxed text-muted-foreground">{t.confirmHint}</p>
      <Disclaimer lang={store.lang} />
      <Button
        type="button"
        className="h-14 w-full rounded-2xl text-lg"
        disabled={saved}
        onClick={() => {
          const result = store.addBag(bag);
          if (result === "duplicate") {
            toast(t.already);
            return;
          }
          toast(t.added);
          const first = bag.drugs[0];
          router.push(first ? `/meds/${first.id}` : "/meds");
        }}
      >
        {saved ? t.alreadyInCabinet : t.addCabinet}
      </Button>
      <Button type="button" variant="outline" className="h-12 w-full rounded-2xl text-base" onClick={() => router.push("/scan")}>
        {t.rescan}
      </Button>
    </div>
  );
}
