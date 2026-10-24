"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { BagFace } from "@/components/bag-artwork";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { BagForm } from "@/components/bag-form";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { getDemoBag, isDemoKey } from "@/lib/demo-data";
import { namesDiffer } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { readPending, type Pending } from "@/lib/pending";
import { drugPath } from "@/lib/routes";
import { useStore } from "@/lib/store";
import type { Bag } from "@/lib/types";

export default function ReviewClient() {
  const store = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const t = ui[store.lang];
  const [bag, setBag] = useState<Bag | null>(null);

  useEffect(() => {
    const draft = params.get("draft");
    if (draft) {
      let tries = 0;
      const timer = window.setInterval(() => {
        tries += 1;
        void fetch(`/api/line/draft?id=${encodeURIComponent(draft)}`)
          .then(async (response) => {
            if (!response.ok) {
              if (tries > 8) window.clearInterval(timer);
              return;
            }
            window.clearInterval(timer);
            const body = (await response.json()) as { kind?: string; payload?: Bag };
            if (body.kind === "bag" && body.payload?.drugs) setBag(body.payload);
          })
          .catch(() => undefined);
      }, 700);
      return () => window.clearInterval(timer);
    }
    const demo = params.get("demo");
    const pending: Pending | null = demo && isDemoKey(demo) ? { kind: "demo", key: demo } : readPending();
    if (!pending) return;
    setBag(pending.kind === "demo" ? getDemoBag(pending.key) : pending.bag);
  }, [params]);

  if (!bag) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-3 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <p className="text-lg">{t.scanLead}</p>
        <Button type="button" className="mt-4 h-12 rounded-2xl" onClick={() => router.push("/scan")}>
          {t.rescan}
        </Button>
      </div>
    );
  }

  const mismatch = namesDiffer(store.bags, bag.patientZh);

  return (
    <div className="space-y-4 pb-8">
      <PageHeader kicker={t.fromBag} title={t.reviewTitle} lead={t.reviewLead} />
      {bag.source === "demo" ? (
        <p className="rounded-2xl bg-amber-bg px-3 py-2 text-sm font-semibold text-amber-ink">{t.sampleFictional}</p>
      ) : null}
      <div className="overflow-hidden rounded-3xl ring-1 ring-border">
        <BagFace bag={bag} />
      </div>
      {mismatch ? <p className="rounded-2xl bg-amber-bg px-3 py-2 text-sm leading-relaxed text-amber-ink">{t.patientMismatch}</p> : null}
      <BagForm
        initial={bag}
        lang={store.lang}
        patientDefault={store.patientName || bag.patientZh}
        requireConfirm
        submitLabel={t.addCabinet}
        onSubmit={(next) => {
          const result = store.addBag(next);
          if (result === "duplicate") {
            toast(t.already);
            return;
          }
          if (result === "mixed") {
            toast(next.source === "demo" ? t.demoBlockedReal : t.realBlockedDemo);
            return;
          }
          toast(t.added);
          const first = next.drugs[0];
          router.push(first ? drugPath(first.id) : "/meds");
        }}
      />
      <Disclaimer lang={store.lang} />
      <Button type="button" variant="outline" className="h-12 w-full rounded-2xl text-base" onClick={() => router.push("/scan")}>
        {t.rescan}
      </Button>
    </div>
  );
}
