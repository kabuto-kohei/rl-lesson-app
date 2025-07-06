'use client';

import { Geist, Geist_Mono } from "next/font/google";
import { usePathname } from 'next/navigation';
import FooterNav from '@/app/component/FooterNav/FooterNav';
import "../globals.css";

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
  const pathname = usePathname();
  const hideFooter = pathname === '/user/login'; // ← ここで判定

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        {!hideFooter && <FooterNav />}
      </body>
    </html>
  );
}
