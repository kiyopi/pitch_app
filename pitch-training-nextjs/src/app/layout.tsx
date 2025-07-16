import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "🎵 相対音感トレーニング v3.0",
  description: "3つのトレーニングモードで相対音感を効果的に鍛えるWebアプリケーション",
  keywords: ["相対音感", "音感訓練", "音楽", "トレーニング", "音程", "ドレミファソラシド"],
  authors: [{ name: "Pitch Training Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  openGraph: {
    title: "🎵 相対音感トレーニング v3.0",
    description: "3つのトレーニングモードで相対音感を効果的に鍛える",
    type: "website",
    locale: "ja_JP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-blue-50 to-purple-50`}
      >
        <div className="flex flex-col min-h-screen">
          <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold text-gray-800">
                🎵 相対音感トレーニング v3.0
              </h1>
            </div>
          </header>
          
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          
          <footer className="bg-gray-800 text-white py-6">
            <div className="container mx-auto px-4 text-center">
              <p className="text-sm">
                🎯 Powered by Pitchy (McLeod Pitch Method) | 
                🎹 Salamander Grand Piano | 
                ⚡ Next.js 15
              </p>
              <p className="text-xs mt-2 text-gray-400">
                Next.js Training v3.0.0 | 
                Build: {new Date().toLocaleString('ja-JP')}
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
