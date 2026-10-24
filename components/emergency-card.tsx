"use client";

import { useEffect, useState } from "react";
import { AskLine } from "@/components/ask-line";
import { APP_NAME } from "@/lib/brand";
import { features } from "@/lib/i18n/features";
import { bagActiveOn } from "@/lib/bag-draft";
import { todayISO } from "@/lib/format";
import { useStore } from "@/lib/store";

export function emergencyText(input: {
  patientName: string;
  allergies: string;
  familyContact: string;
  meds: { hospital: string; name: string; dose: string; usage: string }[];
}): string {
  const lines = [
    `${APP_NAME}緊急卡`,
    `姓名 ${input.patientName || "—"}`,
    `過敏 ${input.allergies || "尚未填寫"}`,
    `家屬 ${input.familyContact || "—"}`,
    "藥品",
    ...input.meds.map((med) => `${med.hospital} ${med.name} ${med.dose} ${med.usage}`.trim()),
    "請詢問醫師或藥師",
  ];
  return lines.join("\n");
}

export function EmergencyCard({ qr }: { qr?: boolean }) {
  const store = useStore();
  const t = features.zh;
  const meds = store.bags
    .filter((bag) => bagActiveOn(bag, todayISO()))
    .flatMap((bag) => bag.drugs.map((drug) => ({ hospital: bag.hospitalZh, name: drug.nameZh, dose: drug.doseZh, usage: drug.usageZh })));
  const text = emergencyText({
    patientName: store.patientName,
    allergies: store.allergiesZh || store.allergies,
    familyContact: store.familyContact,
    meds,
  });
  const [image, setImage] = useState("");

  useEffect(() => {
    if (!qr) return;
    let cancelled = false;
    void import("qrcode").then((mod) => {
      const toDataURL = mod.toDataURL ?? mod.default?.toDataURL;
      if (!toDataURL) return;
      return toDataURL(text, { margin: 1, width: 280, errorCorrectionLevel: "M" });
    }).then((url) => {
      if (!cancelled && url) setImage(url);
    }).catch(() => setImage(""));
    return () => {
      cancelled = true;
    };
  }, [qr, text]);

  return (
    <div className="print-sheet space-y-3">
      <p className="text-sm font-semibold text-[#1b5e45]">藥聲</p>
      <h1 className="text-3xl font-semibold">{t.emergencyTitle}</h1>
      <p className="text-base leading-relaxed">{t.emergencyLead}</p>
      <AskLine lang="zh" />
      <p className="text-lg font-semibold break-words">{store.patientName || "—"}</p>
      <p className="break-words"><span className="text-sm text-[#5c5346]">{t.emergencyAllergies}　</span>{store.allergiesZh || store.allergies || t.emergencyNone}</p>
      <p className="break-words"><span className="text-sm text-[#5c5346]">家屬　</span>{store.familyContact || t.emergencyNone}</p>
      <h2 className="text-xl font-semibold">{t.emergencyMeds}</h2>
      {meds.length === 0 ? <p>{t.visitNone}</p> : null}
      <ul className="space-y-2">
        {meds.map((med) => (
          <li key={`${med.hospital}-${med.name}-${med.dose}`} className="break-inside-avoid leading-relaxed">
            <span className="font-semibold">{med.name}</span>
            <span className="block text-sm">{med.hospital} · {med.dose} · {med.usage}</span>
          </li>
        ))}
      </ul>
      {image ? (
        <div>
          {/* QR is a generated data URL for 119 to scan offline. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="h-auto w-52 max-w-full" />
          <p className="text-sm text-[#5c5346]">{t.emergencyQr}</p>
        </div>
      ) : null}
    </div>
  );
}
