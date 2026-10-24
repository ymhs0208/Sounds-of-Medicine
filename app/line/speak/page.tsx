"use client";

import { useEffect, useState } from "react";
import { lineCopy } from "@/lib/i18n/line";
import { LINE_DISCLAIMER } from "@/lib/line-messages";
import { useStore } from "@/lib/store";

export default function LineSpeakPage() {
  const store = useStore();
  const t = lineCopy[store.lang];
  const [text, setText] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("draft");
    if (!id) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      void fetch(`/api/line/draft?id=${encodeURIComponent(id)}`)
        .then(async (response) => {
          if (!response.ok) {
            if (tries > 8) window.clearInterval(timer);
            return;
          }
          window.clearInterval(timer);
          const body = (await response.json()) as { payload?: { text?: string } };
          setText(body.payload?.text || "");
        })
        .catch(() => undefined);
    }, 700);
    return () => window.clearInterval(timer);
  }, []);

  function speak() {
    if (!text || typeof speechSynthesis === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = store.lang === "zh" ? "zh-TW" : store.lang === "fil" ? "fil-PH" : store.lang;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-semibold">{t.readTitle}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.readBody}</p>
      <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed">{text}</p>
      <p className="mt-3 text-sm leading-relaxed">{LINE_DISCLAIMER[store.lang]}</p>
      <button type="button" className="mt-4 min-h-12 rounded-2xl bg-pine px-4 font-semibold text-white" onClick={speak}>
        {t.speak}
      </button>
    </div>
  );
}
