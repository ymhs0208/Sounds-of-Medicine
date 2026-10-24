import { NextResponse } from "next/server";
import { errorResponse, guardPaid, readLimited, verifyTurnstile } from "@/lib/api-guard";
import { checkImageDataUrl } from "@/lib/image-guard";
import { extractMedicineBag } from "@/lib/llm";
import { isLang } from "@/lib/types";

export const runtime = "nodejs";

const MAX_BODY = 1_600_000;

export async function POST(request: Request) {
  const blocked = await guardPaid(request, "extract");
  if (blocked) return blocked;

  const raw = await readLimited(request, MAX_BODY);
  if (!raw.ok) return errorResponse(request, 413, "too_large");

  let body: { imageDataUrl?: unknown; language?: unknown; turnstileToken?: unknown };
  try {
    body = JSON.parse(raw.text) as { imageDataUrl?: unknown; language?: unknown; turnstileToken?: unknown };
  } catch {
    return errorResponse(request, 400, "bad_image");
  }
  const language = typeof body.language === "string" && isLang(body.language) ? body.language : undefined;
  if (!language || typeof body.imageDataUrl !== "string") return errorResponse(request, 400, "bad_image", language);
  if (!(await verifyTurnstile(request, body.turnstileToken))) return errorResponse(request, 403, "turnstile", language);
  if (!checkImageDataUrl(body.imageDataUrl).ok) return errorResponse(request, 400, "bad_image", language);

  const result = await extractMedicineBag(body.imageDataUrl, language);
  if (!result.ok) {
    if (result.error === "no_key") return NextResponse.json({ error: "no_key" }, { status: 503 });
    if (result.error === "bad_image") return errorResponse(request, 400, "bad_image", language);
    return errorResponse(request, 502, "bad_request", language);
  }
  return NextResponse.json({ extraction: result.extraction });
}
