import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/api-guard";
import { circleStore } from "@/lib/circle-db";
import { lineConfigured } from "@/lib/line-auth";
import { validId } from "@/lib/circle-store";
import { sessionFrom } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const store = await circleStore();
  const session = await sessionFrom(request);
  if (!store) return NextResponse.json({ enabled: false, login: lineConfigured(), user: session ? { sub: session.sub, name: session.name } : null });
  if (!session) return NextResponse.json({ enabled: true, login: lineConfigured(), user: null, circle: null });
  const mine = await store.membership(session.sub);
  return NextResponse.json({
    enabled: true,
    login: lineConfigured(),
    user: { sub: session.sub, name: session.name },
    circle: mine
      ? {
          id: mine.circleId,
          generation: mine.generation,
          role: mine.role,
          memberId: mine.memberId,
          members: mine.members.map((member) => ({ id: member.id, name: member.name, role: member.role, removed: Boolean(member.removedAt) })),
        }
      : null,
  });
}

export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  const store = await circleStore();
  if (!store) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });
  let body: { circleId?: unknown };
  try {
    body = (await request.json()) as { circleId?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof body.circleId !== "string" || !validId(body.circleId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const now = new Date().toISOString();
  await store.upsertUser(session.sub, session.name, now);
  const memberId = crypto.randomUUID().replace(/-/g, "");
  const created = await store.createCircle({ circleId: body.circleId, ownerSub: session.sub, ownerName: session.name, memberId, now });
  if ("error" in created) return NextResponse.json({ error: created.error }, { status: 409 });
  return NextResponse.json(created);
}
