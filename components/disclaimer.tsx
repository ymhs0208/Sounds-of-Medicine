import { ui } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

export function Disclaimer({ lang }: { lang: Lang }) {
  return (
    <p className="rounded-2xl bg-amber-bg px-3 py-2 text-sm leading-relaxed text-amber-ink ring-1 ring-[#efd3a0]">
      {ui[lang].disclaimer}
    </p>
  );
}
