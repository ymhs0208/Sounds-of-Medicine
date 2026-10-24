"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AskLine } from "@/components/ask-line";
import { PageHeader } from "@/components/page-header";
import { EmergencyCard } from "@/components/emergency-card";
import { Button } from "@/components/ui/button";
import { features } from "@/lib/i18n/features";
import { paidPost } from "@/lib/paid-client";
import { staticDemo } from "@/lib/routes";
import { useStore } from "@/lib/store";

export default function EmergencyPage() {
  const store = useStore();
  const t = features[store.lang];
  const [allergies, setAllergies] = useState(store.allergies);

  useEffect(() => {
    if (store.ready) setAllergies(store.allergies);
  }, [store.ready, store.allergies]);

  async function save() {
    let allergiesZh = store.lang === "zh" ? allergies.trim() : "";
    if (store.lang !== "zh" && allergies.trim() && !staticDemo) {
      try {
        const response = await paidPost("/api/translate", { language: "zh", from: store.lang, lines: [allergies.trim()] }, store.lang);
        const body = response.body as { lines?: string[]; message?: string };
        if (response.status === 429 || response.status === 413) toast(body.message || t.saved);
        if (response.status === 200 && body.lines?.[0]) allergiesZh = body.lines[0];
      } catch {
        allergiesZh = "";
      }
    }
    store.setAllergies(allergies, allergiesZh || (store.lang === "zh" ? allergies : store.allergiesZh));
    toast(t.saved);
  }

  return (
    <div className="space-y-4 pb-8">
      <PageHeader title={t.emergencyTitle} lead={t.emergencyLead} />
      <AskLine lang={store.lang} />
      <label className="block text-sm font-semibold text-pine">
        {t.emergencyAllergies}
        <textarea className="mt-1 w-full rounded-2xl border border-border bg-card px-3 py-3 text-base" rows={2} value={allergies} onChange={(event) => setAllergies(event.target.value)} />
        <span className="mt-1 block font-normal text-muted-foreground">{t.allergiesHint}</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-12 rounded-2xl" onClick={() => void save()}>
          {t.emergencySave}
        </Button>
        <Button nativeButton={false} variant="outline" className="h-12 rounded-2xl" render={<Link href="/emergency/print" />}>
          {t.emergencyPrint}
        </Button>
      </div>
      <EmergencyCard qr />
    </div>
  );
}
