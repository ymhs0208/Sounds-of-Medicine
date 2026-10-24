import { Moon, Sun, Sunrise, Sunset, Utensils } from "lucide-react";
import { slotLabel } from "@/lib/i18n";
import { SLOT_TIME, slotDayPart, slotTiming, type Slot } from "@/lib/slots";
import type { Lang } from "@/lib/types";
import { ui } from "@/lib/i18n";

export function SlotPill({ slot, lang }: { slot: Slot; lang: Lang }) {
  const part = slotDayPart(slot);
  const timing = slotTiming(slot);
  const Icon = part === "morning" ? Sunrise : part === "noon" ? Sun : part === "evening" ? Sunset : Moon;
  const meal =
    timing === "before" ? ui[lang].beforeMeal : timing === "after" ? ui[lang].afterMeal : null;
  return (
    <div className="flex min-h-14 items-center gap-2 rounded-2xl bg-accent px-3 py-2 text-accent-foreground">
      <Icon className="size-6 shrink-0" aria-hidden="true" />
      <div>
        <div className="text-base font-semibold leading-tight">{slotLabel[lang][slot]}</div>
        <div className="text-sm text-[#3d5c4c]">
          {SLOT_TIME[slot]}
          {meal ? ` · ${meal}` : ""}
        </div>
      </div>
      {meal ? <Utensils className="ml-auto size-4 opacity-70" aria-hidden="true" /> : null}
    </div>
  );
}
