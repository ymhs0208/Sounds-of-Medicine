"use client";

import Link from "next/link";
import { launch } from "@/lib/i18n/launch";
import { useStore } from "@/lib/store";

export function BackupBanner() {
  const store = useStore();
  const t = launch[store.lang];
  if (!store.ready || !store.bags.length || store.lastExportAt) return null;
  if (store.backupSnoozeUntil && Date.parse(store.backupSnoozeUntil) > Date.now()) return null;
  return (
    <section className="rounded-3xl bg-amber-bg p-4 ring-1 ring-amber-ink/30" role="status">
      <h2 className="text-base font-semibold text-amber-ink">{t.backupTitle}</h2>
      <p className="mt-1 text-sm leading-relaxed text-amber-ink">{t.backupBody}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/settings" className="inline-flex min-h-11 items-center rounded-2xl bg-pine px-4 text-sm font-semibold text-white">
          {t.backupTitle}
        </Link>
        <button
          type="button"
          className="min-h-11 rounded-2xl px-3 text-sm font-semibold text-amber-ink ring-1 ring-amber-ink/40"
          onClick={() => store.snoozeBackup(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())}
        >
          {t.backupLater}
        </button>
      </div>
    </section>
  );
}
