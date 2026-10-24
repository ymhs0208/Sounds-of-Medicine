import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = { title: "隱私權說明", description: "藥聲如何保存藥袋、照片與提醒。預設資料留在您的裝置。" };

export default function PrivacyPage() {
  return <LegalDoc kind="privacy" />;
}
