"use client";

import { LANG_OPTIONS } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LanguagePicker({
  value,
  onChange,
}: {
  value: Lang | null;
  onChange: (lang: Lang) => void;
}) {
  return (
    <div className="grid gap-2">
      {LANG_OPTIONS.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "flex min-h-14 items-center justify-between rounded-2xl border px-4 text-left transition",
              selected
                ? "border-pine bg-pine text-white"
                : "border-border bg-card text-foreground hover:bg-secondary",
            )}
          >
            <span className="text-lg font-semibold">{option.native}</span>
            <span className={cn("text-sm", selected ? "text-white/80" : "text-muted-foreground")}>
              {option.zh}
            </span>
          </button>
        );
      })}
    </div>
  );
}
