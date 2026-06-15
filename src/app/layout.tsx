import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import "./globals.css";
import SessionProvider from '@/components/providers/SessionProvider'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yaku - Sistema de Riego Inteligente",
  description: "Sistema de riego inteligente para Lima, Perú",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <Theme appearance="dark">
            {children}
          </Theme>
        </SessionProvider>
      </body>
    </html>
  );
}
