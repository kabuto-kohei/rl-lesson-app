import { Geist, Geist_Mono } from "next/font/google";
import FooterNav from '@/app/component/FooterNav/FooterNav'; // フッターコンポーネント
import "../globals.css"; // グローバルCSSを引き継ぐ

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <FooterNav /> {/* ← ここでユーザー配下だけ共通ナビ */}
      </body>
    </html>
  );
}
