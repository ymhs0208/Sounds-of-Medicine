import type { Bag, DrugText, Lang } from "./types";
import type { Slot } from "./slots";

export const DEMO_ORDER = ["cathay", "tpech", "femh", "daan"] as const;
export type DemoKey = (typeof DEMO_ORDER)[number];

export function isDemoKey(value: string): value is DemoKey {
  return (DEMO_ORDER as readonly string[]).includes(value);
}

type L4 = Exclude<Lang, "zh">;

const text = (
  id: DrugText,
  vi: DrugText,
  fil: DrugText,
  th: DrugText,
): Record<L4, DrugText> => ({ id, vi, fil, th });

const dose5 = {
  id: { dose: "1 tablet setiap kali (5 mg)" },
  vi: { dose: "Mỗi lần 1 viên (5 mg)" },
  fil: { dose: "1 tableta kada inumin (5 mg)" },
  th: { dose: "ครั้งละ 1 เม็ด (5 มก.)" },
};

const qty28 = {
  id: "28 tablet",
  vi: "28 viên",
  fil: "28 tableta",
  th: "28 เม็ด",
};

const qty56 = {
  id: "56 tablet",
  vi: "56 viên",
  fil: "56 tableta",
  th: "56 เม็ด",
};

const dizzy = {
  id: "Bisa terasa pusing. Berdiri perlahan.",
  vi: "Có thể chóng mặt. Hãy đứng dậy từ từ.",
  fil: "Maaaring mahilo. Tumayo nang dahan-dahan.",
  th: "อาจเวียนศีรษะ โปรดลุกขึ้นอย่างช้าๆ",
};

const noStop = {
  id: "Jangan berhenti minum obat sendiri.",
  vi: "Không tự ý ngừng thuốc.",
  fil: "Huwag itigil ang gamot nang mag-isa.",
  th: "อย่าหยุดยาเอง",
};

function drug(input: {
  id: string;
  nameZh: string;
  ingredient: string;
  doseZh: string;
  quantityZh: string;
  usageZh: string;
  indicationZh: string;
  warningsZh: string[];
  slots: Slot[];
  i18n: Record<L4, DrugText>;
}): Bag["drugs"][number] {
  return input;
}

const CATHAY_DRUG = drug({
  id: "demo-cathay-1",
  nameZh: "脈優錠 5 毫克",
  ingredient: "Amlodipine",
  doseZh: "每次 1 錠（5 毫克）",
  quantityZh: "28 錠",
  usageZh: "每日一次，早餐後",
  indicationZh: "降血壓",
  warningsZh: ["可能感到頭暈，起身時請放慢", "請勿自行停藥"],
  slots: ["morning_after"],
  i18n: text(
    {
      name: "Amlodipine 5 mg (nama di kemasan: 脈優錠)",
      dose: dose5.id.dose,
      quantity: qty28.id,
      usage: "Sehari sekali, setelah sarapan",
      indication: "Menurunkan tekanan darah",
      warnings: [dizzy.id, noStop.id],
    },
    {
      name: "Amlodipine 5 mg (tên trên túi: 脈優錠)",
      dose: dose5.vi.dose,
      quantity: qty28.vi,
      usage: "Mỗi ngày một lần, sau bữa sáng",
      indication: "Hạ huyết áp",
      warnings: [dizzy.vi, noStop.vi],
    },
    {
      name: "Amlodipine 5 mg (pangalan sa supot: 脈優錠)",
      dose: dose5.fil.dose,
      quantity: qty28.fil,
      usage: "Isang beses sa isang araw, pagkatapos ng almusal",
      indication: "Pampababa ng presyon ng dugo",
      warnings: [dizzy.fil, noStop.fil],
    },
    {
      name: "Amlodipine 5 มก. (ชื่อบนซอง: 脈優錠)",
      dose: dose5.th.dose,
      quantity: qty28.th,
      usage: "วันละ 1 ครั้ง หลังอาหารเช้า",
      indication: "ลดความดันโลหิต",
      warnings: [dizzy.th, noStop.th],
    },
  ),
});

const TPECH_DRUG = drug({
  id: "demo-tpech-1",
  nameZh: "格華止膜衣錠 500 毫克",
  ingredient: "Metformin",
  doseZh: "每次 1 錠（500 毫克）",
  quantityZh: "56 錠",
  usageZh: "每日兩次，早餐後與晚餐後",
  indicationZh: "降血糖",
  warningsZh: ["可能有腸胃不適", "請依照藥袋上的時間服用"],
  slots: ["morning_after", "evening_after"],
  i18n: text(
    {
      name: "Metformin 500 mg (nama di kemasan: 格華止)",
      dose: "1 tablet setiap kali (500 mg)",
      quantity: qty56.id,
      usage: "Dua kali sehari, setelah sarapan dan setelah makan malam",
      indication: "Menurunkan gula darah",
      warnings: [
        "Bisa perut tidak nyaman.",
        "Minum sesuai waktu yang tertulis di kemasan.",
      ],
    },
    {
      name: "Metformin 500 mg (tên trên túi: 格華止)",
      dose: "Mỗi lần 1 viên (500 mg)",
      quantity: qty56.vi,
      usage: "Mỗi ngày hai lần, sau bữa sáng và sau bữa tối",
      indication: "Hạ đường huyết",
      warnings: ["Có thể khó chịu dạ dày.", "Uống đúng thời gian ghi trên túi thuốc."],
    },
    {
      name: "Metformin 500 mg (pangalan sa supot: 格華止)",
      dose: "1 tableta kada inumin (500 mg)",
      quantity: qty56.fil,
      usage: "Dalawang beses sa isang araw, pagkatapos ng almusal at hapunan",
      indication: "Pampababa ng asukal sa dugo",
      warnings: [
        "Maaaring sumama ang tiyan.",
        "Inumin ayon sa oras na nakasulat sa supot.",
      ],
    },
    {
      name: "Metformin 500 มก. (ชื่อบนซอง: 格華止)",
      dose: "ครั้งละ 1 เม็ด (500 มก.)",
      quantity: qty56.th,
      usage: "วันละ 2 ครั้ง หลังอาหารเช้าและหลังอาหารเย็น",
      indication: "ลดน้ำตาลในเลือด",
      warnings: ["อาจท้องไม่สบาย", "ให้กินตามเวลาที่เขียนบนซองยา"],
    },
  ),
});

const FEMH_DRUG = drug({
  id: "demo-femh-1",
  nameZh: "艾必克膜衣錠 5 毫克",
  ingredient: "Apixaban",
  doseZh: "每次 1 錠（5 毫克）",
  quantityZh: "56 錠",
  usageZh: "每日兩次，早上與晚上各一次",
  indicationZh: "抗凝血",
  warningsZh: [
    "藥袋註記：有出血風險",
    "若有黑便、異常出血或瘀青，請依藥袋警語回診",
    "請勿自行調整劑量",
  ],
  slots: ["morning", "evening"],
  i18n: text(
    {
      name: "Apixaban 5 mg (nama di kemasan: 艾必克)",
      dose: dose5.id.dose,
      quantity: qty56.id,
      usage: "Dua kali sehari, pagi dan malam masing-masing satu kali",
      indication: "Antikoagulan",
      warnings: [
        "Kemasan mencantumkan risiko perdarahan.",
        "Jika tinja hitam, perdarahan, atau memar yang tidak biasa, ikuti peringatan pada kemasan dan kontrol kembali.",
        "Jangan mengubah dosis sendiri.",
      ],
    },
    {
      name: "Apixaban 5 mg (tên trên túi: 艾必克)",
      dose: dose5.vi.dose,
      quantity: qty56.vi,
      usage: "Mỗi ngày hai lần, sáng và tối mỗi buổi một lần",
      indication: "Chống đông máu",
      warnings: [
        "Túi thuốc ghi: có nguy cơ chảy máu.",
        "Nếu phân đen, chảy máu hoặc bầm tím bất thường, hãy làm theo cảnh báo trên túi và đi tái khám.",
        "Không tự ý đổi liều.",
      ],
    },
    {
      name: "Apixaban 5 mg (pangalan sa supot: 艾必克)",
      dose: dose5.fil.dose,
      quantity: qty56.fil,
      usage: "Dalawang beses sa isang araw, isa sa umaga at isa sa gabi",
      indication: "Pang-iwas sa pamumuo ng dugo",
      warnings: [
        "Nakasaad sa supot: may panganib ng pagdurugo.",
        "Kung itim ang dumi, may di-pangkaraniwang pagdurugo o pasa, sundin ang babala sa supot at magpabalik-konsulta.",
        "Huwag baguhin ang dosis nang mag-isa.",
      ],
    },
    {
      name: "Apixaban 5 มก. (ชื่อบนซอง: 艾必克)",
      dose: dose5.th.dose,
      quantity: qty56.th,
      usage: "วันละ 2 ครั้ง เช้าและเย็นอย่างละครั้ง",
      indication: "ป้องกันเลือดแข็งตัว",
      warnings: [
        "บนซองระบุว่ามีความเสี่ยงเลือดออก",
        "หากอุจจาระสีดำ เลือดออกหรือฟกช้ำผิดปกติ ให้ทำตามคำเตือนบนซองและกลับไปตรวจ",
        "อย่าปรับขนาดยาเอง",
      ],
    },
  ),
});

const DAAN_DRUG = drug({
  id: "demo-daan-1",
  nameZh: "安脈優錠 5 毫克",
  ingredient: "Amlodipine",
  doseZh: "每次 1 錠（5 毫克）",
  quantityZh: "28 錠",
  usageZh: "每日一次，早餐後",
  indicationZh: "降血壓",
  warningsZh: ["可能感到頭暈，起身時請放慢"],
  slots: ["morning_after"],
  i18n: text(
    {
      name: "Amlodipine 5 mg (nama di kemasan: 安脈優錠)",
      dose: dose5.id.dose,
      quantity: qty28.id,
      usage: "Sehari sekali, setelah sarapan",
      indication: "Menurunkan tekanan darah",
      warnings: [dizzy.id],
    },
    {
      name: "Amlodipine 5 mg (tên trên túi: 安脈優錠)",
      dose: dose5.vi.dose,
      quantity: qty28.vi,
      usage: "Mỗi ngày một lần, sau bữa sáng",
      indication: "Hạ huyết áp",
      warnings: [dizzy.vi],
    },
    {
      name: "Amlodipine 5 mg (pangalan sa supot: 安脈優錠)",
      dose: dose5.fil.dose,
      quantity: qty28.fil,
      usage: "Isang beses sa isang araw, pagkatapos ng almusal",
      indication: "Pampababa ng presyon ng dugo",
      warnings: [dizzy.fil],
    },
    {
      name: "Amlodipine 5 มก. (ชื่อบนซอง: 安脈優錠)",
      dose: dose5.th.dose,
      quantity: qty28.th,
      usage: "วันละ 1 ครั้ง หลังอาหารเช้า",
      indication: "ลดความดันโลหิต",
      warnings: [dizzy.th],
    },
  ),
});

export const DEMO_CAPTION: Record<DemoKey, Record<Lang, string>> = {
  cathay: {
    zh: "降血壓 · 早餐後",
    id: "Obat tekanan darah · setelah sarapan",
    vi: "Thuốc huyết áp · sau bữa sáng",
    fil: "Gamot sa presyon · pagkatapos ng almusal",
    th: "ยาความดัน · หลังอาหารเช้า",
  },
  tpech: {
    zh: "降血糖 · 早晚飯後",
    id: "Obat gula darah · setelah makan pagi dan malam",
    vi: "Thuốc đường huyết · sau sáng và tối",
    fil: "Gamot sa asukal · pagkatapos ng almusal at hapunan",
    th: "ยาเบาหวาน · หลังอาหารเช้าและเย็น",
  },
  femh: {
    zh: "抗凝血 · 早晚各一次",
    id: "Antikoagulan · pagi dan malam",
    vi: "Chống đông · sáng và tối",
    fil: "Pang-iwas sa pamumuo · umaga at gabi",
    th: "ยาต้านการแข็งตัวของเลือด · เช้าและเย็น",
  },
  daan: {
    zh: "降血壓 · 另一家藥局",
    id: "Obat tekanan darah · apotek lain",
    vi: "Thuốc huyết áp · nhà thuốc khác",
    fil: "Gamot sa presyon · ibang botika",
    th: "ยาความดัน · อีกร้านยา",
  },
};

const CHART: Record<DemoKey, string> = {
  cathay: "GT-884213",
  tpech: "RA-552901",
  femh: "FE-330178",
  daan: "DA-1044",
};

export function demoChart(key: DemoKey): string {
  return CHART[key];
}

const BAGS: Record<DemoKey, Bag> = {
  cathay: {
    id: "demo-cathay",
    source: "demo",
    demoKey: "cathay",
    hospitalZh: "國泰綜合醫院",
    hospitalShort: "國泰",
    pharmacyZh: "藥劑部",
    patientZh: "林秀英",
    dispensingDate: "2026-10-18",
    dispensingLabel: "115年10月18日",
    theme: "#0f6e6e",
    drugs: [CATHAY_DRUG],
    createdAt: "2026-10-18T02:00:00.000Z",
  },
  tpech: {
    id: "demo-tpech",
    source: "demo",
    demoKey: "tpech",
    hospitalZh: "臺北市立聯合醫院仁愛院區",
    hospitalShort: "聯合仁愛",
    pharmacyZh: "藥劑科",
    patientZh: "林秀英",
    dispensingDate: "2026-10-20",
    dispensingLabel: "115年10月20日",
    theme: "#1d4e89",
    drugs: [TPECH_DRUG],
    createdAt: "2026-10-20T02:00:00.000Z",
  },
  femh: {
    id: "demo-femh",
    source: "demo",
    demoKey: "femh",
    hospitalZh: "亞東紀念醫院",
    hospitalShort: "亞東",
    pharmacyZh: "藥劑部",
    patientZh: "林秀英",
    dispensingDate: "2026-10-15",
    dispensingLabel: "115年10月15日",
    theme: "#5b3a8c",
    drugs: [FEMH_DRUG],
    createdAt: "2026-10-15T02:00:00.000Z",
  },
  daan: {
    id: "demo-daan",
    source: "demo",
    demoKey: "daan",
    hospitalZh: "大安健康藥局",
    hospitalShort: "大安藥局",
    pharmacyZh: "調劑櫃檯",
    patientZh: "林秀英",
    dispensingDate: "2026-10-22",
    dispensingLabel: "115年10月22日",
    theme: "#9a5b12",
    drugs: [DAAN_DRUG],
    createdAt: "2026-10-22T02:00:00.000Z",
  },
};

export function getDemoBag(key: DemoKey): Bag {
  return structuredClone(BAGS[key]);
}

export function allDemoBags(): Bag[] {
  return DEMO_ORDER.map((key) => getDemoBag(key));
}
