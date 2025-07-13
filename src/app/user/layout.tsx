'use client';

import '@fortawesome/fontawesome-svg-core/styles.css';
import { config } from '@fortawesome/fontawesome-svg-core';
config.autoAddCss = false;

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
  const hideFooterPages = ['/user/login', '/user/register'];
  const hideFooter = hideFooterPages.includes(pathname);

  return (
    <div lang="ja" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      {children}
      {!hideFooter && <FooterNav />}
    </div>
  );
}
