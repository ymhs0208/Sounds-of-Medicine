import { features } from "@/lib/i18n/features";
import type { Lang } from "@/lib/types";

export function AskLine({ lang }: { lang: Lang }) {
  return (
    <p className="rounded-2xl bg-amber-bg px-3 py-3 text-base leading-snug font-semibold text-amber-ink">{features[lang].askDoctor}</p>
  );
}
