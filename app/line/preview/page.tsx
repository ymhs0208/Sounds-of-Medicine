"use client";

import { PageHeader } from "@/components/page-header";
import { previewCards } from "@/lib/line-messages";
import { lineCopy } from "@/lib/i18n/line";
import { useStore } from "@/lib/store";

export default function LinePreviewPage() {
  const store = useStore();
  const cards = previewCards(store.lang);
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-8">
      <PageHeader title={lineCopy[store.lang].preview} />
      <div className="space-y-4 rounded-[2rem] bg-[#7494c0] p-4">
        {cards.map((card) => (
          <article key={card.title} className="ml-auto w-full max-w-sm rounded-2xl bg-white p-4 text-[#1c1915] shadow-sm" data-flex-preview="1">
            <h2 className="text-lg font-semibold">{card.title}</h2>
            {card.lines.map((line) => (
              <p key={line} className="mt-2 text-sm leading-relaxed">{line}</p>
            ))}
            {card.buttons.length ? (
              <div className="mt-3 flex gap-2">
                {card.buttons.map((button) => (
                  <span key={button} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#eef6e8] px-3 text-sm font-semibold text-[#1f6b3a]">
                    {button}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
