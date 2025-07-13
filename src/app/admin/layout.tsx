'use client';

import { Geist, Geist_Mono } from "next/font/google";
import { usePathname } from 'next/navigation';
import AdminFooterNav from '@/app/component/AdminFooterNav/AdminFooterNav';
import '../globals.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideFooter = pathname === '/admin/select';

  return (
    <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      {children}
      {!hideFooter && <AdminFooterNav />}
    </body>
  );
}
