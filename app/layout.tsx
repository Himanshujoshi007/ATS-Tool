import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumePro — Resume Review Studio",
  description: "A thoughtful resume audit with clear priorities, practical improvements and optional private expert review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50">{children}</body>
    </html>
  );
}
