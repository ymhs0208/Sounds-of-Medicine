"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/disclaimer";
import { LanguagePicker } from "@/components/language-picker";
import { Logo, Wordmark } from "@/components/logo";
import { APP_NAME_LATIN } from "@/lib/brand";
import { ui } from "@/lib/i18n";
import { features } from "@/lib/i18n/features";
import { launch } from "@/lib/i18n/launch";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const store = useStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Lang | null>(null);
  const [consent, setConsent] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [familyContact, setFamilyContact] = useState("");
  const t = ui[selected ?? "zh"];
  const ft = features[selected ?? "zh"];
  const labels = [t.stepLanguage, ft.stepPeople, t.stepConsent];

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

  const peopleReady = patientName.trim().length > 0 && familyContact.trim().length > 0;
  const ready = Boolean(selected) && consent && peopleReady;

  function next() {
    if (step === 0 && !selected) return;
    if (step === 1 && !peopleReady) return;
    setStep((value) => Math.min(2, value + 1));
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="bg-pine px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-8 text-white lg:px-10">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex items-center gap-3">
            <Logo className="size-12" />
            <div>
              <h1><Wordmark className="block text-2xl text-white" /></h1>
              <p className="text-sm text-white/80">{APP_NAME_LATIN}</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-white/80">{t.madeFor}</p>
          <p className="mt-3 text-lg leading-snug">{t.tagline}</p>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2" role="group" aria-label={labels[step]}>
          {labels.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              aria-current={index === step ? "step" : undefined}
              disabled={index > step}
              onClick={() => setStep(index)}
              className={cn("h-2.5 flex-1 rounded-full", index <= step ? "bg-pine" : "bg-border")}
            />
          ))}
        </div>
        <p className="text-sm font-semibold text-pine">{labels[step]}</p>

        {step === 0 ? (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-pine">{t.pickLanguage}</h2>
            <LanguagePicker value={selected} onChange={setSelected} />
          </section>
        ) : null}

        {step === 1 ? (
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
        ) : null}

        {step === 2 ? (
          <section className="ys-card p-4">
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
        ) : null}

        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          {step > 0 ? (
            <Button type="button" variant="outline" className="h-14 rounded-2xl text-lg" onClick={() => setStep((value) => value - 1)}>
              {ft.onboardBack}
            </Button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <Button
              type="button"
              className="h-14 rounded-2xl text-lg"
              disabled={(step === 0 && !selected) || (step === 1 && !peopleReady)}
              onClick={next}
            >
              {ft.onboardNext}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!ready}
              className="h-14 rounded-2xl text-lg"
              onClick={() => {
                if (!selected || !consent) return;
                store.completeOnboarding({ lang: selected, patientName, familyContact });
                router.push("/today");
              }}
            >
              {t.continue}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
