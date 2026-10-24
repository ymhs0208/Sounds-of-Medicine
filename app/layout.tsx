import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_TC, Noto_Sans_Thai } from "next/font/google";
import { Providers } from "@/components/providers";
import { siteUrl } from "@/lib/site";
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
  metadataBase: new URL(siteUrl),
  title: { default: "藥聲 YaoSheng", template: "%s｜藥聲" },
  description: "外籍看護的藥袋語音助手。只翻譯並朗讀藥袋上的文字，不提供醫療建議。",
  applicationName: "藥聲",
  manifest: "/manifest.json",
  openGraph: {
    title: "藥聲 YaoSheng",
    description: "把藥袋上的字，說成你聽得懂的話。",
    url: siteUrl,
    siteName: "藥聲",
    locale: "zh_TW",
    type: "website",
  },
  appleWebApp: { capable: true, title: "藥聲", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1b5e45" },
    { media: "(prefers-color-scheme: dark)", color: "#10241c" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
