import Link from "next/link";
import { Music, RotateCcw, Target } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* タイムスタンプ表示 */}
      <div className="fixed top-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-bold z-50 shadow-lg backdrop-blur-sm">
        📱 {new Date().toLocaleTimeString('ja-JP')}
      </div>

      {/* ヒーローセクション */}
      <div className="text-center mb-16">
        <div className="inline-block mb-6">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-6xl font-bold">
            🎵
          </span>
        </div>
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-6">
          相対音感トレーニング v3.0
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          3つのトレーニングモードで相対音感を効果的に鍛える
          <br />
          <span className="text-indigo-600 font-semibold">高精度検出</span>×
          <span className="text-purple-600 font-semibold">本格音源</span>×
          <span className="text-teal-600 font-semibold">モダンUI</span>
        </p>
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-500 text-white px-8 py-4 rounded-2xl inline-block shadow-lg">
          <div className="flex items-center space-x-4 text-sm font-medium">
            <div className="flex items-center space-x-1">
              <span>🎯</span>
              <span>Pitchy (McLeod Pitch Method)</span>
            </div>
            <div className="w-px h-4 bg-white/30"></div>
            <div className="flex items-center space-x-1">
              <span>🎹</span>
              <span>Salamander Grand Piano</span>
            </div>
            <div className="w-px h-4 bg-white/30"></div>
            <div className="flex items-center space-x-1">
              <span>⚡</span>
              <span>Next.js 15</span>
            </div>
          </div>
        </div>
      </div>

      {/* トレーニングモード選択 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {/* ランダム基音モード */}
        <div className="group relative bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl mb-6 mx-auto shadow-lg">
              <Music className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              ランダム基音モード
            </h3>
            <p className="text-gray-600 mb-6 text-center leading-relaxed">
              10種類の基音からランダムに選択してドレミファソラシドを発声
            </p>
            <div className="text-center mb-6">
              <span className="inline-block bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-bold">
                初心者向け
              </span>
            </div>
            <Link 
              href="/training/random"
              className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 block text-center shadow-lg hover:shadow-xl"
            >
              開始する
            </Link>
          </div>
        </div>

        {/* 連続チャレンジモード */}
        <div className="group relative bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl mb-6 mx-auto shadow-lg">
              <RotateCcw className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              連続チャレンジモード
            </h3>
            <p className="text-gray-600 mb-6 text-center leading-relaxed">
              選択した回数だけ連続で実行し、総合評価を確認
            </p>
            <div className="text-center mb-6">
              <span className="inline-block bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 px-4 py-2 rounded-full text-sm font-bold">
                中級者向け
              </span>
            </div>
            <Link 
              href="/training/continuous"
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 block text-center shadow-lg hover:shadow-xl"
            >
              開始する
            </Link>
          </div>
        </div>

        {/* 12音階モード */}
        <div className="group relative bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl mb-6 mx-auto shadow-lg">
              <Target className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              12音階モード
            </h3>
            <p className="text-gray-600 mb-6 text-center leading-relaxed">
              クロマチックスケールの上行・下行で完全制覇
            </p>
            <div className="text-center mb-6">
              <span className="inline-block bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700 px-4 py-2 rounded-full text-sm font-bold">
                上級者向け
              </span>
            </div>
            <Link 
              href="/training/chromatic"
              className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 block text-center shadow-lg hover:shadow-xl"
            >
              開始する
            </Link>
          </div>
        </div>
      </div>

      {/* 機能説明 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-2xl p-10 mb-16 border border-gray-100">
        <h2 className="text-3xl font-bold text-center mb-10">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            アプリの特徴
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="group hover:scale-105 transition-transform duration-300">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 h-full">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-xl">🎯</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  高精度音程検出
                </h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Pitchy ライブラリによる McLeod Pitch Method で、±5セントの高精度検出を実現
              </p>
            </div>
          </div>
          <div className="group hover:scale-105 transition-transform duration-300">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 h-full">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-xl">🎹</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  本格的なピアノ音源
                </h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Salamander Grand Piano (Yamaha C5) の高品質サンプル音源を使用
              </p>
            </div>
          </div>
          <div className="group hover:scale-105 transition-transform duration-300">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 h-full">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-xl">🔧</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  ノイズリダクション
                </h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                3段階フィルタリングで23-25Hz低周波ノイズを完全除去
              </p>
            </div>
          </div>
          <div className="group hover:scale-105 transition-transform duration-300">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 h-full">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mr-4">
                  <span className="text-white text-xl">📱</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  モバイル対応
                </h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                iPhone Safari 完全対応、PWA機能でアプリライクな体験
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 使い方 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 border border-gray-100">
        <h2 className="text-3xl font-bold text-center mb-12">
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            使い方
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="group flex flex-col items-center text-center hover:scale-105 transition-transform duration-300">
            <div className="relative mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                1
              </div>
              <div className="absolute -inset-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </div>
            <h3 className="font-bold text-gray-800 mb-3 text-lg">モード選択</h3>
            <p className="text-gray-600 leading-relaxed">
              3つのトレーニングモードから<br />
              レベルに応じて選択
            </p>
          </div>
          <div className="group flex flex-col items-center text-center hover:scale-105 transition-transform duration-300">
            <div className="relative mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                2
              </div>
              <div className="absolute -inset-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </div>
            <h3 className="font-bold text-gray-800 mb-3 text-lg">マイク許可</h3>
            <p className="text-gray-600 leading-relaxed">
              ブラウザでマイクアクセスを<br />
              許可してください
            </p>
          </div>
          <div className="group flex flex-col items-center text-center hover:scale-105 transition-transform duration-300">
            <div className="relative mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                3
              </div>
              <div className="absolute -inset-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </div>
            <h3 className="font-bold text-gray-800 mb-3 text-lg">基音を聞く</h3>
            <p className="text-gray-600 leading-relaxed">
              高品質ピアノ音源で<br />
              基音を確認
            </p>
          </div>
          <div className="group flex flex-col items-center text-center hover:scale-105 transition-transform duration-300">
            <div className="relative mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                4
              </div>
              <div className="absolute -inset-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </div>
            <h3 className="font-bold text-gray-800 mb-3 text-lg">発声・判定</h3>
            <p className="text-gray-600 leading-relaxed">
              ドレミファソラシドを発声して<br />
              高精度判定
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}