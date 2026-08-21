import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import SyncManagerMount from "@/components/sync/SyncManagerMount";
import ServiceWorkerMount from "@/components/sync/ServiceWorkerMount";
import ToastProvider from "@/components/ui/ToastProvider";
import PreferencesProvider from "@/components/providers/PreferencesProvider";
import "./globals.css";

// Runs before hydration so <html data-theme>/dir/lang are correct on first
// paint — no flash of the wrong theme or of an LTR layout that then flips to
// RTL. Reads localStorage directly (a Dexie/IndexedDB read is always async,
// and this must not be) via the same keys lib/preferences/localMirror.ts
// uses. Kept as a raw string deliberately: it has to run before any app
// module is evaluated, so it can't import one.
const THEME_INIT_SCRIPT = `(function(){try{
var t=localStorage.getItem('udhar-plus-theme');
if(t!=='light'&&t!=='dark'&&t!=='system')t='light';
var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;
document.documentElement.dataset.theme=r;
var stored=localStorage.getItem('udhar-plus-language');
var l=(stored==='ur'||stored==='ur-Latn')?stored:'en';
document.documentElement.lang=l;
document.documentElement.dir=l==='ur'?'rtl':'ltr';
}catch(e){}})();`;

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
  themeColor: "#F5FAFE",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-canvas font-sans text-ink" suppressHydrationWarning>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <PreferencesProvider>
          <ServiceWorkerMount />
          <SyncManagerMount />
          <ToastProvider>{children}</ToastProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
