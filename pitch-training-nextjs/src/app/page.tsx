import Link from "next/link";
import { Music, RotateCcw, Target } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* タイムスタンプ表示 */}
      <div className="fixed top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-bold z-50">
        📱 {new Date().toLocaleTimeString('ja-JP')}
      </div>

      {/* ヒーローセクション */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          🎵 相対音感トレーニング v3.0
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          3つのトレーニングモードで相対音感を効果的に鍛える
        </p>
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg inline-block">
          <span className="text-sm font-semibold">
            🎯 Pitchy (McLeod Pitch Method) | 🎹 Salamander Grand Piano | ⚡ Next.js 15
          </span>
        </div>
      </div>

      {/* トレーニングモード選択 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {/* ランダム基音モード */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 mx-auto">
            <Music className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-3 text-center">
            ランダム基音モード
          </h3>
          <p className="text-gray-600 mb-4 text-center">
            10種類の基音からランダムに選択してドレミファソラシドを発声
          </p>
          <div className="text-center">
            <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold mb-4">
              初心者向け
            </span>
          </div>
          <Link 
            href="/training/random"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors block text-center"
          >
            開始する
          </Link>
        </div>

        {/* 連続チャレンジモード */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4 mx-auto">
            <RotateCcw className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-3 text-center">
            連続チャレンジモード
          </h3>
          <p className="text-gray-600 mb-4 text-center">
            選択した回数だけ連続で実行し、総合評価を確認
          </p>
          <div className="text-center">
            <span className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold mb-4">
              中級者向け
            </span>
          </div>
          <Link 
            href="/training/continuous"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors block text-center"
          >
            開始する
          </Link>
        </div>

        {/* 12音階モード */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 mx-auto">
            <Target className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-3 text-center">
            12音階モード
          </h3>
          <p className="text-gray-600 mb-4 text-center">
            クロマチックスケールの上行・下行で完全制覇
          </p>
          <div className="text-center">
            <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold mb-4">
              上級者向け
            </span>
          </div>
          <Link 
            href="/training/chromatic"
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg transition-colors block text-center"
          >
            開始する
          </Link>
        </div>
      </div>

      {/* 機能説明 */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          アプリの特徴
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              🎯 高精度音程検出
            </h3>
            <p className="text-gray-600">
              Pitchy ライブラリによる McLeod Pitch Method で、±5セントの高精度検出を実現
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              🎹 本格的なピアノ音源
            </h3>
            <p className="text-gray-600">
              Salamander Grand Piano (Yamaha C5) の高品質サンプル音源を使用
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              🔧 ノイズリダクション
            </h3>
            <p className="text-gray-600">
              3段階フィルタリングで23-25Hz低周波ノイズを完全除去
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              📱 モバイル対応
            </h3>
            <p className="text-gray-600">
              iPhone Safari 完全対応、PWA機能でアプリライクな体験
            </p>
          </div>
        </div>
      </div>

      {/* 使い方 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          使い方
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg mb-3">
              1
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">モード選択</h3>
            <p className="text-sm text-gray-600">
              3つのトレーニングモードから選択
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg mb-3">
              2
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">マイク許可</h3>
            <p className="text-sm text-gray-600">
              ブラウザでマイクアクセスを許可
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg mb-3">
              3
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">基音を聞く</h3>
            <p className="text-sm text-gray-600">
              ピアノ音源で基音を確認
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg mb-3">
              4
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">発声・判定</h3>
            <p className="text-sm text-gray-600">
              ドレミファソラシドを発声して判定
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}