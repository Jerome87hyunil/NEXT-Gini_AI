import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gini AI - Next.js",
  description: "AI 아바타 영상 생성 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
