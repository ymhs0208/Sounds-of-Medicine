"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { launch } from "@/lib/i18n/launch";
import { loadVault } from "@/lib/circle-vault";
import { deviceId, rememberTurnstile } from "@/lib/paid-client";
import { scheduleTimes } from "@/lib/push-schedule";
import { scrubErrorText } from "@/lib/scrub";
import { useStore } from "@/lib/store";

type TurnstileApi = {
  render: (el: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => string;
};

function urlBase64ToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function Runtime() {
  const store = useStore();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [siteKey, setSiteKey] = useState("");
  const copy = launch[store.lang] ?? launch.zh;

  useEffect(() => {
    if (!store.storageLocked) return;
    toast(copy.storageLocked);
  }, [store.storageLocked, copy.storageLocked]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_STATIC === "1") return;
    if (!("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    const watch = () => {
      if (registration?.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
    };
    let hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.register("/sw.js").then((registered) => {
      registration = registered;
      const claimFirst = () => {
        if (!hadController && registered.waiting) registered.waiting.postMessage("SKIP_WAITING");
        watch();
      };
      claimFirst();
      registered.addEventListener("updatefound", () => {
        registered.installing?.addEventListener("statechange", claimFirst);
      });
    }).catch(() => undefined);
    const onController = () => {
      if (hadController) window.location.reload();
      hadController = true;
    };
    navigator.serviceWorker.addEventListener("controllerchange", onController);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onController);
  }, []);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: scrubErrorText(event.message || "error"), stack: scrubErrorText(event.error?.stack || "") }),
      }).catch(() => undefined);
    };
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STATIC === "1") return;
    fetch("/api/status")
      .then((response) => response.json())
      .then((body: { turnstile?: boolean; turnstileSiteKey?: string; analyticsToken?: string }) => {
        if (body.turnstile && body.turnstileSiteKey) setSiteKey(body.turnstileSiteKey);
        if (body.analyticsToken && !document.querySelector("script[data-yaosheng-analytics]")) {
          const script = document.createElement("script");
          script.defer = true;
          script.dataset.yaoshengAnalytics = "1";
          script.src = "https://static.cloudflareinsights.com/beacon.min.js";
          script.dataset.cfBeacon = JSON.stringify({ token: body.analyticsToken });
          document.head.appendChild(script);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!store.ready || localStorage.getItem("yaosheng.push") !== "1") return;
    if (!("serviceWorker" in navigator)) return;
    const timer = window.setTimeout(() => {
      const times = scheduleTimes(store.bags.flatMap((bag) => bag.drugs.flatMap((drug) => drug.slots ?? [])));
      navigator.serviceWorker.ready
        .then(async (registration) => {
          const subscription = await registration.pushManager.getSubscription();
          const json = subscription?.toJSON();
          if (!subscription || !json?.keys?.p256dh || !json.keys.auth) return;
          const vault = await loadVault().catch(() => null);
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: deviceId(),
              endpoint: subscription.endpoint,
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
              lang: store.lang,
              ...(vault?.circleId ? { circleId: vault.circleId } : {}),
              times,
              sent: {},
            }),
          });
        })
        .catch(() => undefined);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [store.ready, store.lang, store.bags]);

  useEffect(() => {
    if (!siteKey) return;
    const holder = document.getElementById("yaosheng-turnstile");
    if (!holder) return;
    const win = window as Window & { turnstile?: TurnstileApi };
    const render = () => {
      if (!win.turnstile || holder.childElementCount > 0) return;
      win.turnstile.render(holder, { sitekey: siteKey, callback: rememberTurnstile });
    };
    const existing = document.querySelector<HTMLScriptElement>("script[data-yaosheng-turnstile]");
    if (existing) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.dataset.yaoshengTurnstile = "1";
    script.onload = render;
    document.head.appendChild(script);
  }, [siteKey]);

  return (
    <>
      {waiting ? (
        <div className="fixed right-4 bottom-[max(5.5rem,env(safe-area-inset-bottom))] left-4 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-card p-3 ring-1 ring-border" role="status">
          <p className="text-sm font-semibold">{copy.updateTitle}</p>
          <button
            type="button"
            className="min-h-11 rounded-xl bg-pine px-3 text-sm font-semibold text-white"
            onClick={() => {
              waiting.postMessage("SKIP_WAITING");
            }}
          >
            {copy.updateAction}
          </button>
        </div>
      ) : null}
      {siteKey ? (
        <div className="fixed right-4 bottom-[max(5.5rem,env(safe-area-inset-bottom))] left-4 z-20 mx-auto max-w-md rounded-2xl bg-card p-3 ring-1 ring-border">
          <p className="mb-2 text-sm">{copy.turnstileLabel}</p>
          <div id="yaosheng-turnstile" />
        </div>
      ) : null}
    </>
  );
}

export function subscribePush(publicKey: string): Promise<PushSubscription> {
  return navigator.serviceWorker.ready.then((registration) =>
    registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(publicKey) as BufferSource }),
  );
}
