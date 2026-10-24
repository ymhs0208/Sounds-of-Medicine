import { NextResponse } from "next/server";
import { codeChallenge, lineAuthorizeUrl, lineConfigured, randomToken } from "@/lib/line-auth";
import { sealJson } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!lineConfigured()) return NextResponse.redirect(new URL("/circle?auth=unconfigured", request.url));
  const state = randomToken(24);
  const nonce = randomToken(24);
  const verifier = randomToken(32);
  const challenge = await codeChallenge(verifier);
  const secret = process.env.SESSION_SECRET || "";
  const txn = await sealJson({ state, nonce, verifier, exp: Date.now() + 10 * 60 * 1000 }, secret);
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const secure = proto === "https" ? "; Secure" : "";
  const response = NextResponse.redirect(
    lineAuthorizeUrl({
      channelId: process.env.LINE_CHANNEL_ID || "",
      callback: process.env.LINE_CALLBACK_URL || "",
      state,
      nonce,
      challenge,
    }),
  );
  response.headers.append("Set-Cookie", `yaosheng-oauth=${txn}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${secure}`);
  return response;
}
