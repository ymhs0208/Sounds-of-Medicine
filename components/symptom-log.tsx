"use client";

import { useState } from "react";
import { CloudFog, Droplets, HeartPulse, PersonStanding, Utensils, Waves } from "lucide-react";
import { toast } from "sonner";
import { AskLine } from "@/components/ask-line";
import { Button } from "@/components/ui/button";
import { features } from "@/lib/i18n/features";
import { staticDemo } from "@/lib/routes";
import { useStore } from "@/lib/store";
import type { SymptomKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const KINDS: { id: SymptomKind; icon: typeof Waves; label: "kindVomit" | "kindDizzy" | "kindFall" | "kindAppetite" | "kindBp" | "kindSugar" }[] = [
  { id: "vomit", icon: Waves, label: "kindVomit" },
  { id: "dizzy", icon: CloudFog, label: "kindDizzy" },
  { id: "fall", icon: PersonStanding, label: "kindFall" },
  { id: "appetite", icon: Utensils, label: "kindAppetite" },
  { id: "bp", icon: HeartPulse, label: "kindBp" },
  { id: "sugar", icon: Droplets, label: "kindSugar" },
];

export function SymptomLog() {
  const store = useStore();
  const t = features[store.lang];
  const [kind, setKind] = useState<SymptomKind>("vomit");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const needsValue = kind === "bp" || kind === "sugar";

  async function save() {
    if (needsValue && !value.trim()) {
      toast(t.symptomNeedValue);
      return;
    }
    let noteZh = store.lang === "zh" ? note.trim() : "";
    if (store.lang !== "zh" && note.trim() && !staticDemo) {
      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: "zh", from: store.lang, lines: [note.trim()] }),
        });
        const body = (await response.json()) as { lines?: string[] };
        if (response.ok && body.lines?.[0]) noteZh = body.lines[0];
      } catch {
        noteZh = "";
      }
    }
    store.addSymptom({ kind, note, noteZh, value: needsValue ? value : undefined });
    setValue("");
    setNote("");
    toast(t.saved);
  }

  return (
    <section className="space-y-3 rounded-3xl bg-card p-4 ring-1 ring-border">
      <h2 className="text-lg font-semibold">{t.symptomTitle}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{t.symptomLead}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {KINDS.map((item) => {
          const Icon = item.icon;
          const on = kind === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setKind(item.id)}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center text-sm leading-tight font-semibold",
                on ? "border-pine bg-accent" : "border-border",
              )}
            >
              <Icon className="size-6 shrink-0" aria-hidden="true" />
              {t[item.label]}
            </button>
          );
        })}
      </div>
      {needsValue ? (
        <label className="block text-sm font-semibold text-pine">
          {t.symptomValue}
          <input
            className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-3 text-base"
            inputMode="decimal"
            placeholder={kind === "bp" ? t.symptomBp : t.symptomSugar}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
      ) : null}
      <label className="block text-sm font-semibold text-pine">
        {t.symptomNote}
        <textarea className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-3 text-base" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <Button type="button" className="h-auto min-h-12 w-full rounded-2xl" onClick={() => void save()}>
        {t.symptomSave}
      </Button>
      <AskLine lang={store.lang} />
    </section>
  );
}
