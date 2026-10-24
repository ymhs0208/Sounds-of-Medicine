"use client";

import Link from "next/link";
import { Pill } from "lucide-react";
import { ClampText } from "@/components/clamp-text";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DuplicateBanner } from "@/components/duplicate-banner";
import { duplicateDrugIds } from "@/lib/duplicates";
import { chineseNote, drugText, fill, patientName } from "@/lib/format";
import { features } from "@/lib/i18n/features";
import { drugPath } from "@/lib/routes";
import { ui } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Drug, Lang } from "@/lib/types";

function MedDrug({ drug, lang, duplicate }: { drug: Drug; lang: Lang; duplicate: boolean }) {
  const text = drugText(drug, lang);
  const t = ui[lang];
  const ft = features[lang];
  const nameZh = chineseNote(lang, text.name, drug.nameZh);
  const indicationZh = chineseNote(lang, text.indication, drug.indicationZh);
  const usageZh = chineseNote(lang, text.usage, drug.usageZh);
  return (
    <div className="rounded-2xl px-2 py-3 hover:bg-secondary">
      <Link href={drugPath(drug.id)} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="ys-name text-lg font-semibold leading-snug">{text.name}</div>
            {nameZh ? <div className="text-xs text-muted-foreground">{nameZh}</div> : null}
            {text.indication ? <div className="text-sm leading-snug text-muted-foreground">{text.indication}</div> : null}
            {indicationZh ? <div className="text-xs text-muted-foreground">{indicationZh}</div> : null}
          </div>
          {duplicate ? (
            <span className="rounded-full bg-amber-bg px-2 py-1 text-xs font-semibold text-amber-ink">{t.duplicateShort}</span>
          ) : null}
        </div>
      </Link>
      <ClampText text={text.usage} expand={ft.expandLines} collapse={ft.collapseLines} className="text-sm text-muted-foreground" />
      {usageZh ? <p className="text-xs text-muted-foreground">{usageZh}</p> : null}
    </div>
  );
}

export default function MedsPage() {
  const store = useStore();
  const t = ui[store.lang];
  const dupes = duplicateDrugIds(store.bags);
  const name = patientName(store.bags, store.patientName);

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title={t.medsTitle} lead={t.medsLead} extra={name ? <p className="text-base font-semibold">{t.patientLabel}　{name}</p> : null} />
      <Button nativeButton={false} className="h-12 w-full rounded-2xl" render={<Link href="/meds/edit" />}>
        {t.manualEntry}
      </Button>
      <DuplicateBanner lang={store.lang} />
      {store.bags.length === 0 ? (
        <EmptyState icon={Pill} title={t.noMeds} body={t.emptyBody} />
      ) : (
        store.bags.map((bag) => (
          <section key={bag.id} className="overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
            <div className="px-4 py-3 text-white" style={{ background: bag.theme }}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-lg font-semibold break-words">{bag.hospitalZh}</div>
                {bag.source === "demo" ? <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">{t.demoBadge}</span> : null}
              </div>
              <div className="text-sm text-white/80">
                {bag.pharmacyZh} · {bag.dispensingLabel}
              </div>
            </div>
            <div className="px-2 py-2">
              <p className="px-2 text-sm text-muted-foreground">{fill(t.drugsCount, { n: String(bag.drugs.length) })}</p>
              {bag.drugs.map((drug) => (
                <MedDrug key={drug.id} drug={drug} lang={store.lang} duplicate={dupes.has(drug.id)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
