import { NextResponse } from "next/server";
import { originAllowed } from "@/lib/api-guard";
import { circleStore } from "@/lib/circle-db";
import { lineConfigured } from "@/lib/line-auth";
import { messagingConfigured } from "@/lib/line-bot";
import { lineStore } from "@/lib/line-db";
import { validPlanAlert, validPlanDose, validPlanRefill } from "@/lib/line-plan";
import { clockMinutes } from "@/lib/line-schedule";
import { sessionFrom } from "@/lib/session";
import { isLang } from "@/lib/types";

export const runtime = "nodejs";

function unavailable(login: boolean) {
  return NextResponse.json({ enabled: false, login, user: null });
}

export async function GET(request: Request) {
  const login = lineConfigured();
  if (!messagingConfigured()) return unavailable(login);
  const session = await sessionFrom(request);
  const db = await lineStore().catch(() => null);
  const circles = await circleStore().catch(() => null);
  if (!db || !circles) return unavailable(login);
  if (!session) return NextResponse.json({ enabled: true, login, user: null, circle: null });
  const member = await circles.membership(session.sub);
  if (!member) return NextResponse.json({ enabled: true, login, user: { sub: session.sub, name: session.name }, circle: null });
  const link = db.linkForMember(member.circleId, member.memberId);
  const settings = db.settingsFor(member.circleId);
  return NextResponse.json({
    enabled: true,
    login,
    user: { sub: session.sub, name: session.name },
    circle: {
      id: member.circleId,
      role: member.role,
      linked: Boolean(link?.lineUserId),
      notify: {
        dose: link?.notifyDose ?? true,
        missed: link?.notifyMissed ?? true,
        digest: link?.notifyDigest ?? true,
        refill: link?.notifyRefill ?? true,
      },
      quietStart: link?.quietStart ?? "22:00",
      quietEnd: link?.quietEnd ?? "07:00",
      detailOptIn: settings.detailOptIn,
      missedWindowMin: settings.missedWindowMin,
      digestTime: settings.digestTime,
      visitDate: settings.visitDate,
      groupBound: Boolean(db.groupFor(member.circleId)),
      dataKey: Boolean(process.env.LINE_DATA_KEY),
    },
  });
}

export async function POST(request: Request) {
  if (!originAllowed(request)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  if (!messagingConfigured()) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const session = await sessionFrom(request);
  if (!session) return NextResponse.json({ error: "login" }, { status: 401 });
  const db = await lineStore().catch(() => null);
  const circles = await circleStore().catch(() => null);
  if (!db || !circles) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const member = await circles.membership(session.sub);
  if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "bad_body" }, { status: 400 });
  const now = new Date().toISOString();
  const lang = typeof body.lang === "string" && isLang(body.lang) ? body.lang : "zh";
  const link = await db.ensureLink({
    id: member.memberId,
    circleId: member.circleId,
    memberId: member.memberId,
    lineSub: session.sub,
    lang,
    role: member.role,
    now,
  });
  const notify = body.notify && typeof body.notify === "object" ? (body.notify as Record<string, unknown>) : null;
  link.lang = lang;
  if (notify) {
    if ("dose" in notify) link.notifyDose = notify.dose !== false;
    if ("missed" in notify) link.notifyMissed = notify.missed !== false;
    if ("digest" in notify) link.notifyDigest = notify.digest !== false;
    if ("refill" in notify) link.notifyRefill = notify.refill !== false;
  }
  if (typeof body.quietStart === "string" && clockMinutes(body.quietStart) !== null) link.quietStart = body.quietStart;
  if (typeof body.quietEnd === "string" && clockMinutes(body.quietEnd) !== null) link.quietEnd = body.quietEnd;
  await db.updateLink(link, now);

  const settings = db.settingsFor(member.circleId);
  if (member.role === "owner") {
    if (body.detailOptIn === true && !process.env.LINE_DATA_KEY) return NextResponse.json({ error: "no_data_key" }, { status: 409 });
    if (body.detailOptIn === true) settings.detailOptIn = true;
    if (body.detailOptIn === false) settings.detailOptIn = false;
    if (typeof body.missedWindowMin === "number" && body.missedWindowMin >= 5 && body.missedWindowMin <= 180) {
      settings.missedWindowMin = Math.round(body.missedWindowMin);
    }
    if (typeof body.digestTime === "string" && clockMinutes(body.digestTime) !== null) settings.digestTime = body.digestTime;
    if (body.visitDate === null) settings.visitDate = null;
    if (typeof body.visitDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.visitDate)) settings.visitDate = body.visitDate;
  }
  const detail = settings.detailOptIn;
  const doses = Array.isArray(body.doses) ? body.doses.map(validPlanDose).filter((row) => row !== null).slice(0, 200) : [];
  const refills = Array.isArray(body.refills) ? body.refills.map(validPlanRefill).filter((row) => row !== null).slice(0, 80) : [];
  const alerts = Array.isArray(body.alerts) ? body.alerts.map(validPlanAlert).filter((row) => row !== null).slice(0, 40) : [];
  if (!detail) {
    for (const dose of doses) {
      delete dose.name;
      delete dose.drugId;
    }
    for (const refill of refills) delete refill.name;
    for (const alert of alerts) delete alert.name;
  }
  if (typeof body.supplyDays === "number" && body.supplyDays >= 0 && body.supplyDays <= 3650) settings.supplyDays = Math.round(body.supplyDays);
  if (typeof body.observationCount === "number" && body.observationCount >= 0 && body.observationCount <= 1000) {
    settings.observationCount = Math.round(body.observationCount);
  }
  await db.saveSettings(settings, now);
  if (Array.isArray(body.doses) || Array.isArray(body.refills) || Array.isArray(body.alerts)) {
    await db.replacePlan({ circleId: member.circleId, detail, dataKey: process.env.LINE_DATA_KEY || null, doses, refills, alerts, now });
  }
  return NextResponse.json({ ok: true, detailOptIn: settings.detailOptIn });
}
