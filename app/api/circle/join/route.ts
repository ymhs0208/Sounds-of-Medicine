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
  let body: { circleId?: unknown; role?: unknown };
  try {
    body = (await request.json()) as { circleId?: unknown; role?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof body.circleId !== "string" || !validId(body.circleId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (body.role !== "family" && body.role !== "caregiver") return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const now = new Date().toISOString();
  await store.upsertUser(session.sub, session.name, now);
  const memberId = crypto.randomUUID().replace(/-/g, "");
  const joined = await store.join({ circleId: body.circleId, sub: session.sub, name: session.name, memberId, role: body.role, now });
  if ("error" in joined) return NextResponse.json({ error: joined.error }, { status: joined.error === "missing" ? 404 : 403 });
  return NextResponse.json(joined);
}
