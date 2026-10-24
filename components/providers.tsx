"use client";

import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";
import { DoseWatcher } from "@/components/dose-watcher";
import { CircleProvider } from "@/components/circle-provider";
import { Runtime } from "@/components/runtime";
import { StoreProvider } from "@/lib/store";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

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
      <CircleProvider>
        <DisplayMode />
        <Runtime />
        <DoseWatcher />
        <AppShell>{children}</AppShell>
        <Toaster position="top-center" richColors />
      </CircleProvider>
    </StoreProvider>
  );
}
