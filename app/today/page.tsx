"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DuplicateBanner } from "@/components/duplicate-banner";
import { Disclaimer } from "@/components/disclaimer";
import { drugText, fill, formatLongDate, patientName, todayISO } from "@/lib/format";
import { ui, slotLabel } from "@/lib/i18n";
import { notificationSupport, requestNotifications, showNotification } from "@/lib/notify";
import { SLOT_TIME } from "@/lib/slots";
import { drugPath } from "@/lib/routes";
import { buildTimeline, groupTimeline } from "@/lib/schedule";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function TodayPage() {
  const store = useStore();
  const t = ui[store.lang];
  const day = todayISO();
  const items = buildTimeline(store.bags, store.logs, day);
  const groups = groupTimeline(items);
  const done = items.filter((item) => item.status !== "pending").length;
  const name = patientName(store.bags, store.patientName);
  const unseen = store.reports.some((report) => report.replies.some((reply) => !reply.seen));
  const now = new Date();
  const minute = now.getHours() * 60 + now.getMinutes();

  async function enable() {
    const result = await requestNotifications();
    if (result === "unsupported") toast(t.notifUnsupported);
    else if (result === "denied") toast(t.notifDenied);
    else toast(t.remindersOn);
  }

  function testNotify() {
    const support = notificationSupport();
    if (support === "unsupported") {
      toast(t.notifUnsupported);
      return;
    }
    if (support !== "granted") {
      toast(t.notifDenied);
      return;
    }
    const next = items.find((item) => item.status === "pending") ?? items[0];
    const slot = next ? slotLabel[store.lang][next.slot] : t.todayTitle;
    showNotification(t.notifTitle, fill(t.notifBody, { slot }));
    toast(t.testSent);
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <p className="text-sm font-semibold text-pine">{formatLongDate(day, store.lang)}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{t.todayTitle}</h1>
        <p className="mt-1 text-base text-muted-foreground">
          {name ? `${t.patientLabel}　${name}` : t.unknownPatient}
        </p>
      </div>

      {unseen ? (
        <Link href="/report" className="block rounded-2xl bg-accent px-4 py-3 text-base font-semibold text-accent-foreground">
          {t.newReply}
        </Link>
      ) : null}

      {items.length ? (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>{fill(t.progress, { done: String(done), total: String(items.length) })}</span>
              {done === items.length ? <span className="font-semibold text-good">{t.allClear}</span> : null}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-pine"
                style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.todayLead}</p>
          </div>
          <DuplicateBanner lang={store.lang} />
          {groups.map((group) => {
            const [hour, mins] = SLOT_TIME[group.slot].split(":").map(Number);
            const passed = minute >= hour * 60 + mins;
            return (
              <section key={group.slot}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold">
                    {SLOT_TIME[group.slot]}　{slotLabel[store.lang][group.slot]}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {group.items.every((item) => item.status !== "pending") ? t.markSaved : passed ? t.overdue : t.upcoming}
                  </span>
                </div>
                <div className="space-y-3">
                  {group.items.map((item) => {
                    const text = drugText(item.drug, store.lang);
                    return (
                      <article
                        key={`${item.drug.id}-${item.slot}`}
                        className={cn(
                          "rounded-3xl bg-card p-4 ring-1 ring-foreground/10",
                          item.status === "given" && "ring-good/40",
                          item.status === "missed" && "ring-rose/40",
                        )}
                      >
                        <Link href={drugPath(item.drug.id)} className="block">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-semibold leading-tight">{text.name}</h3>
                              {store.lang !== "zh" ? (
                                <p className="mt-1 text-sm text-[#3f382f]">{item.drug.nameZh}</p>
                              ) : null}
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.bag.hospitalShort}
                                {item.bag.source === "demo" ? ` · ${t.demoBadge}` : ""}
                              </p>
                            </div>
                            {item.duplicate ? (
                              <span className="shrink-0 rounded-full bg-amber-bg px-2 py-1 text-xs font-semibold text-amber-ink">
                                {t.duplicateShort}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                        {item.status === "pending" ? (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              className="h-12 rounded-2xl text-base"
                              onClick={() => {
                                store.setDose(item.drug.id, item.slot, "given", day);
                                toast(t.markSaved);
                              }}
                            >
                              {t.given}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-12 rounded-2xl text-base"
                              onClick={() => {
                                store.setDose(item.drug.id, item.slot, "missed", day);
                                toast(t.markSaved);
                              }}
                            >
                              {t.missed}
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center justify-between">
                            <span
                              className={cn(
                                "rounded-full px-3 py-1 text-sm font-semibold",
                                item.status === "given" ? "bg-good-bg text-good" : "bg-rose-bg text-rose",
                              )}
                            >
                              {item.status === "given" ? t.given : t.missed}
                            </span>
                            <button
                              type="button"
                              className="text-sm font-semibold text-pine underline-offset-2"
                              onClick={() => store.setDose(item.drug.id, item.slot, null, day)}
                            >
                              {t.undo}
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
          <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
            <h2 className="text-base font-semibold">{t.reminders}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.worksOffline}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.notifLimit}</p>
            <div className="mt-3 grid gap-2">
              <Button type="button" variant="outline" className="h-12 rounded-2xl text-base" onClick={enable}>
                {notificationSupport() === "granted" ? t.remindersOn : t.enableReminders}
              </Button>
              <Button type="button" variant="secondary" className="h-12 rounded-2xl text-base" onClick={testNotify}>
                {t.testReminder}
              </Button>
            </div>
          </section>
          <Disclaimer lang={store.lang} />
        </>
      ) : (
        <section className="rounded-3xl bg-card p-5 ring-1 ring-border">
          <h2 className="text-2xl font-semibold">{t.emptyTitle}</h2>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t.emptyBody}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t.todayLead}</p>
          <Button nativeButton={false} className="mt-4 h-14 w-full rounded-2xl text-lg" render={<Link href="/scan" />}>
            {t.navScan}
          </Button>
          <Button nativeButton={false} variant="outline" className="mt-2 h-12 w-full rounded-2xl text-base" render={<Link href="/meds/edit" />}>
            {t.manualEntry}
          </Button>
        </section>
      )}
    </div>
  );
}
