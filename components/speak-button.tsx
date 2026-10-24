"use client";

import { useEffect, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { spokenScript } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { speak, stopSpeaking } from "@/lib/speech";
import type { Drug, Lang } from "@/lib/types";

export function SpeakButton({ drug, lang }: { drug: Drug; lang: Lang }) {
  const t = ui[lang];
  const [active, setActive] = useState<"care" | "zh" | null>(null);

  useEffect(() => () => stopSpeaking(), []);

  async function play(target: Lang, which: "care" | "zh") {
    if (active) {
      stopSpeaking();
      setActive(null);
      return;
    }
    setActive(which);
    const result = await speak(spokenScript(drug, target), target);
    setActive(null);
    if (result !== "ok") toast(t.voiceMissing);
  }

  return (
    <div className="rounded-3xl bg-card px-4 py-4 ring-1 ring-foreground/10">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => play(lang, "care")}
          className="grid size-[4.5rem] shrink-0 place-items-center rounded-full bg-pine text-white shadow-md"
          aria-label={active === "care" ? t.cardStop : t.cardPlay}
        >
          {active === "care" ? <Square className="size-6" /> : <Volume2 className="size-8" />}
        </button>
        <div className="min-w-0">
          <div className="text-xl font-semibold">{active === "care" ? t.cardStop : t.cardPlay}</div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.spokenHint}</p>
        </div>
      </div>
      {active === "care" ? (
        <div className="mt-3 flex h-6 items-end gap-1" aria-hidden="true">
          <span className="w-1.5 animate-pulse rounded-full bg-pine [animation-duration:500ms] h-3" />
          <span className="w-1.5 animate-pulse rounded-full bg-pine [animation-duration:700ms] h-6" />
          <span className="w-1.5 animate-pulse rounded-full bg-pine [animation-duration:600ms] h-4" />
        </div>
      ) : null}
      {lang !== "zh" ? (
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-11 w-full rounded-2xl text-base"
          onClick={() => play("zh", "zh")}
        >
          {active === "zh" ? t.cardStop : t.cardPlayZh}
        </Button>
      ) : null}
    </div>
  );
}
