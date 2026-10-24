"use client";

import { adherence } from "@/lib/doses";
import { fill, todayISO } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

export function AdherenceCard({ lang }: { lang: Lang }) {
  const store = useStore();
  const t = ui[lang];
  const summary = adherence(store.bags, store.logs, todayISO());
  return (
    <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
      <h2 className="text-base font-semibold">{t.adherenceTitle}</h2>
      {summary.total === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.adherenceEmpty}</p>
      ) : (
        <>
          <p className="mt-2 text-lg font-semibold">
            {fill(t.adherenceLine, {
              given: String(summary.given),
              missed: String(summary.missed),
              pending: String(summary.pending),
              total: String(summary.total),
            })}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-pine" style={{ width: `${(summary.given / summary.total) * 100}%` }} />
          </div>
        </>
      )}
    </section>
  );
}
