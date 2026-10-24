import { NextResponse } from "next/server";
import { exchangeLineCode, finishLineLogin, verifyLineIdToken } from "@/lib/line-auth";
import { openJson, readCookie, sealSession, sessionCookie } from "@/lib/session";

export const runtime = "nodejs";

type OauthTxn = { state: string; nonce: string; verifier: string; exp: number };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/circle?auth=${reason}`, request.url));
    response.headers.append("Set-Cookie", "yaosheng-oauth=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    return response;
  };
  const secret = process.env.SESSION_SECRET || "";
  if (!secret) return fail("unconfigured");
  const txn = await openJson<OauthTxn>(readCookie(request.headers.get("cookie") || "", "yaosheng-oauth") || "", secret);
  if (!txn || txn.exp < Date.now()) return fail("state");
  const result = await finishLineLogin({
    expectedState: txn.state,
    expectedNonce: txn.nonce,
    state: url.searchParams.get("state") || "",
    code: url.searchParams.get("code") || "",
    exchange: (code) => exchangeLineCode(code, txn.verifier),
    verify: verifyLineIdToken,
  }).catch(() => ({ ok: false as const, error: "profile" as const }));
  if (!result.ok) return fail(result.error);
  const token = await sealSession({ sub: result.profile.sub, name: result.profile.name, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }, secret);
  const response = NextResponse.redirect(new URL("/circle?auth=ok", request.url));
  response.headers.append("Set-Cookie", sessionCookie(token, request, 30 * 24 * 60 * 60));
  response.headers.append("Set-Cookie", "yaosheng-oauth=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  return response;
}
