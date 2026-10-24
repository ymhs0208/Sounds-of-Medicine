"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AskLine } from "@/components/ask-line";
import { Button } from "@/components/ui/button";
import { features } from "@/lib/i18n/features";
import { todayISO } from "@/lib/format";
import { adherence } from "@/lib/doses";
import { bagActiveOn } from "@/lib/bag-draft";
import { duplicateGroups } from "@/lib/duplicates";
import { encryptSnapshot, encryptWithPassphrase, type ShareSnapshot } from "@/lib/share";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

export function FamilyShare({ lang }: { lang?: Lang }) {
  const store = useStore();
  const t = features[lang ?? store.lang];
  const [passphrase, setPassphrase] = useState("");
  const [usePass, setUsePass] = useState(false);
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [note, setNote] = useState("");

  async function create() {
    const day = todayISO();
    const row = adherence(store.bags, store.logs, day);
    const snapshot: ShareSnapshot = {
      v: 1,
      at: new Date().toISOString(),
      day,
      patientName: store.patientName,
      familyContact: store.familyContact,
      allergies: store.allergiesZh || store.allergies,
      adherence: {
        ...row,
        percent: row.total ? Math.round((row.given / row.total) * 100) : null,
      },
      meds: store.bags
        .filter((bag) => bagActiveOn(bag, day))
        .flatMap((bag) => bag.drugs.map((drug) => ({ name: drug.nameZh, hospital: bag.hospitalShort, usage: drug.usageZh }))),
      symptoms: store.symptoms
        .filter((item) => item.date === day)
        .map((item) => ({ kind: item.kind, noteZh: item.noteZh || item.note, value: item.value, at: item.at })),
      duplicates: duplicateGroups(store.bags.filter((bag) => bagActiveOn(bag, day))).map((group) => group.ingredient),
    };
    const origin = window.location.origin;
    let url = "";
    let cloud = false;
    if (usePass && passphrase.trim()) {
      const sealed = await encryptWithPassphrase(snapshot, passphrase.trim());
      url = `${origin}/family/shared#p=1&s=${sealed.salt}&d=${encodeURIComponent(sealed.cipher)}`;
    } else {
      const sealed = await encryptSnapshot(snapshot);
      let id = "";
      try {
        const response = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blob: sealed.cipher }),
        });
        const body = (await response.json()) as { id?: string };
        if (response.ok && body.id) {
          id = body.id;
          cloud = true;
        }
      } catch {
        cloud = false;
      }
      url = id
        ? `${origin}/family/shared?s=${id}#k=${sealed.key}`
        : `${origin}/family/shared#k=${sealed.key}&d=${encodeURIComponent(sealed.cipher)}`;
    }
    setLink(url);
    setNote(cloud ? "" : t.shareKv);
    setImage("");
    if (url.length < 1800) {
      try {
        const mod = await import("qrcode");
        const toDataURL = mod.toDataURL ?? mod.default?.toDataURL;
        if (toDataURL) setImage(await toDataURL(url, { margin: 1, width: 240, errorCorrectionLevel: "L" }));
      } catch {
        setImage("");
      }
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast(t.shareCopied);
    } catch {
      toast(t.shareCopy);
    }
  }

  return (
    <section className="space-y-3 rounded-3xl bg-card p-4 ring-1 ring-border">
      <h2 className="text-lg font-semibold">{t.shareTitle}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{t.shareLead}</p>
      <label className="flex min-h-11 items-center gap-3 text-base">
        <input type="checkbox" className="size-6" checked={usePass} onChange={(event) => setUsePass(event.target.checked)} />
        {t.sharePass}
      </label>
      {usePass ? (
        <input className="w-full rounded-2xl border border-border bg-background px-3 py-3 text-base" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
      ) : null}
      <Button type="button" className="h-12 w-full rounded-2xl" onClick={() => void create()}>
        {t.shareCreate}
      </Button>
      {link ? (
        <>
          <p className="text-sm leading-relaxed break-words">{link}</p>
          {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
          {/* QR is a generated data URL; the key stays in the URL fragment. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image ? <img src={image} alt="" className="h-auto w-48 max-w-full" /> : null}
          <Button type="button" variant="outline" className="h-12 w-full rounded-2xl" onClick={() => void copy()}>
            {t.shareCopy}
          </Button>
        </>
      ) : null}
      <AskLine lang={store.lang} />
    </section>
  );
}
