import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/api-guard";
import { circleStore } from "@/lib/circle-db";
import { messagingConfigured } from "@/lib/line-bot";
import { lineStore } from "@/lib/line-db";
import { sessionFrom } from "@/lib/session";
import { isLang } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  if (!messagingConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });
  const db = await lineStore().catch(() => null);
  const circles = await circleStore().catch(() => null);
  if (!db || !circles) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const member = await circles.membership(session.sub);
  if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { lang?: string };
  const now = new Date().toISOString();
  await db.ensureLink({
    id: member.memberId,
    circleId: member.circleId,
    memberId: member.memberId,
    lineSub: session.sub,
    lang: body.lang && isLang(body.lang) ? body.lang : "zh",
    role: member.role,
    now,
  });
  const code = await db.issueCode({ circleId: member.circleId, memberId: member.memberId, kind: "user", now });
  return NextResponse.json({ code, expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() });
}

export async function DELETE(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });
  const db = await lineStore().catch(() => null);
  if (db) await db.unlinkSub(session.sub, new Date().toISOString());
  return NextResponse.json({ ok: true });
}
