import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineQueueBanner } from "@/components/pwa/OfflineQueueBanner";
import { CapacitorInit } from "@/components/pwa/CapacitorInit";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const viewport: Viewport = {
  themeColor: "#0B0C0E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "BSF THE GYM — Member Management",
  description: "Membership management system for BSF THE GYM, Vadodara",
  applicationName: "BSF THE GYM",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BSF GYM",
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${outfit.variable} antialiased`}>
        <CapacitorInit />
        <PwaRegister />
        <OfflineIndicator />
        <InstallPrompt />
        <OfflineQueueBanner />
        {children}
      </body>
    </html>
  );
}

