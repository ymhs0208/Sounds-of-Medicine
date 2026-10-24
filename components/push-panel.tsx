"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { subscribePush } from "@/components/runtime";
import { launch } from "@/lib/i18n/launch";
import { deviceId } from "@/lib/paid-client";
import { scheduleTimes } from "@/lib/push-schedule";
import { useStore } from "@/lib/store";

type PushState = "checking" | "on" | "off" | "unsupported" | "unavailable";

export function PushPanel() {
  const store = useStore();
  const t = launch[store.lang];
  const [state, setState] = useState<PushState>("checking");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") {
      setState("unsupported");
      return;
    }
    fetch("/api/push/key")
      .then((response) => response.json())
      .then(async (body: { enabled?: boolean }) => {
        if (!body.enabled) {
          setState("unavailable");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        setState(existing ? "on" : "off");
      })
      .catch(() => setState("unavailable"));
  }, []);

  async function enable() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      toast(t.pushUnsupported);
      return;
    }
    const keyResponse = await fetch("/api/push/key");
    const keyBody = (await keyResponse.json()) as { enabled?: boolean; publicKey?: string };
    if (!keyBody.enabled || !keyBody.publicKey) {
      setState("unavailable");
      toast(t.pushUnavailable);
      return;
    }
    const subscription = await subscribePush(keyBody.publicKey);
    const json = subscription.toJSON();
    const times = scheduleTimes(store.bags.flatMap((bag) => bag.drugs.flatMap((drug) => drug.slots ?? [])));
    const saved = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: deviceId(),
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        lang: store.lang,
        times,
        sent: {},
      }),
    });
    if (!saved.ok) {
      toast(t.pushUnavailable);
      return;
    }
    localStorage.setItem("yaosheng.push", "1");
    setState("on");
    toast(t.pushSaved);
  }

  async function disable() {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    await existing?.unsubscribe();
    await fetch(`/api/push/subscribe?id=${encodeURIComponent(deviceId())}`, { method: "DELETE" });
    localStorage.removeItem("yaosheng.push");
    setState("off");
  }

  return (
    <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
      <h2 className="text-base font-semibold">{t.pushTitle}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.pushLead}</p>
      {state === "unsupported" ? <p className="mt-2 text-sm leading-relaxed">{t.pushUnsupported}</p> : null}
      {state === "unavailable" ? <p className="mt-2 text-sm leading-relaxed">{t.pushUnavailable}</p> : null}
      {state === "off" ? (
        <Button type="button" variant="outline" className="mt-3 h-12 w-full rounded-2xl" onClick={() => void enable()}>
          {t.pushOff}
        </Button>
      ) : null}
      {state === "on" ? (
        <Button type="button" variant="outline" className="mt-3 h-12 w-full rounded-2xl" onClick={() => void disable()}>
          {t.pushOn}
        </Button>
      ) : null}
    </section>
  );
}
