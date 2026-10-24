import { NextResponse } from "next/server";
import { errorResponse, guardPaid, readLimited, verifyTurnstile } from "@/lib/api-guard";
import { translateLines } from "@/lib/translate";
import { isLang } from "@/lib/types";

export const runtime = "nodejs";

const MAX_BODY = 48_000;

export async function POST(request: Request) {
  const blocked = await guardPaid(request, "translate");
  if (blocked) return blocked;

  const raw = await readLimited(request, MAX_BODY);
  if (!raw.ok) return errorResponse(request, 413, "too_large");

  let body: { lines?: unknown; language?: unknown; from?: unknown; turnstileToken?: unknown };
  try {
    body = JSON.parse(raw.text) as { lines?: unknown; language?: unknown; from?: unknown; turnstileToken?: unknown };
  } catch {
    return errorResponse(request, 400, "bad_request");
  }
  const language = typeof body.language === "string" && isLang(body.language) ? body.language : undefined;
  if (!language || !Array.isArray(body.lines)) return errorResponse(request, 400, "bad_request", language);
  if (!(await verifyTurnstile(request, body.turnstileToken))) return errorResponse(request, 403, "turnstile", language);

  const lines = body.lines
    .slice(0, 40)
    .map((line) => (typeof line === "string" ? line.slice(0, 600) : ""));
  const from = typeof body.from === "string" && isLang(body.from) ? body.from : undefined;
  const result = await translateLines(lines, language, from);
  if (!result.ok) {
    if (result.error === "no_key") return NextResponse.json({ error: "no_key" }, { status: 503 });
    return errorResponse(request, 502, "bad_request", language);
  }
  return NextResponse.json({ lines: result.lines });
}
