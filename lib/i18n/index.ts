import type { Lang } from "../types";
import type { Slot } from "../slots";
import { en } from "./en";
import { fil } from "./fil";
import { id } from "./id";
import { th } from "./th";
import { vi } from "./vi";
import { zh, type UiPack } from "./zh";

export const ui: Record<Lang, UiPack> = { zh, id, vi, fil, th, en };

export const LANG_OPTIONS: { id: Lang; native: string; zh: string; flag: string }[] = [
  { id: "id", native: "Bahasa Indonesia", zh: "印尼語", flag: "🇮🇩" },
  { id: "vi", native: "Tiếng Việt", zh: "越南語", flag: "🇻🇳" },
  { id: "fil", native: "Filipino", zh: "菲律賓語", flag: "🇵🇭" },
  { id: "th", native: "ภาษาไทย", zh: "泰語", flag: "🇹🇭" },
  { id: "en", native: "English", zh: "英語", flag: "🇬🇧" },
  { id: "zh", native: "中文", zh: "中文", flag: "🇹🇼" },
];

export const slotLabel: Record<Lang, Record<Slot, string>> = {
  zh: {
    morning_before: "早餐前",
    morning: "早上",
    morning_after: "早餐後",
    noon_before: "午餐前",
    noon: "中午",
    noon_after: "午餐後",
    evening_before: "晚餐前",
    evening: "晚上",
    evening_after: "晚餐後",
    bedtime: "睡前",
  },
  id: {
    morning_before: "Sebelum sarapan",
    morning: "Pagi",
    morning_after: "Setelah sarapan",
    noon_before: "Sebelum makan siang",
    noon: "Siang",
    noon_after: "Setelah makan siang",
    evening_before: "Sebelum makan malam",
    evening: "Malam",
    evening_after: "Setelah makan malam",
    bedtime: "Sebelum tidur",
  },
  vi: {
    morning_before: "Trước bữa sáng",
    morning: "Buổi sáng",
    morning_after: "Sau bữa sáng",
    noon_before: "Trước bữa trưa",
    noon: "Buổi trưa",
    noon_after: "Sau bữa trưa",
    evening_before: "Trước bữa tối",
    evening: "Buổi tối",
    evening_after: "Sau bữa tối",
    bedtime: "Trước khi ngủ",
  },
  fil: {
    morning_before: "Bago ang almusal",
    morning: "Umaga",
    morning_after: "Pagkatapos ng almusal",
    noon_before: "Bago ang tanghalian",
    noon: "Tanghali",
    noon_after: "Pagkatapos ng tanghalian",
    evening_before: "Bago ang hapunan",
    evening: "Gabi",
    evening_after: "Pagkatapos ng hapunan",
    bedtime: "Bago matulog",
  },
  th: {
    morning_before: "ก่อนอาหารเช้า",
    morning: "ตอนเช้า",
    morning_after: "หลังอาหารเช้า",
    noon_before: "ก่อนอาหารกลางวัน",
    noon: "ตอนเที่ยง",
    noon_after: "หลังอาหารกลางวัน",
    evening_before: "ก่อนอาหารเย็น",
    evening: "ตอนเย็น",
    evening_after: "หลังอาหารเย็น",
    bedtime: "ก่อนนอน",
  },
  en: {
    morning_before: "Before breakfast",
    morning: "Morning",
    morning_after: "After breakfast",
    noon_before: "Before lunch",
    noon: "Noon",
    noon_after: "After lunch",
    evening_before: "Before dinner",
    evening: "Evening",
    evening_after: "After dinner",
    bedtime: "Bedtime",
  },
};

export const REPLY_TEXT: Record<"thanks" | "tonight" | "watch" | "pharmacist", keyof UiPack> = {
  thanks: "replyThanks",
  tonight: "replyTonight",
  watch: "replyWatch",
  pharmacist: "replyPharmacist",
};

export const OBS_TEXT: Record<
  "dizzy" | "nausea" | "stomach" | "rash" | "bleeding" | "drowsy",
  keyof UiPack
> = {
  dizzy: "obsDizzy",
  nausea: "obsNausea",
  stomach: "obsStomach",
  rash: "obsRash",
  bleeding: "obsBleeding",
  drowsy: "obsDrowsy",
};
