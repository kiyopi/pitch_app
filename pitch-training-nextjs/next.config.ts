import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages対応: 静的サイト出力
  output: 'export',
  
  // 画像最適化無効化（GitHub Pages制限）
  images: {
    unoptimized: true,
  },
  
  // ベースパス設定（GitHub Pages用）
  basePath: process.env.NODE_ENV === 'production' ? '/pitch_app' : '',
  
  // アセットプレフィックス
  assetPrefix: process.env.NODE_ENV === 'production' ? '/pitch_app' : '',
  
  // トレイリングスラッシュ
  trailingSlash: true,
  
  // 実験的機能
  experimental: {
    // ESMライブラリ対応
    esmExternals: true,
  },
};

export default nextConfig;
