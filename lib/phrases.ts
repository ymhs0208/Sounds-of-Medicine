import type { Lang } from "./types";

export type PhraseId =
  | "vomit"
  | "finished"
  | "crush"
  | "dizzy"
  | "appetite"
  | "fall"
  | "showBag"
  | "callFamily"
  | "skipped"
  | "pain";

export type Phrase = {
  id: PhraseId;
  text: Record<Lang, string>;
};

/** Fixed sentences. The Chinese line is the question or report, never an answer. */
export const PHRASES: Phrase[] = [
  {
    id: "vomit",
    text: {
      zh: "阿嬤今天吐了。",
      id: "Nenek muntah hari ini.",
      vi: "Bà bị nôn hôm nay.",
      fil: "Nagsuka ang lola ngayong araw.",
      th: "คุณยายอาเจียนวันนี้",
      en: "Grandma vomited today.",
    },
  },
  {
    id: "finished",
    text: {
      zh: "這包藥吃完了。",
      id: "Obat di kemasan ini sudah habis.",
      vi: "Gói thuốc này đã uống hết.",
      fil: "Ubos na ang gamot sa supot na ito.",
      th: "ยาซองนี้หมดแล้ว",
      en: "This pack of medicine is finished.",
    },
  },
  {
    id: "crush",
    text: {
      zh: "這顆藥可以磨粉嗎？請藥師回答。",
      id: "Apakah tablet ini boleh digerus? Mohon apoteker yang menjawab.",
      vi: "Viên này có thể nghiền không? Xin dược sĩ trả lời.",
      fil: "Maaari bang durugin ang tabletang ito? Pakisagot ng parmasyutiko.",
      th: "ยานี้บดเป็นผงได้ไหม โปรดให้เภสัชกรตอบ",
      en: "Can this tablet be crushed? Please let the pharmacist answer.",
    },
  },
  {
    id: "dizzy",
    text: {
      zh: "今天有頭暈。",
      id: "Hari ini pusing.",
      vi: "Hôm nay bị chóng mặt.",
      fil: "Nahihilo ngayong araw.",
      th: "วันนี้เวียนหัว",
      en: "There was dizziness today.",
    },
  },
  {
    id: "appetite",
    text: {
      zh: "食慾不好。",
      id: "Nafsu makan kurang.",
      vi: "Ăn kém.",
      fil: "Mahina ang gana sa pagkain.",
      th: "ไม่อยากอาหาร",
      en: "Appetite is poor.",
    },
  },
  {
    id: "fall",
    text: {
      zh: "今天跌倒了。",
      id: "Hari ini jatuh.",
      vi: "Hôm nay bị ngã.",
      fil: "Nadalapa ngayong araw.",
      th: "วันนี้ล้ม",
      en: "There was a fall today.",
    },
  },
  {
    id: "showBag",
    text: {
      zh: "請看這包藥袋上的字。",
      id: "Mohon lihat tulisan di kemasan obat ini.",
      vi: "Xin xem chữ trên túi thuốc này.",
      fil: "Pakitingnan ang nakasulat sa supot ng gamot.",
      th: "โปรดดูตัวหนังสือบนซองยานี้",
      en: "Please look at the words on this medicine bag.",
    },
  },
  {
    id: "callFamily",
    text: {
      zh: "請聯絡家屬。",
      id: "Mohon hubungi keluarga.",
      vi: "Xin liên hệ gia đình.",
      fil: "Pakikontak ang pamilya.",
      th: "โปรดติดต่อครอบครัว",
      en: "Please contact the family.",
    },
  },
  {
    id: "skipped",
    text: {
      zh: "這個時間的藥沒有吃。",
      id: "Obat pada waktu ini tidak diminum.",
      vi: "Cữ thuốc này không uống.",
      fil: "Hindi nainom ang gamot sa oras na ito.",
      th: "ยาเวลานี้ไม่ได้กิน",
      en: "The dose at this time was not taken.",
    },
  },
  {
    id: "pain",
    text: {
      zh: "他說會痛。",
      id: "Beliau mengatakan sakit.",
      vi: "Người được chăm sóc nói là đau.",
      fil: "Sabi niya masakit.",
      th: "เขาบอกว่าปวด",
      en: "They said it hurts.",
    },
  },
];

export function phraseById(id: string): Phrase | undefined {
  return PHRASES.find((phrase) => phrase.id === id);
}
