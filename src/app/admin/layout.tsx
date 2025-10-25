import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import AdminAuthGuard from "./AdminAuthGuard";

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
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <AdminAuthGuard>{children}</AdminAuthGuard>
    </div>
  );
}
