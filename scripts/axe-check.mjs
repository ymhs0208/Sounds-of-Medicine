import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const base = process.env.BASE_URL || "http://127.0.0.1:4321";
const outDir = process.env.SCREENSHOT_DIR || "/opt/cursor/artifacts";

const publicRoutes = ["/", "/start", "/privacy", "/terms", "/disclaimer"];
const appRoutes = ["/today", "/meds", "/meds/edit", "/scan", "/review", "/report", "/family", "/settings", "/talk", "/refill", "/visit", "/emergency"];

function seedScript() {
  const data = {
    version: 2,
    onboarded: true,
    lang: "zh",
    consentAt: new Date().toISOString(),
    consentVersion: "2026-10-24",
    lastExportAt: new Date().toISOString(),
    backupSnoozeUntil: null,
    patientName: "林秀英",
    familyContact: "家屬",
    allergies: "",
    allergiesZh: "",
    largeText: false,
    pictograms: true,
    bags: [],
    logs: [],
    reports: [],
    notified: [],
    symptoms: [],
    talks: [],
    refillNotified: [],
  };
  localStorage.setItem("yaosheng.v1", JSON.stringify(data));
  document.cookie = "yaosheng-ready=1; Path=/";
}

function waitForServer(url) {
  const deadline = Date.now() + 90000;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const response = await fetch(url);
        if (response.status < 500) {
          resolve();
          return;
        }
      } catch {
        /* still booting */
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

async function scan(page, route) {
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  await page.waitForSelector("h1, main p", { timeout: 15000 });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  return serious.map((item) => ({
    id: item.id,
    impact: item.impact,
    help: item.help,
    nodes: item.nodes.slice(0, 3).map((node) => node.target.join(" ")),
  }));
}

async function main() {
  await mkdir(outDir, { recursive: true });
  let server;
  if (!process.env.BASE_URL) {
    server = spawn("npm", ["start"], { cwd: root, stdio: "inherit", detached: true, env: process.env });
  }
  const failures = [];
  const browser = await chromium.launch();
  try {
    if (!process.env.BASE_URL) await waitForServer(`${base}/api/health`);
    const open = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await open.newPage();
    for (const route of publicRoutes) {
      const found = await scan(page, route);
      if (found.length) failures.push({ route, violations: found });
    }
    await open.close();

    const app = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await app.addCookies([{ name: "yaosheng-ready", value: "1", url: base }]);
    await app.addInitScript(seedScript);
    const appPage = await app.newPage();
    for (const route of appRoutes) {
      const found = await scan(appPage, route);
      if (found.length) failures.push({ route, violations: found });
    }
    await app.close();
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
  await writeFile(path.join(outDir, "axe-report.json"), JSON.stringify({ failures }, null, 2));
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }
  console.log("axe passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
