import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PERSEPTOR — Program Pembimbingan dan Supervisi Klinik Terintegrasi",
  description:
    "Platform tata kelola pembimbingan dan supervisi klinik Puskesmas: pemetaan, perencanaan, penetapan perseptor, penjadwalan, pelaksanaan, temuan, rekomendasi, tindak lanjut, verifikasi, monitoring, dan pelaporan.",
  keywords: ["PERSEPTOR", "pembimbingan klinik", "supervisi klinik", "Puskesmas", "Dinas Kesehatan", "mutu pelayanan"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
