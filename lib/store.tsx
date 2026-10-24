"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EMPTY_DATA, parseBackup } from "./backup";
import { CONSENT_VERSION, clearReadyCookie, writeReadyCookie } from "./consent";
import { clearStored, loadStored, saveStored } from "./storage";
import { allDemoBags } from "./demo-data";
import { admitBag, applyDose } from "./doses";
import { uid } from "./id";
import { todayISO } from "./format";
import type {
  AppData,
  Bag,
  DoseNotice,
  DoseStatus,
  Lang,
  Observation,
  RefillNotice,
  ReplyTemplate,
  Report,
  SymptomKind,
  SymptomLog,
  TalkCard,
} from "./types";
import type { Slot } from "./slots";

type Store = AppData & {
  ready: boolean;
  completeOnboarding: (input: { lang: Lang; patientName: string; familyContact: string }) => void;
  setLang: (lang: Lang) => void;
  addBag: (bag: Bag) => "ok" | "duplicate" | "mixed";
  updateBag: (bag: Bag) => "ok" | "mixed" | "missing";
  addDemoSet: () => "ok" | "mixed";
  clearDemo: () => void;
  removeBag: (bagId: string) => void;
  setDose: (drugId: string, slot: Slot, status: DoseStatus | null, date?: string) => void;
  markNotified: (notices: DoseNotice[]) => void;
  addObservation: (input: { drugId: string; slot?: Slot; observation: Observation }) => void;
  addReply: (reportId: string, template: ReplyTemplate) => void;
  markRepliesSeen: () => void;
  importBackup: (raw: string) => "ok" | "invalid";
  clearAll: () => void;
  setDisplay: (input: { largeText?: boolean; pictograms?: boolean }) => void;
  setAllergies: (allergies: string, allergiesZh: string) => void;
  addSymptom: (input: { kind: SymptomKind; note: string; noteZh: string; value?: string }) => void;
  addTalk: (card: Omit<TalkCard, "id" | "at">) => TalkCard;
  markRefillNotified: (notices: RefillNotice[]) => void;
  noteExport: () => void;
  snoozeBackup: (until: string) => void;
  applyRemote: (next: AppData) => void;
  storageLocked: boolean;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const [storageLocked, setStorageLocked] = useState(false);
  const ref = useRef(data);
  ref.current = data;
  const writable = useRef(true);

  useEffect(() => {
    let cancelled = false;
    void loadStored().then((loaded) => {
      if (cancelled) return;
      writable.current = loaded.writable;
      setStorageLocked(!loaded.writable);
      setData(loaded.data);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !writable.current) return;
    void saveStored(data);
  }, [data, ready]);

  const completeOnboarding = useCallback(
    (input: { lang: Lang; patientName: string; familyContact: string }) => {
      setData((current) => ({
        ...current,
        onboarded: true,
        lang: input.lang,
        patientName: input.patientName.trim(),
        familyContact: input.familyContact.trim(),
        consentAt: new Date().toISOString(),
        consentVersion: CONSENT_VERSION,
      }));
      writeReadyCookie();
    },
    [],
  );

  const setLang = useCallback((lang: Lang) => {
    setData((current) => ({ ...current, lang }));
  }, []);

  const addBag = useCallback((bag: Bag): "ok" | "duplicate" | "mixed" => {
    if (bag.demoKey && ref.current.bags.some((item) => item.demoKey === bag.demoKey)) {
      return "duplicate";
    }
    if (admitBag(ref.current.bags, bag.source) === "mixed") return "mixed";
    setData((current) => ({ ...current, bags: [...current.bags, bag] }));
    return "ok";
  }, []);

  const updateBag = useCallback((bag: Bag): "ok" | "mixed" | "missing" => {
    const existing = ref.current.bags.find((item) => item.id === bag.id);
    if (!existing) return "missing";
    if (existing.source !== bag.source && admitBag(ref.current.bags.filter((item) => item.id !== bag.id), bag.source) === "mixed") {
      return "mixed";
    }
    setData((current) => ({
      ...current,
      bags: current.bags.map((item) => (item.id === bag.id ? bag : item)),
    }));
    return "ok";
  }, []);

  const addDemoSet = useCallback((): "ok" | "mixed" => {
    if (admitBag(ref.current.bags, "demo") === "mixed") return "mixed";
    setData((current) => {
      const present = new Set(current.bags.map((bag) => bag.demoKey));
      const more = allDemoBags().filter((bag) => !present.has(bag.demoKey));
      return { ...current, bags: [...current.bags, ...more] };
    });
    return "ok";
  }, []);

  const clearDemo = useCallback(() => {
    setData((current) => {
      const demoIds = new Set(
        current.bags.filter((bag) => bag.source === "demo").flatMap((bag) => bag.drugs.map((drug) => drug.id)),
      );
      return {
        ...current,
        bags: current.bags.filter((bag) => bag.source !== "demo"),
        logs: current.logs.filter((log) => !demoIds.has(log.drugId)),
        reports: current.reports.filter((report) => !demoIds.has(report.drugId)),
        notified: current.notified.filter((notice) => !demoIds.has(notice.drugId)),
      };
    });
  }, []);

  const removeBag = useCallback((bagId: string) => {
    setData((current) => {
      const bag = current.bags.find((item) => item.id === bagId);
      const ids = new Set(bag?.drugs.map((drug) => drug.id) ?? []);
      return {
        ...current,
        bags: current.bags.filter((item) => item.id !== bagId),
        logs: current.logs.filter((log) => !ids.has(log.drugId)),
        reports: current.reports.filter((report) => !ids.has(report.drugId)),
        notified: current.notified.filter((notice) => !ids.has(notice.drugId)),
      };
    });
  }, []);

  const setDose = useCallback((drugId: string, slot: Slot, status: DoseStatus | null, date?: string) => {
    const day = date ?? todayISO();
    setData((current) =>
      applyDose(current, {
        drugId,
        slot,
        status,
        date: day,
        at: new Date().toISOString(),
        reportId: uid(),
      }),
    );
  }, []);

  const markNotified = useCallback((notices: DoseNotice[]) => {
    setData((current) => {
      const have = new Set(current.notified.map((notice) => `${notice.date}|${notice.drugId}|${notice.slot}`));
      const more = notices.filter((notice) => !have.has(`${notice.date}|${notice.drugId}|${notice.slot}`));
      if (!more.length) return current;
      return { ...current, notified: [...current.notified, ...more] };
    });
  }, []);

  const addObservation = useCallback(
    (input: { drugId: string; slot?: Slot; observation: Observation }) => {
      const report: Report = {
        id: uid(),
        at: new Date().toISOString(),
        date: todayISO(),
        kind: "observation",
        drugId: input.drugId,
        slot: input.slot,
        observation: input.observation,
        source: "form",
        replies: [],
      };
      setData((current) => ({ ...current, reports: [...current.reports, report] }));
    },
    [],
  );

  const addReply = useCallback((reportId: string, template: ReplyTemplate) => {
    setData((current) => ({
      ...current,
      reports: current.reports.map((report) =>
        report.id === reportId
          ? {
              ...report,
              replies: [
                ...report.replies,
                { id: uid(), at: new Date().toISOString(), template, seen: false },
              ],
            }
          : report,
      ),
    }));
  }, []);

  const markRepliesSeen = useCallback(() => {
    setData((current) => ({
      ...current,
      reports: current.reports.map((report) => ({
        ...report,
        replies: report.replies.map((reply) => ({ ...reply, seen: true })),
      })),
    }));
  }, []);

  const setDisplay = useCallback((input: { largeText?: boolean; pictograms?: boolean }) => {
    setData((current) => ({
      ...current,
      largeText: input.largeText ?? current.largeText,
      pictograms: input.pictograms ?? current.pictograms,
    }));
  }, []);

  const setAllergies = useCallback((allergies: string, allergiesZh: string) => {
    setData((current) => ({ ...current, allergies: allergies.trim(), allergiesZh: allergiesZh.trim() }));
  }, []);

  const addSymptom = useCallback((input: { kind: SymptomKind; note: string; noteZh: string; value?: string }) => {
    const symptom: SymptomLog = {
      id: uid(),
      at: new Date().toISOString(),
      date: todayISO(),
      kind: input.kind,
      note: input.note.trim(),
      noteZh: input.noteZh.trim(),
      value: input.value?.trim() || undefined,
    };
    setData((current) => ({ ...current, symptoms: [...current.symptoms, symptom] }));
  }, []);

  const addTalk = useCallback((card: Omit<TalkCard, "id" | "at">) => {
    const saved: TalkCard = { ...card, id: uid(), at: new Date().toISOString() };
    setData((current) => ({ ...current, talks: [...current.talks, saved] }));
    return saved;
  }, []);

  const markRefillNotified = useCallback((notices: RefillNotice[]) => {
    setData((current) => {
      const have = new Set(current.refillNotified.map((notice) => `${notice.drugId}|${notice.level}|${notice.runOut}`));
      const more = notices.filter((notice) => !have.has(`${notice.drugId}|${notice.level}|${notice.runOut}`));
      if (!more.length) return current;
      return { ...current, refillNotified: [...current.refillNotified, ...more] };
    });
  }, []);

  const importBackup = useCallback((raw: string): "ok" | "invalid" => {
    const parsed = parseBackup(raw);
    if (!parsed) return "invalid";
    setData(parsed);
    return "ok";
  }, []);

  const clearAll = useCallback(() => {
    clearStored();
    clearReadyCookie();
    writable.current = true;
    setStorageLocked(false);
    setData(EMPTY_DATA);
  }, []);

  const noteExport = useCallback(() => {
    setData((current) => ({ ...current, lastExportAt: new Date().toISOString() }));
  }, []);

  const snoozeBackup = useCallback((until: string) => {
    setData((current) => ({ ...current, backupSnoozeUntil: until }));
  }, []);

  const applyRemote = useCallback((next: AppData) => {
    setData(next);
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...data,
      ready,
      completeOnboarding,
      setLang,
      addBag,
      updateBag,
      addDemoSet,
      clearDemo,
      removeBag,
      setDose,
      markNotified,
      addObservation,
      addReply,
      markRepliesSeen,
      importBackup,
      clearAll,
      setDisplay,
      setAllergies,
      addSymptom,
      addTalk,
      markRefillNotified,
      noteExport,
      snoozeBackup,
      applyRemote,
      storageLocked,
    }),
    [
      data,
      ready,
      completeOnboarding,
      setLang,
      addBag,
      updateBag,
      addDemoSet,
      clearDemo,
      removeBag,
      setDose,
      markNotified,
      addObservation,
      addReply,
      markRepliesSeen,
      importBackup,
      clearAll,
      setDisplay,
      setAllergies,
      addSymptom,
      addTalk,
      markRefillNotified,
      noteExport,
      snoozeBackup,
      applyRemote,
      storageLocked,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const value = useContext(Ctx);
  if (!value) throw new Error("useStore outside provider");
  return value;
}
