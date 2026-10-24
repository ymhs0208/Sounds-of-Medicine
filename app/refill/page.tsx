"use client";

import Link from "next/link";
import { AskLine } from "@/components/ask-line";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { features } from "@/lib/i18n/features";
import { drugText, fill, findDrug, todayISO } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { refillStatuses } from "@/lib/refill";
import { useStore } from "@/lib/store";

export default function RefillPage() {
  const store = useStore();
  const t = features[store.lang];
  const rows = refillStatuses(store.bags, store.logs, todayISO());

  return (
    <div className="space-y-4 pb-8">
      <PageHeader title={t.refillTitle} lead={t.refillLead} />
      <AskLine lang={store.lang} />
      {rows.length === 0 ? <p className="rounded-3xl bg-card px-4 py-6 ring-1 ring-border">{t.refillNone}</p> : null}
      {rows.map((row) => {
        const found = findDrug(store.bags, row.drugId);
        const title = found ? drugText(found.drug, store.lang).name : row.nameZh;
        return (
        <article key={row.drugId} className="ys-card p-4">
          <h2 className="text-xl font-semibold break-words">{title}</h2>
          {store.lang !== "zh" && row.nameZh && row.nameZh !== title ? (
            <p className="text-sm text-muted-foreground">{row.nameZh}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">{row.hospitalZh}</p>
          <p className="mt-2 text-lg font-semibold">{row.daysLeft === 0 ? t.refillOut : fill(t.refillDays, { days: String(row.daysLeft) })}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {fill(t.refillTaken, { taken: String(row.taken), supplied: String(row.suppliedDoses) })}
          </p>
          {row.chronic && row.nextFill ? (
            <p className="mt-2 text-base leading-relaxed">
              {fill(t.refillWindow, {
                which: String(row.nextFill.which),
                start: row.nextFill.windowStart,
                end: row.nextFill.windowEnd,
              })}
            </p>
          ) : null}
          {row.chronic && !row.fill ? <p className="mt-2 text-sm leading-relaxed">{t.refillFillMissing}</p> : null}
          <Button nativeButton={false} variant="outline" className="mt-3 h-11 rounded-2xl" render={<Link href={`/meds/edit?bag=${row.bagId}`} />}>
            {ui[store.lang].editBag}
          </Button>
        </article>
        );
      })}
    </div>
  );
}
