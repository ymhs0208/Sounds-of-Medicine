import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/api-guard";
import { circleStore } from "@/lib/circle-db";
import { parseEnvelope } from "@/lib/circle-store";
import { sessionFrom } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const store = await circleStore();
  if (!store) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });
  const since = new URL(request.url).searchParams.get("since");
  const pulled = await store.pull(session.sub, since);
  if ("error" in pulled) return NextResponse.json({ error: pulled.error }, { status: 403 });
  return NextResponse.json({
    generation: pulled.generation,
    members: pulled.members.map((member) => ({ id: member.id, name: member.name, role: member.role, removed: Boolean(member.removedAt) })),
    records: pulled.records,
  });
}

export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  const store = await circleStore();
  if (!store) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });
  let body: { generation?: unknown; records?: unknown };
  try {
    body = (await request.json()) as { generation?: unknown; records?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof body.generation !== "number" || !Array.isArray(body.records) || body.records.length > 80) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const records = [];
  for (const item of body.records) {
    const parsed = parseEnvelope(item, body.generation);
    if (!parsed) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    records.push(parsed);
  }
  const pushed = await store.push({ sub: session.sub, generation: body.generation, records });
  if ("error" in pushed) {
    return NextResponse.json({ error: pushed.error, generation: "generation" in pushed ? pushed.generation : undefined }, { status: pushed.error === "generation" ? 409 : 403 });
  }
  return NextResponse.json(pushed);
}
