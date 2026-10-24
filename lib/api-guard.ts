import { NextResponse } from "next/server";
import { apiMessage, langFromRequest, type ApiErrorCode } from "./api-messages";
import { enforceLimit, type LimitKind } from "./rate-limit";
import { isLang } from "./types";

export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = request.headers.get("host") || new URL(request.url).host;
  return originHost === host;
}

export function errorResponse(request: Request, status: number, code: ApiErrorCode, bodyLang?: string, retryAfter?: number): NextResponse {
  const lang = langFromRequest(request, bodyLang);
  const headers = new Headers();
  if (retryAfter) headers.set("Retry-After", String(retryAfter));
  return NextResponse.json({ error: code, message: apiMessage(lang, code) }, { status, headers });
}

export async function readLimited(request: Request, maxBytes: number): Promise<{ ok: true; text: string } | { ok: false }> {
  const declared = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false };
  const reader = request.body?.getReader();
  if (!reader) return { ok: true, text: "" };
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return { ok: false };
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(merged) };
}

export async function verifyTurnstile(request: Request, token: unknown): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY || "";
  if (!secret) return true;
  if (typeof token !== "string" || token.length < 10 || token.length > 2048) return false;
  const ip = request.headers.get("cf-connecting-ip") || "";
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8_000),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}

/** Shared door for the paid routes. Returns a response when the call must stop. */
export async function guardPaid(request: Request, kind: LimitKind, bodyLang?: string): Promise<NextResponse | null> {
  if (!originAllowed(request)) return errorResponse(request, 403, "bad_origin", bodyLang);
  const limited = await enforceLimit(request, kind);
  if (!limited.ok) return errorResponse(request, 429, "rate_limited", bodyLang, limited.retryAfter);
  return null;
}

export function parseLang(value: unknown): string | undefined {
  return typeof value === "string" && isLang(value) ? value : undefined;
}
