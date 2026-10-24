import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DATA_VERSION, normalizeData } from "./backup";
import { APP_NAME, APP_TITLE } from "./brand";
import { partitionLabel } from "./display-name";
import type { AppData } from "./types";

test("a sentence in the name becomes a short title plus purpose and instructions", () => {
  const split = partitionLabel(
    "Amlodipine untuk tekanan darah tinggi yang harus diminum sesuai tulisan pada kemasan obat setiap hari tanpa jeda",
    "",
    "",
  );
  assert.equal(split.name, "Amlodipine");
  assert.match(split.indication, /tekanan darah tinggi/);
  assert.match(split.usage, /diminum/);
  assert.ok(split.name.length < 40);
});

test("an existing purpose is kept and the title still shortens", () => {
  const split = partitionLabel(
    "Amlodipine untuk tekanan darah tinggi yang harus diminum sesuai tulisan pada kemasan obat setiap hari tanpa jeda",
    "Tekanan darah tinggi",
    "Sehari sekali, setelah sarapan",
  );
  assert.equal(split.name, "Amlodipine");
  assert.equal(split.indication, "Tekanan darah tinggi");
  assert.equal(split.usage, "Sehari sekali, setelah sarapan");
});

test("saved cabinets migrate long names without dropping the bag", () => {
  const saved = normalizeData({
    version: 2,
    onboarded: true,
    lang: "id",
    bags: [
      {
        id: "bag-1",
        source: "manual",
        hospitalZh: "國泰",
        hospitalShort: "國泰",
        pharmacyZh: "",
        patientZh: "林",
        dispensingDate: null,
        dispensingLabel: "",
        theme: "#1b5e45",
        drugs: [
          {
            id: "d1",
            nameZh: "脈優錠用於降血壓每日一次飯後服用",
            ingredient: "Amlodipine",
            doseZh: "1",
            quantityZh: "28",
            usageZh: "",
            indicationZh: "",
            warningsZh: [],
            slots: ["morning_after"],
            i18n: {
              id: {
                name: "Amlodipine untuk tekanan darah tinggi yang harus diminum sesuai tulisan pada kemasan obat setiap hari tanpa jeda",
                dose: "1",
                quantity: "28",
                usage: "",
                indication: "",
                warnings: [],
              },
            },
          },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  } as unknown as AppData);
  assert.equal(saved.version, DATA_VERSION);
  assert.equal(saved.bags[0]?.drugs[0]?.nameZh.startsWith("脈優錠"), true);
  assert.match(saved.bags[0]?.drugs[0]?.indicationZh ?? "", /降血壓/);
  assert.match(saved.bags[0]?.drugs[0]?.usageZh ?? "", /飯後/);
  assert.equal(saved.bags[0]?.drugs[0]?.i18n.id?.name, "Amlodipine");
  assert.match(saved.bags[0]?.drugs[0]?.i18n.id?.indication ?? "", /tekanan/);
});

test("the install name matches the brand constants", () => {
  const manifest = JSON.parse(readFileSync(new URL("../public/manifest.json", import.meta.url), "utf8")) as { name: string; short_name: string };
  assert.equal(manifest.short_name, APP_NAME);
  assert.equal(manifest.name, APP_TITLE);
});
