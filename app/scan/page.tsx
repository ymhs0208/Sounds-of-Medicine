"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { BagArtwork } from "@/components/bag-artwork";
import { Button } from "@/components/ui/button";
import { bagFromExtraction } from "@/lib/build-bag";
import { DEMO_CAPTION, DEMO_ORDER, getDemoBag, type DemoKey } from "@/lib/demo-data";
import { compressImage } from "@/lib/images";
import { ui } from "@/lib/i18n";
import { paidPost } from "@/lib/paid-client";
import { setPending } from "@/lib/pending";
import { staticDemo } from "@/lib/routes";
import { useStore } from "@/lib/store";
import type { Extraction } from "@/lib/extraction";

export default function ScanPage() {
  const store = useStore();
  const router = useRouter();
  const t = ui[store.lang];
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [llm, setLlm] = useState(false);
  const [problem, setProblem] = useState<"no_key" | "fail" | null>(null);

  useEffect(() => {
    if (staticDemo) return;
    fetch("/api/status")
      .then((response) => response.json())
      .then((body: { llm?: boolean }) => setLlm(Boolean(body.llm)))
      .catch(() => setLlm(false));
  }, []);

  async function openSample(key: DemoKey) {
    setBusy(key);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setPending({ kind: "demo", key });
    router.push(`/review?demo=${key}`);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (staticDemo) {
      toast(t.staticNoOcr);
      return;
    }
    setBusy("photo");
    setProblem(null);
    try {
      const imageDataUrl = await compressImage(file);
      const response = await paidPost("/api/extract", { imageDataUrl, language: store.lang }, store.lang);
      const body = response.body as { error?: string; message?: string; extraction?: Extraction };
      if (body.error === "no_key" || response.status === 503) {
        setProblem("no_key");
        return;
      }
      if (response.status === 429 || response.status === 413 || response.status === 403) {
        setProblem("fail");
        toast(body.message || t.extractFail);
        return;
      }
      if (response.status !== 200 || !body.extraction) {
        setProblem("fail");
        toast(body.error === "unreadable" ? t.unreadable : body.message || t.extractFail);
        return;
      }
      const bag = bagFromExtraction(body.extraction, imageDataUrl, store.lang);
      if (!bag.drugs.length && !bag.patientZh) {
        setProblem("fail");
        toast(t.unreadable);
        return;
      }
      setPending({ kind: "extract", bag });
      router.push("/review");
    } catch {
      setProblem("fail");
      toast(t.photoUnsupported);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-6">
      <div>
        <p className="text-sm font-semibold text-pine">{staticDemo ? t.demoMode : llm ? t.llmMode : t.manualEntry}</p>
        <h1 className="text-3xl font-semibold">{t.scanTitle}</h1>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{t.scanLead}</p>
      </div>
      {staticDemo ? (
        <p className="rounded-2xl bg-amber-bg px-4 py-3 text-base font-semibold leading-relaxed text-amber-ink">
          {t.staticNoOcr}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" className="h-auto min-h-14 w-full min-w-0 rounded-2xl px-2 py-3 text-base whitespace-normal" onClick={() => cameraRef.current?.click()}>
          <Camera className="size-5" />
          {t.photograph}
        </Button>
        <Button type="button" variant="outline" className="h-auto min-h-14 w-full min-w-0 rounded-2xl px-2 py-3 text-base whitespace-normal" onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-5" />
          {t.upload}
        </Button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      {problem ? (
        <div className="rounded-3xl bg-amber-bg p-4 text-amber-ink">
          <p className="text-base font-semibold leading-relaxed">{problem === "no_key" ? t.noKey : t.extractFail}</p>
          <Button type="button" className="mt-3 h-12 w-full rounded-2xl" onClick={() => router.push("/meds/edit")}>
            {t.manualEntry}
          </Button>
        </div>
      ) : null}
      <Button type="button" variant="outline" className="h-12 w-full rounded-2xl text-base" onClick={() => router.push("/meds/edit")}>
        {t.manualEntry}
      </Button>
      {staticDemo ? (
        <>
      <h2 className="pt-2 text-sm font-semibold text-pine">{t.orSamples}</h2>
      <div className="space-y-3">
        {DEMO_ORDER.map((key) => {
          const bag = getDemoBag(key);
          const saved = store.bags.some((item) => item.demoKey === key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => openSample(key)}
              className="w-full overflow-hidden rounded-3xl bg-card text-left ring-1 ring-border"
            >
              <div className="h-36 overflow-hidden">
                <BagArtwork bag={bag} />
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-base font-semibold">{bag.hospitalShort}</div>
                  <div className="text-sm text-muted-foreground">{DEMO_CAPTION[key][store.lang]}</div>
                </div>
                <span className="text-xs font-semibold text-amber-ink">{saved ? t.alreadyInCabinet : t.sampleFictional}</span>
              </div>
            </button>
          );
        })}
      </div>
        </>
      ) : null}
      {busy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c1915]/55 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="w-full max-w-sm rounded-3xl bg-card p-5 text-center">
            <div className="relative mx-auto h-36 overflow-hidden rounded-2xl bg-[#14261f]">
              <div className="scanline absolute right-6 left-6 h-0.5 bg-[#b7f0cf]" />
            </div>
            <p className="mt-4 text-lg font-semibold">{t.reading}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
