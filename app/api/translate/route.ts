import { NextResponse } from "next/server";
import { translateLines } from "@/lib/translate";
import { isLang } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { lines?: unknown; language?: string; from?: string };
  try {
    body = (await request.json()) as { lines?: unknown; language?: string };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.language || !isLang(body.language) || !Array.isArray(body.lines)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const lines = body.lines.map((line) => (typeof line === "string" ? line : "")).slice(0, 40);
  const from = body.from && isLang(body.from) ? body.from : undefined;
  const result = await translateLines(lines, body.language, from);
  if (!result.ok) {
    const status = result.error === "no_key" ? 503 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ lines: result.lines });
}
