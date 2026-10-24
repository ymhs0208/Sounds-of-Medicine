"use client";

import { TriangleAlert } from "lucide-react";
import { duplicateLine } from "@/lib/copy";
import { duplicateGroups } from "@/lib/duplicates";
import { drugText } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

export function DuplicateBanner({ lang }: { lang: Lang }) {
  const { bags } = useStore();
  const groups = duplicateGroups(bags);
  if (!groups.length) return null;
  const t = ui[lang];
  return (
    <section className="rounded-2xl bg-amber-bg px-4 py-3 ring-1 ring-[#efd3a0]">
      <div className="flex items-center gap-2 text-base font-semibold text-amber-ink">
        <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
        {t.askTitle}
      </div>
      <div className="mt-2 space-y-1 text-sm leading-relaxed text-[#3f2e10]">
        {groups.map((group) => (
          <p key={group.key}>
            {duplicateLine(
              lang,
              group.items.map((item) => ({
                hospital: item.bag.hospitalShort,
                name: drugText(item.drug, lang).name,
              })),
              group.ingredient,
            )}
          </p>
        ))}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[#3f2e10]">{t.askBody}</p>
    </section>
  );
}
