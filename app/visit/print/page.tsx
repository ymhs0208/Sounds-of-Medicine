"use client";

import Link from "next/link";
import { VisitSheet } from "@/components/visit-sheet";
import { features } from "@/lib/i18n/features";
import { todayISO } from "@/lib/format";
import { buildVisitSummary } from "@/lib/summary";
import { useStore } from "@/lib/store";

export default function VisitPrintPage() {
  const store = useStore();
  const t = features.zh;
  const summary = buildVisitSummary(store, todayISO());
  return (
    <div className="mx-auto w-full max-w-[210mm] px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="no-print mb-6 flex flex-wrap gap-2">
        <Link href="/visit" className="inline-flex min-h-11 items-center rounded-full border border-[#e0d6c4] px-4 text-base font-semibold">
          返回
        </Link>
        <button type="button" className="inline-flex min-h-11 items-center rounded-full bg-[#1b5e45] px-4 text-base font-semibold text-white" onClick={() => window.print()}>
          {t.visitPrint}
        </button>
      </div>
      <VisitSheet summary={summary} />
    </div>
  );
}
