import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = { title: "使用條款", description: "藥聲翻譯並記錄藥袋上的文字，不提供醫療服務。" };

export default function TermsPage() {
  return <LegalDoc kind="terms" />;
}
