import type { Metadata, Viewport } from "next";
import { Montserrat, Fraunces } from "next/font/google";
import ErrorBoundary from "@/components/ErrorBoundary";
import GlobalErrorLogger from "@/components/GlobalErrorLogger";
import { ToastProvider } from "@/components/Toast";
import { NetworkProvider } from "@/providers/NetworkProvider";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CIMI Leads",
  description: "Escaneie QR Codes e cartoes de visita",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CIMI Leads",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icons/favicon.ico", sizes: "32x32", type: "image/x-icon" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#002F3F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} ${fraunces.variable}`}>
      <body className="antialiased font-sans">
        <GlobalErrorLogger />
        <ErrorBoundary>
          <NetworkProvider>
            <ToastProvider>{children}</ToastProvider>
          </NetworkProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
