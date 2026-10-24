import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/api-guard";
import { lineConfigured, publicProfile, verifyLineIdToken } from "@/lib/line-auth";
import { sealSession, sessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  if (!lineConfigured() || !process.env.LINE_LIFF_ID) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { idToken?: unknown } | null;
  const idToken = body?.idToken;
  if (typeof idToken !== "string" || idToken.length < 20 || idToken.length > 8_000) {
    return NextResponse.json({ error: "profile" }, { status: 400 });
  }
  try {
    const claims = await verifyLineIdToken(idToken);
    const profile = publicProfile(claims);
    if (!profile) return NextResponse.json({ error: "profile" }, { status: 401 });
    const token = await sealSession(
      { sub: profile.sub, name: profile.name, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 },
      process.env.SESSION_SECRET || "",
    );
    const response = NextResponse.json({ ok: true, user: profile });
    response.headers.set("Set-Cookie", sessionCookie(token, request, 30 * 24 * 60 * 60));
    return response;
  } catch {
    return NextResponse.json({ error: "profile" }, { status: 401 });
  }
}
