"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BagFace } from "@/components/bag-artwork";
import { Bilingual } from "@/components/bilingual";
import { Disclaimer } from "@/components/disclaimer";
import { DuplicateBanner } from "@/components/duplicate-banner";
import { SlotPill } from "@/components/slot-pill";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { duplicateDrugIds } from "@/lib/duplicates";
import { drugText, hasTranslation, rocLabel } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export default function MedicineCardClient() {
  const params = useSearchParams();
  const router = useRouter();
  const store = useStore();
  const t = ui[store.lang];
  const [open, setOpen] = useState(false);
  const [showBag, setShowBag] = useState(false);
  const drugId = params.get("id") ?? "";
  const found = store.bags.flatMap((bag) => bag.drugs.map((drug) => ({ bag, drug }))).find((item) => item.drug.id === drugId);

  if (!store.ready) return null;
  if (!found) {
    return (
      <div className="py-8">
        <p className="text-lg">{t.noMeds}</p>
        <Button type="button" className="mt-4 h-12 rounded-2xl" onClick={() => router.push("/meds")}>
          {t.medsTitle}
        </Button>
      </div>
    );
  }

  const { bag, drug } = found;
  const text = drugText(drug, store.lang);
  const showZh = store.lang !== "zh" && hasTranslation(drug, store.lang);
  const duplicate = duplicateDrugIds(store.bags).has(drug.id);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-8">
      <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
        <div className="h-2" style={{ background: bag.theme }} />
        <div className="px-4 py-4">
          <p className="text-sm font-semibold" style={{ color: bag.theme }}>
            {bag.hospitalZh}
          </p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight">{text.name}</h1>
          {showZh ? <p className="mt-1 text-base text-muted-foreground">{drug.nameZh}</p> : null}
          <p className="mt-2 text-sm text-muted-foreground">
            {bag.pharmacyZh} · {bag.dispensingLabel || rocLabel(bag.dispensingDate, "")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {bag.source === "demo" ? (
              <span className="inline-flex rounded-full bg-amber-bg px-3 py-1 text-sm font-semibold text-amber-ink">{t.demoBadge}</span>
            ) : null}
            {duplicate ? (
              <span className="inline-flex rounded-full bg-amber-bg px-3 py-1 text-sm font-semibold text-amber-ink">{t.duplicateShort}</span>
            ) : null}
          </div>
          {bag.source !== "demo" ? (
            <Button nativeButton={false} variant="outline" className="mt-3 h-11 rounded-2xl" render={<Link href={`/meds/edit?bag=${bag.id}`} />}>
              {t.editBag}
            </Button>
          ) : null}
        </div>
      </div>
      <SpeakButton drug={drug} lang={store.lang} />
      {drug.slots.length ? (
        <div className="grid gap-2">
          {drug.slots.map((slot) => (
            <SlotPill key={slot} slot={slot} lang={store.lang} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t.noSlots}</p>
      )}
      {duplicate ? <DuplicateBanner lang={store.lang} /> : null}
      <article className="rounded-3xl bg-card px-4 ring-1 ring-foreground/10">
        {!showZh && store.lang !== "zh" ? <p className="pt-3 text-sm text-amber-ink">{t.missingTranslation}</p> : null}
        <Bilingual label={t.doseLabel} primary={text.dose || t.missing} original={drug.doseZh} showOriginal={showZh} originalLabel={t.zhOriginal} />
        <Bilingual label={t.quantityLabel} primary={text.quantity || t.missing} original={drug.quantityZh} showOriginal={showZh} originalLabel={t.zhOriginal} />
        <Bilingual label={t.fieldUsage} primary={text.usage || t.missing} original={drug.usageZh} showOriginal={showZh} originalLabel={t.zhOriginal} />
        <Bilingual label={t.indicationLabel} primary={text.indication || t.missing} original={drug.indicationZh} showOriginal={showZh} originalLabel={t.zhOriginal} />
        <section className="py-3">
          <h3 className="text-sm font-semibold text-pine">{t.warningsLabel}</h3>
          {text.warnings.length ? (
            <ul className="mt-2 space-y-2">
              {text.warnings.map((warning, index) => (
                <li key={warning} className="rounded-2xl bg-rose-bg px-3 py-2 text-base leading-snug text-rose">
                  {warning}
                  {showZh && drug.warningsZh[index] ? (
                    <span className="mt-1 block text-sm text-rose">
                      {t.zhOriginal}　{drug.warningsZh[index]}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-base">{t.missing}</p>
          )}
        </section>
      </article>
      <button type="button" className="inline-flex min-h-11 items-center text-base font-semibold text-pine" onClick={() => setShowBag((value) => !value)}>
        {showBag ? t.hideBag : t.viewBag}
      </button>
      {showBag ? (
        <div className="overflow-hidden rounded-3xl ring-1 ring-border">
          <BagFace bag={bag} />
        </div>
      ) : null}
      <Disclaimer lang={store.lang} />
      <Button type="button" variant="outline" className="h-12 w-full rounded-2xl text-base" onClick={() => setOpen(true)}>
        {t.remove}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.removeTitle}</DialogTitle>
            <DialogDescription>{t.removeBody}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              type="button"
              className="h-11 rounded-xl"
              onClick={() => {
                store.removeBag(bag.id);
                toast(t.removeDone);
                router.push("/meds");
              }}
            >
              {t.confirmRemove}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
