"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { dueItems } from "@/lib/doses";
import { drugText, fill, todayISO } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { refillStatuses } from "@/lib/refill";
import { notificationSupport, showNotification } from "@/lib/notify";
import { buildTimeline } from "@/lib/schedule";
import { useStore } from "@/lib/store";

export function DoseWatcher() {
  const store = useStore();

  useEffect(() => {
    if (!store.ready || !store.onboarded) return;
    let stopped = false;

    async function tick() {
      if (stopped || document.visibilityState === "hidden") return;
      const day = todayISO();
      const items = buildTimeline(store.bags, store.logs, day);
      const due = dueItems(items, day, new Date(), store.notified);
      if (!due.length) return;
      const t = ui[store.lang];
      for (const item of due) {
        const name = drugText(item.drug, store.lang).name;
        toast(fill(t.doseDue, { name }));
      }
      if (notificationSupport() === "granted") {
        const t = ui[store.lang];
        const body = due.map((item) => drugText(item.drug, store.lang).name).join(" · ");
        await showNotification(t.notifTitle, body);
      }
      store.markNotified(due.map((item) => ({ drugId: item.drug.id, date: day, slot: item.slot })));
    }

    function remindRefills() {
      if (stopped || document.visibilityState === "hidden") return;
      const day = todayISO();
      const due = refillStatuses(store.bags, store.logs, day).filter((row) => {
        if (!row.level) return false;
        return !store.refillNotified.some((notice) => notice.drugId === row.drugId && notice.level === row.level && notice.runOut === row.runOut);
      });
      if (!due.length) return;
      store.markRefillNotified(due.map((row) => ({ drugId: row.drugId, level: row.level!, runOut: row.runOut })));
    }

    void tick();
    remindRefills();
    const timer = window.setInterval(() => void tick(), 20_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [store]);

  return null;
}
