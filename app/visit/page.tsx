"use client";

import Link from "next/link";
import { toast } from "sonner";
import { AskLine } from "@/components/ask-line";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { summaryText, VisitSheet } from "@/components/visit-sheet";
import { features } from "@/lib/i18n/features";
import { todayISO } from "@/lib/format";
import { buildVisitSummary } from "@/lib/summary";
import { useStore } from "@/lib/store";

export default function VisitPage() {
  const store = useStore();
  const t = features[store.lang];
  const summary = buildVisitSummary(store, todayISO());

  async function share() {
    const text = summaryText(summary);
    if (navigator.share) {
      try {
        await navigator.share({ title: "藥聲回診資料", text });
        return;
      } catch {
        /* Copy remains available when share is cancelled or unsupported. */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast(t.visitCopied);
    } catch {
      toast(text);
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <PageHeader title={t.visitTitle} lead={t.visitLead} />
      <AskLine lang={store.lang} />
      <div className="flex flex-wrap gap-2">
        <Button nativeButton={false} className="h-12 rounded-2xl sm:w-auto" render={<Link href="/visit/print" />}>
          {t.visitPrint}
        </Button>
        <Button type="button" variant="outline" className="h-12 rounded-2xl" onClick={() => void share()}>
          {t.visitShare}
        </Button>
      </div>
      <VisitSheet summary={summary} />
    </div>
  );
}
