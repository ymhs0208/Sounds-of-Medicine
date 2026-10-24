"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AskLine } from "@/components/ask-line";
import { EmergencyCard } from "@/components/emergency-card";
import { Button } from "@/components/ui/button";
import { features } from "@/lib/i18n/features";
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
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: "zh", from: store.lang, lines: [allergies.trim()] }),
        });
        const body = (await response.json()) as { lines?: string[] };
        if (response.ok && body.lines?.[0]) allergiesZh = body.lines[0];
      } catch {
        allergiesZh = "";
      }
    }
    store.setAllergies(allergies, allergiesZh || (store.lang === "zh" ? allergies : store.allergiesZh));
    toast(t.saved);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-8">
      <div>
        <h1 className="text-3xl font-semibold">{t.emergencyTitle}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t.emergencyLead}</p>
      </div>
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
