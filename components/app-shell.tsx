"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Camera, MessageSquareText, Pill, Settings, SunMedium, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { LANG_OPTIONS, ui } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function Splash() {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-background">
      <div className="text-center">
        <Logo className="mx-auto size-14" />
        <div className="mt-3 text-2xl font-semibold">藥聲</div>
      </div>
    </div>
  );
}

function CareFrame({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (store.ready && !store.onboarded) router.replace("/");
  }, [store.ready, store.onboarded, router]);

  if (!store.ready || !store.onboarded) return <Splash />;

  const family = pathname.startsWith("/family");
  const lang = family ? "zh" : store.lang;
  const t = ui[lang];
  const languageName = LANG_OPTIONS.find((option) => option.id === store.lang)?.native ?? "";
  const unseen = store.reports.some((report) => report.replies.some((reply) => !reply.seen));

  const items = [
    { href: "/today", label: t.navToday, icon: SunMedium },
    { href: "/meds", label: t.navMeds, icon: Pill },
    { href: "/scan", label: t.navScan, icon: Camera, center: true },
    { href: "/report", label: t.navReport, icon: MessageSquareText, dot: unseen },
    { href: "/family", label: t.navFamily, icon: Users },
  ];

  function isActive(href: string) {
    if (href === "/scan") return pathname.startsWith("/scan") || pathname.startsWith("/review");
    if (href === "/meds") return pathname.startsWith("/meds");
    if (href === "/family") return pathname.startsWith("/family");
    return pathname === href;
  }

  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-1 flex-col">
      <header className="no-print sticky top-0 z-20 flex shrink-0 items-center justify-between gap-3 bg-background/95 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <Link href="/today" className="flex min-w-0 flex-1 items-center gap-2 rounded-xl">
          <Logo className="size-9 shrink-0" />
          <span className="min-w-0">
            <span className="block text-lg font-semibold leading-none">藥聲</span>
            <span className="mt-1 block text-sm leading-tight break-words text-muted-foreground">
              {family ? "家屬 · 繁體中文" : languageName}
            </span>
          </span>
        </Link>
        <Link
          href="/settings"
          aria-label={t.openSettings}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-card ring-1 ring-border"
        >
          <Settings className="size-5" />
        </Link>
      </header>
      <main className="min-h-0 w-full min-w-0 flex-1 overflow-x-clip overflow-y-auto px-4 pt-2 pb-8">{children}</main>
      <nav className="no-print grid shrink-0 grid-cols-5 items-end border-t border-border bg-card px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          if (item.center) {
            return (
              <Link key={item.href} href={item.href} className="flex min-w-0 flex-col items-center px-0.5">
                <span className="-mt-3 grid size-14 place-items-center rounded-full bg-pine text-white shadow-lg">
                  <Icon className="size-6" />
                </span>
                <span className="mt-1 w-full text-center text-sm leading-tight font-semibold break-words text-pine">{item.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-center text-sm leading-tight font-medium break-words",
                active ? "text-pine" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" />
              {item.label}
              {item.dot ? <span className="absolute top-1 right-3 size-2 rounded-full bg-rose" /> : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const print = pathname.startsWith("/family/print");
  const onboard = pathname === "/";

  if (print) {
    return <div className="min-h-dvh bg-white text-[#1c1915]">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col">
        {onboard ? <main className="flex min-h-dvh w-full min-w-0 flex-1 flex-col">{children}</main> : <CareFrame>{children}</CareFrame>}
      </div>
    </div>
  );
}
