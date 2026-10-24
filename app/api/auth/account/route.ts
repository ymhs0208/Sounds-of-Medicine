import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/api-guard";
import { circleStore } from "@/lib/circle-db";
import { sessionFrom } from "@/lib/session";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });
  const store = await circleStore();
  if (store) await store.deleteAccount(session.sub);
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", "yaosheng-session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  return response;
}
