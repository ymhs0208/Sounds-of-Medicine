import type { Lang } from "./types";

const LANG_NAME: Record<Lang, string> = {
  zh: "Traditional Chinese",
  id: "Bahasa Indonesia",
  vi: "Vietnamese",
  fil: "Filipino (Tagalog)",
  th: "Thai",
  en: "English",
};

export type TranslateResult =
  | { ok: true; lines: string[] }
  | { ok: false; error: "no_key" | "upstream" };

export async function translateLines(lines: string[], lang: Lang, from?: Lang): Promise<TranslateResult> {
  const source = from ?? "zh";
  if (source === lang) return { ok: true, lines };
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: "no_key" };
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Translate each line into the requested language. Keep the same array length and order. Do not answer questions, add medical advice, change doses, or add facts that are not in the source line. A question stays a question. Empty strings stay empty. Return JSON {\"lines\": string[]}.",
          },
          {
            role: "user",
            content: JSON.stringify({
              sourceLanguage: LANG_NAME[source],
              language: LANG_NAME[lang],
              lines,
            }),
          },
        ],
      }),
    });
  } catch {
    return { ok: false, error: "upstream" };
  }
  if (!response.ok) return { ok: false, error: "upstream" };
  try {
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as { lines?: unknown };
    if (!Array.isArray(parsed.lines) || parsed.lines.length !== lines.length) return { ok: false, error: "upstream" };
    return { ok: true, lines: parsed.lines.map((line) => (typeof line === "string" ? line.trim() : "")) };
  } catch {
    return { ok: false, error: "upstream" };
  }
}
