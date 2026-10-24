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
import { allDemoBags, getDemoBag, isDemoKey } from "./demo-data";
import { uid } from "./id";
import { todayISO } from "./format";
import type {
  AppData,
  Bag,
  DoseStatus,
  Lang,
  Observation,
  ReplyTemplate,
  Report,
} from "./types";
import type { Slot } from "./slots";

const STORAGE_KEY = "yaosheng.v1";

const EMPTY: AppData = {
  version: 1,
  onboarded: false,
  lang: "zh",
  consentAt: null,
  bags: [],
  logs: [],
  reports: [],
};

type Store = AppData & {
  ready: boolean;
  completeOnboarding: (lang: Lang) => void;
  setLang: (lang: Lang) => void;
  addBag: (bag: Bag) => "ok" | "duplicate";
  addDemoSet: () => void;
  removeBag: (bagId: string) => void;
  setDose: (drugId: string, slot: Slot, status: DoseStatus | null, date?: string) => void;
  addObservation: (input: { drugId: string; slot?: Slot; observation: Observation }) => void;
  addReply: (reportId: string, template: ReplyTemplate) => void;
  markRepliesSeen: () => void;
  clearAll: () => void;
};

const Ctx = createContext<Store | null>(null);

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as AppData;
    if (parsed.version !== 1 || !Array.isArray(parsed.bags)) return EMPTY;
    return { ...EMPTY, ...parsed, version: 1 };
  } catch {
    return EMPTY;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    setData(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  const completeOnboarding = useCallback((lang: Lang) => {
    setData((current) => ({
      ...current,
      onboarded: true,
      lang,
      consentAt: new Date().toISOString(),
    }));
  }, []);

  const setLang = useCallback((lang: Lang) => {
    setData((current) => ({ ...current, lang }));
  }, []);

  const addBag = useCallback((bag: Bag): "ok" | "duplicate" => {
    if (bag.demoKey && ref.current.bags.some((item) => item.demoKey === bag.demoKey)) {
      return "duplicate";
    }
    setData((current) => ({ ...current, bags: [...current.bags, bag] }));
    return "ok";
  }, []);

  const addDemoSet = useCallback(() => {
    setData((current) => {
      const present = new Set(current.bags.map((bag) => bag.demoKey));
      const more = allDemoBags().filter((bag) => !present.has(bag.demoKey));
      return { ...current, bags: [...current.bags, ...more] };
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
      };
    });
  }, []);

  const setDose = useCallback((drugId: string, slot: Slot, status: DoseStatus | null, date?: string) => {
    const day = date ?? todayISO();
    setData((current) => {
      const logs = current.logs.filter(
        (log) => !(log.drugId === drugId && log.date === day && log.slot === slot),
      );
      const reports = current.reports.filter(
        (report) =>
          !(
            report.source === "timeline" &&
            report.drugId === drugId &&
            report.date === day &&
            report.slot === slot
          ),
      );
      if (!status) return { ...current, logs, reports };
      const at = new Date().toISOString();
      return {
        ...current,
        logs: [...logs, { drugId, date: day, slot, status, at }],
        reports: [
          ...reports,
          {
            id: uid(),
            at,
            date: day,
            kind: status,
            drugId,
            slot,
            source: "timeline",
            replies: [],
          },
        ],
      };
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

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData(EMPTY);
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...data,
      ready,
      completeOnboarding,
      setLang,
      addBag,
      addDemoSet,
      removeBag,
      setDose,
      addObservation,
      addReply,
      markRepliesSeen,
      clearAll,
    }),
    [
      data,
      ready,
      completeOnboarding,
      setLang,
      addBag,
      addDemoSet,
      removeBag,
      setDose,
      addObservation,
      addReply,
      markRepliesSeen,
      clearAll,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const value = useContext(Ctx);
  if (!value) throw new Error("useStore outside provider");
  return value;
}

export function bagFromDemoKey(key: string): Bag | null {
  if (!isDemoKey(key)) return null;
  return getDemoBag(key);
}
