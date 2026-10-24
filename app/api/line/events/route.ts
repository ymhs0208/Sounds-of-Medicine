import { NextResponse } from "next/server";
import { circleStore } from "@/lib/circle-db";
import { openDoseEvent } from "@/lib/line-events";
import { lineStore } from "@/lib/line-db";
import { messagingConfigured } from "@/lib/line-bot";
import { sessionFrom } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!messagingConfigured()) return NextResponse.json({ enabled: false, events: [] });
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });
  const db = await lineStore().catch(() => null);
  const circles = await circleStore().catch(() => null);
  if (!db || !circles) return NextResponse.json({ enabled: false, events: [] });
  const member = await circles.membership(session.sub);
  if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const since = new URL(request.url).searchParams.get("since");
  const secret = process.env.LINE_DATA_KEY || process.env.LINE_MESSAGING_CHANNEL_SECRET || "";
  const events = [];
  for (const row of db.eventsSince(member.circleId, since)) {
    const opened = await openDoseEvent(row.body, row.sig, secret);
    if (opened) events.push({ ...opened, id: row.id });
  }
  return NextResponse.json({ enabled: true, events });
}
