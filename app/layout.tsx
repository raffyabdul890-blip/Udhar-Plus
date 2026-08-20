import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import SyncManagerMount from "@/components/sync/SyncManagerMount";
import ServiceWorkerMount from "@/components/sync/ServiceWorkerMount";
import ToastProvider from "@/components/ui/ToastProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Udhar Plus",
  description:
    "Udhar Plus — a senior-friendly app for tracking customer credit (udhar) and payments.",
  applicationName: "Udhar Plus",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Udhar Plus",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F7F8",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-canvas font-sans text-ink">
        <ServiceWorkerMount />
        <SyncManagerMount />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
