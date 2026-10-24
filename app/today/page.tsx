"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pill, TriangleAlert } from "lucide-react";
import { AskLine } from "@/components/ask-line";
import { timingIcon } from "@/components/dose-mark";
import { DuplicateBanner } from "@/components/duplicate-banner";
import { BackupBanner } from "@/components/backup-banner";
import { EmptyState } from "@/components/empty-state";
import { ClampText } from "@/components/clamp-text";
import { HomeTools } from "@/components/home-tools";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { duplicateGroups } from "@/lib/duplicates";
import { chineseNote, drugText, fill, findDrug, formatLongDate, patientName, todayISO } from "@/lib/format";
import { ui, slotLabel } from "@/lib/i18n";
import { features } from "@/lib/i18n/features";
import { drugPath } from "@/lib/routes";
import { refillStatuses, type RefillInfo } from "@/lib/refill";
import { buildTimeline, type TimelineItem } from "@/lib/schedule";
import { SLOT_TIME } from "@/lib/slots";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function ProgressRing({ done, total, label }: { done: number; total: number; label: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const ratio = total ? done / total : 0;
  return (
    <div className="relative grid size-20 shrink-0 place-items-center text-pine" role="img" aria-label={label}>
      <svg viewBox="0 0 72 72" className="size-20 -rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" className="stroke-secondary" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          className="stroke-current"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${circumference * ratio} ${circumference}`}
        />
      </svg>
      <span className="absolute text-sm font-semibold text-foreground">
        {done}/{total}
      </span>
    </div>
  );
}

function RefillLine({ row, lang }: { row: RefillInfo; lang: Parameters<typeof drugText>[1] }) {
  const found = findDrug(useStore().bags, row.drugId);
  const text = found ? drugText(found.drug, lang) : null;
  const title = text?.name || row.nameZh;
  const ft = features[lang];
  return (
    <div>
      <p className="text-base leading-snug font-semibold">{title}</p>
      {lang !== "zh" && row.nameZh && row.nameZh !== title ? (
        <p className="text-sm text-muted-foreground">{row.nameZh}</p>
      ) : null}
      <p className="text-base leading-snug">{fill(ft.refillRemind, { days: String(row.daysLeft) })}</p>
    </div>
  );
}

function Note({ lang, primary, chinese }: { lang: Parameters<typeof drugText>[1]; primary: string; chinese?: string }) {
  const note = chineseNote(lang, primary, chinese);
  if (!note) return null;
  return <p className="text-xs leading-snug text-muted-foreground">{note}</p>;
}

function CompactDose({
  item,
  lang,
  onGiven,
}: {
  item: TimelineItem;
  lang: Parameters<typeof drugText>[1];
  onGiven: () => void;
}) {
  const text = drugText(item.drug, lang);
  const t = ui[lang];
  const ft = features[lang];
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-2xl bg-card px-3 py-3 ring-1 ring-border sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums">{SLOT_TIME[item.slot]}</span>
        <div className="min-w-0 flex-1">
          <Link href={drugPath(item.drug.id)} className="block">
            <span className="ys-name block font-semibold leading-snug">{text.name}</span>
          </Link>
          <Note lang={lang} primary={text.name} chinese={item.drug.nameZh} />
          {text.indication ? <p className="text-sm leading-snug text-muted-foreground">{text.indication}</p> : null}
          <Note lang={lang} primary={text.indication} chinese={item.drug.indicationZh} />
          <ClampText text={text.usage} expand={ft.expandLines} collapse={ft.collapseLines} className="text-sm text-muted-foreground" />
          <Note lang={lang} primary={text.usage} chinese={item.drug.usageZh} />
        </div>
      </div>
      {item.status === "pending" ? (
        <button type="button" className="h-12 w-full rounded-full bg-pine px-3 text-sm font-semibold text-white sm:h-11 sm:w-auto sm:shrink-0" onClick={onGiven}>
          {t.given}
        </button>
      ) : (
        <span className={cn("text-sm font-semibold sm:shrink-0", item.status === "given" ? "text-good" : "text-rose")}>
          {item.status === "given" ? t.given : t.missed}
        </span>
      )}
    </li>
  );
}

export default function TodayPage() {
  const store = useStore();
  const t = ui[store.lang];
  const ft = features[store.lang];
  const day = todayISO();
  const refills = refillStatuses(store.bags, store.logs, day).filter((row) => row.level);
  const items = buildTimeline(store.bags, store.logs, day);
  const done = items.filter((item) => item.status !== "pending").length;
  const name = patientName(store.bags, store.patientName);
  const unseen = store.reports.some((report) => report.replies.some((reply) => !reply.seen));
  const dupes = duplicateGroups(store.bags).length;
  const alertCount = dupes + (unseen ? 1 : 0);
  const next = items.find((item) => item.status === "pending") ?? null;
  const rest = next ? items.filter((item) => item !== next) : items;
  const [burst, setBurst] = useState(false);
  const [tip, setTip] = useState(false);
  useEffect(() => {
    if (window.localStorage.getItem("yaosheng.tip.reminders") !== "1") setTip(true);
  }, []);

  function markGiven(item: TimelineItem) {
    store.setDose(item.drug.id, item.slot, "given", day);
    setBurst(true);
    toast.success(t.markSaved);
  }

  const progressLabel = fill(t.progress, { done: String(done), total: String(items.length) });

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          kicker={formatLongDate(day, store.lang)}
          title={t.todayTitle}
          lead={name ? `${t.patientLabel}　${name}` : t.unknownPatient}
        />
        {items.length ? <ProgressRing done={done} total={items.length} label={progressLabel} /> : null}
      </div>

      <BackupBanner />

      {items.length ? (
        <>
          {next ? (
            <HeroDose item={next} lang={store.lang} burst={burst} onGiven={() => markGiven(next)} onMissed={() => {
              store.setDose(next.drug.id, next.slot, "missed", day);
              toast(t.markSaved);
            }} />
          ) : (
            <section className="ys-card p-5">
              <p className="text-lg font-semibold text-good">{t.allClear}</p>
              <p className="mt-1 text-sm text-muted-foreground">{progressLabel}</p>
            </section>
          )}

          {refills.length ? (
            <section id="today-refills" className="space-y-2">
              {refills.map((row) => (
                <article key={row.drugId} className="rounded-3xl bg-amber-bg px-4 py-3 ring-1 ring-amber-ink/30">
                  <RefillLine row={row} lang={store.lang} />
                </article>
              ))}
              <AskLine lang={store.lang} />
            </section>
          ) : null}

          {alertCount ? (
            <details id="today-alerts" className="group rounded-3xl bg-amber-bg ring-1 ring-amber-ink/30">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-amber-ink">
                <span className="flex min-w-0 items-center gap-2">
                  <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">{fill(ft.alertsTitle, { count: String(alertCount) })}</span>
                </span>
                <span className="shrink-0 text-sm group-open:hidden">{ft.alertsShow}</span>
                <span className="hidden shrink-0 text-sm group-open:inline">{ft.alertsHide}</span>
              </summary>
              <div className="space-y-3 px-4 pb-4">
                <DuplicateBanner lang={store.lang} bare />
                {unseen ? (
                  <Link href="/report" className="block text-base font-semibold text-amber-ink underline">
                    {t.newReply}
                  </Link>
                ) : null}
              </div>
            </details>
          ) : null}

          {rest.length ? (
            <section>
              <h2 className="mb-2 text-lg font-semibold">{ft.restToday}</h2>
              <ol className="space-y-2">
                {rest.map((item) => (
                  <CompactDose
                    key={`${item.drug.id}-${item.slot}`}
                    item={item}
                    lang={store.lang}
                    onGiven={() => markGiven(item)}
                  />
                ))}
              </ol>
            </section>
          ) : null}

          <HomeTools />

          {tip ? (
            <p className="rounded-2xl bg-card px-4 py-3 text-sm leading-relaxed ring-1 ring-border xl:hidden">
              {fill(ft.reminderTip, { app: APP_NAME })}{" "}
              <Link href="/settings" className="font-semibold text-pine">
                {t.reminders}
              </Link>
              <button
                type="button"
                className="mt-2 block min-h-11 font-semibold text-pine"
                onClick={() => {
                  window.localStorage.setItem("yaosheng.tip.reminders", "1");
                  setTip(false);
                }}
              >
                {ft.reminderTipDismiss}
              </button>
            </p>
          ) : null}
        </>
      ) : (
        <EmptyState icon={Pill} title={t.emptyTitle} body={t.emptyBody}>
          <Button nativeButton={false} className="h-14 w-full rounded-2xl text-lg" render={<Link href="/scan" />}>
            {t.navScan}
          </Button>
          <Button nativeButton={false} variant="outline" className="h-12 w-full rounded-2xl text-base" render={<Link href="/meds/edit" />}>
            {t.manualEntry}
          </Button>
        </EmptyState>
      )}
    </div>
  );
}

function HeroDose({
  item,
  lang,
  burst,
  onGiven,
  onMissed,
}: {
  item: TimelineItem;
  lang: Parameters<typeof drugText>[1];
  burst: boolean;
  onGiven: () => void;
  onMissed: () => void;
}) {
  const text = drugText(item.drug, lang);
  const t = ui[lang];
  const ft = features[lang];
  const Icon = timingIcon(item.slot);
  return (
    <article className={cn("ys-card p-4", burst && "ys-done")}>
      <p className="text-sm font-semibold text-pine">{ft.nextDose}</p>
      <p className="mt-1 text-4xl font-semibold tracking-tight">{SLOT_TIME[item.slot]}</p>
      <p className="text-base text-muted-foreground">{slotLabel[lang][item.slot]}</p>
      <div className="mt-3 flex gap-3">
        {item.bag.photoDataUrl ? (
          // Local data URL from the caregiver's camera; next/image cannot optimize it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.bag.photoDataUrl} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent text-pine">
            <Pill className="size-7" aria-hidden="true" />
          </span>
        )}
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Icon className="size-7" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3">
        <h2 className="ys-name text-2xl font-semibold leading-snug">
          <Link href={drugPath(item.drug.id)}>{text.name}</Link>
        </h2>
        <Note lang={lang} primary={text.name} chinese={item.drug.nameZh} />
        {text.indication ? <p className="mt-1 text-base leading-snug">{text.indication}</p> : null}
        <Note lang={lang} primary={text.indication} chinese={item.drug.indicationZh} />
        {text.usage ? <p className="mt-1 text-sm leading-snug text-muted-foreground">{text.usage}</p> : null}
        <Note lang={lang} primary={text.usage} chinese={item.drug.usageZh} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr]">
        <Button type="button" className="h-16 rounded-2xl text-xl" onClick={onGiven}>
          {t.given}
        </Button>
        <Button type="button" variant="outline" className="h-16 rounded-2xl text-lg" onClick={onMissed}>
          {t.missed}
        </Button>
      </div>
    </article>
  );
}
