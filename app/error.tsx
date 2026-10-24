"use client";

import { useEffect } from "react";
import { scrubErrorText } from "@/lib/scrub";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const message = scrubErrorText(error.message || "error");
    const stack = scrubErrorText(error.stack || "");
    void fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, stack }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="text-3xl font-semibold">這一頁暫時打不開</h1>
      <p className="mt-3 text-base leading-relaxed">This page hit a problem. The medicine list on this device is still saved.</p>
      <p className="mt-2 text-base leading-relaxed">Halaman ini bermasalah. Daftar obat di perangkat ini tetap tersimpan.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="min-h-12 rounded-2xl bg-pine px-4 font-semibold text-white" onClick={() => reset()}>
          再試一次
        </button>
        <a className="inline-flex min-h-12 items-center font-semibold underline" href="/today">
          今天
        </a>
      </div>
    </main>
  );
}
