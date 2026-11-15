import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { PosProvider } from "@/context/PosContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bismillah General Store POS | کریانہ پوائنٹ آف سیل",
  description:
    "Production retail point of sale system for Pakistani kiryana stores and mini-marts with offline-first sync, bilingual Urdu RTL, and FBR fiscal integration.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className={`h-full ${inter.variable} ${notoArabic.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className="h-full flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
        <PosProvider>{children}</PosProvider>
      </body>
    </html>
  );
}
