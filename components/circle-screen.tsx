"use client";

import { useEffect, useState } from "react";
import { shareOnLine } from "@/components/liff-login";
import { PageHeader } from "@/components/page-header";
import { circleInvite, recoveryCode } from "@/lib/circle-crypto";
import { circleCopy } from "@/lib/i18n/circle";
import { lineCopy } from "@/lib/i18n/line";
import { formatDateTime } from "@/lib/format";
import { useCircle } from "@/components/circle-provider";
import { useStore } from "@/lib/store";

function roleLabel(role: string, t: (typeof circleCopy)["zh"]): string {
  if (role === "owner") return t.roleOwner;
  if (role === "caregiver") return t.roleCaregiver;
  return t.roleFamily;
}

export function CircleScreen() {
  const store = useStore();
  const circle = useCircle();
  const t = circleCopy[store.lang];
  const [code, setCode] = useState("");
  const [qr, setQr] = useState("");
  const [role, setRole] = useState<"family" | "caregiver">("caregiver");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [invite, setInvite] = useState("");
  const [authNote, setAuthNote] = useState("");
  const showJoin = Boolean(circle.fragment && (!circle.vault || circle.vault.circleId !== circle.fragment.circleId));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "unconfigured") setAuthNote(t.lineUnavailable);
    else if (params.get("auth") && params.get("auth") !== "ok") setAuthNote(t.authError);
  }, [t.authError, t.lineUnavailable]);

  useEffect(() => {
    if (!circle.vault) {
      setInvite("");
      setCode("");
      return;
    }
    setInvite(circleInvite(window.location.origin, { circleId: circle.vault.circleId, key: circle.vault.keyToken, generation: circle.vault.generation }));
    let cancel = false;
    void recoveryCode(circle.vault.keyToken).then((value) => {
      if (!cancel) setCode(value);
    });
    return () => {
      cancel = true;
    };
  }, [circle.vault]);

  useEffect(() => {
    if (!invite || invite.length > 1800) {
      setQr("");
      return;
    }
    let cancel = false;
    void import("qrcode").then(async (mod) => {
      const toDataURL = mod.toDataURL ?? mod.default?.toDataURL;
      if (!toDataURL) return;
      const url = await toDataURL(invite, { margin: 1, width: 240, errorCorrectionLevel: "M" });
      if (!cancel) setQr(url);
    });
    return () => {
      cancel = true;
    };
  }, [invite]);

  const status =
    circle.phase === "syncing"
      ? t.syncing
      : circle.phase === "synced"
        ? `${t.synced} ${circle.vault?.lastSyncAt ? formatDateTime(circle.vault.lastSyncAt, store.lang) : ""}`
        : circle.phase === "offline"
          ? t.offline
          : circle.phase === "conflict"
            ? t.conflict
            : circle.phase === "needs-key"
              ? t.needsKey
              : circle.phase === "signed-out"
                ? t.syncSignedOut
                : circle.phase === "unavailable" && circle.vault
                  ? t.syncLocal
                  : circle.phase === "unavailable"
                    ? t.syncUnavailable
                    : circle.vault
                      ? t.syncLocal
                      : t.syncUnavailable;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-8">
      <PageHeader title={t.title} lead={t.lead} />
      <section className="rounded-3xl bg-card p-4 ring-1 ring-border" aria-labelledby="sync-status-heading">
        <h2 id="sync-status-heading" className="text-base font-semibold">{t.syncTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed" role="status">{status}</p>
        {circle.user ? <p className="mt-2 text-sm">{circle.user.name || circle.user.sub}</p> : null}
        {circle.login && !circle.user ? (
          <a className="mt-3 inline-flex min-h-12 items-center rounded-2xl bg-[#06c755] px-4 font-semibold text-[#062117]" href="/api/auth/line/start">
            {t.lineButton}
          </a>
        ) : null}
        {!circle.login ? (
          <p className="mt-3 text-sm leading-relaxed">
            <span className="inline-flex min-h-12 items-center rounded-2xl bg-[#06c755] px-4 font-semibold text-[#062117]">{t.lineButton}</span>
            <span className="mt-2 block text-muted-foreground">{t.lineUnavailable}</span>
          </p>
        ) : null}
        {authNote ? <p className="mt-2 text-sm">{authNote}</p> : null}
      </section>

      {showJoin ? (
        <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
          <h2 className="text-xl font-semibold">{t.joinTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.joinLead}</p>
          <fieldset className="mt-3 space-y-2">
            <label className="flex min-h-11 items-center gap-3 text-base">
              <input type="radio" name="circle-role" className="size-5" checked={role === "caregiver"} onChange={() => setRole("caregiver")} />
              {t.roleCaregiver}
            </label>
            <label className="flex min-h-11 items-center gap-3 text-base">
              <input type="radio" name="circle-role" className="size-5" checked={role === "family"} onChange={() => setRole("family")} />
              {t.roleFamily}
            </label>
          </fieldset>
          <button type="button" className="mt-3 min-h-12 w-full rounded-2xl bg-pine font-semibold text-white" onClick={() => void circle.joinCircle(role)}>
            {t.joinAction}
          </button>
        </section>
      ) : null}

      {!circle.vault ? (
        <button type="button" className="min-h-14 w-full rounded-2xl bg-pine text-lg font-semibold text-white" onClick={() => void circle.createCircle()}>
          {t.create}
        </button>
      ) : (
        <section className="circle-print rounded-3xl bg-card p-4 ring-1 ring-border">
          <h2 className="text-xl font-semibold">{t.recoveryTitle}</h2>
          <p className="mt-2 font-mono text-base leading-relaxed break-all">{code}</p>
          <p className="mt-3 rounded-2xl bg-amber-bg p-3 text-sm leading-relaxed text-amber-ink">{t.recoveryWarning}</p>
          <button type="button" className="mt-3 min-h-11 rounded-2xl px-3 font-semibold ring-1 ring-border" onClick={() => window.print()}>
            {t.printRecovery}
          </button>
          <div className="mt-4">
            <h2 className="text-base font-semibold">{t.inviteLabel}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.keyFragment}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr ? <img className="mt-3 size-60 max-w-full" alt={t.qrAlt} src={qr} /> : null}
            <label className="mt-3 block text-sm font-semibold" htmlFor="circle-invite">{t.inviteLabel}</label>
            <input id="circle-invite" readOnly className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm break-all" value={invite} />
            <p className="mt-3 text-sm leading-relaxed text-amber-ink">{lineCopy[store.lang].shareWarn}</p>
            <button
              type="button"
              className="mt-2 min-h-12 rounded-2xl bg-[#06c755] px-4 font-semibold text-[#062117]"
              onClick={() => void shareOnLine(`${lineCopy[store.lang].shareWarn}\n${invite}`)}
            >
              {lineCopy[store.lang].share}
            </button>
          </div>
          {circle.notice === "rotated" ? <p className="mt-3 text-sm leading-relaxed">{t.rotated}</p> : null}
        </section>
      )}

      <section className="rounded-3xl bg-card p-4 ring-1 ring-border">
        <h2 className="text-base font-semibold">{t.membersTitle}</h2>
        {circle.members.length === 0 ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.emptyMembers}</p> : null}
        <ul className="mt-2 space-y-2">
          {circle.members.filter((member) => !member.removed).map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-background px-3 py-2">
              <span className="text-base">{member.name || member.id.slice(0, 8)} · {roleLabel(member.role, t)}</span>
              {circle.vault?.role === "owner" && member.role !== "owner" ? (
                <button type="button" className="min-h-11 rounded-xl px-3 text-sm font-semibold ring-1 ring-border" onClick={() => void circle.removeMember(member.id)}>
                  {t.remove}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {circle.user ? (
        <section className="space-y-2">
          <button type="button" className="min-h-12 w-full rounded-2xl font-semibold ring-1 ring-border" onClick={() => void circle.logout()}>
            {t.logout}
          </button>
          <p className="text-sm leading-relaxed text-muted-foreground">{t.deleteExplain}</p>
          {confirmDelete ? (
            <button type="button" className="min-h-12 w-full rounded-2xl bg-rose font-semibold text-white" onClick={() => void circle.deleteAccount()}>
              {t.deleteConfirm}
            </button>
          ) : (
            <button type="button" className="min-h-12 w-full rounded-2xl font-semibold ring-1 ring-border" onClick={() => setConfirmDelete(true)}>
              {t.deleteAccount}
            </button>
          )}
        </section>
      ) : null}
    </div>
  );
}
