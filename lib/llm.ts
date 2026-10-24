import { extractionHasContent, sanitizeExtraction, type Extraction } from "./extraction";
import type { Lang } from "./types";

const LANG_NAME: Record<Lang, string> = {
  zh: "Traditional Chinese",
  id: "Bahasa Indonesia",
  vi: "Vietnamese",
  fil: "Filipino (Tagalog)",
  th: "Thai",
};

const SYSTEM = `You transcribe and translate a Taiwan medicine bag (藥袋). Return one JSON object and nothing else.

Rules:
- Use ONLY text visible in the image. If a field is not printed, use null. Never guess a diagnosis, dose, indication, warning, or interaction.
- Do not add medical advice, lifestyle tips, or dosing changes. Do not say whether a medicine is safe or should be stopped.
- Keep printed Chinese in Traditional Chinese.
- ingredient is the English INN only when it is printed (example: Amlodipine). If it is not printed, use null. Do not invent it from a brand name.
- slots may only contain these values, and only when the printed usage explicitly says so:
  morning_before (早餐前 or 早上飯前), morning (早上 without 飯前/飯後), morning_after (早餐後 or 早上飯後),
  noon_before, noon, noon_after, evening_before, evening, evening_after, bedtime (睡前).
  早晚 without 飯 means ["morning","evening"]. If timing is unclear, use [].
- translation is a faithful plain-language rendering of the printed Chinese fields into the requested language. Do not add facts that are not in that Chinese field. Null Chinese means null translation.
- warningsZh lists distinct printed warning lines only.

JSON shape:
{
  "patientName": string | null,
  "hospital": string | null,
  "pharmacy": string | null,
  "dispensingDateISO": "YYYY-MM-DD" | null,
  "dispensingLabel": string | null,
  "drugs": [{
    "nameZh": string | null,
    "ingredient": string | null,
    "doseZh": string | null,
    "quantityZh": string | null,
    "usageZh": string | null,
    "indicationZh": string | null,
    "warningsZh": string[] | null,
    "slots": string[] | null,
    "translation": {
      "name": string | null,
      "dose": string | null,
      "quantity": string | null,
      "usage": string | null,
      "indication": string | null,
      "warnings": string[] | null
    }
  }]
}

dispensingDateISO: convert 民國年 by adding 1911 when the date is unambiguous, else null.
dispensingLabel: the date as printed.`;

export type LlmResult =
  | { ok: true; extraction: Extraction }
  | { ok: false; error: "no_key" | "bad_image" | "upstream" | "unreadable" };

function stripFence(raw: string): string {
  return raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}

export async function extractMedicineBag(imageDataUrl: string, lang: Lang): Promise<LlmResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: "no_key" };
  if (!imageDataUrl.startsWith("data:image/") || imageDataUrl.length > 6_000_000) {
    return { ok: false, error: "bad_image" };
  }

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
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 2200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Target language for translation: ${LANG_NAME[lang]}. Transcribe the bag and translate only what is printed.`,
              },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });
  } catch {
    return { ok: false, error: "upstream" };
  }

  if (!response.ok) return { ok: false, error: "upstream" };

  let content = "";
  try {
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    content = payload.choices?.[0]?.message?.content ?? "";
  } catch {
    return { ok: false, error: "upstream" };
  }

  let json: unknown;
  try {
    json = JSON.parse(stripFence(content));
  } catch {
    return { ok: false, error: "unreadable" };
  }

  const extraction = sanitizeExtraction(json);
  if (!extraction || !extractionHasContent(extraction)) return { ok: false, error: "unreadable" };
  return { ok: true, extraction };
}
