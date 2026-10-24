import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/api-guard";
import { circleStore } from "@/lib/circle-db";
import { lineStore } from "@/lib/line-db";
import { sessionFrom } from "@/lib/session";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });
  const store = await circleStore();
  const deleted = store ? await store.deleteAccount(session.sub) : { deletedCircles: [] as string[] };
  const line = await lineStore().catch(() => null);
  if (line) await line.purgeAccount(session.sub, deleted.deletedCircles).catch(() => undefined);
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", "yaosheng-session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  return response;
}
