"use client";

import { useEffect, useState } from "react";
import { AskLine } from "@/components/ask-line";
import { features } from "@/lib/i18n/features";
import { decryptSnapshot, decryptWithPassphrase, type ShareSnapshot } from "@/lib/share";

const kindZh = {
  vomit: "嘔吐",
  dizzy: "頭暈",
  fall: "跌倒",
  appetite: "食慾不好",
  bp: "血壓數字",
  sugar: "血糖數字",
} as const;

export default function SharedFamilyPage() {
  const t = features.zh;
  const [snapshot, setSnapshot] = useState<ShareSnapshot | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const [salt, setSalt] = useState("");
  const [cipher, setCipher] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const key = hash.get("k") ?? "";
    const packed = hash.get("d") ?? "";
    const remote = query.get("s") ?? "";
    if (hash.get("p") === "1" && hash.get("s") && packed) {
      setSalt(hash.get("s") ?? "");
      setCipher(packed);
      setLocked(true);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        if (remote && key) {
          const response = await fetch(`/api/sync?id=${encodeURIComponent(remote)}`);
          const body = (await response.json()) as { blob?: string };
          if (!response.ok || !body.blob) throw new Error("missing");
          const opened = await decryptSnapshot(key, body.blob);
          if (!cancelled) setSnapshot(opened);
          return;
        }
        if (key && packed) {
          const opened = await decryptSnapshot(key, packed);
          if (!cancelled) setSnapshot(opened);
          return;
        }
        if (!cancelled) setError(t.shareBad);
      } catch {
        if (!cancelled) setError(t.shareBad);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [t.shareBad]);

  async function unlock() {
    try {
      setSnapshot(await decryptWithPassphrase(passphrase, salt, cipher));
      setLocked(false);
      setError("");
    } catch {
      setError(t.shareBad);
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="text-sm font-semibold text-pine">藥聲</p>
      <h1 className="mt-1 text-3xl font-semibold">{t.shareOpen}</h1>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t.shareFamilyView}</p>
      {locked ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold">
            {t.shareUnlock}
            <input className="mt-1 w-full rounded-2xl border border-border bg-card px-3 py-3 text-base" type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
          </label>
          <button type="button" className="inline-flex min-h-12 items-center rounded-2xl bg-pine px-4 font-semibold text-white" onClick={() => void unlock()}>
            {t.shareOpen}
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-4 text-base">{error}</p> : null}
      {snapshot ? (
        <div className="mt-4 space-y-4">
          <AskLine lang="zh" />
          <p className="text-lg font-semibold">{snapshot.patientName || "—"} · {snapshot.day}</p>
          <p>
            已餵 {snapshot.adherence.given}，漏吃 {snapshot.adherence.missed}，未記錄 {snapshot.adherence.pending}，共 {snapshot.adherence.total}
            {snapshot.adherence.percent === null ? "" : `（${snapshot.adherence.percent}%）`}
          </p>
          <section>
            <h2 className="text-xl font-semibold">藥品</h2>
            {snapshot.meds.length === 0 ? <p className="mt-1">沒有藥品</p> : null}
            <ul className="mt-2 space-y-2">
              {snapshot.meds.map((med) => (
                <li key={`${med.hospital}-${med.name}`} className="break-words">
                  <span className="font-semibold">{med.name}</span>
                  <span className="block text-sm text-muted-foreground">{med.hospital} · {med.usage}</span>
                </li>
              ))}
            </ul>
          </section>
          {snapshot.duplicates.length ? (
            <section>
              <h2 className="text-xl font-semibold">相同成分</h2>
              {snapshot.duplicates.map((item) => (
                <p key={item} className="mt-1">{item}</p>
              ))}
            </section>
          ) : null}
          <section>
            <h2 className="text-xl font-semibold">今天的狀況</h2>
            {snapshot.symptoms.length === 0 ? <p className="mt-1">沒有紀錄</p> : null}
            <ul className="mt-2 space-y-1">
              {snapshot.symptoms.map((item) => (
                <li key={item.at}>
                  {kindZh[item.kind as keyof typeof kindZh] ?? item.kind}
                  {item.value ? ` ${item.value}` : ""} {item.noteZh}
                </li>
              ))}
            </ul>
          </section>
          {snapshot.allergies ? <p>過敏　{snapshot.allergies}</p> : null}
          {snapshot.familyContact ? <p>家屬　{snapshot.familyContact}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
