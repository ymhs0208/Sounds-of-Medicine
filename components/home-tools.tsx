"use client";

import Link from "next/link";
import { CalendarDays, MessageSquareText, NotebookPen, Pill, ShieldAlert } from "lucide-react";
import { features } from "@/lib/i18n/features";
import { useStore } from "@/lib/store";

const LINKS = [
  ["/talk", "homeTalk", MessageSquareText],
  ["/report", "homeSymptoms", NotebookPen],
  ["/visit", "homeVisit", CalendarDays],
  ["/refill", "homeRefill", Pill],
  ["/emergency", "homeEmergency", ShieldAlert],
] as const;

export function HomeTools() {
  const store = useStore();
  const t = features[store.lang];
  return (
    <section aria-label={t.toolsLabel}>
      <div className="grid grid-cols-5 gap-1.5">
        {LINKS.map(([href, key, Icon]) => (
          <Link
            key={href}
            href={href}
            aria-label={t[key]}
            className="flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl bg-card px-1 py-2 text-pine ring-1 ring-border"
          >
            <Icon className="size-6 shrink-0" aria-hidden="true" />
          </Link>
        ))}
      </div>
      <details className="mt-2 rounded-2xl bg-card ring-1 ring-border">
        <summary className="cursor-pointer list-none px-4 py-3 text-base font-semibold">{t.toolsLabel}</summary>
        <ul className="space-y-1 px-2 pb-3">
          {LINKS.map(([href, key, Icon]) => (
            <li key={href}>
              <Link href={href} className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-base font-semibold">
                <Icon className="size-5 shrink-0 text-pine" aria-hidden="true" />
                {t[key]}
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
