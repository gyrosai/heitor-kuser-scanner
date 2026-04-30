import type { Metadata, Viewport } from "next";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heitor Scanner",
  description: "Escaneie QR Codes e cartoes de visita",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Heitor Scanner",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <ErrorBoundary>
          <ToastProvider>{children}</ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
