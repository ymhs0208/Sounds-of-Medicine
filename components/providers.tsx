"use client";

import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";
import { DoseWatcher } from "@/components/dose-watcher";
import { StoreProvider } from "@/lib/store";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (process.env.NEXT_PUBLIC_STATIC === "1") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

function DisplayMode() {
  const store = useStore();
  useEffect(() => {
    if (!store.ready) return;
    document.documentElement.dataset.large = store.largeText ? "1" : "0";
  }, [store.ready, store.largeText]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <RegisterServiceWorker />
      <DisplayMode />
      <DoseWatcher />
      <AppShell>{children}</AppShell>
      <Toaster position="top-center" richColors />
    </StoreProvider>
  );
}
