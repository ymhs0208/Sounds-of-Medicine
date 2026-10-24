import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/api-guard";
import { circleStore } from "@/lib/circle-db";
import { messagingConfigured } from "@/lib/line-bot";
import { lineStore } from "@/lib/line-db";
import { sessionFrom } from "@/lib/session";

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
  if (!member || member.role !== "owner") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const code = await db.issueCode({ circleId: member.circleId, memberId: null, kind: "group", now: new Date().toISOString() });
  return NextResponse.json({ code, expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() });
}

export async function DELETE(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });
  const db = await lineStore().catch(() => null);
  const circles = await circleStore().catch(() => null);
  if (!db || !circles) return NextResponse.json({ ok: true });
  const member = await circles.membership(session.sub);
  if (!member || member.role !== "owner") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await db.clearGroup(member.circleId);
  return NextResponse.json({ ok: true });
}
