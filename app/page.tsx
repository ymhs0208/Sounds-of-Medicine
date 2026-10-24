"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { LanguagePicker } from "@/components/language-picker";
import { Logo } from "@/components/logo";
import { ui } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

export default function OnboardingPage() {
  const store = useStore();
  const router = useRouter();
  const [selected, setSelected] = useState<Lang | null>(null);
  const [consent, setConsent] = useState(false);
  const t = ui[selected ?? "zh"];

  useEffect(() => {
    if (store.ready && store.onboarded) router.replace("/today");
  }, [store.ready, store.onboarded, router]);

  if (!store.ready || store.onboarded) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Logo className="size-14" />
      </div>
    );
  }

  const ready = Boolean(selected) && consent;

  return (
    <div className="flex min-h-full flex-col">
      <div className="bg-pine px-5 pt-10 pb-8 text-white">
        <Logo className="size-12" />
        <p className="mt-6 text-sm text-white/80">{t.madeFor}</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">藥聲</h1>
        <p className="mt-3 max-w-[18rem] text-lg leading-snug">{t.tagline}</p>
      </div>
      <div className="flex flex-1 flex-col gap-5 px-4 py-5">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-pine">{t.stepLanguage}</h2>
          <LanguagePicker value={selected} onChange={setSelected} />
        </section>
        <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
          <h2 className="text-sm font-semibold text-pine">{t.consentTitle}</h2>
          <label className="mt-3 flex gap-3">
            <Checkbox
              checked={consent}
              onCheckedChange={(checked) => setConsent(checked)}
              aria-label={t.consentLabel}
              className="mt-1 size-6 rounded-md"
            />
            <span className="text-base leading-relaxed font-medium">{t.consentLabel}</span>
          </label>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.consentDetail}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.consentHint}</p>
        </section>
        <div className="mt-auto pt-2">
          {!ready ? <p className="mb-2 text-center text-sm text-muted-foreground">{t.consentRequired}</p> : null}
          <Button
            type="button"
            disabled={!ready}
            className="h-14 w-full rounded-2xl text-lg"
            onClick={() => {
              if (!selected || !consent) return;
              store.completeOnboarding(selected);
              router.push("/today");
            }}
          >
            {t.continue}
          </Button>
        </div>
      </div>
    </div>
  );
}
