"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import { toast } from "sonner";
import { AskLine } from "@/components/ask-line";
import { Button } from "@/components/ui/button";
import { features } from "@/lib/i18n/features";
import { listenOnce, speechInputSupport } from "@/lib/listen";
import { PHRASES, type Phrase } from "@/lib/phrases";
import { staticDemo } from "@/lib/routes";
import { speak } from "@/lib/speech";
import { useStore } from "@/lib/store";
import type { TalkCard } from "@/lib/types";

export default function TalkPage() {
  const store = useStore();
  const t = features[store.lang];
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [listening, setListening] = useState(false);
  const [focus, setFocus] = useState<TalkCard | null>(null);
  const [large, setLarge] = useState(false);
  const history = [...store.talks].reverse();

  async function toChinese(line: string): Promise<string> {
    if (store.lang === "zh" || staticDemo) return store.lang === "zh" ? line : "";
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "zh", from: store.lang, lines: [line] }),
      });
      const body = (await response.json()) as { lines?: string[]; error?: string };
      if (!response.ok || !body.lines?.[0]) {
        toast(t.talkNoKey);
        return "";
      }
      return body.lines[0];
    } catch {
      toast(t.talkNoKey);
      return "";
    }
  }

  function open(card: TalkCard) {
    setFocus(card);
    setLarge(true);
  }

  function sendPreset(phrase: Phrase) {
    const card = store.addTalk({
      direction: "to-zh",
      sourceLang: store.lang,
      text: phrase.text[store.lang],
      textZh: phrase.text.zh,
      textCare: phrase.text[store.lang],
      presetId: phrase.id,
    });
    open(card);
  }

  async function sendTyped() {
    const line = text.trim();
    if (!line) return;
    const textZh = await toChinese(line);
    const card = store.addTalk({
      direction: "to-zh",
      sourceLang: store.lang,
      text: line,
      textZh,
      textCare: line,
    });
    setText("");
    open(card);
  }

  async function speakLine() {
    if (!speechInputSupport()) {
      toast(t.talkUnsupported);
      return;
    }
    setListening(true);
    const heard = await listenOnce(store.lang);
    setListening(false);
    if (heard === "unsupported") toast(t.talkUnsupported);
    else if (heard === "denied") toast(t.talkDenied);
    else if (heard === "empty") toast(t.talkEmpty);
    else setText(heard);
  }

  async function sendReply() {
    const line = reply.trim();
    if (!line) return;
    let care = line;
    if (store.lang !== "zh" && !staticDemo) {
      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: store.lang, from: "zh", lines: [line] }),
        });
        const body = (await response.json()) as { lines?: string[] };
        if (response.ok && body.lines?.[0]) care = body.lines[0];
        else toast(t.talkNoKey);
      } catch {
        toast(t.talkNoKey);
      }
    }
    const card = store.addTalk({
      direction: "from-zh",
      sourceLang: "zh",
      text: line,
      textZh: line,
      textCare: care,
    });
    setReply("");
    setFocus(card);
    setLarge(false);
    if (care) void speak(care, store.lang);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-8">
      <div>
        <h1 className="text-3xl font-semibold">{t.talkTitle}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t.talkLead}</p>
      </div>
      <AskLine lang={store.lang} />
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-pine">{t.talkPreset}</h2>
        <div className="grid gap-2">
          {PHRASES.map((phrase) => (
            <button
              key={phrase.id}
              type="button"
              className="min-h-14 rounded-2xl bg-card px-4 py-3 text-left text-base leading-snug font-semibold ring-1 ring-border"
              onClick={() => sendPreset(phrase)}
            >
              {phrase.text[store.lang]}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-2 rounded-3xl bg-card p-4 ring-1 ring-border">
        <label className="block text-sm font-semibold text-pine">
          {t.talkType}
          <textarea className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-3 text-base" rows={3} value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" className="h-auto min-h-12 rounded-2xl" onClick={() => void speakLine()}>
            <Mic className="size-5" />
            {listening ? t.talkListening : t.talkSpeak}
          </Button>
          <Button type="button" className="h-auto min-h-12 rounded-2xl" onClick={() => void sendTyped()}>
            {t.talkShow}
          </Button>
        </div>
      </section>
      <section className="space-y-2 rounded-3xl bg-card p-4 ring-1 ring-border">
        <label className="block text-sm font-semibold text-pine">
          {t.talkReply}
          <textarea className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-3 text-base" rows={3} value={reply} onChange={(event) => setReply(event.target.value)} />
        </label>
        <p className="text-sm leading-relaxed text-muted-foreground">{t.talkReplyHint}</p>
        <Button type="button" className="h-auto min-h-12 w-full rounded-2xl" onClick={() => void sendReply()}>
          {t.talkSendReply}
        </Button>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t.talkHistory}</h2>
        {history.length === 0 ? <p className="text-sm text-muted-foreground">{t.talkPreset}</p> : null}
        {history.map((card) => (
          <button key={card.id} type="button" className="block w-full min-w-0 rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-border" onClick={() => open(card)}>
            <span className="block text-base font-semibold break-words">{card.textCare || card.text}</span>
            {card.textZh ? <span className="mt-1 block text-sm break-words text-muted-foreground">{card.textZh}</span> : null}
          </button>
        ))}
      </section>
      {large && focus ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
            <p className="text-sm font-semibold text-pine">{t.talkChinese}</p>
            <h2 className="mt-3 text-4xl leading-tight font-semibold break-words sm:text-5xl">{focus.textZh || focus.text}</h2>
            <p className="mt-6 text-sm font-semibold text-muted-foreground">{t.talkOriginal}</p>
            <p className="mt-1 text-lg leading-snug break-words">{focus.textCare || focus.text}</p>
            <div className="mt-auto space-y-3 pt-6">
              <AskLine lang="zh" />
              <Button type="button" variant="outline" className="h-14 w-full rounded-2xl text-lg" onClick={() => setLarge(false)}>
                {t.talkHide}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
