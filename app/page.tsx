import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "藥聲 YaoSheng" },
  description: "給在台灣照顧家人的外籍看護。翻譯並朗讀藥袋上的文字，不提供醫療建議。",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "藥聲 YaoSheng",
    description: "把藥袋上的字，說成你聽得懂的話。",
    url: siteUrl,
    siteName: "藥聲",
    locale: "zh_TW",
    type: "website",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
