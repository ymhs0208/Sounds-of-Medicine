"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { bytesToUrl } from "@/lib/bytes";
import { decryptPayload, encryptPayload, generateCircleKey, parseCircleFragment, type CircleLink } from "@/lib/circle-crypto";
import { cabinetFromRecords, canonical, snapshotRecords, tombstone, type SyncBody } from "@/lib/circle-records";
import { clearVault, loadVault, saveVault, type CircleRole, type CircleVault } from "@/lib/circle-vault";
import { deviceId } from "@/lib/paid-client";
import { mergeEnvelope, type Envelope } from "@/lib/sync-merge";
import { useStore } from "@/lib/store";

export type SyncPhase = "loading" | "unavailable" | "signed-out" | "local" | "syncing" | "synced" | "offline" | "conflict" | "needs-key";

export type CircleMember = { id: string; name: string; role: string; removed: boolean };

type CircleContextValue = {
  ready: boolean;
  vault: CircleVault | null;
  phase: SyncPhase;
  login: boolean;
  user: { sub: string; name: string } | null;
  members: CircleMember[];
  fragment: CircleLink | null;
  notice: string;
  createCircle: () => Promise<void>;
  joinCircle: (role: "family" | "caregiver") => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const Ctx = createContext<CircleContextValue | null>(null);

type RemoteStatus = {
  enabled?: boolean;
  login?: boolean;
  user?: { sub: string; name: string } | null;
  circle?: { id: string; generation: number; role: CircleRole; memberId: string; members: CircleMember[] } | null;
};

async function hashBody(body: unknown): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(body))));
  return bytesToUrl(digest);
}

function blankVault(input: { circleId: string; keyToken: string; generation: number; role: CircleRole }): CircleVault {
  return {
    circleId: input.circleId,
    generation: input.generation,
    role: input.role,
    memberId: "",
    deviceId: deviceId(),
    keyToken: input.keyToken,
    vectors: {},
    hashes: {},
    updatedAt: {},
    lastSyncAt: null,
  };
}

export function CircleProvider({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const vaultRef = useRef<CircleVault | null>(null);
  const skip = useRef(0);
  const [vault, setVault] = useState<CircleVault | null>(null);
  const [phase, setPhase] = useState<SyncPhase>("loading");
  const [login, setLogin] = useState(false);
  const [user, setUser] = useState<{ sub: string; name: string } | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [fragment, setFragment] = useState<CircleLink | null>(null);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);

  const remember = useCallback(async (next: CircleVault | null) => {
    vaultRef.current = next;
    setVault(next);
    if (next) await saveVault(next);
    else await clearVault();
  }, []);

  const sync = useCallback(async () => {
    const current = vaultRef.current;
    if (!store.ready || store.storageLocked) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setPhase(current ? "offline" : "unavailable");
      return;
    }
    let status: RemoteStatus = { enabled: false, login: false, user: null };
    try {
      status = (await fetch("/api/circle").then((response) => response.json())) as RemoteStatus;
    } catch {
      setPhase(current ? "offline" : "unavailable");
      return;
    }
    setLogin(Boolean(status.login));
    setUser(status.user ?? null);
    setMembers(status.circle?.members ?? []);
    if (!status.enabled) {
      setPhase("unavailable");
      return;
    }
    if (!status.user) {
      setPhase("signed-out");
      return;
    }
    if (!current) {
      setPhase("local");
      return;
    }
    if (status.circle && status.circle.generation > current.generation && status.circle.role !== "owner") {
      setPhase("needs-key");
      return;
    }
    const working: CircleVault = {
      ...current,
      vectors: { ...current.vectors },
      hashes: { ...current.hashes },
      updatedAt: { ...current.updatedAt },
    };
    if (!working.memberId && status.circle && status.circle.id === working.circleId) {
      working.memberId = status.circle.memberId;
      working.role = status.circle.role;
    }
    setPhase("syncing");
    try {
      const pulled = await fetch("/api/circle/records");
      if (pulled.status === 409) {
        setPhase("needs-key");
        return;
      }
      if (!pulled.ok) {
        setPhase(pulled.status === 401 ? "signed-out" : "unavailable");
        return;
      }
      const body = (await pulled.json()) as { generation: number; members: CircleMember[]; records: Envelope[] };
      setMembers(body.members);
      if (body.generation !== working.generation) {
        setPhase("needs-key");
        await remember(working);
        return;
      }
      const map = new Map(snapshotRecords(store).map((record) => [record.id, record]));
      let changed = false;
      let conflict = false;
      for (const remote of body.records) {
        const localBody = map.get(remote.id);
        const localEnv: Envelope = {
          id: remote.id,
          vector: working.vectors[remote.id] || {},
          updatedAt: working.updatedAt[remote.id] || "1970-01-01T00:00:00.000Z",
          deviceId: working.deviceId,
          generation: working.generation,
          cipher: "",
          size: 0,
        };
        const merged = localBody || working.vectors[remote.id] ? mergeEnvelope(localEnv, remote) : { winner: remote, conflict: false, reason: "remote" as const };
        if (merged.conflict) conflict = true;
        if (merged.winner !== remote && merged.reason !== "remote" && merged.reason !== "lww-remote" && merged.reason !== "generation") continue;
        if (merged.winner !== remote) continue;
        let plain: unknown;
        try {
          plain = await decryptPayload(working.keyToken, remote.cipher);
        } catch {
          setPhase("needs-key");
          return;
        }
        if (!plain || typeof plain !== "object") continue;
        const record = { id: remote.id, body: plain as Record<string, unknown> };
        map.set(remote.id, record);
        working.vectors[remote.id] = remote.vector;
        working.updatedAt[remote.id] = remote.updatedAt;
        working.hashes[remote.id] = await hashBody(plain);
        if ((plain as { tombstone?: boolean }).tombstone) delete working.hashes[remote.id];
        changed = true;
      }
      if (changed) {
        skip.current += 1;
        store.applyRemote(cabinetFromRecords(store, [...map.values()]));
      }
      const fresh = snapshotRecords(changed ? cabinetFromRecords(store, [...map.values()]) : store);
      const seen = new Set(fresh.map((record) => record.id));
      const pending: SyncBody[] = [...fresh];
      for (const id of Object.keys(working.hashes)) if (!seen.has(id)) pending.push(tombstone(id));
      const envelopes: Envelope[] = [];
      for (const record of pending) {
        const hash = await hashBody(record.body);
        if (hash === working.hashes[record.id]) continue;
        const vector = { ...(working.vectors[record.id] || {}) };
        vector[working.deviceId] = (vector[working.deviceId] || 0) + 1;
        const updatedAt = new Date().toISOString();
        const cipher = await encryptPayload(working.keyToken, record.body);
        envelopes.push({ id: record.id, vector, updatedAt, deviceId: working.deviceId, generation: working.generation, cipher, size: cipher.length });
        working.hashes[record.id] = record.body.tombstone ? "" : hash;
        working.vectors[record.id] = vector;
        working.updatedAt[record.id] = updatedAt;
      }
      if (envelopes.length) {
        const pushed = await fetch("/api/circle/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generation: working.generation, records: envelopes }),
        });
        if (pushed.status === 409) {
          setPhase("needs-key");
          await remember(working);
          return;
        }
        if (!pushed.ok) {
          setPhase("offline");
          await remember(working);
          return;
        }
        for (const envelope of envelopes) {
          if (working.hashes[envelope.id] === "") delete working.hashes[envelope.id];
        }
      }
      working.lastSyncAt = new Date().toISOString();
      await remember(working);
      setPhase(conflict ? "conflict" : "synced");
    } catch {
      setPhase("offline");
    }
  }, [remember, store]);

  useEffect(() => {
    let cancel = false;
    void loadVault().then((loaded) => {
      if (cancel) return;
      vaultRef.current = loaded;
      setVault(loaded);
      setFragment(parseCircleFragment(window.location.hash));
      setReady(true);
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !store.ready) return;
    void sync();
    const timer = window.setInterval(() => void sync(), 45_000);
    const onFocus = () => void sync();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [ready, store.ready, sync]);

  useEffect(() => {
    if (!ready || !store.ready || !vaultRef.current) return;
    if (skip.current > 0) {
      skip.current -= 1;
      return;
    }
    const timer = window.setTimeout(() => void sync(), 1200);
    return () => window.clearTimeout(timer);
  }, [ready, store.ready, store.bags, store.logs, store.reports, store.symptoms, store.talks, store.patientName, store.familyContact, store.allergies, store.lang, sync]);

  const createCircle = useCallback(async () => {
    const keyToken = await generateCircleKey();
    const circleId = bytesToUrl(crypto.getRandomValues(new Uint8Array(18)));
    const next = blankVault({ circleId, keyToken, generation: 1, role: "owner" });
    await remember(next);
    const response = await fetch("/api/circle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ circleId }),
    });
    if (response.ok) {
      const body = (await response.json()) as { memberId: string; generation: number };
      next.memberId = body.memberId;
      next.generation = body.generation;
      await remember(next);
      await sync();
      return;
    }
    setPhase(response.status === 401 ? "signed-out" : "unavailable");
  }, [remember, sync]);

  const joinCircle = useCallback(async (role: "family" | "caregiver") => {
    const link = parseCircleFragment(window.location.hash);
    if (!link) return;
    const next = blankVault({ circleId: link.circleId, keyToken: link.key, generation: link.generation, role });
    await remember(next);
    const response = await fetch("/api/circle/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ circleId: link.circleId, role }),
    });
    if (response.ok) {
      const body = (await response.json()) as { memberId: string; generation: number; role: CircleRole };
      next.memberId = body.memberId;
      next.generation = body.generation;
      next.role = body.role;
      await remember(next);
      await sync();
      return;
    }
    setPhase(response.status === 401 ? "signed-out" : "unavailable");
  }, [remember, sync]);

  const removeMember = useCallback(async (memberId: string) => {
    const current = vaultRef.current;
    if (!current) return;
    const response = await fetch("/api/circle/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (!response.ok) return;
    const body = (await response.json()) as { generation: number };
    const keyToken = await generateCircleKey();
    const next: CircleVault = { ...current, keyToken, generation: body.generation, hashes: {}, vectors: {}, updatedAt: {} };
    await remember(next);
    setNotice("rotated");
    await sync();
  }, [remember, sync]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setPhase("signed-out");
  }, []);

  const deleteAccount = useCallback(async () => {
    await fetch("/api/auth/account", { method: "DELETE" });
    await remember(null);
    setUser(null);
    setMembers([]);
    setPhase("signed-out");
  }, [remember]);

  const value = useMemo<CircleContextValue>(
    () => ({
      ready,
      vault,
      phase,
      login,
      user,
      members,
      fragment,
      notice,
      createCircle,
      joinCircle,
      removeMember,
      logout,
      deleteAccount,
    }),
    [ready, vault, phase, login, user, members, fragment, notice, createCircle, joinCircle, removeMember, logout, deleteAccount],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCircle(): CircleContextValue {
  const value = useContext(Ctx);
  if (!value) throw new Error("useCircle outside provider");
  return value;
}
