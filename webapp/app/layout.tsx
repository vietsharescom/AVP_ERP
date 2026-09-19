import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SearchBarSlot from "../components/SearchBarSlot";
import NavBar from "../components/NavBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AVP_ERP",
  description: "AVP_ERP — hệ thống quản lý sản xuất nội bộ AVP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {/* NavBar tự ẩn khi chưa đăng nhập (vd /login) — xem FID-ERP-014 §4a */}
        <NavBar />
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 16px 0" }}>
          <SearchBarSlot />
        </div>
        {children}
      </body>
    </html>
  );
}
