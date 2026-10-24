"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Disclaimer } from "@/components/disclaimer";
import { APP_NAME } from "@/lib/brand";
import { duplicateGroups } from "@/lib/duplicates";
import { fill, todayISO } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { features } from "@/lib/i18n/features";
import { refillStatuses } from "@/lib/refill";
import { useStore } from "@/lib/store";

export function CareRail() {
  const store = useStore();
  const pathname = usePathname();
  const lang = pathname.startsWith("/family") ? "zh" : store.lang;
  const t = ui[lang];
  const ft = features[lang];
  const day = todayISO();
  const refills = refillStatuses(store.bags, store.logs, day).filter((row) => row.level).length;
  const dupes = duplicateGroups(store.bags).length;
  const unseen = store.reports.some((report) => report.replies.some((reply) => !reply.seen));
  const count = refills + dupes + (unseen ? 1 : 0);

  return (
    <aside className="no-print hidden w-80 shrink-0 xl:block">
      <div className="sticky top-4 space-y-3 py-2 pr-4">
        <section className="ys-card p-4">
          <h2 className="text-base font-semibold">{t.reminders}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{fill(ft.reminderTip, { app: APP_NAME })}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.notifLimit}</p>
          <Link href="/settings" className="mt-3 inline-flex min-h-11 items-center text-base font-semibold text-pine">
            {t.openSettings}
          </Link>
        </section>
        {count ? (
          <Link href="/today#today-alerts" className="ys-card block p-4 text-base font-semibold text-amber-ink">
            {fill(ft.alertsTitle, { count: String(count) })}
          </Link>
        ) : null}
        <Disclaimer lang={lang} />
      </div>
    </aside>
  );
}
