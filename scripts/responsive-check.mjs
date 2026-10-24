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
  { path: "/", name: "home" },
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
];

function seedScript() {
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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
    ],
    logs: [
      {
        drugId: "drug-long",
        date: day,
        slot: "morning_after",
        status: "given",
        at: now.toISOString(),
      },
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
    notified: [],
  };
  localStorage.setItem("yaosheng.v1", JSON.stringify(data));
}

async function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
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
      const file = path.join(outDir, `${viewport.name}-onboarding.png`);
      const result = await shoot(page, file);
      shots.push({ viewport: viewport.name, route: "/onboarding", ...result });
      if (result.overflow) failures.push({ viewport: viewport.name, route: "/onboarding", ...result });
      await onboard.close();

      const ready = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });
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
    await printContext.addInitScript(seedScript);
    const printPage = await printContext.newPage();
    await printPage.goto(`${base}/family/print`, { waitUntil: "networkidle" });
    await printPage.emulateMedia({ media: "print" });
    await printPage.waitForSelector("h1");
    const printFile = path.join(outDir, "print-a4.png");
    await printPage.screenshot({ path: printFile, fullPage: true });
    shots.push({ viewport: "A4", route: "/family/print", file: printFile, overflow: false });
    await printContext.close();
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
