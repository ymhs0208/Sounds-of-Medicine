"use client";

import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";
import { DoseWatcher } from "@/components/dose-watcher";
import { StoreProvider } from "@/lib/store";
import { useEffect } from "react";

function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (process.env.NEXT_PUBLIC_STATIC === "1") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <RegisterServiceWorker />
      <DoseWatcher />
      <AppShell>{children}</AppShell>
      <Toaster theme="light" position="top-center" richColors closeButton />
    </StoreProvider>
  );
}
