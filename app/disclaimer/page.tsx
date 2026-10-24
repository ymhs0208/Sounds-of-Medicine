import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal-doc";

export const metadata: Metadata = { title: "不是醫療建議", description: "藥聲不是醫療器材。請照藥袋，並詢問醫師或藥師。" };

export default function DisclaimerPage() {
  return <LegalDoc kind="disclaimer" />;
}
