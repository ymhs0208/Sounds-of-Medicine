import { Moon, Pill, Soup, SunMedium, Sunrise, Sunset, Utensils } from "lucide-react";
import { slotLabel } from "@/lib/i18n";
import { slotDayPart, slotTiming, type Slot } from "@/lib/slots";
import type { Bag, Lang } from "@/lib/types";

function timingIcon(slot: Slot) {
  const part = slotDayPart(slot);
  const timing = slotTiming(slot);
  if (part === "bedtime") return Moon;
  if (timing === "before") return Utensils;
  if (timing === "after") return Soup;
  if (part === "morning") return Sunrise;
  if (part === "noon") return SunMedium;
  return Sunset;
}

export function DoseMark({ bag, slot, lang, on }: { bag: Bag; slot: Slot; lang: Lang; on: boolean }) {
  if (!on) return null;
  const Icon = timingIcon(slot);
  return (
    <div className="mt-3 flex min-w-0 items-center gap-3">
      {bag.photoDataUrl ? (
        // Local data URL from the caregiver's camera; next/image cannot optimize it.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bag.photoDataUrl} alt="" className="size-14 shrink-0 rounded-2xl object-cover" />
      ) : (
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-pine">
          <Pill className="size-6" aria-hidden="true" />
        </span>
      )}
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <span className="min-w-0 text-lg leading-snug font-semibold break-words">{slotLabel[lang][slot]}</span>
    </div>
  );
}
