"use client";

import Link from "next/link";
import { AskLine } from "@/components/ask-line";
import { Button } from "@/components/ui/button";
import { features } from "@/lib/i18n/features";
import { fill, todayISO } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { refillStatuses } from "@/lib/refill";
import { useStore } from "@/lib/store";

export default function RefillPage() {
  const store = useStore();
  const t = features[store.lang];
  const rows = refillStatuses(store.bags, store.logs, todayISO());

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-8">
      <div>
        <h1 className="text-3xl font-semibold">{t.refillTitle}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t.refillLead}</p>
      </div>
      <AskLine lang={store.lang} />
      {rows.length === 0 ? <p className="rounded-3xl bg-card px-4 py-6 ring-1 ring-border">{t.refillNone}</p> : null}
      {rows.map((row) => (
        <article key={row.drugId} className="rounded-3xl bg-card p-4 ring-1 ring-border">
          <h2 className="text-xl font-semibold break-words">{row.nameZh}</h2>
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
      ))}
    </div>
  );
}
