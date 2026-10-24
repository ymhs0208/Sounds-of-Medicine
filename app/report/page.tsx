"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdherenceCard } from "@/components/adherence-card";
import { SymptomLog } from "@/components/symptom-log";
import { features } from "@/lib/i18n/features";
import { Button } from "@/components/ui/button";
import { reportSentence, observationLabel, replyLabel } from "@/lib/copy";
import { drugText, formatDateTime } from "@/lib/format";
import { OBS_TEXT, ui } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Observation } from "@/lib/types";
import type { Slot } from "@/lib/slots";
import { slotLabel } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OBSERVATIONS = Object.keys(OBS_TEXT) as Observation[];

export default function ReportPage() {
  const store = useStore();
  const { bags, lang, reports, addObservation, markRepliesSeen } = store;
  const t = ui[lang];
  const drugs = bags.flatMap((bag) => bag.drugs.map((drug) => ({ bag, drug })));
  const [drugId, setDrugId] = useState(drugs[0]?.drug.id ?? "");
  const selected = drugs.find((item) => item.drug.id === drugId);
  const [slot, setSlot] = useState<Slot | undefined>(selected?.drug.slots[0]);
  const [observation, setObservation] = useState<Observation | null>(null);

  useEffect(() => {
    markRepliesSeen();
  }, [markRepliesSeen]);

  useEffect(() => {
    const drug = bags.flatMap((bag) => bag.drugs).find((item) => item.id === drugId);
    setSlot(drug?.slots[0]);
  }, [drugId, bags]);

  const previewZh = selected
    ? reportSentence(
        {
          id: "preview",
          at: new Date().toISOString(),
          date: "",
          kind: "observation",
          drugId: selected.drug.id,
          slot,
          observation: observation ?? undefined,
          source: "form",
          replies: [],
        },
        "zh",
        bags,
      )
    : "";

  const history = [...reports].reverse();

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-3xl font-semibold">{t.reportTitle}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t.reportLead}</p>
      </div>
      <AdherenceCard lang={lang} />
      <SymptomLog />
      {store.symptoms.length ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{features[lang].visitSymptoms}</h2>
          {[...store.symptoms].reverse().map((item) => (
            <article key={item.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
              <p className="font-semibold">{features[lang][item.kind === "vomit" ? "kindVomit" : item.kind === "dizzy" ? "kindDizzy" : item.kind === "fall" ? "kindFall" : item.kind === "appetite" ? "kindAppetite" : item.kind === "bp" ? "kindBp" : "kindSugar"]}</p>
              {item.value ? <p className="text-base">{item.value}</p> : null}
              {item.note ? <p className="text-base leading-relaxed">{item.note}</p> : null}
              {item.noteZh && item.noteZh !== item.note ? <p className="text-sm text-muted-foreground">{item.noteZh}</p> : null}
            </article>
          ))}
        </section>
      ) : null}
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
      <div className="min-w-0">
      {drugs.length === 0 ? (
        <p className="rounded-3xl bg-card px-4 py-6 ring-1 ring-border">{t.noMeds}</p>
      ) : (
        <section className="space-y-3 rounded-3xl bg-card p-4 ring-1 ring-foreground/10">
          <h2 className="text-sm font-semibold text-pine">{t.chooseDrug}</h2>
          <div className="grid gap-2">
            {drugs.map((item) => (
              <button
                key={item.drug.id}
                type="button"
                onClick={() => setDrugId(item.drug.id)}
                className={cn(
                  "min-h-11 w-full min-w-0 rounded-2xl border px-3 py-3 text-left",
                  drugId === item.drug.id ? "border-pine bg-accent" : "border-border",
                )}
              >
                <div className="font-semibold break-words">{drugText(item.drug, lang).name}</div>
                <div className="text-sm text-muted-foreground">{item.bag.hospitalShort}</div>
              </button>
            ))}
          </div>
          {selected && selected.drug.slots.length > 0 ? (
            <>
              <h2 className="text-sm font-semibold text-pine">{t.chooseSlot}</h2>
              <div className="flex flex-wrap gap-2">
                {selected.drug.slots.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSlot(item)}
                    className={cn(
                      "min-h-11 rounded-full px-3 text-sm font-semibold",
                      slot === item ? "bg-pine text-white" : "bg-secondary",
                    )}
                  >
                    {slotLabel[lang][item]}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <h2 className="text-sm font-semibold text-pine">{t.chooseObs}</h2>
          <p className="text-sm text-muted-foreground">{t.obsNote}</p>
          <div className="grid grid-cols-2 gap-2">
            {OBSERVATIONS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setObservation(key)}
                className={cn(
                  "h-auto min-h-12 rounded-2xl border px-2 py-2 text-sm leading-snug font-semibold whitespace-normal",
                  observation === key ? "border-pine bg-accent" : "border-border",
                )}
              >
                {observationLabel(lang, key)}
              </button>
            ))}
          </div>
          {observation && selected ? (
            <div className="rounded-2xl bg-secondary px-3 py-3">
              <p className="text-xs font-semibold text-muted-foreground">{t.familyWillSee}</p>
              <p className="mt-1 text-base leading-relaxed">{previewZh}</p>
            </div>
          ) : null}
          <Button
            type="button"
            className="h-14 w-full rounded-2xl text-lg"
            disabled={!selected || !observation}
            onClick={() => {
              if (!selected || !observation) {
                toast(t.reportNeed);
                return;
              }
              addObservation({ drugId: selected.drug.id, slot, observation });
              setObservation(null);
              toast(t.sent);
            }}
          >
            {t.send}
          </Button>
        </section>
      )}
      </div>
      <section className="mt-4 min-w-0 lg:mt-0">
        <h2 className="mb-2 text-lg font-semibold">{t.youSaid}</h2>
        {history.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{t.emptyReportHint}</p>
        ) : (
          <div className="space-y-3">
            {history.map((report) => (
              <article key={report.id} className="rounded-3xl bg-card p-4 ring-1 ring-border">
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(report.at, lang)} · {report.source === "timeline" ? t.sourceTimeline : t.sourceForm}
                </p>
                <p className="mt-1 text-base font-semibold leading-relaxed">{reportSentence(report, lang, bags)}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{reportSentence(report, "zh", bags)}</p>
                {report.replies.length ? (
                  <div className="mt-3 space-y-2">
                    {report.replies.map((reply) => (
                      <p key={reply.id} className="rounded-2xl bg-accent px-3 py-2 text-sm leading-relaxed">
                        <span className="font-semibold">{t.familySaid}　</span>
                        {replyLabel(lang, reply.template)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">{t.noReplyYet}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
