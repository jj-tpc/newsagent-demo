import type { Metadata } from "next";
import { Gowun_Dodum, Nanum_Myeongjo, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/nav/NavBar";

const bodyDodum = Gowun_Dodum({
  variable: "--font-body-dodum",
  weight: "400",
  subsets: ["latin"],
});

const displayMyungjo = Nanum_Myeongjo({
  variable: "--font-display-myungjo",
  weight: ["400", "700", "800"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "신문 에이전트",
  description: "최신 기사를 골라 읽어주는 한국어 신문 에이전트",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${bodyDodum.variable} ${displayMyungjo.variable} ${geistMono.variable}`}>
      <body>
        <NavBar />
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
