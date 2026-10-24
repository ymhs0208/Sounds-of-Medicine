import { NextResponse } from "next/server";
import { extractMedicineBag } from "@/lib/llm";
import { isLang } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { imageDataUrl?: string; language?: string };
  try {
    body = (await request.json()) as { imageDataUrl?: string; language?: string };
  } catch {
    return NextResponse.json({ error: "bad_image" }, { status: 400 });
  }
  if (!body.imageDataUrl || !body.language || !isLang(body.language)) {
    return NextResponse.json({ error: "bad_image" }, { status: 400 });
  }
  const result = await extractMedicineBag(body.imageDataUrl, body.language);
  if (!result.ok) {
    const status = result.error === "no_key" ? 503 : result.error === "bad_image" ? 400 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ extraction: result.extraction });
}
