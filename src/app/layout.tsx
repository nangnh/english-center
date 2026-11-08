import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Garden — Luyện tiếng Anh lớp 2",
  description:
    "Website luyện tiếng Anh cho học sinh lớp 2. Nội dung và hình ảnh tự sáng tác, không liên kết với IOE.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#57c977",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
