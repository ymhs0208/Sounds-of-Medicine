import { AskLine } from "@/components/ask-line";
import { Wordmark } from "@/components/logo";
import { features } from "@/lib/i18n/features";
import { fill } from "@/lib/format";
import type { VisitSummary } from "@/lib/summary";

const kindZh = {
  vomit: "嘔吐",
  dizzy: "頭暈",
  fall: "跌倒",
  appetite: "食慾不好",
  bp: "血壓數字",
  sugar: "血糖數字",
} as const;

export function VisitSheet({ summary }: { summary: VisitSummary }) {
  const t = features.zh;
  const percent = summary.adherence.percent === null ? "—" : `${summary.adherence.percent}%`;
  return (
    <div className="print-sheet space-y-4">
      <p className="text-sm font-semibold text-[#1b5e45]"><Wordmark /></p>
      <h1 className="text-3xl font-semibold">{t.visitTitle}</h1>
      <p className="text-base leading-relaxed">{t.visitLead}</p>
      <AskLine lang="zh" />
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-[#5c5346]">被照顧者</dt>
          <dd className="font-semibold break-words">{summary.patientName || "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-[#5c5346]">日期</dt>
          <dd className="font-semibold">{summary.day}</dd>
        </div>
        <div>
          <dt className="text-sm text-[#5c5346]">{t.visitAllergies}</dt>
          <dd className="font-semibold break-words">{summary.allergiesZh || summary.allergies || t.emergencyNone}</dd>
        </div>
        <div>
          <dt className="text-sm text-[#5c5346]">家屬</dt>
          <dd className="font-semibold break-words">{summary.familyContact || "—"}</dd>
        </div>
      </dl>
      <p className="text-base leading-relaxed">
        {fill(t.visitAdherence, {
          days: String(summary.adherence.days),
          given: String(summary.adherence.given),
          missed: String(summary.adherence.missed),
          pending: String(summary.adherence.pending),
          total: String(summary.adherence.total),
          percent,
        })}
      </p>
      <section>
        <h2 className="text-xl font-semibold">{t.visitMeds}</h2>
        {summary.meds.length === 0 ? <p className="mt-2">{t.visitNone}</p> : null}
        <div className="mt-2 space-y-3">
          {summary.meds.map((med) => (
            <article key={med.drugId} className="break-inside-avoid rounded-2xl border border-[#e0d6c4] p-4">
              <h3 className="text-lg font-semibold break-words">{med.nameZh}</h3>
              <p className="text-sm">{med.hospitalZh}</p>
              <p className="mt-1">{med.doseZh || "—"} · {med.usageZh || "—"}</p>
              {med.ingredient ? <p>成分：{med.ingredient}</p> : null}
              {med.refill ? <p>{t.visitDays}：{med.refill.daysLeft}</p> : null}
            </article>
          ))}
        </div>
      </section>
      {summary.duplicates.length ? (
        <section>
          <h2 className="text-xl font-semibold">{t.visitDupes}</h2>
          {summary.duplicates.map((group) => (
            <p key={group.key} className="mt-2 leading-relaxed">
              {group.ingredient}：{group.items.map((item) => `${item.bag.hospitalShort} ${item.drug.nameZh}`).join("、")}
            </p>
          ))}
          <div className="mt-2">
            <AskLine lang="zh" />
          </div>
        </section>
      ) : null}
      <section>
        <h2 className="text-xl font-semibold">{t.visitMissed}</h2>
        {summary.missed.length === 0 ? <p className="mt-2">{t.visitNone}</p> : null}
        <ul className="mt-2 space-y-1">
          {summary.missed.map((item) => (
            <li key={`${item.date}-${item.drugId}-${item.slot}`}>
              {item.date}　{item.nameZh}　{item.slot}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold">{t.visitSymptoms}</h2>
        {summary.symptoms.length === 0 ? <p className="mt-2">{t.visitNone}</p> : null}
        <ul className="mt-2 space-y-2">
          {summary.symptoms.map((item) => (
            <li key={item.id} className="leading-relaxed">
              {item.date}　{kindZh[item.kind]}
              {item.value ? `　${item.value}` : ""}
              {item.noteZh ? `　${item.noteZh}` : item.note ? `　${item.note}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function summaryText(summary: VisitSummary): string {
  const sheet = [
    `藥聲回診資料 ${summary.day}`,
    `被照顧者 ${summary.patientName || "—"}`,
    `過敏 ${summary.allergiesZh || summary.allergies || "尚未填寫"}`,
    `近${summary.adherence.days}天 已餵${summary.adherence.given} 漏吃${summary.adherence.missed} 共${summary.adherence.total}`,
    ...summary.meds.map((med) => `${med.hospitalZh} ${med.nameZh} ${med.doseZh} ${med.usageZh}`),
    ...summary.duplicates.map((group) => `相同成分 ${group.ingredient}`),
    "請詢問醫師或藥師",
  ];
  return sheet.filter(Boolean).join("\n");
}
