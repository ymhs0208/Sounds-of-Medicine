import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const base = process.env.BASE_URL || "http://127.0.0.1:4321";
const outDir = process.env.SCREENSHOT_DIR || "/opt/cursor/artifacts/responsive";

const viewports = [
  { name: "320x740", width: 320, height: 740 },
  { name: "360x740", width: 360, height: 740 },
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1440x900", width: 1440, height: 900 },
].filter((viewport) => !process.env.VIEWPORTS || process.env.VIEWPORTS.split(",").includes(viewport.name));

const routes = [
  { path: "/privacy", name: "privacy" },
  { path: "/terms", name: "terms" },
  { path: "/disclaimer", name: "disclaimer" },
  { path: "/today", name: "today" },
  { path: "/meds", name: "meds" },
  { path: "/meds/card?id=drug-long", name: "meds-card" },
  { path: "/meds/edit", name: "meds-edit" },
  { path: "/meds/edit?bag=bag-long", name: "meds-edit-bag" },
  { path: "/scan", name: "scan" },
  { path: "/review", name: "review" },
  { path: "/report", name: "report" },
  { path: "/family", name: "family" },
  { path: "/family/print", name: "family-print" },
  { path: "/settings", name: "settings" },
  { path: "/talk", name: "talk" },
  { path: "/line/preview", name: "line-preview" },
  { path: "/refill", name: "refill" },
  { path: "/visit", name: "visit" },
  { path: "/visit/print", name: "visit-print" },
  { path: "/emergency", name: "emergency" },
  { path: "/emergency/print", name: "emergency-print" },
  { path: "/family/shared", name: "family-shared" },
];

function seedScript() {
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  function shift(offset) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  const longId =
    "Amlodipine untuk tekanan darah tinggi yang harus diminum sesuai tulisan pada kemasan obat setiap hari tanpa jeda";
  const longVi =
    "Amlodipine dùng cho huyết áp cao, uống đúng như chữ ghi trên túi thuốc mỗi ngày và không tự ý ngừng thuốc";
  const longTh =
    "แอมโลดิพีนสำหรับความดันโลหิตสูง ต้องกินตามตัวหนังสือที่เขียนบนซองยาทุกวัน และห้ามหยุดยาเอง";
  const token = "PERINGATAN-JANGAN-DIHENTIKAN-SENDIRI-TANPA-BERTANYA-APOTEKER-ATAU-DOKTER-YANG-MERAWAT";
  const data = {
    version: 1,
    onboarded: true,
    lang: "id",
    consentAt: now.toISOString(),
    patientName: "林秀英",
    familyContact:
      "Anak: Budi Santoso, Jalan Kesehatan Panjang Nomor 18 Jakarta Selatan, hubungi kapan saja. Liên hệ gia đình bằng tiếng Việt nếu cần phiên dịch. ติดต่อครอบครัวเป็นภาษาไทยได้ตลอดเวลา",
    allergies: "Penisilin",
    allergiesZh: "盤尼西林",
    pictograms: true,
    largeText: false,
    symptoms: [
      {
        id: "sym-1",
        at: now.toISOString(),
        date: day,
        kind: "vomit",
        note: "Muntah setelah minum obat pagi",
        noteZh: "早上吃藥後吐了",
      },
      {
        id: "sym-2",
        at: now.toISOString(),
        date: day,
        kind: "bp",
        note: "",
        noteZh: "",
        value: "140/90",
      },
    ],
    talks: [],
    refillNotified: [],
    bags: [
      {
        id: "bag-long",
        source: "manual",
        hospitalZh: "臺大醫院",
        hospitalShort: "臺大",
        pharmacyZh: "門診藥局",
        patientZh: "林秀英",
        dispensingDate: day,
        dispensingLabel: "今日",
        theme: "#1b5e45",
        days: 28,
        chronic: true,
        chronicFill: 1,
        createdAt: now.toISOString(),
        drugs: [
          {
            id: "drug-long",
            nameZh: "脈優錠",
            ingredient: "amlodipine",
            doseZh: "5mg",
            quantityZh: "28 顆",
            usageZh: "每天早上飯後一顆",
            indicationZh: "高血壓",
            warningsZh: ["勿自行停藥"],
            slots: ["morning_after", "evening_after"],
            frequencyZh: "每日兩次",
            i18n: {
              id: {
                name: longId,
                dose: "5 mg setiap kali",
                quantity: "28 tablet",
                usage:
                  "Minum satu tablet setiap pagi sesudah makan dan satu tablet setiap sore sesudah makan, sesuai tulisan pada kemasan.",
                indication: "Tekanan darah tinggi",
                warnings: [token, longVi, longTh],
              },
              vi: {
                name: longVi,
                dose: "5 mg mỗi lần",
                quantity: "28 viên",
                usage: longVi,
                indication: "Huyết áp cao",
                warnings: [longVi],
              },
              th: {
                name: longTh,
                dose: "ครั้งละ 5 มก.",
                quantity: "28 เม็ด",
                usage: longTh,
                indication: "ความดันโลหิตสูง",
                warnings: [longTh],
              },
            },
          },
        ],
      },
      {
        id: "bag-two",
        source: "manual",
        hospitalZh: "馬偕紀念醫院",
        hospitalShort: "馬偕",
        pharmacyZh: "門診藥局",
        patientZh: "林秀英",
        dispensingDate: day,
        dispensingLabel: "今日",
        theme: "#1b5e45",
        days: 14,
        createdAt: now.toISOString(),
        drugs: [
          {
            id: "drug-two",
            nameZh: "脈優",
            ingredient: "amlodipine",
            doseZh: "5mg",
            quantityZh: "14 顆",
            usageZh: "每天早上飯前一顆",
            indicationZh: "高血壓",
            warningsZh: ["勿自行停藥"],
            slots: ["morning_before"],
            frequencyZh: "每日一次",
            i18n: {
              id: {
                name: "Amlodipine 5 mg",
                dose: "5 mg",
                quantity: "14 tablet",
                usage: "Satu tablet setiap pagi sebelum makan",
                indication: "Tekanan darah tinggi",
                warnings: ["Jangan berhenti sendiri"],
              },
              vi: {
                name: "Amlodipine 5 mg",
                dose: "5 mg",
                quantity: "14 viên",
                usage: "Mỗi sáng một viên trước khi ăn",
                indication: "Huyết áp cao",
                warnings: ["Không tự ý ngừng thuốc"],
              },
              fil: {
                name: "Amlodipine 5 mg",
                dose: "5 mg",
                quantity: "14 tableta",
                usage: "Isang tableta tuwing umaga bago kumain",
                indication: "Mataas na presyon",
                warnings: ["Huwag itigil nang mag-isa"],
              },
              th: {
                name: "Amlodipine 5 mg",
                dose: "5 มก.",
                quantity: "14 เม็ด",
                usage: "วันละ 1 เม็ดตอนเช้าก่อนอาหาร",
                indication: "ความดันโลหิตสูง",
                warnings: ["อย่าหยุดยาเอง"],
              },
              en: {
                name: "Amlodipine 5 mg",
                dose: "5 mg",
                quantity: "14 tablets",
                usage: "One tablet every morning before food",
                indication: "High blood pressure",
                warnings: ["Do not stop on your own"],
              },
            },
          },
        ],
      },
      {
        id: "bag-refill",
        source: "manual",
        hospitalZh: "臺大醫院",
        hospitalShort: "臺大",
        pharmacyZh: "門診藥局",
        patientZh: "林秀英",
        dispensingDate: shift(-7),
        dispensingLabel: "七日",
        theme: "#1b5e45",
        days: 10,
        createdAt: now.toISOString(),
        drugs: [
          {
            id: "drug-bed",
            nameZh: "睡眠藥",
            ingredient: "zolpidem",
            doseZh: "5mg",
            quantityZh: "10 顆",
            usageZh: "睡前一顆",
            indicationZh: "失眠",
            warningsZh: [],
            slots: ["bedtime"],
            frequencyZh: "每日一次",
            i18n: {
              id: {
                name: "Zolpidem 5 mg",
                dose: "5 mg",
                quantity: "10 tablet",
                usage: "Satu tablet sebelum tidur",
                indication: "Sulit tidur",
                warnings: [],
              },
              vi: {
                name: "Zolpidem 5 mg",
                dose: "5 mg",
                quantity: "10 viên",
                usage: "Một viên trước khi ngủ",
                indication: "Mất ngủ",
                warnings: [],
              },
              fil: {
                name: "Zolpidem 5 mg",
                dose: "5 mg",
                quantity: "10 tableta",
                usage: "Isang tableta bago matulog",
                indication: "Hirap matulog",
                warnings: [],
              },
              th: {
                name: "Zolpidem 5 mg",
                dose: "5 มก.",
                quantity: "10 เม็ด",
                usage: "1 เม็ดก่อนนอน",
                indication: "นอนไม่หลับ",
                warnings: [],
              },
              en: {
                name: "Zolpidem 5 mg",
                dose: "5 mg",
                quantity: "10 tablets",
                usage: "One tablet at bedtime",
                indication: "Trouble sleeping",
                warnings: [],
              },
            },
          },
        ],
      },
    ],
    logs: [
      {
        drugId: "drug-long",
        date: day,
        slot: "morning_after",
        status: "given",
        at: now.toISOString(),
      },
      {
        drugId: "drug-long",
        date: day,
        slot: "evening_after",
        status: "missed",
        at: now.toISOString(),
      },
      ...[-7, -6, -5, -4, -3, -2, -1].map((offset) => ({
        drugId: "drug-bed",
        date: shift(offset),
        slot: "bedtime",
        status: "given",
        at: now.toISOString(),
      })),
    ],
    reports: [
      {
        id: "report-1",
        at: now.toISOString(),
        date: day,
        kind: "observation",
        drugId: "drug-long",
        slot: "morning_after",
        observation: "dizzy",
        source: "form",
        replies: [
          {
            id: "reply-1",
            at: now.toISOString(),
            template: "watch",
            seen: false,
          },
        ],
      },
    ],
    notified: [
      { drugId: "drug-two", date: day, slot: "morning_before" },
      { drugId: "drug-bed", date: day, slot: "bedtime" },
    ],
  };
  localStorage.setItem("yaosheng.v1", JSON.stringify(data));
  document.cookie = "yaosheng-ready=1; Path=/";
}

async function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (style.position === "fixed" && el.closest("[data-sonner-toaster]")) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 && rect.height < 1) continue;
      if (rect.right > vw + 1 || rect.left < -1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || "",
          className: String(el.className).slice(0, 140),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
        if (offenders.length >= 6) break;
      }
    }
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      offenders,
    };
  });
}

async function shoot(page, file) {
  await page.waitForSelector("h1, main p", { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !document.querySelector("[data-sonner-toast]"), { timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(200);
  const box = await measure(page);
  await page.screenshot({ path: file, fullPage: true });
  const overflow = box.scrollWidth > box.clientWidth + 1 || box.offenders.length > 0;
  return { ...box, overflow, file };
}

function waitForServer(url) {
  const deadline = Date.now() + 60000;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const response = await fetch(url);
        if (response.ok || response.status < 500) {
          resolve();
          return;
        }
      } catch {
        /* server still booting */
      }
      if (Date.now() > deadline) {
        reject(new Error(`server did not answer ${url}`));
        return;
      }
      setTimeout(tick, 400);
    };
    tick();
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  let server;
  if (!process.env.BASE_URL) {
    server = spawn("npm", ["start"], {
      cwd: root,
      stdio: "inherit",
      detached: true,
      env: process.env,
    });
  }
  const failures = [];
  const shots = [];
  const browser = await chromium.launch();
  try {
    if (!process.env.BASE_URL) await waitForServer(base);

    for (const viewport of viewports) {
      const onboard = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });
      const page = await onboard.newPage();
      await page.goto(`${base}/`, { waitUntil: "networkidle" });
      const file = path.join(outDir, `${viewport.name}-landing.png`);
      const result = await shoot(page, file);
      shots.push({ viewport: viewport.name, route: "/", ...result });
      if (result.overflow) failures.push({ viewport: viewport.name, route: "/", ...result });
      await page.goto(`${base}/start`, { waitUntil: "networkidle" });
      const startFile = path.join(outDir, `${viewport.name}-onboarding.png`);
      const startResult = await shoot(page, startFile);
      shots.push({ viewport: viewport.name, route: "/start", ...startResult });
      if (startResult.overflow) failures.push({ viewport: viewport.name, route: "/start", ...startResult });
      await onboard.close();

      const ready = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });
      await ready.addCookies([{ name: "yaosheng-ready", value: "1", url: base }]);
      await ready.addInitScript(seedScript);
      for (const route of routes) {
        const routed = await ready.newPage();
        await routed.goto(`${base}${route.path}`, { waitUntil: "networkidle" });
        const shot = path.join(outDir, `${viewport.name}-${route.name}.png`);
        const checked = await shoot(routed, shot);
        shots.push({ viewport: viewport.name, route: route.path, ...checked });
        if (checked.overflow) failures.push({ viewport: viewport.name, route: route.path, ...checked });
        await routed.close();
      }
      await ready.close();
    }

    const dark = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      colorScheme: "dark",
    });
    await dark.addCookies([{ name: "yaosheng-ready", value: "1", url: base }]);
    await dark.addInitScript(seedScript);
    for (const route of routes) {
      const page = await dark.newPage();
      await page.goto(`${base}${route.path}`, { waitUntil: "networkidle" });
      const shot = path.join(outDir, `dark-390x844-${route.name}.png`);
      const checked = await shoot(page, shot);
      shots.push({ viewport: "dark-390x844", route: route.path, ...checked });
      if (checked.overflow) failures.push({ viewport: "dark-390x844", route: route.path, ...checked });
      await page.close();
    }
    await dark.close();

    const printContext = await browser.newContext({
      viewport: { width: 794, height: 1123 },
      deviceScaleFactor: 1,
    });
    await printContext.addCookies([{ name: "yaosheng-ready", value: "1", url: base }]);
    await printContext.addInitScript(seedScript);
    const printPage = await printContext.newPage();
    await printPage.goto(`${base}/family/print`, { waitUntil: "networkidle" });
    await printPage.emulateMedia({ media: "print" });
    await printPage.waitForSelector("h1");
    const printFile = path.join(outDir, "print-a4.png");
    await printPage.screenshot({ path: printFile, fullPage: true });
    shots.push({ viewport: "A4", route: "/family/print", file: printFile, overflow: false });
    for (const extra of [
      { path: "/visit/print", name: "visit-print-a4" },
      { path: "/emergency/print", name: "emergency-print-a4" },
    ]) {
      const page = await printContext.newPage();
      await page.goto(`${base}${extra.path}`, { waitUntil: "networkidle" });
      await page.emulateMedia({ media: "print" });
      await page.waitForSelector("h1");
      const file = path.join(outDir, `${extra.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      shots.push({ viewport: "A4", route: extra.path, file, overflow: false });
      await page.close();
    }
    await printContext.close();

    const flow = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await flow.addCookies([{ name: "yaosheng-ready", value: "1", url: base }]);
    await flow.addInitScript(seedScript);
    const talk = await flow.newPage();
    await talk.goto(`${base}/talk`, { waitUntil: "networkidle" });
    await talk.getByRole("button", { name: "Nenek muntah hari ini." }).click();
    await talk.getByRole("heading", { name: "阿嬤今天吐了。" }).waitFor();
    const talkFile = path.join(outDir, "390x844-talk-card.png");
    const talkShot = await shoot(talk, talkFile);
    shots.push({ viewport: "390x844", route: "/talk#card", ...talkShot });
    if (talkShot.overflow) failures.push({ viewport: "390x844", route: "/talk#card", ...talkShot });

    const reportPage = await flow.newPage();
    await reportPage.goto(`${base}/report`, { waitUntil: "networkidle" });
    await reportPage.getByRole("button", { name: "Jatuh" }).click();
    await reportPage.getByRole("button", { name: "Simpan catatan ini" }).click();
    await reportPage.getByText("Jatuh").nth(1).waitFor();
    const reportFile = path.join(outDir, "390x844-report-saved.png");
    const reportShot = await shoot(reportPage, reportFile);
    shots.push({ viewport: "390x844", route: "/report#saved", ...reportShot });
    if (reportShot.overflow) failures.push({ viewport: "390x844", route: "/report#saved", ...reportShot });

    const family = await flow.newPage();
    await family.goto(`${base}/family`, { waitUntil: "networkidle" });
    await family.getByRole("button", { name: "做出分享連結" }).click();
    const link = family.locator("p", { hasText: "/family/shared#" });
    await link.waitFor({ timeout: 15000 });
    const href = (await link.innerText()).trim();
    const shared = await flow.newPage();
    await shared.goto(href, { waitUntil: "networkidle" });
    await shared.getByText("林秀英").waitFor();
    const sharedFile = path.join(outDir, "390x844-family-shared-open.png");
    const sharedShot = await shoot(shared, sharedFile);
    shots.push({ viewport: "390x844", route: "/family/shared#open", ...sharedShot });
    if (sharedShot.overflow) failures.push({ viewport: "390x844", route: "/family/shared#open", ...sharedShot });
    await flow.close();
  } finally {
    await browser.close();
    if (server?.pid) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {
        server.kill("SIGTERM");
      }
    }
  }

  const report = {
    screenshots: shots.map((shot) => shot.file),
    failures: failures.map((failure) => ({
      viewport: failure.viewport,
      route: failure.route,
      scrollWidth: failure.scrollWidth,
      clientWidth: failure.clientWidth,
      offenders: failure.offenders,
    })),
  };
  await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  if (failures.length) {
    console.error(JSON.stringify(report.failures, null, 2));
    process.exit(1);
  }
  console.log(`saved ${shots.length} screenshots to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
