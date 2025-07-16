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
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100`}
      >
        <div className="flex flex-col min-h-screen">
          <header className="bg-white/90 backdrop-blur-md shadow-lg border-b border-gray-200/50">
            <div className="container mx-auto px-6 py-5">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  🎵 相対音感トレーニング v3.0
                </h1>
                <div className="hidden md:flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Next.js 15</span>
                  </div>
                </div>
              </div>
            </div>
          </header>
          
          <main className="flex-grow container mx-auto px-6 py-12">
            {children}
          </main>
          
          <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-8 border-t border-gray-700">
            <div className="container mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center space-x-6 mb-4 md:mb-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🎯</span>
                    <span className="text-sm font-medium">Pitchy (McLeod Pitch Method)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🎹</span>
                    <span className="text-sm font-medium">Salamander Grand Piano</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">⚡</span>
                    <span className="text-sm font-medium">Next.js 15</span>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-sm font-semibold text-gray-300">
                    Next.js Training v3.0.0
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Build: {new Date().toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
