import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/api-guard";
import { takeMemory } from "@/lib/rate-limit";
import { scrubErrorText } from "@/lib/scrub";

export const runtime = "nodejs";

function sentryTarget(dsn: string): { url: string; key: string } | null {
  try {
    const parsed = new URL(dsn);
    const key = parsed.username;
    const project = parsed.pathname.replace(/\//g, "");
    if (!key || !project) return null;
    return { url: `${parsed.protocol}//${parsed.host}/api/${project}/envelope/?sentry_key=${encodeURIComponent(key)}`, key };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ ok: false }, { status: 403 });
  const dsn = process.env.SENTRY_DSN || "";
  if (!dsn) return NextResponse.json({ ok: true, enabled: false });
  const ip = request.headers.get("cf-connecting-ip") || "local";
  if (!takeMemory(`report:${ip}`, 20, 10 * 60 * 1000).ok) return NextResponse.json({ ok: true }, { status: 429 });
  const target = sentryTarget(dsn);
  if (!target) return NextResponse.json({ ok: true, enabled: false });
  let message = "error";
  let stack = "";
  try {
    const body = (await request.json()) as { message?: unknown; stack?: unknown };
    if (typeof body.message === "string") message = scrubErrorText(body.message);
    if (typeof body.stack === "string") stack = scrubErrorText(body.stack);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const envelope = [
    JSON.stringify({ event_id: eventId, dsn }),
    JSON.stringify({ type: "event" }),
    JSON.stringify({
      event_id: eventId,
      level: "error",
      platform: "javascript",
      message,
      exception: { values: [{ type: "Error", value: message, stacktrace: stack ? { frames: [{ filename: "app", function: stack.slice(0, 180) }] } : undefined }] },
    }),
  ].join("\n");
  await fetch(target.url, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope" },
    body: envelope,
    signal: AbortSignal.timeout(5_000),
  }).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
