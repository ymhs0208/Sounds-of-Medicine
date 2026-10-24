"use client";

import { useEffect } from "react";

type LiffApi = {
  init: (options: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  isInClient: () => boolean;
  login: () => void;
  getIDToken: () => string | null;
  isApiAvailable?: (name: string) => boolean;
  shareTargetPicker?: (messages: { type: "text"; text: string }[]) => Promise<void>;
};

declare global {
  interface Window {
    liff?: LiffApi;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("liff"));
    document.head.appendChild(script);
  });
}

/** Inside LINE, exchange the LIFF ID token for the same httpOnly session as LINE Login. */
export function LiffLogin() {
  useEffect(() => {
    let cancel = false;
    void (async () => {
      const status = await fetch("/api/status")
        .then((response) => response.json() as Promise<{ liffId?: string }>)
        .catch(() => null);
      const liffId = status?.liffId;
      if (!liffId || cancel) return;
      try {
        await loadScript("https://static.line-scdn.net/liff/edge/2/sdk.js");
      } catch {
        return;
      }
      const liff = window.liff;
      if (!liff || cancel) return;
      await liff.init({ liffId }).catch(() => undefined);
      if (!liff.isLoggedIn()) {
        if (liff.isInClient()) liff.login();
        return;
      }
      const idToken = liff.getIDToken();
      if (!idToken || cancel) return;
      await fetch("/api/auth/line/liff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      }).catch(() => undefined);
    })();
    return () => {
      cancel = true;
    };
  }, []);
  return null;
}

export async function shareOnLine(text: string): Promise<void> {
  const liff = window.liff;
  if (liff?.isApiAvailable?.("shareTargetPicker") && liff.shareTargetPicker) {
    await liff.shareTargetPicker([{ type: "text", text }]);
    return;
  }
  window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}
