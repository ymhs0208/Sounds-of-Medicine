import { asBuffer, bytesToUrl, urlToBytes } from "./bytes";

export type SessionBody = { sub: string; name: string; exp: number };

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return bytesToUrl(sig);
}

export async function sealJson(value: unknown, secret: string): Promise<string> {
  const payload = bytesToUrl(new TextEncoder().encode(JSON.stringify(value)));
  return `${payload}.${await sign(secret, payload)}`;
}

export async function openJson<T>(token: string, secret: string): Promise<T | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, asBuffer(urlToBytes(sig)), new TextEncoder().encode(payload));
  if (!ok) return null;
  try {
    return JSON.parse(new TextDecoder().decode(asBuffer(urlToBytes(payload)))) as T;
  } catch {
    return null;
  }
}

export async function sealSession(body: SessionBody, secret: string): Promise<string> {
  return sealJson(body, secret);
}

export async function openSession(token: string, secret: string): Promise<SessionBody | null> {
  const body = await openJson<SessionBody>(token, secret);
  if (!body || typeof body.sub !== "string" || typeof body.name !== "string" || typeof body.exp !== "number") return null;
  if (body.exp < Date.now()) return null;
  return { sub: body.sub, name: body.name, exp: body.exp };
}

export function readCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function sessionCookie(token: string, request: Request, maxAge: number): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const secure = proto === "https" ? "; Secure" : "";
  return `yaosheng-session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export async function sessionFrom(request: Request): Promise<SessionBody | null> {
  const secret = process.env.SESSION_SECRET || "";
  if (!secret) return null;
  const token = readCookie(request.headers.get("cookie") || "", "yaosheng-session");
  if (!token) return null;
  return openSession(token, secret);
}
