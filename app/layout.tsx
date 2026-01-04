import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CEGAS - C++ 考卷自動化批改系統",
  description: "C++ Exam Grading Automation System - 多助教協作的考卷批改平台",
  keywords: ["C++", "考卷批改", "自動化", "Cppcheck", "教育"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </body>
    </html>
  );
}
