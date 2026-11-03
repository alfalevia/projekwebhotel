
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "NARA HOTEL | Reservasi Hotel",
  description:
    "Website reservasi NARA HOTEL untuk melihat kamar, fasilitas, dan melakukan pemesanan hotel.",
  keywords: [
    "NARA HOTEL",
    "reservasi hotel",
    "booking hotel",
    "kamar hotel",
  ],
  authors: [{ name: "NARA HOTEL" }],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
