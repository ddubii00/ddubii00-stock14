import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "stock14 주도주",
  description: "테마와 거래대금으로 찾는 오늘의 주도주",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
