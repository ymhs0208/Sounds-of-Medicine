"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { lineCopy } from "@/lib/i18n/line";
import { buildLinePlan } from "@/lib/line-plan";
import { todayISO } from "@/lib/format";
import { useStore } from "@/lib/store";

type CircleState = {
  id: string;
  role: string;
  linked: boolean;
  notify: { dose: boolean; missed: boolean; digest: boolean; refill: boolean };
  quietStart: string;
  quietEnd: string;
  detailOptIn: boolean;
  missedWindowMin: number;
  digestTime: string;
  visitDate: string | null;
  groupBound: boolean;
  dataKey: boolean;
};

export function LineSettings() {
  const store = useStore();
  const t = lineCopy[store.lang];
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [user, setUser] = useState(false);
  const [circle, setCircle] = useState<CircleState | null>(null);
  const [code, setCode] = useState("");
  const [groupCode, setGroupCode] = useState("");

  useEffect(() => {
    let cancel = false;
    void fetch("/api/line/settings")
      .then((response) => response.json())
      .then((body: { enabled?: boolean; user?: { sub: string } | null; circle?: CircleState | null }) => {
        if (cancel) return;
        setEnabled(Boolean(body.enabled));
        setUser(Boolean(body.user));
        setCircle(body.circle || null);
      })
      .catch(() => {
        if (!cancel) setEnabled(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const notify = circle?.notify || { dose: true, missed: true, digest: true, refill: true };

  function patch(next: Partial<CircleState>) {
    setCircle((current) => (current ? { ...current, ...next } : current));
  }

  async function save() {
    const plan = buildLinePlan(store, todayISO(), Boolean(circle?.detailOptIn), circle?.visitDate);
    const response = await fetch("/api/line/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lang: store.lang,
        notify,
        quietStart: circle?.quietStart || "22:00",
        quietEnd: circle?.quietEnd || "07:00",
        detailOptIn: Boolean(circle?.detailOptIn),
        missedWindowMin: circle?.missedWindowMin ?? 30,
        digestTime: circle?.digestTime || "21:00",
        visitDate: circle?.visitDate,
        supplyDays: plan.supplyDays,
        observationCount: plan.observationCount,
        doses: plan.doses,
        refills: plan.refills,
        alerts: plan.alerts,
      }),
    });
    if (!response.ok) {
      toast(t.unavailable);
      return;
    }
    toast(t.saved);
  }

  return (
    <section className="rounded-3xl bg-card p-4 ring-1 ring-border" aria-labelledby="line-settings-heading">
      <h2 id="line-settings-heading" className="text-base font-semibold">{t.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.lead}</p>
      {enabled === false ? <p className="mt-2 text-sm leading-relaxed" role="status">{t.unavailable}</p> : null}
      {enabled && !user ? (
        <a className="mt-3 inline-flex min-h-12 items-center rounded-2xl bg-[#06c755] px-4 font-semibold text-[#062117]" href="/api/auth/line/start">
          LINE
        </a>
      ) : null}
      {enabled && user && !circle ? (
        <p className="mt-2 text-sm leading-relaxed">
          {t.needCircle} <Link className="font-semibold text-pine underline" href="/circle">{t.title}</Link>
        </p>
      ) : null}
      <p className="mt-3 text-sm font-semibold">{circle?.linked ? t.linked : t.unlinked}</p>
      <div className="mt-3 grid gap-2">
        <button
          type="button"
          className="min-h-12 rounded-2xl bg-[#06c755] px-4 font-semibold text-[#062117]"
          onClick={async () => {
            const response = await fetch("/api/line/link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lang: store.lang }) });
            const body = (await response.json().catch(() => ({}))) as { code?: string };
            if (!response.ok || !body.code) {
              toast(enabled ? t.needCircle : t.unavailable);
              return;
            }
            setCode(body.code);
          }}
        >
          {t.link}
        </button>
        {code ? (
          <p className="rounded-2xl bg-amber-bg p-3 text-sm leading-relaxed text-amber-ink">
            <span className="block font-mono text-2xl font-semibold tracking-widest">{code}</span>
            {t.codeHelp}
          </p>
        ) : null}
        <button
          type="button"
          className="min-h-12 rounded-2xl bg-card px-4 font-semibold ring-1 ring-border"
          onClick={async () => {
            const response = await fetch("/api/line/link", { method: "DELETE" });
            if (response.ok) {
              setCode("");
              patch({ linked: false });
              toast(t.unlinked);
            }
          }}
        >
          {t.unlink}
        </button>
      </div>
      <fieldset className="mt-4 space-y-2">
        <legend className="text-sm font-semibold">{t.title}</legend>
        {(
          [
            ["dose", t.dose],
            ["missed", t.missed],
            ["digest", t.digest],
            ["refill", t.refill],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex min-h-11 items-center gap-3 text-base">
            <input
              type="checkbox"
              className="size-6"
              checked={notify[key]}
              onChange={(event) => patch({ notify: { ...notify, [key]: event.target.checked } })}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="mt-4">
        <h3 className="text-sm font-semibold">{t.quiet}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.quietHelp}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className="text-sm">
            {t.from}
            <input className="mt-1 block min-h-11 rounded-xl border border-border bg-background px-3" type="time" value={circle?.quietStart || "22:00"} onChange={(event) => patch({ quietStart: event.target.value })} />
          </label>
          <label className="text-sm">
            {t.until}
            <input className="mt-1 block min-h-11 rounded-xl border border-border bg-background px-3" type="time" value={circle?.quietEnd || "07:00"} onChange={(event) => patch({ quietEnd: event.target.value })} />
          </label>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-amber-bg p-3 text-amber-ink">
        <h3 className="text-sm font-semibold">{t.detailTitle}</h3>
        <p className="mt-1 text-sm leading-relaxed">{t.detailHelp}</p>
        <label className="mt-2 flex min-h-11 items-center gap-3 text-base">
          <input
            type="checkbox"
            className="size-6"
            checked={Boolean(circle?.detailOptIn)}
            disabled={circle ? circle.role !== "owner" : false}
            onChange={(event) => patch({ detailOptIn: event.target.checked })}
          />
          {t.detailOn}
        </label>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          {t.window}
          <input
            className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3"
            type="number"
            min={5}
            max={180}
            value={circle?.missedWindowMin ?? 30}
            onChange={(event) => patch({ missedWindowMin: Number(event.target.value) })}
          />
        </label>
        <label className="text-sm">
          {t.digestTime}
          <input className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3" type="time" value={circle?.digestTime || "21:00"} onChange={(event) => patch({ digestTime: event.target.value })} />
        </label>
        <label className="text-sm sm:col-span-2">
          {t.visit}
          <input className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-background px-3" type="date" value={circle?.visitDate || ""} onChange={(event) => patch({ visitDate: event.target.value || null })} />
        </label>
      </div>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          className="min-h-12 rounded-2xl bg-pine px-4 font-semibold text-white"
          onClick={() => void save()}
        >
          {t.save}
        </button>
        {circle?.role === "owner" ? (
          <button
            type="button"
            className="min-h-12 rounded-2xl bg-card px-4 font-semibold ring-1 ring-border"
            onClick={async () => {
              const response = await fetch("/api/line/group", { method: "POST" });
              const body = (await response.json().catch(() => ({}))) as { code?: string };
              if (!response.ok || !body.code) {
                toast(t.unavailable);
                return;
              }
              setGroupCode(body.code);
            }}
          >
            {t.group}
          </button>
        ) : null}
        {groupCode ? (
          <p className="rounded-2xl bg-amber-bg p-3 text-sm leading-relaxed text-amber-ink">
            <span className="block font-mono text-2xl font-semibold tracking-widest">{groupCode}</span>
            {t.groupHelp}
          </p>
        ) : null}
        {circle?.groupBound ? <p className="text-sm">{t.groupBound}</p> : null}
        {circle?.role === "owner" && circle.groupBound ? (
          <button
            type="button"
            className="min-h-12 rounded-2xl bg-card px-4 font-semibold ring-1 ring-border"
            onClick={async () => {
              const response = await fetch("/api/line/group", { method: "DELETE" });
              if (response.ok) patch({ groupBound: false });
            }}
          >
            {t.unbindGroup}
          </button>
        ) : null}
      </div>
      <Link href="/line/preview" className="mt-4 inline-flex min-h-11 items-center text-base font-semibold text-pine underline">
        {t.preview}
      </Link>
    </section>
  );
}
