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
    <div className="flex h-full flex-1 items-center justify-center bg-background">
      <div className="text-center">
        <Logo className="mx-auto size-14" />
        <div className="mt-3 text-2xl font-semibold">藥聲</div>
      </div>
    </div>
  );
}

function JudgeRail() {
  return (
    <aside className="no-print hidden px-2 pt-10 text-[#2b241c] lg:block">
      <Logo className="size-12" />
      <p className="mt-4 text-sm font-semibold tracking-wide text-pine">藥袋語音助手</p>
      <h1 className="mt-1 text-3xl font-semibold leading-tight">藥聲</h1>
      <p className="mt-2 text-base leading-relaxed">
        外籍看護的藥袋語音助手。只翻譯並朗讀藥袋上的字，不另外給醫療建議。
      </p>
      <ol className="mt-6 space-y-3 text-sm leading-relaxed">
        <li>1. 填被照顧者姓名、家屬聯絡方式，選語言，勾選同意。</li>
        <li>2. 拍真正的藥袋，或手動把藥袋上的字打進去，核對後再存。</li>
        <li>3. 今天的時間軸記錄已餵藥或漏吃。開著畫面才會提醒。</li>
        <li>4. 兩包藥成分相同時，只顯示「請詢問藥師」。</li>
        <li>5. 家屬頁是繁體中文，可看服用紀錄並列印摘要。</li>
      </ol>
      <p className="mt-6 text-sm text-[#5c5346]">設定裡的「試用示範資料」是虛構藥袋，不會和真實藥袋混在一起。</p>
    </aside>
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
    <>
      <header className="no-print flex shrink-0 items-center justify-between px-4 py-3">
        <Link href="/today" className="flex items-center gap-2">
          <Logo className="size-9" />
          <span>
            <span className="block text-lg font-semibold leading-none">藥聲</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {family ? "家屬 · 繁體中文" : languageName}
            </span>
          </span>
        </Link>
        <Link
          href="/settings"
          aria-label={t.openSettings}
          className="grid size-11 place-items-center rounded-full bg-card ring-1 ring-border"
        >
          <Settings className="size-5" />
        </Link>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</main>
      <nav className="no-print grid shrink-0 grid-cols-5 border-t border-border bg-card px-1 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          if (item.center) {
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center">
                <span className="-mt-5 grid size-14 place-items-center rounded-full bg-pine text-white shadow-lg">
                  <Icon className="size-6" />
                </span>
                <span className="mt-1 text-xs font-semibold text-pine">{item.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-12 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                active ? "text-pine" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {item.label}
              {item.dot ? <span className="absolute top-1 right-4 size-2 rounded-full bg-rose" /> : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const print = pathname.startsWith("/family/print");
  const onboard = pathname === "/";

  if (print) {
    return <div className="min-h-dvh bg-white text-foreground">{children}</div>;
  }

  return (
    <div className="min-h-dvh bg-[#e4ddd0] lg:grid lg:grid-cols-[minmax(240px,320px)_430px] lg:items-start lg:justify-center lg:gap-8 lg:px-6">
      <JudgeRail />
      <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col bg-background lg:my-4 lg:h-[calc(100dvh-2rem)] lg:overflow-hidden lg:rounded-[2rem] lg:shadow-[0_24px_70px_rgba(48,36,12,0.18)] lg:ring-1 lg:ring-black/10">
        {onboard ? <main className="min-h-0 flex-1 overflow-y-auto">{children}</main> : <CareFrame>{children}</CareFrame>}
      </div>
    </div>
  );
}
