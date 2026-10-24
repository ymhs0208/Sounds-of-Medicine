import { NextResponse } from "next/server";
import { vapidReady } from "@/lib/push-kv";

export function GET() {
  const turnstile = Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.TURNSTILE_SITE_KEY);
  return NextResponse.json({
    llm: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    turnstile,
    turnstileSiteKey: turnstile ? process.env.TURNSTILE_SITE_KEY : undefined,
    push: vapidReady() && process.env.YAOSHENG_PUSH_ENABLED === "1",
    sentry: Boolean(process.env.SENTRY_DSN),
    analytics: Boolean(process.env.CF_ANALYTICS_TOKEN),
    analyticsToken: process.env.CF_ANALYTICS_TOKEN || undefined,
  });
}
