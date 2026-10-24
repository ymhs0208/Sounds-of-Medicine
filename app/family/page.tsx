"use client";

import Link from "next/link";
import { toast } from "sonner";
import { DuplicateBanner } from "@/components/duplicate-banner";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { replyLabel, reportSentence } from "@/lib/copy";
import { drugText, formatDateTime, patientName } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { drugPath } from "@/lib/routes";
import { useStore } from "@/lib/store";
import type { ReplyTemplate } from "@/lib/types";

const REPLIES: ReplyTemplate[] = ["thanks", "tonight", "watch", "pharmacist"];

export default function FamilyPage() {
  const store = useStore();
  const t = ui.zh;
  const name = patientName(store.bags);
  const history = [...store.reports].reverse();

  return (
    <div className="space-y-4 pb-8">
      <div>
        <p className="text-sm font-semibold text-pine">家屬 · 繁體中文</p>
        <h1 className="text-3xl font-semibold">{t.familyTitle}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t.familyLead}</p>
        {name ? <p className="mt-2 text-lg font-semibold">{t.printPatient}　{name}</p> : null}
      </div>
      <Button nativeButton={false} className="h-12 w-full rounded-2xl text-base" render={<Link href="/family/print" />}>
        {t.print}
      </Button>
      <DuplicateBanner lang="zh" />
      <section>
        <h2 className="mb-2 text-lg font-semibold">{t.medsZh}</h2>
        {store.bags.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noMeds}</p>
        ) : (
          <div className="space-y-2">
            {store.bags.flatMap((bag) =>
              bag.drugs.map((drug) => (
                <Link key={drug.id} href={drugPath(drug.id)} className="block rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
                  <div className="font-semibold">{drugText(drug, "zh").name}</div>
                  <div className="text-sm text-muted-foreground">
                    {bag.hospitalShort} · {drug.usageZh}
                  </div>
                </Link>
              )),
            )}
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">{t.familyFeed}</h2>
        {history.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{t.noFeed}</p>
        ) : (
          <div className="space-y-3">
            {history.map((report) => (
              <article key={report.id} className="rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(report.at, "zh")} · {report.source === "timeline" ? t.sourceTimeline : t.sourceForm}
                </p>
                <p className="mt-1 text-lg font-semibold leading-relaxed">{reportSentence(report, "zh", store.bags)}</p>
                <p className="mt-3 text-sm font-semibold text-pine">{t.reply}</p>
                <div className="mt-2 grid gap-2">
                  {REPLIES.map((template) => (
                    <Button
                      key={template}
                      type="button"
                      variant="outline"
                      className="h-auto min-h-11 justify-start rounded-2xl px-3 py-2 text-left text-sm whitespace-normal"
                      onClick={() => {
                        store.addReply(report.id, template);
                        toast(t.replySent);
                      }}
                    >
                      {replyLabel("zh", template)}
                    </Button>
                  ))}
                </div>
                {report.replies.length ? (
                  <div className="mt-3 space-y-1">
                    {report.replies.map((reply) => (
                      <p key={reply.id} className="text-sm text-muted-foreground">
                        {t.familySaid}：{replyLabel("zh", reply.template)}
                      </p>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
      <Disclaimer lang="zh" />
      <Button nativeButton={false} variant="secondary" className="h-12 w-full rounded-2xl" render={<Link href="/today" />}>
        {t.backCare}
      </Button>
    </div>
  );
}
