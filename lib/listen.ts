import type { Lang } from "./types";

const TAG: Record<Lang, string> = {
  zh: "zh-TW",
  id: "id-ID",
  vi: "vi-VN",
  fil: "fil-PH",
  th: "th-TH",
  en: "en-US",
};

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function ctor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

export function speechInputSupport(): boolean {
  return Boolean(ctor());
}

export function listenOnce(lang: Lang): Promise<string | "unsupported" | "denied" | "empty"> {
  const Recognition = ctor();
  if (!Recognition) return Promise.resolve("unsupported");
  return new Promise((resolve) => {
    const recognition = new Recognition();
    recognition.lang = TAG[lang];
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    let settled = false;
    const finish = (value: string | "unsupported" | "denied" | "empty") => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim() ?? "";
      finish(text || "empty");
    };
    recognition.onerror = (event) => {
      finish(event.error === "not-allowed" || event.error === "service-not-allowed" ? "denied" : "empty");
    };
    recognition.onend = () => finish("empty");
    try {
      recognition.start();
    } catch {
      finish("unsupported");
    }
  });
}
