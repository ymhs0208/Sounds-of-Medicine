import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/api-guard";
import { pushNamespace, vapidReady } from "@/lib/push-kv";
import { parsePushRecord } from "@/lib/push-schedule";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  const kv = await pushNamespace();
  if (!kv || !vapidReady()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const record = parsePushRecord(body);
  if (!record) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const existing = await kv.get(`push:${record.id}`);
  if (existing) {
    try {
      const previous = parsePushRecord(JSON.parse(existing));
      if (previous) record.sent = previous.sent;
    } catch {
      /* A fresh record starts with no send history. */
    }
  }
  await kv.put(`push:${record.id}`, JSON.stringify(record));
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  const kv = await pushNamespace();
  if (!kv) return NextResponse.json({ ok: true });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  await kv.delete(`push:${id}`);
  return NextResponse.json({ ok: true });
}
