import assert from "node:assert/strict";
import test from "node:test";
import { DATA_VERSION, normalizeData } from "./backup";
import { openText, sealText } from "./at-rest";
import type { AppData } from "./types";

test("a version 1 save keeps its bags and gains the consent fields", () => {
  const saved = normalizeData({
    version: 1,
    onboarded: true,
    lang: "id",
    consentAt: "2026-01-01T00:00:00.000Z",
    patientName: "林秀英",
    familyContact: "0912",
    bags: [
      {
        id: "bag-1",
        source: "manual",
        hospitalZh: "臺大",
        hospitalShort: "臺大",
        pharmacyZh: "",
        patientZh: "林秀英",
        dispensingDate: "2026-01-01",
        dispensingLabel: "",
        theme: "#1b5e45",
        drugs: [],
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  } as AppData);
  assert.equal(saved.version, DATA_VERSION);
  assert.equal(saved.bags.length, 1);
  assert.equal(saved.bags[0].id, "bag-1");
  assert.equal(saved.patientName, "林秀英");
  assert.equal(saved.consentVersion, null);
  assert.equal(saved.onboarded, true);
});

test("a newer save is not downgraded or emptied", () => {
  const saved = normalizeData({
    version: 9,
    onboarded: true,
    lang: "vi",
    bags: [{ id: "keep", source: "manual", hospitalZh: "A", hospitalShort: "A", pharmacyZh: "", patientZh: "", dispensingDate: null, dispensingLabel: "", theme: "#000", drugs: [], createdAt: "" }],
  } as unknown as AppData);
  assert.equal(saved.version, 9);
  assert.equal(saved.bags[0].id, "keep");
});

test("local data round-trips through the device key", async () => {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const sealed = await sealText(key, JSON.stringify({ version: 2, patientName: "林秀英" }));
  assert.equal(sealed.startsWith("enc:v1:"), true);
  assert.equal(sealed.includes("林秀英"), false);
  assert.equal(JSON.parse(await openText(key, sealed)).patientName, "林秀英");
});
