import { NextResponse } from "next/server";
import { pushNamespace, vapidPublic, vapidReady } from "@/lib/push-kv";

export const runtime = "nodejs";

export async function GET() {
  if (!vapidReady() || !(await pushNamespace())) {
    return NextResponse.json({ enabled: false }, { status: 503 });
  }
  return NextResponse.json({ enabled: true, publicKey: vapidPublic() });
}
