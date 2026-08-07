import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "@/styles/globals.css";
import SiteHeader from "@/components/layout/site-header";
import ChatWidget from "@/components/chat/chat-widget";
import CostumeWidget from "@/components/costume/costume-widget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SKALA STUDY ROOM",
  description: "SKALA 교육생들을 위한 온라인 스터디룸",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
        <ChatWidget />
        <CostumeWidget />
        <Analytics />
      </body>
    </html>
  );
}
