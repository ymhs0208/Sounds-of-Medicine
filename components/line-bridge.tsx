"use client";

import { useEffect, useRef } from "react";
import { todayISO } from "@/lib/format";
import { buildLinePlan } from "@/lib/line-plan";
import type { DoseEvent } from "@/lib/line-events";
import { useStore } from "@/lib/store";

type Remote = { detail: boolean; visit: string | null; enabled: boolean };

export function LineBridge() {
  const store = useStore();
  const remote = useRef<Remote>({ detail: false, visit: null, enabled: false });
  const since = useRef("");

  useEffect(() => {
    if (!store.ready) return;
    let stop = false;
    void fetch("/api/line/settings")
      .then((response) => response.json())
      .then((body: { enabled?: boolean; circle?: { detailOptIn?: boolean; visitDate?: string | null } | null }) => {
        if (stop) return;
        remote.current = {
          enabled: Boolean(body.enabled && body.circle),
          detail: Boolean(body.circle?.detailOptIn),
          visit: body.circle?.visitDate || null,
        };
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [store.ready]);

  useEffect(() => {
    if (!store.ready) return;
    let stop = false;
    async function pull() {
      const response = await fetch(`/api/line/events?since=${encodeURIComponent(since.current)}`).catch(() => null);
      if (!response || !response.ok || stop) return;
      const body = (await response.json()) as { events?: DoseEvent[] };
      if (!body.events?.length) return;
      store.applyLineDoses(body.events);
      since.current = body.events[body.events.length - 1]?.at || since.current;
    }
    void pull();
    const timer = window.setInterval(() => void pull(), 60_000);
    window.addEventListener("focus", pull);
    return () => {
      stop = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", pull);
    };
  }, [store, store.ready]);

  useEffect(() => {
    if (!store.ready) return;
    const timer = window.setTimeout(() => {
      if (!remote.current.enabled) return;
      const plan = buildLinePlan(store, todayISO(), remote.current.detail, remote.current.visit);
      void fetch("/api/line/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lang: store.lang,
          supplyDays: plan.supplyDays,
          observationCount: plan.observationCount,
          doses: plan.doses,
          refills: plan.refills,
          alerts: plan.alerts,
        }),
      }).catch(() => undefined);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [store, store.ready, store.lang, store.bags, store.logs, store.symptoms, store.reports]);

  return null;
}
