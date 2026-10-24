import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/api-guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", "yaosheng-session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  return response;
}
