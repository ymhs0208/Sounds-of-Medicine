import { isLang, type Lang } from "./types";

export type ApiErrorCode = "rate_limited" | "too_large" | "bad_origin" | "bad_image" | "bad_request" | "turnstile";

const copy: Record<Lang, Record<ApiErrorCode, string>> = {
  zh: {
    rate_limited: "這個動作太頻繁了，請稍後再試。",
    too_large: "檔案太大，請改拍近一點或縮小後再傳。",
    bad_origin: "這個請求不是從藥聲頁面發出的。",
    bad_image: "這張圖不是可用的 JPEG、PNG 或 WebP。",
    bad_request: "這筆資料無法處理。",
    turnstile: "請先完成頁面上的驗證，再試一次。",
  },
  id: {
    rate_limited: "Terlalu sering. Coba lagi sebentar lagi.",
    too_large: "Berkas terlalu besar. Foto lebih dekat atau perkecil, lalu kirim lagi.",
    bad_origin: "Permintaan ini tidak datang dari halaman YaoSheng.",
    bad_image: "Gambar ini bukan JPEG, PNG, atau WebP yang bisa dipakai.",
    bad_request: "Data ini tidak bisa diproses.",
    turnstile: "Selesaikan pemeriksaan di halaman, lalu coba lagi.",
  },
  vi: {
    rate_limited: "Thao tác quá nhiều. Hãy thử lại sau một lúc.",
    too_large: "Tệp quá lớn. Chụp gần hơn hoặc thu nhỏ rồi gửi lại.",
    bad_origin: "Yêu cầu này không đến từ trang YaoSheng.",
    bad_image: "Ảnh này không phải JPEG, PNG hoặc WebP dùng được.",
    bad_request: "Không xử lý được dữ liệu này.",
    turnstile: "Hãy hoàn tất bước kiểm tra trên trang, rồi thử lại.",
  },
  fil: {
    rate_limited: "Sobrang dalas. Subukan muli pagkalipas ng sandali.",
    too_large: "Masyadong malaki ang file. Kunan nang mas malapit o paliitin, tapos ipadala ulit.",
    bad_origin: "Hindi galing sa pahina ng YaoSheng ang hiling na ito.",
    bad_image: "Hindi magagamit na JPEG, PNG, o WebP ang larawang ito.",
    bad_request: "Hindi maproseso ang datos na ito.",
    turnstile: "Tapusin muna ang pagsusuri sa pahina, tapos subukan ulit.",
  },
  th: {
    rate_limited: "ทำบ่อยเกินไป โปรดลองอีกครั้งอีกสักครู่",
    too_large: "ไฟล์ใหญ่เกินไป โปรดถ่ายให้ใกล้ขึ้นหรือย่อแล้วส่งใหม่",
    bad_origin: "คำขอนี้ไม่ได้มาจากหน้ายาเสียง",
    bad_image: "รูปนี้ไม่ใช่ JPEG, PNG หรือ WebP ที่ใช้ได้",
    bad_request: "ข้อมูลนี้ประมวลผลไม่ได้",
    turnstile: "โปรดทำการยืนยันบนหน้านี้ก่อน แล้วลองอีกครั้ง",
  },
  en: {
    rate_limited: "That was too fast. Please wait and try again.",
    too_large: "That file is too large. Take a closer photo or a smaller one and send it again.",
    bad_origin: "This request did not come from a YaoSheng page.",
    bad_image: "This picture is not a JPEG, PNG, or WebP we can use.",
    bad_request: "This data could not be processed.",
    turnstile: "Finish the check on the page, then try again.",
  },
};

export function apiMessage(lang: Lang, code: ApiErrorCode): string {
  return copy[lang][code];
}

export function langFromRequest(request: Request, bodyLang?: string): Lang {
  const header = request.headers.get("x-yaosheng-lang") || "";
  if (bodyLang && isLang(bodyLang)) return bodyLang;
  if (isLang(header)) return header;
  const accept = request.headers.get("accept-language") || "";
  const lower = accept.toLowerCase();
  if (lower.includes("id")) return "id";
  if (lower.includes("vi")) return "vi";
  if (lower.includes("fil") || lower.includes("tl")) return "fil";
  if (lower.includes("th")) return "th";
  if (lower.includes("en")) return "en";
  return "zh";
}
