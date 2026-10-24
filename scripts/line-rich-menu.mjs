import { readFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const liffId = process.env.LINE_LIFF_ID || "";
const token = process.env.LINE_MESSAGING_ACCESS_TOKEN || "";
const menu = JSON.parse(readFileSync(new URL("../line/rich-menu.json", import.meta.url), "utf8"));

if (liffId) {
  for (const area of menu.areas) {
    area.action.uri = area.action.uri.replace("LIFF_ID", liffId);
  }
}

const labels = [
  { text: "今日  Today", x: 80, y: 180 },
  { text: "拍藥袋  Scan", x: 80, y: 760 },
  { text: "溝通卡  Talk", x: 1330, y: 760 },
  { text: "家屬  Family", x: 80, y: 1320 },
  { text: "設定  Settings", x: 1330, y: 1320 },
];

const GLYPH = {
  A: "01110,10001,10001,11111,10001,10001,10001",
  C: "01110,10001,10000,10000,10000,10001,01110",
  D: "11110,10001,10001,10001,10001,10001,11110",
  E: "11111,10000,10000,11110,10000,10000,11111",
  F: "11111,10000,10000,11110,10000,10000,10000",
  G: "01110,10001,10000,10111,10001,10001,01110",
  I: "11111,00100,00100,00100,00100,00100,11111",
  K: "10001,10010,10100,11000,10100,10010,10001",
  L: "10000,10000,10000,10000,10000,10000,11111",
  M: "10001,11011,10101,10101,10001,10001,10001",
  N: "10001,11001,10101,10011,10001,10001,10001",
  S: "01111,10000,10000,01110,00001,00001,11110",
  T: "11111,00100,00100,00100,00100,00100,00100",
  Y: "10001,10001,01010,00100,00100,00100,00100",
  " ": "00000,00000,00000,00000,00000,00000,00000",
};

function stamp(raw, width, text, originX, originY, scale) {
  let cursor = originX;
  for (const char of text) {
    const rows = (GLYPH[char] || GLYPH[" "]).split(",");
    rows.forEach((bits, row) => {
      for (let col = 0; col < bits.length; col += 1) {
        if (bits[col] !== "1") continue;
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < scale; dx += 1) {
            const x = cursor + col * scale + dx;
            const y = originY + row * scale + dy;
            if (x < 0 || y < 0 || x >= width || y >= 1686) continue;
            const offset = y * (width * 4 + 1) + 1 + x * 4;
            raw[offset] = 255;
            raw[offset + 1] = 255;
            raw[offset + 2] = 255;
            raw[offset + 3] = 255;
          }
        }
      }
    });
    cursor += 6 * scale;
  }
}

function png(width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  const bands = [
    [0, 562, 0x1f, 0x6b, 0x4a],
    [562, 1124, 0x2f, 0x6f, 0x4e],
    [1124, 1686, 0x3d, 0x5a, 0x40],
  ];
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    const band = bands.find((item) => y >= item[0] && y < item[1]) || bands[0];
    const split = y >= 562;
    const left = Buffer.from([band[2], band[3], band[4], 255]);
    const right = Buffer.from([band[2] + 24, band[3], band[4], 255]);
    for (let x = 0; x < width; x += 1) raw.set(split && x >= width / 2 ? right : left, row + 1 + x * 4);
  }
  stamp(raw, width, "TODAY", 160, 180, 28);
  stamp(raw, width, "SCAN", 180, 760, 28);
  stamp(raw, width, "TALK", 1430, 760, 28);
  stamp(raw, width, "FAMILY", 120, 1280, 22);
  stamp(raw, width, "SETTINGS", 1320, 1280, 18);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, crc]);
}

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc;
}

const image = png(2500, 1686);
console.log(JSON.stringify({ menu, labels, bytes: image.length }, null, 2));

if (!token || !liffId) {
  console.log("Set LINE_LIFF_ID and LINE_MESSAGING_ACCESS_TOKEN to upload. Nothing was sent.");
  process.exit(0);
}

const created = await fetch("https://api.line.me/v2/bot/richmenu", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(menu),
});
if (!created.ok) {
  console.error(await created.text());
  process.exit(1);
}
const { richMenuId } = await created.json();
const uploaded = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/png" },
  body: image,
});
if (!uploaded.ok) {
  console.error(await uploaded.text());
  process.exit(1);
}
const bound = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});
if (!bound.ok) {
  console.error(await bound.text());
  process.exit(1);
}
console.log(richMenuId);
