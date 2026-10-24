import type { Lang } from "./types";

export const LINE_DOSE: Record<Lang, string> = {
  zh: "該吃藥了",
  id: "Waktunya minum obat",
  vi: "Đã đến giờ uống thuốc",
  fil: "Oras na para inumin ang gamot",
  th: "ถึงเวลาทานยาแล้ว",
  en: "It is time for the medicine",
};

export const LINE_TAKEN: Record<Lang, string> = {
  zh: "已餵藥",
  id: "Sudah diberi",
  vi: "Đã cho uống",
  fil: "Nabigyan na",
  th: "ให้ยาแล้ว",
  en: "Given",
};

export const LINE_SKIP: Record<Lang, string> = {
  zh: "略過",
  id: "Lewati",
  vi: "Bỏ qua",
  fil: "Laktawan",
  th: "ข้าม",
  en: "Skip",
};

const MISSED: Record<Lang, string> = {
  zh: "有一次服藥還沒記錄。請打開藥聲查看。",
  id: "Ada jadwal obat yang belum tercatat. Buka YaoSheng untuk melihatnya.",
  vi: "Có một lần uống thuốc chưa được ghi. Hãy mở YaoSheng để xem.",
  fil: "May isang inuman na hindi pa naitala. Buksan ang YaoSheng para tingnan.",
  th: "มียาหนึ่งครั้งที่ยังไม่ได้บันทึก เปิดยาเสียงเพื่อดู",
  en: "One scheduled dose is not recorded yet. Open YaoSheng to see it.",
};

const DIGEST_TITLE: Record<Lang, string> = {
  zh: "今天的用藥紀錄",
  id: "Catatan obat hari ini",
  vi: "Nhật ký thuốc hôm nay",
  fil: "Tala ng gamot ngayon",
  th: "บันทึกยาวันนี้",
  en: "Today's medicine record",
};

const REFILL: Record<Lang, string> = {
  zh: "有藥快用完，或連續處方箋、回診的日子接近了。請打開藥聲查看。",
  id: "Ada obat yang akan habis, atau jadwal tebus resep dan kontrol sudah dekat. Buka YaoSheng.",
  vi: "Có thuốc sắp hết, hoặc lịch lãnh toa dài hạn và tái khám đã gần. Hãy mở YaoSheng.",
  fil: "May gamot na malapit nang maubos, o malapit na ang reseta at ang balik-doktor. Buksan ang YaoSheng.",
  th: "มียาใกล้หมด หรือใกล้ถึงวันรับยาต่อเนื่องและวันนัด เปิดยาเสียงเพื่อดู",
  en: "A supply is running low, or a refill or visit date is near. Open YaoSheng.",
};

const FALL: Record<Lang, string> = {
  zh: "今天有一筆跌倒紀錄。請打開藥聲查看。",
  id: "Ada catatan jatuh hari ini. Buka YaoSheng untuk melihatnya.",
  vi: "Hôm nay có một ghi chép về việc bị ngã. Hãy mở YaoSheng.",
  fil: "May tala ng pagkahulog ngayon. Buksan ang YaoSheng.",
  th: "วันนี้มีบันทึกการล้ม เปิดยาเสียงเพื่อดู",
  en: "A fall was recorded today. Open YaoSheng to see it.",
};

const DUPLICATE: Record<Lang, string> = {
  zh: "藥櫃裡有重複成分的標記。請打開藥聲查看。",
  id: "Ada tanda kandungan yang sama di lemari obat. Buka YaoSheng.",
  vi: "Tủ thuốc có đánh dấu thành phần trùng. Hãy mở YaoSheng.",
  fil: "May marka ng magkaparehong sangkap sa kabinet. Buksan ang YaoSheng.",
  th: "ในตู้ยามีเครื่องหมายส่วนประกอบซ้ำ เปิดยาเสียงเพื่อดู",
  en: "The cabinet has a duplicate-ingredient flag. Open YaoSheng.",
};

export const LINE_DISCLAIMER: Record<Lang, string> = {
  zh: "請詢問醫師或藥師。藥聲不是醫療建議。",
  id: "Tanyakan kepada dokter atau apoteker. YaoSheng bukan saran medis.",
  vi: "Hãy hỏi bác sĩ hoặc dược sĩ. YaoSheng không phải lời khuyên y tế.",
  fil: "Magtanong sa doktor o parmasyutiko. Hindi payo medikal ang YaoSheng.",
  th: "โปรดถามแพทย์หรือเภสัชกร ยาเสียงไม่ใช่คำแนะนำทางการแพทย์",
  en: "Ask a doctor or pharmacist. YaoSheng is not medical advice.",
};

const FORWARD: Record<Lang, string> = {
  zh: "轉給家屬",
  id: "Kirim ke keluarga",
  vi: "Gửi cho gia đình",
  fil: "Ipadala sa pamilya",
  th: "ส่งให้ครอบครัว",
  en: "Send to family",
};

const READ: Record<Lang, string> = {
  zh: "朗讀",
  id: "Bacakan",
  vi: "Đọc to",
  fil: "Basahin",
  th: "อ่านออกเสียง",
  en: "Read aloud",
};

const ADD: Record<Lang, string> = {
  zh: "加入藥櫃",
  id: "Masukkan ke lemari",
  vi: "Thêm vào tủ thuốc",
  fil: "Idagdag sa kabinet",
  th: "ใส่ในตู้ยา",
  en: "Add to the cabinet",
};

const RECORDED: Record<Lang, string> = {
  zh: "已記下。請打開藥聲查看。",
  id: "Sudah dicatat. Buka YaoSheng untuk melihatnya.",
  vi: "Đã ghi lại. Hãy mở YaoSheng để xem.",
  fil: "Naitala na. Buksan ang YaoSheng.",
  th: "บันทึกแล้ว เปิดยาเสียงเพื่อดู",
  en: "Recorded. Open YaoSheng to see it.",
};

export function doseAlt(lang: Lang): string {
  return LINE_DOSE[lang];
}

export function recordedText(lang: Lang): string {
  return `${RECORDED[lang]} ${LINE_DISCLAIMER[lang]}`;
}

export type FlexButton = { label: string; data?: string; uri?: string };

export type LineFlex = {
  type: "flex";
  altText: string;
  contents: {
    type: "bubble";
    body: { type: "box"; layout: "vertical"; contents: unknown[] };
  };
  quickReply?: { items: { type: "action"; action: Record<string, string> }[] };
};

function text(value: string, weight?: "bold", size?: "sm" | "md") {
  return { type: "text", text: value.slice(0, 500), weight: weight ?? "regular", size: size ?? "md", wrap: true };
}

function postback(label: string, data: string) {
  return { type: "postback" as const, label: label.slice(0, 20), data: data.slice(0, 300), displayText: label.slice(0, 20) };
}

export function doseFlex(input: { lang: Lang; time: string; dataTaken: string; dataSkip: string; detail?: string }): LineFlex {
  const title = doseAlt(input.lang);
  const lines = [text(title, "bold"), text(input.time, undefined, "sm")];
  if (input.detail) lines.push(text(input.detail));
  lines.push(text(LINE_DISCLAIMER[input.lang], undefined, "sm"));
  const taken = LINE_TAKEN[input.lang];
  const skip = LINE_SKIP[input.lang];
  return {
    type: "flex",
    altText: title,
    contents: { type: "bubble", body: { type: "box", layout: "vertical", contents: lines } },
    quickReply: {
      items: [
        { type: "action", action: postback(taken, input.dataTaken) },
        { type: "action", action: postback(skip, input.dataSkip) },
      ],
    },
  };
}

export function noticeFlex(lang: Lang, body: string, detail?: string): LineFlex {
  const lines = [text(body, "bold")];
  if (detail) lines.push(text(detail));
  lines.push(text(LINE_DISCLAIMER[lang], undefined, "sm"));
  return { type: "flex", altText: body.slice(0, 400), contents: { type: "bubble", body: { type: "box", layout: "vertical", contents: lines } } };
}

export function missedText(lang: Lang): string {
  return MISSED[lang];
}

export function digestTitle(lang: Lang): string {
  return DIGEST_TITLE[lang];
}

export function digestBody(lang: Lang, taken: number, scheduled: number, observations: number, supplyDays: number | null): string {
  const supply = supplyDays === null ? "" : ` ${supplyDays}`;
  if (lang === "zh") return `已記錄 ${taken}/${scheduled}。觀察 ${observations} 筆。剩餘約${supply || " —"}天。請打開藥聲查看。`;
  if (lang === "id") return `Tercatat ${taken}/${scheduled}. Pengamatan ${observations}. Sisa sekitar${supply || " —"} hari.`;
  if (lang === "vi") return `Đã ghi ${taken}/${scheduled}. Quan sát ${observations}. Còn khoảng${supply || " —"} ngày.`;
  if (lang === "fil") return `Naitala ${taken}/${scheduled}. Obserbasyon ${observations}. May natitira na mga${supply || " —"} araw.`;
  if (lang === "th") return `บันทึกแล้ว ${taken}/${scheduled} การสังเกต ${observations} เหลือประมาณ${supply || " —"} วัน`;
  return `Recorded ${taken}/${scheduled}. Observations ${observations}. About${supply || " —"} days of supply left.`;
}

export function refillText(lang: Lang): string {
  return REFILL[lang];
}

export function fallText(lang: Lang): string {
  return FALL[lang];
}

export function duplicateText(lang: Lang): string {
  return DUPLICATE[lang];
}

export function forwardLabel(lang: Lang): string {
  return FORWARD[lang];
}

export function readLabel(lang: Lang): string {
  return READ[lang];
}

export function addLabel(lang: Lang): string {
  return ADD[lang];
}

export function photoFlex(input: { lang: Lang; body: string; readUri?: string; addUri?: string }): LineFlex {
  const lines = [text(input.body), text(LINE_DISCLAIMER[input.lang], undefined, "sm")];
  const buttons: unknown[] = [];
  if (input.readUri) buttons.push({ type: "button", action: { type: "uri", label: readLabel(input.lang).slice(0, 20), uri: input.readUri } });
  if (input.addUri) buttons.push({ type: "button", action: { type: "uri", label: addLabel(input.lang).slice(0, 20), uri: input.addUri } });
  return {
    type: "flex",
    altText: input.body.slice(0, 400),
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: buttons.length ? [...lines, { type: "box", layout: "vertical", contents: buttons }] : lines,
      },
    },
  };
}

export function translateFlex(input: { lang: Lang; body: string; forwardData?: string }): LineFlex {
  const lines = [text(input.body), text(LINE_DISCLAIMER[input.lang], undefined, "sm")];
  const quick = input.forwardData
    ? { items: [{ type: "action" as const, action: postback(forwardLabel(input.lang), input.forwardData) }] }
    : undefined;
  return {
    type: "flex",
    altText: input.body.slice(0, 400),
    contents: { type: "bubble", body: { type: "box", layout: "vertical", contents: lines } },
    ...(quick ? { quickReply: quick } : {}),
  };
}

export type PreviewCard = { title: string; lines: string[]; buttons: string[] };

/** HTML mock of a Flex bubble. The screenshot page renders this, not a live LINE chat. */
export function previewCards(lang: Lang): PreviewCard[] {
  const dose = doseFlex({ lang, time: "08:00", dataTaken: "a=taken", dataSkip: "a=skip", detail: undefined });
  return [
    { title: dose.altText, lines: [LINE_DOSE[lang], "08:00", LINE_DISCLAIMER[lang]], buttons: [LINE_TAKEN[lang], LINE_SKIP[lang]] },
    { title: missedText(lang), lines: [missedText(lang), LINE_DISCLAIMER[lang]], buttons: [] },
    {
      title: digestTitle(lang),
      lines: [digestTitle(lang), digestBody(lang, 2, 4, 1, 6), LINE_DISCLAIMER[lang]],
      buttons: [],
    },
  ];
}
