import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_TC, Noto_Sans_Thai } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const noto = Noto_Sans({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
  display: "swap",
});

const tc = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tc",
  display: "swap",
});

const thai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "藥聲 YaoSheng",
  description: "外籍看護的藥袋語音助手。只翻譯並朗讀藥袋上的文字，不提供醫療建議。",
  applicationName: "藥聲",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "藥聲", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#1b5e45",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant" className={`${noto.variable} ${tc.variable} ${thai.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
