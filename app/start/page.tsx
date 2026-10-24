"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/disclaimer";
import { LanguagePicker } from "@/components/language-picker";
import { Logo } from "@/components/logo";
import { ui } from "@/lib/i18n";
import { launch } from "@/lib/i18n/launch";
import Link from "next/link";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

export default function OnboardingPage() {
  const store = useStore();
  const router = useRouter();
  const [selected, setSelected] = useState<Lang | null>(null);
  const [consent, setConsent] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [familyContact, setFamilyContact] = useState("");
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

  const ready = Boolean(selected) && consent && patientName.trim().length > 0 && familyContact.trim().length > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="bg-pine px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-8 text-white lg:px-10">
        <div className="mx-auto w-full max-w-2xl">
          <Logo className="size-12" />
          <p className="mt-6 text-sm text-white/80">{t.madeFor}</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">藥聲</h1>
          <p className="mt-3 text-lg leading-snug">{t.tagline}</p>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <section className="space-y-3">
          <label className="block text-sm font-semibold text-pine">
            {t.patientNameField}
            <input
              className="mt-1 w-full rounded-2xl border border-border bg-card px-3 py-3 text-base"
              value={patientName}
              onChange={(event) => setPatientName(event.target.value)}
            />
            <span className="mt-1 block text-sm font-normal text-muted-foreground">{t.patientNameHint}</span>
          </label>
          <label className="block text-sm font-semibold text-pine">
            {t.familyContactField}
            <input
              className="mt-1 w-full rounded-2xl border border-border bg-card px-3 py-3 text-base"
              value={familyContact}
              onChange={(event) => setFamilyContact(event.target.value)}
            />
            <span className="mt-1 block text-sm font-normal text-muted-foreground">{t.familyContactHint}</span>
          </label>
        </section>
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
          <div className="mt-3">
            <Disclaimer lang={selected ?? "zh"} />
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            {launch[selected ?? "zh"].consentLinks}{" "}
            <Link className="font-semibold underline" href="/privacy">{launch[selected ?? "zh"].privacy}</Link>
            {" · "}
            <Link className="font-semibold underline" href="/terms">{launch[selected ?? "zh"].terms}</Link>
            {" · "}
            <Link className="font-semibold underline" href="/disclaimer">{launch[selected ?? "zh"].disclaimer}</Link>
          </p>
        </section>
        <div className="mt-auto pt-2">
          {!ready ? <p className="mb-2 text-center text-sm text-muted-foreground">{t.onboardingMissing}</p> : null}
          <Button
            type="button"
            disabled={!ready}
            className="h-14 w-full rounded-2xl text-lg"
            onClick={() => {
              if (!selected || !consent) return;
              store.completeOnboarding({
                lang: selected,
                patientName,
                familyContact,
              });
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
