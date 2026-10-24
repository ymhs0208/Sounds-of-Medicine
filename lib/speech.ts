import type { Lang } from "./types";

const TAGS: Record<Lang, string[]> = {
  zh: ["zh-TW", "zh-HK", "zh-CN", "zh"],
  id: ["id-ID", "id"],
  vi: ["vi-VN", "vi"],
  fil: ["fil-PH", "fil", "tl-PH", "tl"],
  th: ["th-TH", "th"],
  en: ["en-US", "en-GB", "en"],
};

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve([]);
  const existing = window.speechSynthesis.getVoices();
  if (existing.length) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const finish = () => resolve(window.speechSynthesis.getVoices());
    const timer = window.setTimeout(finish, 700);
    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timer);
      finish();
    };
  });
}

function matchVoice(voices: SpeechSynthesisVoice[], lang: Lang): SpeechSynthesisVoice | undefined {
  const tags = TAGS[lang].map((tag) => tag.toLowerCase());
  const exact = voices.find((voice) => tags.includes(voice.lang.toLowerCase().replace("_", "-")));
  if (exact) return exact;
  return voices.find((voice) => {
    const code = voice.lang.toLowerCase().replace("_", "-");
    return tags.some((tag) => code.startsWith(tag.split("-")[0] ?? tag));
  });
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export async function speak(text: string, lang: Lang): Promise<"ok" | "unavailable" | "no-voice"> {
  if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) {
    return "unavailable";
  }
  const voices = await loadVoices();
  const voice = matchVoice(voices, lang);
  if (!voice) return "no-voice";
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = lang === "th" ? 0.9 : 0.96;
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();
  return new Promise((resolve) => {
    let settled = false;
    const done = (result: "ok" | "unavailable") => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    utterance.onend = () => done("ok");
    utterance.onerror = () => done("unavailable");
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      done("unavailable");
      return;
    }
    window.setTimeout(() => done("ok"), Math.min(20000, 2500 + text.length * 80));
  });
}
