import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/api-guard";
import { circleStore } from "@/lib/circle-db";
import { validId } from "@/lib/circle-store";
import { sessionFrom } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  const store = await circleStore();
  if (!store) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });
  let body: { memberId?: unknown };
  try {
    body = (await request.json()) as { memberId?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof body.memberId !== "string" || !validId(body.memberId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const removed = await store.removeMember({ actorSub: session.sub, memberId: body.memberId, now: new Date().toISOString() });
  if ("error" in removed) return NextResponse.json({ error: removed.error }, { status: removed.error === "forbidden" ? 403 : 404 });
  return NextResponse.json(removed);
}
