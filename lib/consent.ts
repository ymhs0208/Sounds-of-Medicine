/** Bump this when the privacy notice or consent text changes. */
export const CONSENT_VERSION = "2026-10-24";

export const READY_COOKIE = "yaosheng-ready";

export function writeReadyCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${READY_COOKIE}=1; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function clearReadyCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${READY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
