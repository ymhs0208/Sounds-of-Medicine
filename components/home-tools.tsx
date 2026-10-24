"use client";

import Link from "next/link";
import { features } from "@/lib/i18n/features";
import { useStore } from "@/lib/store";

const LINKS = [
  ["/talk", "homeTalk"],
  ["/report", "homeSymptoms"],
  ["/visit", "homeVisit"],
  ["/refill", "homeRefill"],
  ["/emergency", "homeEmergency"],
] as const;

export function HomeTools() {
  const store = useStore();
  const t = features[store.lang];
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
      {LINKS.map(([href, key]) => (
        <Link key={href} href={href} className="flex min-h-14 items-center justify-center rounded-2xl bg-card px-3 py-2 text-center text-base leading-snug font-semibold ring-1 ring-border">
          {t[key]}
        </Link>
      ))}
    </div>
  );
}
