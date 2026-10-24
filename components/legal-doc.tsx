"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/logo";
import { launch } from "@/lib/i18n/launch";
import { legal, type LegalKind } from "@/lib/legal";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

const ORDER: Lang[] = ["zh", "id", "vi", "fil", "th", "en"];
const HTML_LANG: Record<Lang, string> = { zh: "zh-Hant", id: "id", vi: "vi", fil: "fil", th: "th", en: "en" };

export function LegalDoc({ kind }: { kind: LegalKind }) {
  const store = useStore();
  const [lang, setLang] = useState<Lang>("zh");
  useEffect(() => {
    if (store.ready && store.lang) setLang(store.lang);
  }, [store.ready, store.lang]);
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
  }, [lang]);
  const doc = legal[lang][kind];
  const t = launch[lang];
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <p className="text-sm font-semibold text-pine"><Wordmark /></p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="語言 Language">
        {ORDER.map((item) => (
          <button key={item} type="button" className="min-h-11 rounded-full px-3 text-sm font-semibold ring-1 ring-border" onClick={() => setLang(item)} aria-pressed={item === lang}>
            {item === "zh" ? "中文" : item === "id" ? "Indonesia" : item === "vi" ? "Việt" : item === "fil" ? "Filipino" : item === "th" ? "ไทย" : "English"}
          </button>
        ))}
      </div>
      <h1 className="mt-4 text-3xl font-semibold">{doc.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{doc.updated}</p>
      {doc.sections.map((section) => (
        <section key={section.heading} className="mt-6">
          <h2 className="text-xl font-semibold">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-2 text-base leading-relaxed">{paragraph}</p>
          ))}
        </section>
      ))}
      <nav className="mt-8 flex flex-wrap gap-4 text-base font-semibold">
        <Link className="min-h-11 underline" href="/privacy">{t.privacy}</Link>
        <Link className="min-h-11 underline" href="/terms">{t.terms}</Link>
        <Link className="min-h-11 underline" href="/disclaimer">{t.disclaimer}</Link>
        <Link className="min-h-11 underline" href="/start">{t.start}</Link>
      </nav>
    </main>
  );
}
