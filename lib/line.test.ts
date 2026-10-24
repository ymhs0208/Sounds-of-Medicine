import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { EMPTY_DATA } from "./backup";
import { applyLineDoses } from "./doses";
import { openDoseEvent } from "./line-events";
import { doseData, handleLineBody, parsePostback } from "./line-bot";
import { runLineCron } from "./line-cron";
import { doseAlt, LINE_DOSE, previewCards } from "./line-messages";
import { buildLinePlan } from "./line-plan";
import { digestDue, missedDue, refillDue, reminderDue } from "./line-schedule";
import { memoryLineStore } from "./line-store";
import { lineSignature, verifyLineSignature } from "./line-sign";
import { addDays } from "./refill";
import type { Bag } from "./types";

const NOW = "2026-10-24T00:00:00.000Z";
const CIRCLE = "circle-circle-circle1";
const MEMBER = "member-member-memb1";
const CARE = "Ucaregiver0123456789abcdef01";
const FAMILY = "Ufamily0123456789abcdef0123";
const GROUP = "Cgroup0123456789abcdef012345";
const SECRET = "channel-secret";
const SIGNING = "signing-secret";

function bag(): Bag {
  return {
    id: "bag-bag-bag-bag-1",
    source: "photo",
    hospitalZh: "",
    hospitalShort: "",
    pharmacyZh: "",
    patientZh: "",
    dispensingDate: "2026-10-01",
    dispensingLabel: "",
    theme: "pine",
    days: 28,
    chronic: true,
    chronicFill: 1,
    createdAt: NOW,
    drugs: [
      {
        id: "drug-drug-drug-001",
        nameZh: "脈優",
        ingredient: "Amlodipine",
        doseZh: "5mg",
        quantityZh: "28",
        usageZh: "每日一次",
        indicationZh: "",
        warningsZh: [],
        slots: ["morning_after"],
        i18n: {},
      },
    ],
  };
}

async function linkedStore() {
  const store = memoryLineStore();
  const care = await store.ensureLink({
    id: MEMBER,
    circleId: CIRCLE,
    memberId: MEMBER,
    lineSub: "sub-sub-sub-sub-sub1",
    lang: "zh",
    role: "caregiver",
    now: NOW,
  });
  care.lineUserId = CARE;
  await store.updateLink(care, NOW);
  const family = await store.ensureLink({
    id: "member-family-fam01",
    circleId: CIRCLE,
    memberId: "member-family-fam01",
    lineSub: "sub-family-family1",
    lang: "zh",
    role: "family",
    now: NOW,
  });
  family.lineUserId = FAMILY;
  await store.updateLink(family, NOW);
  await store.saveSettings(
    { circleId: CIRCLE, detailOptIn: false, missedWindowMin: 30, digestTime: "21:00", lastDigestDate: null, visitDate: null, supplyDays: 6, observationCount: 1 },
    NOW,
  );
  return store;
}

test("LINE webhook signature accepts the raw body and rejects a changed byte", async () => {
  const body = JSON.stringify({ events: [] });
  const signature = await lineSignature(body, SECRET);
  assert.equal(await verifyLineSignature(body, signature, SECRET), true);
  assert.equal(await verifyLineSignature(`${body} `, signature, SECRET), false);
  assert.equal(await verifyLineSignature(body, null, SECRET), false);
  const result = await handleLineBody(body, signature, {
    secret: null,
    store: memoryLineStore(),
    now: new Date(NOW),
    reply: async () => true,
    push: async () => true,
    signingKey: SIGNING,
    dataKey: null,
  });
  assert.equal(result.status, 503);
  const rejected = await handleLineBody(body, "bm90LXNpZw==", {
    secret: SECRET,
    store: memoryLineStore(),
    now: new Date(NOW),
    reply: async () => true,
    push: async () => true,
    signingKey: SIGNING,
    dataKey: null,
  });
  assert.equal(rejected.status, 401);
});

test("a dose postback records a signed event and a later skip", async () => {
  const store = await linkedStore();
  await store.replacePlan({
    circleId: CIRCLE,
    detail: false,
    dataKey: null,
    doses: [{ id: "dose-dose-dose-001", date: "2026-10-24", time: "08:00", slot: "morning_after", name: "脈優" }],
    refills: [],
    alerts: [],
    now: NOW,
  });
  assert.equal(JSON.stringify(store.dosesFor(CIRCLE)).includes("脈優"), false);
  const replies: unknown[] = [];
  const data = doseData("taken", { circleId: CIRCLE, date: "2026-10-24", slot: "morning_after", id: "dose-dose-dose-001", one: false });
  const body = JSON.stringify({
    events: [{ type: "postback", replyToken: "reply-token", source: { type: "user", userId: CARE }, postback: { data } }],
  });
  const status = await handleLineBody(body, await lineSignature(body, SECRET), {
    secret: SECRET,
    store,
    now: new Date("2026-10-24T00:10:00.000Z"),
    reply: async (_to, messages) => {
      replies.push(messages);
      return true;
    },
    push: async () => true,
    signingKey: SIGNING,
    dataKey: null,
  });
  assert.equal(status.status, 200);
  assert.equal(store.dosesFor(CIRCLE)[0]?.status, "taken");
  const stored = store.eventsSince(CIRCLE, null)[0];
  assert.ok(stored);
  const opened = await openDoseEvent(stored.body, stored.sig, SIGNING);
  assert.equal(opened?.action, "taken");
  assert.equal(opened?.drugId, undefined);
  assert.equal(JSON.stringify(opened).includes("脈優"), false);
  const cabinet = applyLineDoses({ ...EMPTY_DATA, bags: [bag()] }, opened ? [opened] : []);
  assert.equal(cabinet.logs[0]?.status, "given");
  const skip = doseData("skipped", { circleId: CIRCLE, date: "2026-10-24", slot: "morning_after", id: "dose-dose-dose-001", one: false });
  assert.equal(parsePostback(skip)?.action, "skipped");
  assert.equal(JSON.stringify(replies).includes("脈優"), false);
});

test("a one-time code binds a group once and unlink removes the LINE id", async () => {
  const store = await linkedStore();
  const code = await store.issueCode({ circleId: CIRCLE, memberId: null, kind: "group", now: NOW });
  const replies: string[] = [];
  async function send(text: string) {
    const body = JSON.stringify({
      events: [{ type: "message", replyToken: "reply-token", source: { type: "group", userId: FAMILY, groupId: GROUP }, message: { type: "text", text } }],
    });
    return handleLineBody(body, await lineSignature(body, SECRET), {
      secret: SECRET,
      store,
      now: new Date(NOW),
      reply: async (_to, messages) => {
        replies.push(JSON.stringify(messages));
        return true;
      },
      push: async () => true,
      signingKey: SIGNING,
      dataKey: null,
    });
  }
  assert.equal((await send(code)).status, 200);
  assert.equal(store.groupFor(CIRCLE)?.groupId, GROUP);
  await send(code);
  assert.equal(store.groupFor(CIRCLE)?.groupId, GROUP);
  assert.match(replies[0] || "", /照護圈/);
  await store.unlinkSub("sub-sub-sub-sub-sub1", NOW);
  assert.equal(store.linkForUser(CARE), null);
  await store.purgeAccount("sub-family-family1", [CIRCLE]);
  assert.equal(store.groupFor(CIRCLE), null);
  assert.equal(store.linksForCircle(CIRCLE).length, 0);
});

test("missed doses, the nightly digest, and refill days are scheduled in Taipei time", async () => {
  assert.equal(reminderDue({ date: "2026-10-24", time: "08:00", status: "open", remindedAt: null, missedAlertedAt: null }, new Date("2026-10-24T00:05:00.000Z")), true);
  assert.equal(missedDue({ date: "2026-10-24", time: "08:00", status: "open", remindedAt: NOW, missedAlertedAt: null }, new Date("2026-10-24T00:20:00.000Z"), 30), false);
  assert.equal(missedDue({ date: "2026-10-24", time: "08:00", status: "open", remindedAt: NOW, missedAlertedAt: null }, new Date("2026-10-24T00:40:00.000Z"), 30), true);
  assert.equal(digestDue("21:00", null, new Date("2026-10-24T12:50:00.000Z")), false);
  assert.equal(digestDue("21:00", null, new Date("2026-10-24T13:00:00.000Z")), true);
  assert.equal(digestDue("21:00", "2026-10-24", new Date("2026-10-24T13:10:00.000Z")), false);
  assert.equal(refillDue(addDays("2026-10-24", 7), "2026-10-24", false, false), 7);
  assert.equal(refillDue(addDays("2026-10-24", 3), "2026-10-24", true, false), 3);

  const store = await linkedStore();
  await store.replacePlan({
    circleId: CIRCLE,
    detail: true,
    dataKey: "data-key",
    doses: [{ id: "dose-dose-dose-001", date: "2026-10-24", time: "08:00", slot: "morning_after", name: "脈優", drugId: "drug-drug-drug-001" }],
    refills: [{ id: "refill-refill-001", kind: "supply", due: addDays("2026-10-24", 10), name: "脈優" }],
    alerts: [],
    now: NOW,
  });
  assert.equal(JSON.stringify(store.dosesFor(CIRCLE)).includes("脈優"), false);
  assert.equal(await store.readLabel(store.dosesFor(CIRCLE)[0]?.labelCipher || null, "data-key"), "脈優");
  const pushed: { to: string; messages: unknown[] }[] = [];
  const push = async (to: string, messages: unknown[]) => {
    pushed.push({ to, messages });
    return true;
  };
  const quiet = store.linkForUser(CARE);
  assert.ok(quiet);
  quiet.quietStart = "07:00";
  quiet.quietEnd = "09:00";
  await store.updateLink(quiet, NOW);
  const quietRun = await runLineCron({ LINE_MESSAGING_ACCESS_TOKEN: "token", LINE_DATA_KEY: "data-key" }, new Date("2026-10-24T00:05:00.000Z"), { store, push });
  assert.equal(quietRun.sent, 0);
  quiet.quietStart = "22:00";
  quiet.quietEnd = "07:00";
  await store.updateLink(quiet, NOW);
  const reminded = await runLineCron({ LINE_MESSAGING_ACCESS_TOKEN: "token" }, new Date("2026-10-24T00:05:00.000Z"), { store, push });
  assert.equal(reminded.sent, 1);
  assert.equal(JSON.stringify(pushed).includes("脈優"), false);
  assert.match(JSON.stringify(pushed), /該吃藥了/);
  const again = await runLineCron({ LINE_MESSAGING_ACCESS_TOKEN: "token" }, new Date("2026-10-24T00:10:00.000Z"), { store, push });
  assert.equal(again.sent, 0);

  const missed = await runLineCron({ LINE_MESSAGING_ACCESS_TOKEN: "token" }, new Date("2026-10-24T00:40:00.000Z"), { store, push });
  assert.equal(missed.sent >= 1, true);
  assert.match(JSON.stringify(pushed), /有一次服藥還沒記錄/);
  assert.equal(pushed.some((item) => item.to === FAMILY), true);
  assert.equal(pushed.some((item) => item.to === GROUP), false);

  await store.saveSettings({ ...store.settingsFor(CIRCLE), detailOptIn: false }, NOW);
  const groupCode = await store.issueCode({ circleId: CIRCLE, memberId: null, kind: "group", now: NOW });
  await store.redeemCode({ code: groupCode, groupId: GROUP, now: NOW });
  const dose = store.dosesFor(CIRCLE)[0];
  dose.missedAlertedAt = null;
  dose.status = "open";
  const missedGroup = await runLineCron({ LINE_MESSAGING_ACCESS_TOKEN: "token" }, new Date("2026-10-24T00:45:00.000Z"), { store, push });
  assert.equal(missedGroup.sent >= 1, true);
  assert.equal(pushed.some((item) => item.to === GROUP), true);

  dose.status = "taken";
  const beforeDigest = pushed.length;
  const digest = await runLineCron({ LINE_MESSAGING_ACCESS_TOKEN: "token" }, new Date("2026-10-24T13:00:00.000Z"), { store, push });
  assert.equal(digest.sent >= 1, true);
  assert.match(JSON.stringify(pushed.slice(beforeDigest)), /2|1/);
  const second = await runLineCron({ LINE_MESSAGING_ACCESS_TOKEN: "token" }, new Date("2026-10-24T13:10:00.000Z"), { store, push });
  assert.equal(second.sent, 0);

  const refillStore = await linkedStore();
  await refillStore.replacePlan({
    circleId: CIRCLE,
    detail: false,
    dataKey: null,
    doses: [],
    refills: [
      { id: "refill-refill-001", kind: "supply", due: addDays("2026-10-24", 7) },
      { id: "refill-chronic-001", kind: "chronic", due: addDays("2026-10-24", 3) },
      { id: "refill-visit-0001", kind: "visit", due: addDays("2026-10-24", 7) },
    ],
    alerts: [],
    now: NOW,
  });
  const refillPushes: unknown[] = [];
  await runLineCron({ LINE_MESSAGING_ACCESS_TOKEN: "token" }, new Date("2026-10-24T13:00:00.000Z"), {
    store: refillStore,
    push: async (_to, messages) => {
      refillPushes.push(messages);
      return true;
    },
  });
  assert.match(JSON.stringify(refillPushes), /有藥快用完/);
  assert.equal(JSON.stringify(refillPushes).includes("脈優"), false);
  assert.equal(refillStore.allRefills().filter((item) => item.sent7).length, 2);
  assert.equal(refillStore.allRefills().filter((item) => item.sent3).length, 1);
});

test("default Flex copy stays generic in every language and the photo route does not log images", () => {
  assert.equal(LINE_DOSE.zh, "該吃藥了");
  assert.equal(LINE_DOSE.id, "Waktunya minum obat");
  assert.equal(doseAlt("vi").includes("mg"), false);
  for (const card of previewCards("zh")) assert.equal(JSON.stringify(card).includes("脈優"), false);
  const plan = buildLinePlan({ ...EMPTY_DATA, bags: [bag()] }, "2026-10-24", false, "2026-11-01");
  assert.equal(JSON.stringify(plan).includes("脈優"), false);
  assert.equal(plan.refills.some((item) => item.kind === "visit"), true);
  assert.equal(plan.refills.some((item) => item.kind === "chronic"), true);
  const detailed = buildLinePlan({ ...EMPTY_DATA, bags: [bag()] }, "2026-10-24", true, null);
  assert.equal(detailed.doses[0]?.name, "脈優");
  const source = readFileSync(new URL("../app/api/line/webhook/route.ts", import.meta.url), "utf8") + readFileSync(new URL("./line-bot.ts", import.meta.url), "utf8");
  assert.equal(source.includes("console."), false);
  assert.match(readFileSync(new URL("../app/api/extract/route.ts", import.meta.url), "utf8"), /not logged or stored/);
});
