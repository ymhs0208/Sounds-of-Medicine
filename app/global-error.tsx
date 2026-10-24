"use client";

import { APP_NAME, APP_NAME_LATIN } from "@/lib/brand";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh-Hant">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#f6f1e8", color: "#1c1915" }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: 24 }}>
          <h1 style={{ fontSize: 32 }}>{APP_NAME}暫時打不開</h1>
          <p style={{ fontSize: 18, lineHeight: 1.6 }}>{APP_NAME_LATIN} hit a problem. Your saved list stays on this device.</p>
          <button type="button" style={{ minHeight: 48, marginTop: 16, padding: "0 16px", borderRadius: 16, background: "#1b5e45", color: "#fff" }} onClick={() => reset()}>
            再試一次
          </button>
        </main>
      </body>
    </html>
  );
}
