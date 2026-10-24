import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
import { APP_NAME, APP_TITLE } from "@/lib/brand";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: APP_TITLE },
  description: "給在台灣照顧家人的外籍看護。翻譯並朗讀藥袋上的文字，不提供醫療建議。",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: APP_TITLE,
    description: "把藥袋上的字，說成你聽得懂的話。",
    url: siteUrl,
    siteName: APP_NAME,
    locale: "zh_TW",
    type: "website",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
