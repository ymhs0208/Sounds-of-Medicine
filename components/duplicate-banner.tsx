"use client";

import { TriangleAlert } from "lucide-react";
import { duplicateLine } from "@/lib/copy";
import { duplicateGroups } from "@/lib/duplicates";
import { drugText } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { features } from "@/lib/i18n/features";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

export function DuplicateBanner({ lang, prominent = false, bare = false }: { lang: Lang; prominent?: boolean; bare?: boolean }) {
  const { bags } = useStore();
  const groups = duplicateGroups(bags);
  if (!groups.length) return null;
  const t = ui[lang];
  return (
    <section className={bare ? "space-y-2" : prominent ? "rounded-3xl bg-amber-bg px-4 py-4 ring-2 ring-amber-ink/40" : "rounded-2xl bg-amber-bg px-4 py-3 ring-1 ring-amber-ink/30"}>
      <div className="flex items-start gap-2 text-base font-semibold text-amber-ink">
        <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0">{t.askTitle}</span>
      </div>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-amber-ink">
        {groups.map((group) => (
          <div key={group.key}>
            <p>
              {duplicateLine(
                lang,
                group.items.map((item) => ({
                  hospital: item.bag.hospitalShort,
                  name: drugText(item.drug, lang).name,
                })),
                group.ingredient,
              )}
            </p>
            {lang !== "zh" ? (
              <p className="text-xs leading-snug">{group.items.map((item) => item.drug.nameZh).filter(Boolean).join(" · ")}</p>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-amber-ink">{t.askBody}</p>
      <p className="mt-2 text-base font-semibold text-amber-ink">{features[lang].askDoctor}</p>
    </section>
  );
}
