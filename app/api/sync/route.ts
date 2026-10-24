import { NextResponse } from "next/server";
import { syncNamespace } from "@/lib/sync-kv";

export const runtime = "nodejs";

function id(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(key)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const kv = await syncNamespace();
  if (!kv) return NextResponse.json({ error: "disabled" }, { status: 503 });
  const blob = await kv.get(key);
  if (!blob) return NextResponse.json({ error: "missing" }, { status: 404 });
  return NextResponse.json({ blob });
}

export async function POST(request: Request) {
  let body: { blob?: unknown };
  try {
    body = (await request.json()) as { blob?: unknown };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof body.blob !== "string" || body.blob.length < 16 || body.blob.length > 80_000) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const kv = await syncNamespace();
  if (!kv) return NextResponse.json({ error: "disabled" }, { status: 503 });
  const key = id();
  await kv.put(key, body.blob, { expirationTtl: 60 * 60 * 24 * 30 });
  return NextResponse.json({ id: key });
}
