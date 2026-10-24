"use client";

const DEVICE_KEY = "yaosheng.device";

function bytesToUrl(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function deviceId(): string {
  if (typeof localStorage === "undefined") return "server-render-placeholder";
  const current = localStorage.getItem(DEVICE_KEY);
  if (current && /^[A-Za-z0-9_-]{16,80}$/.test(current)) return current;
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const id = bytesToUrl(bytes);
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

export function turnstileToken(): string | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  const token = sessionStorage.getItem("yaosheng.turnstile") || "";
  return token.length > 10 ? token : undefined;
}

export function rememberTurnstile(token: string): void {
  sessionStorage.setItem("yaosheng.turnstile", token);
}

export async function paidPost(path: string, body: Record<string, unknown>, lang: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const token = turnstileToken();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Yaosheng-Device": deviceId(),
      "X-Yaosheng-Lang": lang,
    },
    body: JSON.stringify(token ? { ...body, turnstileToken: token } : body),
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await response.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }
  return { status: response.status, body: json };
}
