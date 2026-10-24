"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { launch } from "@/lib/i18n/launch";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

const ORDER: Lang[] = ["zh", "id", "vi", "fil", "th", "en"];
const HTML_LANG: Record<Lang, string> = { zh: "zh-Hant", id: "id", vi: "vi", fil: "fil", th: "th", en: "en" };
const LABEL: Record<Lang, string> = { zh: "中文", id: "Indonesia", vi: "Việt", fil: "Filipino", th: "ไทย", en: "English" };

export function LandingPage() {
  const store = useStore();
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("zh");
  useEffect(() => {
    if (store.ready && store.onboarded) router.replace("/today");
  }, [store.ready, store.onboarded, router]);
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
  }, [lang]);
  const t = launch[lang];
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <p className="text-sm font-semibold text-pine">藥聲 YaoSheng</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="語言 Language">
        {ORDER.map((item) => (
          <button key={item} type="button" className="min-h-11 rounded-full px-3 text-sm font-semibold ring-1 ring-border" onClick={() => setLang(item)} aria-pressed={item === lang}>
            {LABEL[item]}
          </button>
        ))}
      </div>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">藥聲</h1>
      <section className="mt-6">
        <h2 className="text-xl font-semibold">{t.forTitle}</h2>
        <p className="mt-2 text-base leading-relaxed">{t.forBody}</p>
      </section>
      <section className="mt-6">
        <h2 className="text-xl font-semibold">{t.doesTitle}</h2>
        <p className="mt-2 text-base leading-relaxed">{t.doesBody}</p>
      </section>
      <section className="mt-6">
        <h2 className="text-xl font-semibold">{t.notTitle}</h2>
        <p className="mt-2 text-base leading-relaxed">{t.notBody}</p>
      </section>
      <section className="mt-6">
        <h2 className="text-xl font-semibold">{t.installTitle}</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-base leading-relaxed">
          <li>{t.installAndroid}</li>
          <li>{t.installIos}</li>
          <li>{t.installDesktop}</li>
        </ul>
      </section>
      <section className="mt-6">
        <h2 className="text-xl font-semibold">{t.privacy}</h2>
        <p className="mt-2 text-base leading-relaxed">{t.privacySummary}</p>
        <Link className="mt-2 inline-flex min-h-11 items-center font-semibold underline" href="/privacy">{t.privacy}</Link>
      </section>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/start" className="inline-flex min-h-14 items-center rounded-2xl bg-pine px-5 text-lg font-semibold text-white">{t.start}</Link>
        <Link href="/disclaimer" className="inline-flex min-h-14 items-center rounded-2xl px-4 text-base font-semibold ring-1 ring-border">{t.disclaimer}</Link>
      </div>
    </main>
  );
}
