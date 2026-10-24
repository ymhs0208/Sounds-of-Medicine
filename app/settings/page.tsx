"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LanguagePicker } from "@/components/language-picker";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PushPanel } from "@/components/push-panel";
import { backupJson } from "@/lib/backup";
import { cabinetMode } from "@/lib/doses";
import { fill, formatDateTime } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { features } from "@/lib/i18n/features";
import { launch } from "@/lib/i18n/launch";
import { notificationSupport, requestNotifications } from "@/lib/notify";
import { staticDemo } from "@/lib/routes";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const store = useStore();
  const router = useRouter();
  const t = ui[store.lang];
  const [llm, setLlm] = useState(false);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mode = cabinetMode(store.bags);

  useEffect(() => {
    if (staticDemo) return;
    fetch("/api/status")
      .then((response) => response.json())
      .then((body: { llm?: boolean }) => setLlm(Boolean(body.llm)))
      .catch(() => setLlm(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-8">
      <h1 className="text-3xl font-semibold">{t.settingsTitle}</h1>
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-base font-semibold">{features[store.lang].displayTitle}</h2>
        <label className="mt-3 flex min-h-11 items-center gap-3 text-base">
          <input type="checkbox" className="size-6" checked={store.largeText} onChange={(event) => store.setDisplay({ largeText: event.target.checked })} />
          {features[store.lang].displayLarge}
        </label>
        <label className="mt-2 flex min-h-11 items-center gap-3 text-base">
          <input type="checkbox" className="size-6" checked={store.pictograms} onChange={(event) => store.setDisplay({ pictograms: event.target.checked })} />
          {features[store.lang].displayIcons}
        </label>
      </section>
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-base font-semibold">{features[store.lang].allergiesField}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{features[store.lang].allergiesHint}</p>
        <p className="mt-2 break-words text-base">{store.allergies || store.allergiesZh || "—"}</p>
        <Link href="/emergency" className="mt-3 inline-flex min-h-11 items-center text-base font-semibold text-pine underline">
          {features[store.lang].emergencyTitle}
        </Link>
      </section>
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-sm font-semibold text-pine">{t.language}</h2>
        <div className="mt-3">
          <LanguagePicker
            value={store.lang}
            onChange={(lang) => {
              store.setLang(lang);
              toast(ui[lang].languageUpdated);
            }}
          />
        </div>
      </section>
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-base font-semibold">{t.llmStatus}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {staticDemo ? t.staticNoOcr : llm ? t.llmOnBody : t.llmOffBody}
        </p>
        <p className="mt-2 text-sm font-semibold text-pine">{staticDemo ? t.staticNoOcr : llm ? t.llmMode : t.manualEntry}</p>
      </section>
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-base font-semibold">{t.reminders}</h2>
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-12 w-full rounded-2xl"
          onClick={async () => {
            const result = await requestNotifications();
            toast(result === "granted" ? t.remindersOn : result === "unsupported" ? t.notifUnsupported : t.notifDenied);
          }}
        >
          {notificationSupport() === "granted" ? t.remindersOn : t.enableReminders}
        </Button>
      </section>
      <PushPanel />
      <section className="rounded-3xl bg-amber-bg p-4 ring-1 ring-amber-ink/30">
        <h2 className="text-base font-semibold text-amber-ink">{t.demoTitle}</h2>
        <p className="mt-1 text-sm leading-relaxed text-amber-ink">{t.demoBody}</p>
        {mode === "demo" ? <p className="mt-2 text-sm font-semibold text-amber-ink">{t.demoOn}</p> : null}
        {mode === "real" ? <p className="mt-2 text-sm leading-relaxed text-amber-ink">{t.demoBlockedReal}</p> : null}
        <Button
          type="button"
          className="mt-3 h-12 w-full rounded-2xl"
          disabled={mode === "real"}
          onClick={() => {
            const result = store.addDemoSet();
            if (result === "mixed") {
              toast(t.demoBlockedReal);
              return;
            }
            toast(t.demoLoaded);
            router.push("/today");
          }}
        >
          {t.loadAll}
        </Button>
        {mode === "demo" ? (
          <Button
            type="button"
            variant="outline"
            className="mt-2 h-12 w-full rounded-2xl"
            onClick={() => {
              store.clearDemo();
              toast(t.demoCleared);
            }}
          >
            {t.clearDemo}
          </Button>
        ) : null}
      </section>
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-base font-semibold">{t.dataTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.dataBody}</p>
        {store.patientName ? <p className="mt-2 text-sm">{t.patientLabel}　{store.patientName}</p> : null}
        {store.familyContact ? <p className="text-sm">{t.familyContactShow}　{store.familyContact}</p> : null}
        {store.consentAt ? (
          <p className="mt-2 text-sm">{fill(t.consentOn, { time: formatDateTime(store.consentAt, store.lang) })}</p>
        ) : null}
        {store.consentVersion ? <p className="text-sm">{store.consentVersion}</p> : null}
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{launch[store.lang].backupBody}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-12 w-full rounded-2xl"
          onClick={() => {
            const blob = new Blob([backupJson(store)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "yaosheng-backup.json";
            link.click();
            URL.revokeObjectURL(url);
            store.noteExport();
          }}
        >
          {t.exportJson}
        </Button>
        <Button type="button" variant="outline" className="mt-2 h-12 w-full rounded-2xl" onClick={() => fileRef.current?.click()}>
          {t.importJson}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const text = await file.text();
            const result = store.importBackup(text);
            toast(result === "ok" ? t.imported : t.importInvalid);
          }}
        />
        <Button type="button" variant="outline" className="mt-2 h-12 w-full rounded-2xl" onClick={() => setOpen(true)}>
          {t.clear}
        </Button>
      </section>
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-base font-semibold">{t.about}</h2>
        <p className="mt-2 text-sm leading-relaxed">{t.aboutBody}</p>
        <nav className="mt-3 flex flex-col gap-1 text-base font-semibold">
          <Link className="inline-flex min-h-11 items-center underline" href="/privacy">{launch[store.lang].privacy}</Link>
          <Link className="inline-flex min-h-11 items-center underline" href="/terms">{launch[store.lang].terms}</Link>
          <Link className="inline-flex min-h-11 items-center underline" href="/disclaimer">{launch[store.lang].disclaimer}</Link>
        </nav>
      </section>
      <Disclaimer lang={store.lang} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.clearTitle}</DialogTitle>
            <DialogDescription>{t.clearBody}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              type="button"
              onClick={() => {
                store.clearAll();
                router.replace("/");
              }}
            >
              {t.clear}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
