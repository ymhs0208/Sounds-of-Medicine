"use client";

import Link from "next/link";
import { DuplicateBanner } from "@/components/duplicate-banner";
import { replyLabel, reportSentence } from "@/lib/copy";
import { formatDateTime, patientName, rocLabel, todayISO } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export default function PrintPage() {
  const store = useStore();
  const t = ui.zh;
  const name = patientName(store.bags) || t.unknownPatient;
  const history = [...store.reports].reverse();

  return (
    <div className="print-sheet mx-auto max-w-3xl px-5 py-8 text-[#1c1915]">
      <div className="no-print mb-6 flex gap-2">
        <Link href="/family" className="rounded-full border px-4 py-2 text-sm font-semibold">
          {t.backApp}
        </Link>
        <button type="button" className="rounded-full bg-[#1b5e45] px-4 py-2 text-sm font-semibold text-white" onClick={() => window.print()}>
          {t.printButton}
        </button>
      </div>
      <p className="text-sm font-semibold text-[#1b5e45]">藥聲</p>
      <h1 className="mt-1 text-3xl font-semibold">{t.printTitle}</h1>
      <p className="mt-3 text-base leading-relaxed">{t.printNote}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-base">
        <div>
          <dt className="text-sm text-[#5c5346]">{t.printPatient}</dt>
          <dd className="font-semibold">{name}</dd>
        </div>
        <div>
          <dt className="text-sm text-[#5c5346]">{t.printGenerated}</dt>
          <dd className="font-semibold">{formatDateTime(new Date().toISOString(), "zh")}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <DuplicateBanner lang="zh" />
      </div>
      <h2 className="mt-8 text-xl font-semibold">{t.printMeds}</h2>
      {store.bags.length === 0 ? <p className="mt-2">{t.noMeds}</p> : null}
      <div className="mt-3 space-y-4">
        {store.bags.flatMap((bag) =>
          bag.drugs.map((drug) => (
            <article key={drug.id} className="break-inside-avoid rounded-2xl border border-[#e0d6c4] p-4">
              <h3 className="text-xl font-semibold">{drug.nameZh}</h3>
              <p className="text-sm">
                {bag.hospitalZh} · {bag.pharmacyZh}
              </p>
              <p className="mt-2 text-sm">
                {t.printDate}：{bag.dispensingLabel || rocLabel(bag.dispensingDate, "—")}
              </p>
              <p className="mt-1">{t.printDose}：{drug.doseZh || "—"}</p>
              <p>{t.printQty}：{drug.quantityZh || "—"}</p>
              <p>{t.printUsage}：{drug.usageZh || "—"}</p>
              <p>{t.printIndication}：{drug.indicationZh || "—"}</p>
              <p>
                {t.printWarnings}：{drug.warningsZh.length ? drug.warningsZh.join("；") : "—"}
              </p>
              {drug.ingredient ? <p>{t.ingredient}：{drug.ingredient}</p> : null}
            </article>
          )),
        )}
      </div>
      <h2 className="mt-8 text-xl font-semibold">{t.printReports}</h2>
      {history.length === 0 ? (
        <p className="mt-2">{t.printEmptyReports}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {history.map((report) => (
            <li key={report.id} className="leading-relaxed">
              {formatDateTime(report.at, "zh")}　{reportSentence(report, "zh", store.bags)}
              {report.replies.map((reply) => (
                <span key={reply.id}>　{t.familySaid}：{replyLabel("zh", reply.template)}</span>
              ))}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-sm leading-relaxed">{t.disclaimer}</p>
      <p className="mt-1 text-xs text-[#5c5346]">{todayISO()}</p>
    </div>
  );
}
