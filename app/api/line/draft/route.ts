import { NextResponse } from "next/server";
import { lineStore } from "@/lib/line-db";
import { openJson } from "@/lib/line-seal";
import { sessionFrom } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });
  const key = process.env.LINE_DATA_KEY || "";
  if (!key) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(id)) return NextResponse.json({ error: "missing" }, { status: 404 });
  const db = await lineStore().catch(() => null);
  if (!db) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const now = new Date().toISOString();
  const peeked = db.peekDraft(id, now);
  if (!peeked) return NextResponse.json({ error: "missing" }, { status: 404 });
  const mine = db.linksForSub(session.sub);
  const allowed = peeked.lineUserId === session.sub || mine.some((link) => link.lineUserId === peeked.lineUserId);
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const draft = await db.takeDraft(id, now);
  if (!draft) return NextResponse.json({ error: "missing" }, { status: 404 });
  const opened = await openJson<unknown>(draft.cipher, key);
  if (!opened) return NextResponse.json({ error: "missing" }, { status: 404 });
  return NextResponse.json({ kind: draft.kind, payload: opened });
}
