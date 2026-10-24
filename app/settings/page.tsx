"use client";

import { useEffect, useState } from "react";
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
import { fill, formatDateTime } from "@/lib/format";
import { ui } from "@/lib/i18n";
import { notificationSupport, requestNotifications } from "@/lib/notify";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const store = useStore();
  const router = useRouter();
  const t = ui[store.lang];
  const [llm, setLlm] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((response) => response.json())
      .then((body: { llm?: boolean }) => setLlm(Boolean(body.llm)))
      .catch(() => setLlm(false));
  }, []);

  return (
    <div className="space-y-4 pb-8">
      <h1 className="text-3xl font-semibold">{t.settingsTitle}</h1>
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
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{llm ? t.llmOnBody : t.llmOffBody}</p>
        <p className="mt-2 text-sm font-semibold text-pine">{llm ? t.llmMode : t.demoMode}</p>
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
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-base font-semibold">{t.loadDemo}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.loadAllHint}</p>
        <Button
          type="button"
          className="mt-3 h-12 w-full rounded-2xl"
          onClick={() => {
            store.addDemoSet();
            toast(t.demoLoaded);
            router.push("/today");
          }}
        >
          {t.loadAll}
        </Button>
      </section>
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-base font-semibold">{t.dataTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.dataBody}</p>
        {store.consentAt ? (
          <p className="mt-2 text-sm">{fill(t.consentOn, { time: formatDateTime(store.consentAt, store.lang) })}</p>
        ) : null}
        <Button type="button" variant="outline" className="mt-3 h-12 w-full rounded-2xl" onClick={() => setOpen(true)}>
          {t.clear}
        </Button>
      </section>
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-base font-semibold">{t.about}</h2>
        <p className="mt-2 text-sm leading-relaxed">{t.aboutBody}</p>
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
