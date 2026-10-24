import { NextResponse } from "next/server";
import { extractMedicineBag } from "@/lib/llm";
import { handleLineBody, lineContent, linePush, lineReply, messagingConfigured } from "@/lib/line-bot";
import { lineStore } from "@/lib/line-db";
import { translateLines } from "@/lib/translate";
import type { Lang } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.LINE_MESSAGING_CHANNEL_SECRET || "";
  const token = process.env.LINE_MESSAGING_ACCESS_TOKEN || "";
  if (!messagingConfigured() || !secret) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const body = await request.text();
  if (body.length > 1_000_000) return NextResponse.json({ error: "too_large" }, { status: 413 });
  const store = await lineStore();
  if (!store) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const result = await handleLineBody(body, request.headers.get("x-line-signature"), {
    secret,
    store,
    now: new Date(),
    signingKey: process.env.LINE_DATA_KEY || secret,
    dataKey: process.env.LINE_DATA_KEY || null,
    liffId: process.env.LINE_LIFF_ID || null,
    reply: (replyToken, messages) => lineReply(token, replyToken, messages),
    push: (to, messages) => linePush(token, to, messages),
    getContent: (messageId) => lineContent(token, messageId),
    extract: (dataUrl, lang) => extractMedicineBag(dataUrl, lang),
    translate: async (text, to, from) => {
      const translated = await translateLines([text], to as Lang, from);
      return translated.ok ? translated.lines[0] || "" : null;
    },
  });
  if (result.status === 401) return NextResponse.json({ error: "signature" }, { status: 401 });
  if (result.status === 400) return NextResponse.json({ error: "bad_body" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
