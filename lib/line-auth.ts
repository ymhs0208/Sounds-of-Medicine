import { bytesToUrl } from "./bytes";

export type LineProfile = { sub: string; name: string };

export function lineConfigured(): boolean {
  return Boolean(process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET && process.env.LINE_CALLBACK_URL && process.env.SESSION_SECRET);
}

export function randomToken(bytes = 32): string {
  return bytesToUrl(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  return bytesToUrl(digest);
}

export function lineAuthorizeUrl(input: { channelId: string; callback: string; state: string; nonce: string; challenge: string }): string {
  const url = new URL("https://access.line.me/oauth2/v2.1/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.channelId);
  url.searchParams.set("redirect_uri", input.callback);
  url.searchParams.set("state", input.state);
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export function displayName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n\t]/g, " ").trim().slice(0, 80);
}

/** Keep LINE's subject and display name. Email is ignored unless a future consent flag asks for it. */
export function publicProfile(claims: { sub?: unknown; name?: unknown; email?: unknown }): LineProfile | null {
  if (typeof claims.sub !== "string" || !claims.sub.trim()) return null;
  return { sub: claims.sub.trim().slice(0, 80), name: displayName(claims.name) };
}

export async function finishLineLogin(input: {
  expectedState: string;
  expectedNonce: string;
  state: string;
  code: string;
  exchange: (code: string) => Promise<{ idToken: string }>;
  verify: (idToken: string) => Promise<{ sub?: string; name?: string; email?: string; nonce?: string }>;
}): Promise<{ ok: true; profile: LineProfile } | { ok: false; error: "state" | "nonce" | "profile" }> {
  if (!input.state || input.state !== input.expectedState || !input.code) return { ok: false, error: "state" };
  const exchanged = await input.exchange(input.code);
  const claims = await input.verify(exchanged.idToken);
  if (!claims.nonce || claims.nonce !== input.expectedNonce) return { ok: false, error: "nonce" };
  const profile = publicProfile(claims);
  if (!profile) return { ok: false, error: "profile" };
  return { ok: true, profile };
}

export async function exchangeLineCode(code: string, verifier: string): Promise<{ idToken: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.LINE_CALLBACK_URL || "",
    client_id: process.env.LINE_CHANNEL_ID || "",
    client_secret: process.env.LINE_CHANNEL_SECRET || "",
    code_verifier: verifier,
  });
  const response = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("line token");
  const json = (await response.json()) as { id_token?: string };
  if (!json.id_token) throw new Error("line token");
  return { idToken: json.id_token };
}

export async function verifyLineIdToken(idToken: string): Promise<{ sub?: string; name?: string; email?: string; nonce?: string }> {
  const body = new URLSearchParams({ id_token: idToken, client_id: process.env.LINE_CHANNEL_ID || "" });
  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("line verify");
  return (await response.json()) as { sub?: string; name?: string; email?: string; nonce?: string };
}
