import type { Lang } from "./types";

export type LegalKind = "privacy" | "terms" | "disclaimer";
export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDocument = { title: string; updated: string; sections: LegalSection[] };

const updated = "2026-10-24";

const zh: Record<LegalKind, LegalDocument> = {
  privacy: {
    title: "隱私權說明",
    updated,
    sections: [
      {
        heading: "誰負責",
        paragraphs: [
          "藥聲由【待填】提供。聯絡方式：【待填】。在正式上線前，請把這兩個位置換成營運者的名稱、地址與信箱。",
        ],
      },
      {
        heading: "處理哪些資料",
        paragraphs: [
          "您輸入的被照顧者姓名、家屬聯絡方式、過敏文字、藥袋上的文字、服藥紀錄、您打的觀察，以及您選擇的語言。這些是個人資料保護法所稱的個人資料。藥聲不用這些資料做行銷。",
        ],
      },
      {
        heading: "存在哪裡",
        paragraphs: [
          "藥袋、姓名、紀錄預設只存在這支裝置的瀏覽器。本機副本會用這支裝置的金鑰加密後再寫入，金鑰不離開裝置。您可以匯出 JSON，或在設定裡全部刪除。",
          "伺服器不保存藥名或姓名，除非您另外開啟下面寫到的選用功能。",
        ],
      },
      {
        heading: "照片與模型",
        paragraphs: [
          "只有在您按下辨識時，藥袋照片才會送到營運者設定的模型供應商（預設為 OpenAI）做轉錄與翻譯。照片不用來訓練本服務，也不會被拿來產生醫療建議。沒有金鑰時，辨識不會送出。",
        ],
      },
      {
        heading: "背景提醒",
        paragraphs: [
          "若您開啟背景提醒，伺服器只存一組裝置代號、推播位址、提醒的鐘點，以及通知要用的語言。不存藥名、劑量或姓名。您可以隨時在設定裡關閉。",
        ],
      },
      {
        heading: "家屬分享",
        paragraphs: [
          "分享連結的內容在您的裝置上加密。金鑰放在網址 # 後面，不會送到伺服器。若營運者另外開啟短連結，伺服器只暫存密文，最長 30 天。",
        ],
      },
      {
        heading: "保存與刪除",
        paragraphs: [
          "本機資料留到您刪除或清除瀏覽器資料為止。請定期匯出備份。您可以要求【待填】說明伺服器上是否還有推播或短連結資料，並要求刪除。",
        ],
      },
    ],
  },
  terms: {
    title: "使用條款",
    updated,
    sections: [
      {
        heading: "這項服務做什麼",
        paragraphs: [
          "藥聲翻譯、朗讀、整理並記錄藥袋上的文字，以及您自己輸入的字。它不是醫療服務，也不取代藥袋、醫師或藥師。",
        ],
      },
      {
        heading: "您的責任",
        paragraphs: [
          "請核對辨識結果。用藥請照藥袋，並詢問醫師或藥師。請只在已取得本人或家屬同意時輸入他人的資料。",
        ],
      },
      {
        heading: "服務可能中斷",
        paragraphs: [
          "辨識、翻譯與背景提醒依賴營運者設定的金鑰與雲端服務。沒有那些設定時，手打、本機紀錄與離線片語卡仍然可用。",
        ],
      },
    ],
  },
  disclaimer: {
    title: "不是醫療建議",
    updated,
    sections: [
      {
        heading: "請照藥袋",
        paragraphs: [
          "藥聲不是醫療器材，不做診斷，不建議劑量，也不告訴您該停哪一種藥。畫面上記的天數、百分比與重複成分，都只是把您存過的紀錄算出來。",
          "用藥問題請詢問醫師或藥師。急診或 119 請以藥袋與專業人員的判斷為準。",
        ],
      },
    ],
  },
};

function mirror(kind: LegalKind, title: string, sections: LegalSection[]): LegalDocument {
  return { title, updated, sections: sections.length ? sections : zh[kind].sections };
}

const id: Record<LegalKind, LegalDocument> = {
  privacy: mirror("privacy", "Privasi", [
    { heading: "Siapa yang bertanggung jawab", paragraphs: ["YaoSheng disediakan oleh 【待填】. Kontak: 【待填】. Ganti keduanya sebelum dibuka untuk umum."] },
    { heading: "Data yang diolah", paragraphs: ["Nama orang yang dirawat, kontak keluarga, alergi yang Anda ketik, tulisan pada kemasan, catatan minum, pengamatan Anda, dan bahasa. Data ini tidak dipakai untuk iklan."] },
    { heading: "Di mana data disimpan", paragraphs: ["Secara bawaan data obat ada di peramban perangkat ini, disegel dengan kunci perangkat. Server tidak menyimpan nama obat atau nama orang, kecuali fitur opsional di bawah ini dinyalakan."] },
    { heading: "Foto dan model", paragraphs: ["Foto kemasan dikirim ke penyedia model (bawaan OpenAI) hanya saat Anda menekan kenali, untuk menyalin dan menerjemahkan tulisan. Foto tidak dipakai memberi saran medis."] },
    { heading: "Pengingat latar", paragraphs: ["Jika Anda menyalakannya, server hanya menyimpan id perangkat, alamat push, jam, dan bahasa. Nama obat dan nama orang tidak disimpan."] },
    { heading: "Berbagi keluarga", paragraphs: ["Tautan dienkripsi di perangkat Anda. Kunci ada di belakang tanda #. Tautan pendek opsional hanya menyimpan ciphertext paling lama 30 hari."] },
    { heading: "Simpan dan hapus", paragraphs: ["Data di perangkat tetap ada sampai Anda menghapusnya. Anda dapat mengekspor JSON dan meminta 【待填】 menghapus data server jika ada."] },
  ]),
  terms: mirror("terms", "Ketentuan", [
    { heading: "Apa layanan ini", paragraphs: ["YaoSheng menerjemahkan, membacakan, merapikan, dan mencatat tulisan pada kemasan serta kata yang Anda ketik. Ini bukan layanan medis."] },
    { heading: "Tanggung jawab Anda", paragraphs: ["Periksa hasil kenali. Ikuti kemasan dan tanyakan kepada dokter atau apoteker. Masukkan data orang lain hanya dengan persetujuan."] },
    { heading: "Layanan dapat terhenti", paragraphs: ["Kenali, terjemahan, dan pengingat latar membutuhkan kunci yang diatur pemilik. Tanpa itu, entri manual dan kartu kalimat offline tetap jalan."] },
  ]),
  disclaimer: mirror("disclaimer", "Bukan saran medis", [
    { heading: "Ikuti kemasan", paragraphs: ["YaoSheng bukan alat kesehatan. Aplikasi tidak mendiagnosis, tidak mengubah dosis, dan tidak menyuruh berhenti obat. Angka hari dan tanda kandungan yang sama hanya menghitung catatan Anda. Tanyakan kepada dokter atau apoteker."] },
  ]),
};

const vi: Record<LegalKind, LegalDocument> = {
  privacy: mirror("privacy", "Quyền riêng tư", [
    { heading: "Ai phụ trách", paragraphs: ["YaoSheng do 【待填】 cung cấp. Liên hệ: 【待填】."] },
    { heading: "Dữ liệu được xử lý", paragraphs: ["Tên người được chăm sóc, liên hệ gia đình, dị ứng bạn ghi, chữ trên túi thuốc, nhật ký uống, quan sát của bạn và ngôn ngữ. Không dùng để quảng cáo."] },
    { heading: "Lưu ở đâu", paragraphs: ["Mặc định dữ liệu nằm trên trình duyệt của máy này, được khóa bằng khóa của máy. Máy chủ không lưu tên thuốc hay tên người, trừ các tính năng tùy chọn bên dưới."] },
    { heading: "Ảnh và mô hình", paragraphs: ["Ảnh túi thuốc chỉ được gửi tới nhà cung cấp mô hình (mặc định OpenAI) khi bạn bấm nhận dạng, để chép và dịch chữ in. Không dùng để đưa lời khuyên y tế."] },
    { heading: "Nhắc khi đóng ứng dụng", paragraphs: ["Nếu bạn bật, máy chủ chỉ lưu mã thiết bị, địa chỉ đẩy, giờ và ngôn ngữ. Không lưu tên thuốc hay tên người."] },
    { heading: "Chia sẻ cho gia đình", paragraphs: ["Liên kết được mã hóa trên máy bạn. Khóa nằm sau dấu #. Liên kết ngắn tùy chọn chỉ giữ bản mã tối đa 30 ngày."] },
    { heading: "Lưu và xóa", paragraphs: ["Dữ liệu trên máy ở lại đến khi bạn xóa. Bạn có thể xuất JSON và yêu cầu 【待填】 xóa dữ liệu trên máy chủ nếu có."] },
  ]),
  terms: mirror("terms", "Điều khoản", [
    { heading: "Dịch vụ này làm gì", paragraphs: ["YaoSheng dịch, đọc, sắp xếp và ghi chữ trên túi thuốc cùng chữ bạn tự gõ. Đây không phải dịch vụ y tế."] },
    { heading: "Trách nhiệm của bạn", paragraphs: ["Hãy kiểm tra kết quả nhận dạng. Làm theo túi thuốc và hỏi bác sĩ hoặc dược sĩ. Chỉ nhập dữ liệu người khác khi đã có sự đồng ý."] },
    { heading: "Dịch vụ có thể gián đoạn", paragraphs: ["Nhận dạng, dịch và nhắc nền cần khóa do chủ dịch vụ đặt. Không có khóa, nhập tay và thẻ câu sẵn vẫn dùng được."] },
  ]),
  disclaimer: mirror("disclaimer", "Không phải lời khuyên y tế", [
    { heading: "Làm theo túi thuốc", paragraphs: ["YaoSheng không phải thiết bị y tế. Ứng dụng không chẩn đoán, không đổi liều, không bảo ngừng thuốc. Số ngày và cờ thành phần trùng chỉ là số liệu từ ghi chép của bạn. Hãy hỏi bác sĩ hoặc dược sĩ."] },
  ]),
};

const fil: Record<LegalKind, LegalDocument> = {
  privacy: mirror("privacy", "Privacy", [
    { heading: "Sino ang may pananagutan", paragraphs: ["Ang YaoSheng ay ibinibigay ng 【待填】. Contact: 【待填】."] },
    { heading: "Anong datos", paragraphs: ["Pangalan ng inaalagaan, contact ng pamilya, allergy na tina-type mo, teksto sa supot, tala ng inom, obserbasyon mo, at wika. Hindi ito ginagamit sa advertising."] },
    { heading: "Saan ito nakatago", paragraphs: ["Ang default ay nasa browser ng aparatong ito, selyado ng susi ng aparato. Hindi nag-iimbak ang server ng pangalan ng gamot o tao maliban kung binuksan ang opsyonal na feature."] },
    { heading: "Litrato at modelo", paragraphs: ["Ipinapadala ang litrato sa provider ng modelo (default OpenAI) kapag pinindot mo ang kilalanin, para kopyahin at isalin ang nakasulat. Hindi ito ginagamit para magpayo ng gamot."] },
    { heading: "Paalala sa background", paragraphs: ["Kung bubuksan mo ito, id ng aparato, push address, oras, at wika lang ang iniimbak. Walang pangalan ng gamot o pasyente."] },
    { heading: "Share sa pamilya", paragraphs: ["Naka-encrypt ang link sa aparato mo. Nasa likod ng # ang susi. Ang opsyonal na maikling link ay ciphertext lang, hanggang 30 araw."] },
    { heading: "Tagal at pagbura", paragraphs: ["Mananatili ang datos sa aparato hanggang burahin mo. Maaari kang mag-export ng JSON at humiling sa 【待填】 na burahin ang datos sa server kung meron."] },
  ]),
  terms: mirror("terms", "Mga tuntunin", [
    { heading: "Ano ang serbisyo", paragraphs: ["Nagsasalin, nagbabasa, nag-aayos, at nagtatala ang YaoSheng ng teksto sa supot at ng tina-type mo. Hindi ito serbisyong medikal."] },
    { heading: "Responsibilidad mo", paragraphs: ["Suriin ang resulta. Sundin ang supot at magtanong sa doktor o parmasyutiko. Maglagay ng datos ng iba lang kung may pahintulot."] },
    { heading: "Maaaring maputol", paragraphs: ["Kailangan ng susi ang pagkilala, pagsasalin, at paalala. Kung wala, gumagana pa rin ang mano-manong pagpasok at ang offline na mga pangungusap."] },
  ]),
  disclaimer: mirror("disclaimer", "Hindi payo medikal", [
    { heading: "Sundin ang supot", paragraphs: ["Hindi medical device ang YaoSheng. Hindi ito nag-diagnose, hindi nagbabago ng dose, at hindi nagsasabing itigil ang gamot. Ang mga bilang ay tala mo lang. Magtanong sa doktor o parmasyutiko."] },
  ]),
};

const th: Record<LegalKind, LegalDocument> = {
  privacy: mirror("privacy", "ความเป็นส่วนตัว", [
    { heading: "ใครรับผิดชอบ", paragraphs: ["ยาเสียงให้บริการโดย 【待填】 ติดต่อ 【待填】"] },
    { heading: "ข้อมูลที่จัดเก็บ", paragraphs: ["ชื่อผู้ได้รับการดูแล ช่องทางติดต่อครอบครัว ข้อความแพ้ที่คุณพิมพ์ ตัวหนังสือบนซอง บันทึกการกิน สิ่งที่คุณสังเกต และภาษา ไม่ใช้เพื่อการโฆษณา"] },
    { heading: "เก็บที่ไหน", paragraphs: ["โดยปกติข้อมูลอยู่ในเบราว์เซอร์ของเครื่องนี้ และถูกเข้ารหัสด้วยกุญแจของเครื่อง เซิร์ฟเวอร์ไม่เก็บชื่อยาหรือชื่อคน เว้นแต่เปิดฟังก์ชันเสริมด้านล่าง"] },
    { heading: "รูปภาพและโมเดล", paragraphs: ["รูปซองยาจะถูกส่งไปยังผู้ให้บริการโมเดล (ค่าเริ่มต้นคือ OpenAI) เมื่อคุณกดอ่านเท่านั้น เพื่อคัดลอกและแปลตัวหนังสือ ไม่ใช้เพื่อให้คำแนะนำทางการแพทย์"] },
    { heading: "การเตือนเบื้องหลัง", paragraphs: ["ถ้าคุณเปิด เซิร์ฟเวอร์เก็บเฉพาะรหัสเครื่อง ที่อยู่พุช เวลา และภาษา ไม่เก็บชื่อยาหรือชื่อคน"] },
    { heading: "แชร์ให้ครอบครัว", paragraphs: ["ลิงก์ถูกเข้ารหัสบนเครื่องคุณ กุญแจอยู่หลังเครื่องหมาย # ลิงก์สั้นที่เป็นตัวเลือกเก็บเฉพาะข้อความเข้ารหัส ไม่เกิน 30 วัน"] },
    { heading: "การเก็บและการลบ", paragraphs: ["ข้อมูลในเครื่องอยู่จนกว่าคุณจะลบ คุณส่งออก JSON ได้ และขอให้ 【待填】 ลบข้อมูลบนเซิร์ฟเวอร์ได้ถ้ามี"] },
  ]),
  terms: mirror("terms", "ข้อกำหนด", [
    { heading: "บริการนี้ทำอะไร", paragraphs: ["ยาเสียงแปล อ่านออกเสียง จัดระเบียบ และบันทึกตัวหนังสือบนซองกับคำที่คุณพิมพ์ ไม่ใช่บริการทางการแพทย์"] },
    { heading: "หน้าที่ของคุณ", paragraphs: ["โปรดตรวจผลที่อ่านได้ ทำตามซองยา และถามแพทย์หรือเภสัชกร ใส่ข้อมูลของผู้อื่นเมื่อได้รับความยินยอมแล้วเท่านั้น"] },
    { heading: "บริการอาจหยุด", paragraphs: ["การอ่านรูป การแปล และการเตือนเบื้องหลังต้องใช้กุญแจที่ผู้ดูแลตั้ง ถ้าไม่มี กาพิมพ์เองและการ์ดประโยคออฟไลน์ยังใช้ได้"] },
  ]),
  disclaimer: mirror("disclaimer", "ไม่ใช่คำแนะนำทางการแพทย์", [
    { heading: "ทำตามซองยา", paragraphs: ["ยาเสียงไม่ใช่เครื่องมือแพทย์ ไม่วินิจฉัย ไม่เปลี่ยนขนาดยา และไม่บอกให้หยุดยา ตัวเลขคือบันทึกของคุณ โปรดถามแพทย์หรือเภสัชกร"] },
  ]),
};

const en: Record<LegalKind, LegalDocument> = {
  privacy: mirror("privacy", "Privacy", [
    { heading: "Who is responsible", paragraphs: ["YaoSheng is provided by 【待填】. Contact: 【待填】. Replace both before a public launch."] },
    { heading: "What is processed", paragraphs: ["The patient's name, a family contact, allergy text you type, words from the medicine bag, dose logs, observations you type, and your language. This is not used for advertising."] },
    { heading: "Where it is stored", paragraphs: ["By default the cabinet stays in this browser and is sealed with a key that does not leave the device. The server does not keep drug names or people's names unless an optional feature below is turned on."] },
    { heading: "Photos and the model", paragraphs: ["A bag photo is sent to the configured model provider (OpenAI by default) only when you tap recognize, to transcribe and translate the printed words. It is not used to produce medical advice."] },
    { heading: "Background reminders", paragraphs: ["If you opt in, the server stores a device id, the push endpoint, clock times, and the notification language. It does not store drug names or patient names."] },
    { heading: "Family share", paragraphs: ["The share link is encrypted on your device. The key stays after the # and is not sent to the server. An optional short link stores only ciphertext for up to 30 days."] },
    { heading: "Keeping and deleting", paragraphs: ["On-device data stays until you delete it. You can export JSON and ask 【待填】 to delete server data if any exists."] },
  ]),
  terms: mirror("terms", "Terms", [
    { heading: "What this service does", paragraphs: ["YaoSheng translates, reads aloud, organizes, and records the words on a medicine bag and the words you type. It is not a medical service."] },
    { heading: "Your responsibility", paragraphs: ["Check recognition results. Follow the bag and ask a doctor or pharmacist. Enter someone else's information only with consent."] },
    { heading: "The service can stop", paragraphs: ["Recognition, translation, and background reminders need keys the operator sets. Without them, manual entry and the offline phrase cards still work."] },
  ]),
  disclaimer: mirror("disclaimer", "Not medical advice", [
    { heading: "Follow the bag", paragraphs: ["YaoSheng is not a medical device. It does not diagnose, change a dose, or tell you to stop a medicine. Days remaining, percentages, and duplicate-ingredient flags are calculations from your records. Ask a doctor or pharmacist."] },
  ]),
};

export const legal: Record<Lang, Record<LegalKind, LegalDocument>> = { zh, id, vi, fil, th, en };
