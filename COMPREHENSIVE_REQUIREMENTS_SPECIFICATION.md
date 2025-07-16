# 相対音感トレーニングアプリ 統合要件定義書

**作成日**: 2025-07-16  
**バージョン**: v2.1.0-hybrid-comprehensive  
**対象**: 新規開発・完全実装  
**ステータス**: 包括的要件定義（全仕様書統合版 + ハイブリッドマイク許可）

---

## 🎯 1. プロジェクト概要

### 1.1 アプリケーションの目的
**相対音感トレーニングアプリケーション**
- **主目的**: ユーザーの相対音感（音程の相対的な関係を聞き分ける能力）を効果的に鍛える
- **基本動作**: 基音再生→ユーザー歌唱→リアルタイム音程検出→正解判定→フィードバック
- **対象音階**: ドレミファソラシド（C4-C5オクターブ、8音階）
- **技術的特徴**: Web Audio API + Pitchy（McLeod Pitch Method）による高精度音程検出

### 1.2 基本フロー
```
1. ページ読み込み → ハイブリッドマイク許可システム → 事前準備完了
2. スタートボタン押下 → 基音選択・再生 → 音程測定開始
3. ユーザー歌唱 → リアルタイム音程検出 → 正解判定
4. 8音階完了 → 結果表示 → もう一度ボタン
```

### 1.3 技術的特徴
- **高精度音程検出**: Pitchy ライブラリによる McLeod Pitch Method 実装
- **動的オクターブ補正**: 倍音誤検出の自動回避システム
- **3段階ノイズリダクション**: ハイパス・ローパス・ノッチフィルター
- **ハイブリッドマイク許可**: Permissions API事前チェック付き最適化システム
- **ランダム基音システム**: 10種類の基音からランダム選択（Bb3-Ab4）
- **リアルタイム可視化**: 周波数・音量・進行状況の即座表示

---

## 🎮 2. 機能要件

### 2.1 必須機能

#### 2.1.1 ハイブリッドマイク管理機能 [新規追加]
- **Permissions API事前チェック**: 許可状態確認による最適化フロー選択
- **動的初期化**: 許可済み→事前初期化 / 未許可→オンデマンド初期化
- **説明付き許可要求**: ユーザーフレンドリーな許可要求メッセージ
- **状態変更監視**: リアルタイム許可状態変更への対応
- **フォールバック機能**: 非対応ブラウザへの自動切り替え

#### 2.1.2 音声入力処理機能
- **音声入力処理**: Web Audio APIによる高品質音声取得
- **ノイズリダクション**: 強化された3段階フィルター（150Hz ハイパス・2kHz ローパス・60Hz ノッチ）
- **状態管理**: アクティブ・非アクティブ状態の確実な管理
- **AudioContext管理**: suspended状態対応とユーザーインタラクション時の適切な再開

#### 2.1.3 音程検出機能
- **Pitchy統合**: McLeod Pitch Method による高精度検出
- **リアルタイム処理**: 60FPS での連続音程検出
- **オクターブ補正**: 倍音誤検出の自動補正システム
- **精度制御**: 確信度しきい値（0.1以上）での信頼性確保
- **低周波ノイズ除去**: 23-25Hz低周波ノイズの完全除去

#### 2.1.4 基音再生機能
- **Tone.js統合**: Salamander Grand Piano音源使用
- **ランダム選択**: 10種類の基音からランダム選択
- **再生制御**: 2.5秒間の確実な再生・自動停止
- **音量最適化**: 1.2倍ゲインによる聞き取りやすさ向上

#### 2.1.5 判定・フィードバック機能
- **正解判定**: ±50セント以内での正解判定
- **進行管理**: 8音階の順次判定・進行状況表示
- **結果表示**: 最終スコア・音階別結果の表示
- **再挑戦機能**: もう一度ボタンによるリスタート

#### 2.1.6 多様なトレーニングモード機能 [新規追加]
- **ランダム基音モード**: 10種類の基音からランダム選択（既存基本機能）
- **ランダム基音連続モード**: 自動連続実行による効率的トレーニング
- **12音モード**: 半音階完全網羅による上級者向けトレーニング
- **モード切り替え**: 直感的なUI操作によるモード選択
- **統合評価システム**: モード別総合評価と進捗管理

#### 2.1.7 結果共有・出力機能 [新規追加]
- **SNS連携**: Twitter/X、Facebook、LINE、Instagram Storiesへの結果シェア
- **画像生成**: グラフィカルな結果レポートの自動生成
- **PDF出力**: 詳細レポートのPDF形式ダウンロード
- **データエクスポート**: JSON/CSV形式での学習データ出力
- **プライバシー制御**: 共有内容の詳細レベル選択

### 2.2 ハイブリッドマイク許可システム [新規追加]

#### 2.2.1 Permissions API事前チェック機能
```javascript
async checkMicrophonePermission() {
    const permission = await navigator.permissions.query({name: 'microphone'});
    return permission.state; // 'granted', 'denied', 'prompt'
}
```

**動作仕様**:
- ページロード時に許可状態を確認
- `'granted'`: 事前初期化実行（0秒で開始可能）
- `'denied'`: ユーザー操作時要求（説明付き）
- `'prompt'`: ユーザー操作時要求

#### 2.2.2 動的初期化フロー選択
```javascript
initializationMode: 'preload' | 'ondemand'
```

**動作仕様**:
- **preload**: 許可済み → ページロード時初期化
- **ondemand**: 未許可 → スタートボタン時初期化

#### 2.2.3 ユーザーフレンドリーな許可要求
```javascript
showMicrophoneExplanation() {
    return "🎤 音程検出のためマイクを使用します\n正確な相対音感トレーニングに必要です";
}
```

### 2.3 トレーニングモード詳細仕様 [新規追加]

#### 2.3.1 ランダム基音モード（基本モード）
**概要**: 10種類の基音からランダム選択による標準トレーニング
```javascript
mode: 'random-base'
baseToneSelection: 'random'
scale: ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド']
rounds: 1
evaluation: 'single-round'
```

**動作フロー**:
1. スタートボタン押下
2. 10種類の基音からランダム選択
3. 基音再生（2.5秒）
4. ドレミファソラシド（8音階）順次発声・判定
5. 結果表示（8/8正解など）
6. もう一度挑戦可能

#### 2.3.2 ランダム基音連続モード（効率トレーニング）
**概要**: 自動連続実行による集中的トレーニング
```javascript
mode: 'random-continuous'
baseToneSelection: 'random'
scale: ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド']
rounds: 5 // 3/5/10回選択制
evaluation: 'cumulative-average'
autoplay: true
```

**動作フロー**:
1. 回数選択（3/5/10回）
2. スタートボタン押下
3. **自動連続実行**:
   - Round 1: ランダム基音選択→8音階→採点
   - Round 2: 新ランダム基音→8音階→採点
   - ...（設定回数まで）
4. **総合評価表示**:
   - 各ラウンド結果（Round 1: 7/8, Round 2: 6/8...）
   - 総合正解率（35/40 = 87.5%）
   - 平均正解率、最高・最低スコア
5. 全体再挑戦可能

#### 2.3.3 12音モード（上級者向け）
**概要**: 半音階完全網羅による徹底的トレーニング
```javascript
mode: 'chromatic-12'
baseToneSelection: 'user-selectable'
scale: ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド']
rounds: 24 // 12音×上り下り
evaluation: 'chromatic-comprehensive'
direction: 'ascending-descending'
```

**基音選択**: ユーザーが1つの基音を選択（C4推奨）
```javascript
const chromaticBaseTones = [
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4',
    'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4'
];
```

**動作フロー**:
1. 基音選択UI表示（12音から選択）
2. スタートボタン押下
3. **上り半音階実行**（12ラウンド）:
   - C4基音→ドレミファソラシド→採点
   - C#4基音→ドレミファソラシド→採点
   - ...B4まで
4. **下り半音階実行**（12ラウンド）:
   - B4基音→ドレミファソラシド→採点
   - A#4基音→ドレミファソラシド→採点
   - ...C4まで
5. **総合評価表示**:
   - 上り結果（12ラウンド各採点）
   - 下り結果（12ラウンド各採点）
   - 総合正解率（192問中の正解数）
   - 基音別傾向分析

### 2.4 SNS連携・データ出力機能詳細仕様 [新規追加]

#### 2.4.1 SNS連携機能
**概要**: 総合評価結果をソーシャルメディアで共有
```typescript
interface SocialShareConfig {
  platform: 'twitter' | 'facebook' | 'line' | 'instagram-stories'
  shareType: 'image' | 'text' | 'combined'
  privacyLevel: 'public' | 'friends' | 'private'
  includeDetails: boolean
}
```

**対応プラットフォーム**:
- **Twitter/X**: 画像付きツイート、ハッシュタグ自動生成
- **Facebook**: 結果画像とコメントの投稿
- **LINE**: トーク・タイムライン共有
- **Instagram Stories**: ストーリー用画像生成

**共有コンテンツ生成**:
```typescript
// 画像生成（Canvas API使用）
const generateResultImage = (results: TrainingResults) => {
  // スコアグラフ、音階別正解率、達成バッジ等を含む画像
  return canvas.toDataURL('image/png')
}

// テキスト生成
const generateShareText = (results: TrainingResults, mode: TrainingMode) => {
  return `🎵 相対音感トレーニング結果
${mode}モード: ${results.score}/10 正解! 
正解率: ${results.accuracy}%
#相対音感 #音楽トレーニング #PitchTraining`
}
```

#### 2.4.2 PDF出力・ダウンロード機能
**概要**: 詳細な学習レポートの生成・出力
```typescript
interface ExportOptions {
  format: 'pdf' | 'png' | 'json' | 'csv'
  includeGraphs: boolean
  includeDetailedStats: boolean
  timeRange: 'session' | 'daily' | 'weekly' | 'monthly'
  customTemplate?: string
}
```

**PDF出力内容**:
1. **サマリーセクション**:
   - 総合スコア、正解率、実施日時
   - モード別パフォーマンス比較
   - 進捗グラフ（時系列）

2. **詳細分析セクション**:
   - 音階別正解率チャート
   - 基音別傾向分析（12音モード）
   - 反応時間分析
   - 改善提案

3. **統計情報セクション**:
   - セッション統計（回数、時間）
   - 最高・最低・平均スコア
   - 学習継続日数

**技術実装**:
```typescript
// PDF生成ライブラリ: jsPDF + Chart.js
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

const generatePDFReport = async (results: TrainingResults[]) => {
  const pdf = new jsPDF()
  
  // チャート生成
  const chartCanvas = await generateCharts(results)
  
  // PDF構築
  pdf.addImage(chartCanvas, 'PNG', 10, 10, 180, 100)
  pdf.text('相対音感トレーニング レポート', 10, 130)
  
  return pdf.output('blob')
}
```

#### 2.4.3 プライバシー・セキュリティ
**データ保護**:
- 個人情報の非含有（スコアのみ）
- ローカルストレージ優先（クラウド同期はオプション）
- 共有レベル選択（詳細/概要/スコアのみ）

**共有制御**:
```typescript
interface PrivacySettings {
  allowSocialShare: boolean
  defaultShareLevel: 'minimal' | 'standard' | 'detailed'
  includePersonalBest: boolean
  includeProgressHistory: boolean
}
```

### 2.5 オプション機能

#### 2.5.1 デバッグ機能
- **詳細ログ**: 音程検出・判定プロセスの可視化
- **タイムスタンプ**: 8色ループシステムによる更新確認
- **フィルター確認**: ノイズリダクション動作状況の表示
- **許可状態監視**: Permissions API状態変更のリアルタイム表示

#### 2.5.2 UI拡張機能
- **アニメーション**: 周波数表示のリアルタイム更新
- **ローディング表示**: オンデマンド初期化時の待機インジケーター
- **モード選択UI**: 3つのモード切り替えインターフェース
- **進捗表示**: 連続モード・12音モードの進行状況可視化
- **共有ボタン**: SNS連携・エクスポート機能のUI [新規]

---

## 🎯 3. 非機能要件

### 3.1 性能要件
- **応答時間**: 音程検出 < 16ms（60FPS）
- **精度**: 音程判定 ±50セント以内
- **安定性**: 連続使用時の安定動作
- **メモリ**: 効率的なリソース管理
- **初期化速度**: 許可済みユーザー→0秒、未許可→1秒以内

### 3.2 UI/UX要件

#### 3.2.1 設計原則（不変）
1. **スタートボタンの純粋性**: 100%基音再生専用、マイク初期化や他の処理は含まない
2. **ハイブリッド事前準備**: 許可済み→事前初期化、未許可→オンデマンド初期化
3. **標準エラーダイアログ**: `alert()` と `confirm()` のみ使用、独自ダイアログ禁止

#### 3.2.2 Next.js対応UI構成 [更新]

**React + TypeScript + Tailwind CSS実装例**:
```tsx
// pages/index.tsx - ホームページ
import { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/layout/Layout'
import ModeSelector from '@/components/training/ModeSelector'

export default function Home() {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<TrainingMode>('random-base')

  const handleModeSelect = (mode: TrainingMode) => {
    setSelectedMode(mode)
    router.push(`/training/${mode}`)
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">
          🎵 相対音感トレーニング
        </h1>
        
        <ModeSelector 
          selectedMode={selectedMode}
          onModeSelect={handleModeSelect}
        />
        
        <div className="mt-6 text-center text-sm text-gray-600">
          📱 {new Date().toLocaleTimeString()}
        </div>
      </div>
    </Layout>
  )
}
```

**トレーニングページ共通レイアウト**:
```tsx
// pages/training/[mode].tsx
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import FrequencyDisplay from '@/components/training/FrequencyDisplay'
import ProgressIndicator from '@/components/training/ProgressIndicator'
import SettingsPanel from '@/components/training/SettingsPanel'
import ResultsDisplay from '@/components/training/ResultsDisplay'
import MicrophoneButton from '@/components/audio/MicrophoneButton'

export default function TrainingPage() {
  const router = useRouter()
  const { mode } = router.query as { mode: TrainingMode }

  // カスタムHooks
  const { permission, requestPermission } = usePermissionManager()
  const { isActive, audioData } = useMicrophoneManager()
  const { frequency } = usePitchDetection(audioData)
  const { currentBaseTone, playBaseTone } = useBaseToneManager()
  const { settings, updateSettings } = useTrainingMode(mode)
  const { results, recordResult } = useEvaluation()

  return (
    <Layout>
      <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
        {/* 設定パネル */}
        <SettingsPanel mode={mode} settings={settings} onChange={updateSettings} />
        
        {/* メイン表示 */}
        <FrequencyDisplay frequency={frequency} />
        <ProgressIndicator mode={mode} results={results} />
        
        {/* コントロール */}
        <MicrophoneButton 
          permission={permission}
          isActive={isActive}
          onRequestPermission={requestPermission}
        />
        
        {/* 結果表示 */}
        <ResultsDisplay results={results} mode={mode} />
      </div>
    </Layout>
  )
}
```

**レスポンシブ対応**:
```tsx
// components/training/ModeSelector.tsx
export default function ModeSelector({ selectedMode, onModeSelect }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <button 
        onClick={() => onModeSelect('random-base')}
        className={`p-4 rounded-lg border-2 transition-all ${
          selectedMode === 'random-base' 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:border-blue-300'
        }`}
      >
        <div className="text-2xl mb-2">🎲</div>
        <div className="font-semibold">ランダム基音</div>
        <div className="text-sm text-gray-600">基本モード</div>
      </button>
      
      {/* 他のモードボタン */}
    </div>
  )
}
```

### 3.3 エラーハンドリング要件

#### 3.3.1 標準エラーダイアログ（拡張版14種類）
1. **マイク拒否**: 許可案内
2. **マイク未接続**: 接続案内
3. **マイク使用中**: 解放案内
4. **準備未完了**: 再読み込み案内
5. **音程検出エラー**: 初期化エラー
6. **AudioContext エラー**: 状態管理エラー
7. **ライブラリ読み込みエラー**: Tone.js/Pitchy
8. **基音再生エラー**: 音源再生失敗
9. **ネットワークエラー**: 音源取得失敗
10. **ブラウザ非対応**: 機能制限案内
11. **一般エラー**: 予期しないエラー
12. **初回マイク拒否**: 説明付き再要求 [新規]
13. **既存マイク拒否**: 設定変更手順案内 [新規]
14. **Permissions API非対応**: 自動フォールバック [新規]

#### 3.3.2 ハイブリッド対応エラー処理パターン [新規]
- **confirm() + location.reload()**: 自動復旧
- **説明付き再要求**: 初回拒否時の丁寧な案内
- **設定変更手順**: 既存拒否ユーザーへの具体的手順
- **自動フォールバック**: API非対応時の無音切り替え

---

## 🔧 4. 技術要件

### 4.1 必須ライブラリ・フレームワーク [更新]

#### 4.1.1 フロントエンドフレームワーク
- **Next.js 14+**: React基盤のフルスタックフレームワーク [新規]
- **React 18+**: コンポーネントベースUI構築
- **TypeScript**: 型安全性とコード品質向上

#### 4.1.2 音響処理ライブラリ
- **Tone.js v14.7.77**: 音源再生・AudioContext管理
- **Pitchy v4**: 音程検出（McLeod Pitch Method）
- **Web Audio API**: 音声処理・フィルター
- **Permissions API**: マイク許可状態チェック

#### 4.1.3 UI/UX・データ処理ライブラリ
- **Tailwind CSS**: レスポンシブデザイン・ユーティリティファースト
- **Framer Motion**: アニメーション・トランジション
- **React Icons**: 統一されたアイコンセット
- **Chart.js**: グラフ・チャート生成 [新規]
- **jsPDF**: PDF生成・出力 [新規]
- **html2canvas**: HTML要素の画像化 [新規]
- **React Share**: SNS共有機能統合 [新規]

### 4.2 アーキテクチャ

#### 4.2.1 Next.js対応アーキテクチャ [更新]

**React Hooks + TypeScript実装**:
```typescript
// カスタムHooks設計
const usePermissionManager = () => {
    // 許可状態管理・Permissions API統合
    const checkMicrophonePermission = async () => { ... }
    const requestWithExplanation = async () => { ... }
    return { permission, checkMicrophonePermission, ... }
}

const useMicrophoneManager = () => {
    // マイク管理・ノイズリダクション・ハイブリッド対応
    const requestAccess = async () => { ... }
    const initNoiseReductionFilters = () => { ... }
    return { isActive, audioData, requestAccess, ... }
}

const usePitchDetection = (audioContext: AudioContext) => {
    // 音程検出・Pitchy統合
    const [frequency, setFrequency] = useState<number | null>(null)
    const detectPitch = (audioData: Float32Array) => { ... }
    return { frequency, detectPitch, ... }
}

const useBaseToneManager = () => {
    // 基音管理・Tone.js統合・モード対応
    const selectRandomBaseTone = () => { ... }
    const generateChromaticSequence = (startTone: string) => { ... }
    return { currentBaseTone, playBaseTone, ... }
}

const useTrainingMode = () => {
    // トレーニングモード管理
    const [mode, setMode] = useState<TrainingMode>('random-base')
    const [settings, setSettings] = useState<ModeSettings>({})
    return { mode, settings, setMode, ... }
}

const useEvaluation = () => {
    // 評価・統計管理
    const [results, setResults] = useState<TrainingResult[]>([])
    const recordResult = (note: string, correct: boolean) => { ... }
    return { results, recordResult, generateReport, ... }
}

const useSocialShare = () => {
    // SNS連携・共有管理 [新規]
    const generateShareImage = (results: TrainingResults) => { ... }
    const shareToTwitter = (image: string, text: string) => { ... }
    const shareToFacebook = (image: string, text: string) => { ... }
    return { generateShareImage, shareToTwitter, shareToFacebook, ... }
}

const useDataExport = () => {
    // データ出力・エクスポート管理 [新規]
    const exportToPDF = (results: TrainingResults[]) => { ... }
    const exportToJSON = (results: TrainingResults[]) => { ... }
    const generateCharts = (results: TrainingResults[]) => { ... }
    return { exportToPDF, exportToJSON, generateCharts, ... }
}
```

**Page Router構成**:
```typescript
pages/
├── index.tsx                 // ホーム・モード選択
├── training/
│   ├── random.tsx           // ランダム基音モード
│   ├── continuous.tsx       // 連続モード
│   └── chromatic.tsx        // 12音モード
├── results/
│   └── [id].tsx            // 結果詳細ページ
└── settings.tsx            // 設定ページ
```

**コンポーネント構成**:
```typescript
components/
├── layout/
│   ├── Header.tsx          // ナビゲーション
│   └── Layout.tsx          // 共通レイアウト
├── training/
│   ├── ModeSelector.tsx    // モード選択UI
│   ├── SettingsPanel.tsx   // 設定パネル
│   ├── FrequencyDisplay.tsx // 周波数表示
│   ├── ProgressIndicator.tsx // 進捗表示
│   └── ResultsDisplay.tsx  // 結果表示
├── export/ [新規]
│   ├── ShareButtons.tsx    // SNS共有ボタン群
│   ├── ExportPanel.tsx     // エクスポート設定パネル
│   ├── ResultImageGenerator.tsx // 結果画像生成
│   └── PDFReportGenerator.tsx // PDF生成コンポーネント
├── charts/ [新規]
│   ├── ScoreChart.tsx      // スコアグラフ
│   ├── ProgressChart.tsx   // 進捗チャート
│   ├── AccuracyChart.tsx   // 正解率チャート
│   └── TrendChart.tsx      // 傾向分析チャート
├── audio/
│   ├── MicrophoneButton.tsx // マイク制御
│   └── BaseTonePlayer.tsx  // 基音再生
└── common/
    ├── Button.tsx          // 共通ボタン
    ├── Modal.tsx           // モーダル
    └── DownloadButton.tsx  // ダウンロードボタン [新規]
```

#### 4.2.2 拡張データフロー [更新]
```
モード選択 → 設定確認 → 許可状態チェック → 初期化フロー選択 → トレーニング実行 → 評価・統計 → 共有・出力
    ↓           ↓            ↓                   ↓              ↓           ↓         ↓
[UI選択] → [設定値] → [Permissions API] → [preload/ondemand] → [音程検出] → [結果処理] → [エクスポート]
    ↓           ↓            ↓                   ↓              ↓           ↓         ↓
[モード管理] → [検証] → [マイク入力] → [ノイズリダクション] → [判定] → [統計分析] → [SNS連携]
```

**モード別フロー**:
- **ランダム基音**: 基音選択→再生→測定→評価→完了→共有選択
- **連続モード**: 設定→ループ開始→(基音→測定→評価)×N回→総合評価→レポート生成
- **12音モード**: 基音選択→シーケンス生成→上り実行→下り実行→総合分析→PDF出力

**共有・出力フロー [新規]**:
- **画像生成**: Canvas API→結果画像作成→SNS用フォーマット
- **PDF生成**: jsPDF→チャート統合→詳細レポート作成
- **データエクスポート**: JSON/CSV→学習データ出力→ダウンロード

### 4.3 強化ノイズリダクション仕様 [更新]
- **ハイパスフィルター**: 150Hz以下カット（Q=2.0）- 23-25Hz完全遮断
- **ローパスフィルター**: 2kHz以上カット（Q=0.7）
- **ノッチフィルター**: 60Hz電源ノイズカット（Q=30）
- **ゲインノード**: 1.2倍音量補正

### 4.4 ハイブリッド許可システム仕様 [新規]
```javascript
// 許可状態判定ロジック
async determineInitializationFlow() {
    if (!navigator.permissions) {
        return 'ondemand'; // API非対応 → 従来フロー
    }
    
    const permission = await navigator.permissions.query({name: 'microphone'});
    switch (permission.state) {
        case 'granted':
            return 'preload';                    // 事前初期化
        case 'denied':
            return 'ondemand-with-explanation';  // 説明付き再要求
        case 'prompt':
            return 'ondemand';                   // 通常要求
    }
}
```

### 4.5 拡張基音システム仕様 [更新]

#### 4.5.1 ランダム基音モード用（既存）
```javascript
const randomBaseTones = [
    { name: 'Bb3', note: 'シ♭3', frequency: 233.08 },
    { name: 'C4',  note: 'ド4',   frequency: 261.63 },
    { name: 'Db4', note: 'レ♭4', frequency: 277.18 },
    { name: 'D4',  note: 'レ4',   frequency: 293.66 },
    { name: 'Eb4', note: 'ミ♭4', frequency: 311.13 },
    { name: 'E4',  note: 'ミ4',   frequency: 329.63 },
    { name: 'F4',  note: 'ファ4', frequency: 349.23 },
    { name: 'Gb4', note: 'ソ♭4', frequency: 369.99 },
    { name: 'G4',  note: 'ソ4',   frequency: 392.00 },
    { name: 'Ab4', note: 'ラ♭4', frequency: 415.30 }
];
```

#### 4.5.2 12音モード用（新規）
```javascript
const chromaticBaseTones = [
    { name: 'C4',  note: 'ド',   frequency: 261.63, sharp: false },
    { name: 'C#4', note: 'ド#',  frequency: 277.18, sharp: true },
    { name: 'D4',  note: 'レ',   frequency: 293.66, sharp: false },
    { name: 'D#4', note: 'レ#',  frequency: 311.13, sharp: true },
    { name: 'E4',  note: 'ミ',   frequency: 329.63, sharp: false },
    { name: 'F4',  note: 'ファ', frequency: 349.23, sharp: false },
    { name: 'F#4', note: 'ファ#', frequency: 369.99, sharp: true },
    { name: 'G4',  note: 'ソ',   frequency: 392.00, sharp: false },
    { name: 'G#4', note: 'ソ#',  frequency: 415.30, sharp: true },
    { name: 'A4',  note: 'ラ',   frequency: 440.00, sharp: false },
    { name: 'A#4', note: 'ラ#',  frequency: 466.16, sharp: true },
    { name: 'B4',  note: 'シ',   frequency: 493.88, sharp: false }
];
```

#### 4.5.3 トレーニングシーケンス生成
```javascript
// 連続モード用
function generateContinuousSequence(rounds) {
    return Array.from({length: rounds}, () => 
        randomBaseTones[Math.floor(Math.random() * randomBaseTones.length)]
    );
}

// 12音モード用
function generateChromaticSequence(startTone) {
    const startIndex = chromaticBaseTones.findIndex(tone => tone.name === startTone);
    
    // 上り: startTone から B4 まで
    const ascending = chromaticBaseTones.slice(startIndex);
    
    // 下り: B4 から startTone まで（逆順）
    const descending = chromaticBaseTones.slice(startIndex).reverse();
    
    return { ascending, descending, total: ascending.length + descending.length };
}
```

---

## 🚨 5. 設計制約と原則

### 5.1 不変の設計原則
1. **スタートボタンの純粋性**: 100%基音再生専用
2. **ハイブリッド事前準備**: Permissions API活用による最適化
3. **標準エラーダイアログ**: confirm() + location.reload()

### 5.2 実装制約

#### 5.2.1 禁止事項
- ❌ スタートボタンでのマイク初期化
- ❌ 独自エラーダイアログの使用
- ❌ 基音表示要素の追加
- ❌ 推測による実行
- ❌ ユーザー許可なしの修正

#### 5.2.2 必須事項
- ✅ 設計原則書の参照
- ✅ エラーダイアログ仕様書の参照
- ✅ ハイブリッドマイク許可システムの実装
- ✅ 8色ループシステムの実装
- ✅ 作業ログの更新
- ✅ ユーザー承認の取得

### 5.3 開発ルール

#### 5.3.1 使い捨てブランチ運用
```
[機能名]-v[版数]-impl-[番号]
例: hybrid-microphone-v2-impl-001
```

#### 5.3.2 作業ログ管理
- **WORK_LOG.md**: 日次作業記録
- **ERROR_LOG.md**: エラー・問題記録
- **DECISION_LOG.md**: 重要決定記録

---

## 🔍 6. 現在の問題点と解決すべき課題

### 6.1 最重要課題 [更新]

#### 6.1.1 23-25Hz低周波ノイズ問題 [P0]
- **現状**: 150Hzハイパスフィルター実装済みだが完全解決には至らず
- **影響**: 不要な検出、誤判定、大量ログ出力（2400メッセージ/分）
- **対策**: より強力なフィルター（200Hz + Q=3.0）への強化が必要
- **解決方針**: フィルターチェーン接続の確実性確保と周波数閾値の大幅引き上げ

#### 6.1.2 マイク許可UX最適化 [P0] [新規]
- **現状**: 従来方式の限界（許可済みユーザーの待機時間）
- **解決策**: ハイブリッドマイク許可システムによる最適化
- **効果**: 許可済みユーザー→0秒開始、未許可→説明付き要求

#### 6.1.3 もう一度ボタン機能 [P0]
- **現状**: マイク継続使用で実装済み
- **課題**: 確実な動作保証が必要
- **解決方針**: retry()でのマイク停止回避

### 6.2 改善点

#### 6.2.1 音程検出精度 [P1]
- **オクターブ補正**: 動的補正システムの最適化
- **ノイズ耐性**: 環境ノイズに対する堅牢性
- **レスポンス**: 検出速度の向上

#### 6.2.2 UI/UX改善 [P2]
- **視覚的フィードバック**: 音程の可視化
- **操作性**: 直感的なインターフェース
- **レスポンシブ**: モバイル対応

---

## 🎯 7. 実装優先度

### 7.1 P0: 必須機能（動作に必要）
1. **ハイブリッドマイク許可システム**: Permissions API統合
2. **23-25Hz低周波ノイズ除去**: 200Hz + Q=3.0強化フィルター
3. **基本ランダム基音モード**: 既存機能の安定動作
4. **基音再生**: ピアノ音による確実な基音再生

### 7.2 P1: 重要機能（品質向上）
1. **ランダム基音連続モード**: 自動連続実行機能 [新規]
2. **モード切り替えUI**: 3つのモード選択インターフェース [新規]
3. **音程検出精度**: オクターブ補正の最適化
4. **拡張エラーハンドリング**: 14種類のエラーケース対応

### 7.3 P2: 推奨機能（UX向上）
1. **12音モード**: 半音階完全網羅トレーニング [新規]
2. **統合評価システム**: 総合統計・進捗管理 [新規]
3. **SNS連携機能**: Twitter/Facebook/LINE/Instagram共有 [新規]
4. **PDF出力機能**: 詳細レポート生成・ダウンロード [新規]
5. **UI改善**: アニメーション・視覚的フィードバック
6. **モバイル対応**: レスポンシブデザイン

### 7.4 P3: 拡張機能（将来対応）
1. **回数選択制拡張**: 1/3/5/7/10回の柔軟な設定
2. **カスタム設定**: 難易度調整・音階範囲設定
3. **データ保存**: 履歴・進捗管理・エクスポート機能
4. **ソーシャル機能**: 結果共有・競争・ランキング

---

## 🎯 8. 成功判定基準

### 8.1 技術的成功
- [ ] ハイブリッドマイク許可システムの正常動作
- [ ] 許可済みユーザーの0秒開始実現
- [ ] 23-25Hz低周波ノイズの完全除去
- [ ] 音程検出が正常に動作（±50セント精度）
- [ ] 3つのトレーニングモードの正常動作 [新規]
- [ ] モード切り替えUIの直感的操作 [新規]
- [ ] エラー時に適切なダイアログ表示

### 8.2 性能基準
- [ ] 音程検出レスポンス: < 16ms（60FPS）
- [ ] 基音再生遅延: < 100ms
- [ ] 初期化時間: 許可済み→0秒、未許可→1秒以内
- [ ] メモリ使用量: < 50MB
- [ ] CPU使用率: < 30%

### 8.3 UX成功
- [ ] 許可済みユーザーの即座開始
- [ ] 未許可ユーザーへの適切な説明
- [ ] 拒否済みユーザーの設定変更案内
- [ ] 3つのモード間のスムーズな切り替え
- [ ] 連続モードの自動実行と進捗表示
- [ ] 12音モードの基音選択と統計表示
- [ ] SNS共有機能の直感的操作 [新規]
- [ ] PDF出力の高品質レポート生成 [新規]
- [ ] 結果画像の魅力的なデザイン [新規]
- [ ] プライバシー設定の明確な制御 [新規]
- [ ] 直感的で予測可能な動作
- [ ] エラー時の適切な案内
- [ ] モバイル環境での正常動作

### 8.4 品質基準
- [ ] 連続使用時の安定動作（30分以上）
- [ ] 異なるブラウザでの動作確認
- [ ] 異なるデバイスでの動作確認
- [ ] エラー復旧の自動化
- [ ] Permissions API非対応ブラウザでの正常動作

### 8.5 設計成功
- [ ] 設計原則に完全準拠
- [ ] シンプルで保守性の高いコード
- [ ] 明確な責任分離（7クラス構成） [更新]
- [ ] 拡張性の確保（新モード追加容易性） [更新]
- [ ] ハイブリッドシステムの効果的運用
- [ ] モジュラー設計による機能分離 [新規]

---

## 🚀 9. ハイブリッド実装ガイドライン [新規]

### 9.1 PermissionManager実装
```javascript
class PermissionManager {
    constructor() {
        this.microphoneState = 'unknown';
        this.isAPISupported = this.checkAPISupport();
        console.log('🔐 PermissionManager初期化完了');
    }
    
    checkAPISupport() {
        return !!(navigator.permissions && navigator.permissions.query);
    }
    
    async checkMicrophonePermission() {
        if (!this.isAPISupported) {
            return 'prompt'; // フォールバック
        }
        
        try {
            const permission = await navigator.permissions.query({name: 'microphone'});
            this.microphoneState = permission.state;
            return permission.state;
        } catch (error) {
            return 'prompt'; // エラー時フォールバック
        }
    }
}
```

### 9.2 ハイブリッド初期化フロー
```javascript
// SimplePitchTrainingクラス
async initializeSmartFlow() {
    console.log('🎯 ハイブリッド初期化開始');
    
    const permissionState = await this.microphone.permissionManager.checkMicrophonePermission();
    
    if (permissionState === 'granted') {
        // 許可済み → 事前初期化
        this.initializationMode = 'preload';
        await this.preloadInitialization();
    } else {
        // 未許可 → オンデマンド初期化
        this.initializationMode = 'ondemand';
        this.setupOnDemandFlow();
    }
}
```

### 9.3 強化ノイズリダクション
```javascript
function setupEnhancedNoiseReduction() {
    // 23-25Hz完全遮断のための強化設定
    this.noiseReduction.highPassFilter.frequency.value = 200; // 150Hz→200Hz
    this.noiseReduction.highPassFilter.Q.value = 3.0;         // 2.0→3.0
    
    // より急峻なカットオフ特性
    console.log('✅ 強化ノイズリダクション: 200Hz Q=3.0 (23-25Hz完全遮断)');
}
```

---

## 📚 10. 参照仕様書一覧

### 10.1 必須参照
- **CLAUDE.md**: プロジェクトルール・ガイドライン
- **SIMPLE_PITCH_TRAINING_DESIGN_PRINCIPLES.md**: 設計原則
- **ERROR_DIALOG_SPECIFICATION.md**: エラーダイアログ仕様
- **HYBRID_MICROPHONE_PERMISSION_REQUIREMENTS.md**: ハイブリッドマイク許可仕様 [統合済み]
- **SIMPLE_PITCH_TRAINING_FINAL_SPECIFICATION.md**: 最終仕様書

### 10.2 技術参照
- **PITCHY_SPECS.md**: Pitchy仕様・使用方法
- **TONE_JS_NOTES.md**: Tone.js実装・音源設定
- **WEB_AUDIO_API_GUIDE.md**: Web Audio API実装

### 10.3 作業管理
- **WORK_LOG.md**: 作業記録・進捗管理
- **ERROR_LOG.md**: エラー・問題記録
- **DECISION_LOG.md**: 重要決定記録

---

## 📊 11. 期待効果とパフォーマンス比較 [新規]

### 11.1 ハイブリッドシステム効果
| 指標 | 従来方式 | ハイブリッド方式 | 改善効果 |
|------|----------|------------------|----------|
| **初回許可済みユーザー** | 1秒待機 | 0秒即座開始 | **100%高速化** |
| **未許可ユーザー** | 突然の許可要求 | 説明付き要求 | **UX向上** |
| **拒否済みユーザー** | 無限ループ | 適切な再許可手順 | **問題解決** |
| **ベストプラクティス準拠** | 50% | 95% | **90%向上** |

### 11.2 総合評価比較
| 評価軸 | ページロード時 | スタートボタン時 | **ハイブリッド方式** |
|--------|----------------|------------------|---------------------|
| **ユーザビリティ** | 6/10 | 8/10 | **9/10** |
| **セキュリティ・プライバシー** | 3/10 | 9/10 | **9/10** |
| **ベストプラクティス準拠** | 2/10 | 9/10 | **9/10** |
| **パフォーマンス** | 8/10 | 6/10 | **9/10** |
| **総合評価** | 4.75/10 | 8/10 | **9/10** |

---

## 🎯 12. 実装手順書 [更新]

### 12.1 Phase 1: 基盤システム（約1時間）

#### Step 1: PermissionManagerクラス追加（15分）
```bash
# 対象ファイル: simple-pitch-training.js
# 位置: MicrophoneManagerクラスの前に追加
```

#### Step 2: MicrophoneManager拡張（15分）
```bash
# 修正箇所:
# - constructor()に permissionManager追加
# - requestAccessSmart()メソッド追加
# - requestAccessWithExplanation()メソッド追加
```

#### Step 3: SimplePitchTraining修正（20分）
```bash
# 修正箇所:
# - initializeSmartFlow()メソッド追加
# - preloadInitialization()メソッド追加
# - start()メソッド修正
# - showLoadingIndicator()メソッド追加
```

#### Step 4: 強化ノイズリダクション（5分）
```bash
# 修正箇所:
# - ハイパスフィルター: 200Hz Q=3.0に強化
# - 23-25Hz完全遮断設定
```

#### Step 5: エラーハンドラー拡張（5分）
```bash
# 修正箇所:
# - handleError()関数拡張
# - 新規エラーハンドラー関数追加
```

### 12.2 Phase 2: Next.js移行・多モード・共有システム（約4.5時間）

#### Step 6: Next.js プロジェクト初期化（30分）
```bash
# Next.js プロジェクト作成
npx create-next-app@latest pitch-training-app --typescript --tailwind --app-router

# 追加ライブラリインストール
npm install tone pitchy framer-motion @types/web-audio-api react-icons \
  chart.js react-chartjs-2 jspdf html2canvas react-share \
  canvas-confetti @types/canvas-confetti

# プロジェクト構造セットアップ
mkdir -p {components,hooks,types,utils}/{layout,training,audio,common}
```

#### Step 7: TypeScript型定義・カスタムHooks（60分）
```bash
# 対象ファイル: types/index.ts, hooks/
# 実装内容:
# - TrainingMode, ModeSettings型定義
# - usePermissionManager Hook
# - useMicrophoneManager Hook
# - usePitchDetection Hook
# - useBaseToneManager Hook
# - useTrainingMode Hook
# - useEvaluation Hook
```

#### Step 8: Reactコンポーネント実装（90分）
```bash
# 対象ファイル: components/
# 実装内容:
# - Layout.tsx (共通レイアウト)
# - ModeSelector.tsx (モード選択)
# - FrequencyDisplay.tsx (周波数表示)
# - ProgressIndicator.tsx (進捗表示)
# - ResultsDisplay.tsx (結果表示)
# - MicrophoneButton.tsx (マイク制御)
# - SettingsPanel.tsx (設定パネル)
```

#### Step 9: ページルーティング・共有機能実装（90分）
```bash
# 対象ファイル: pages/, components/export/, components/charts/
# 実装内容:
# - index.tsx (ホームページ)
# - training/[mode].tsx (動的ルーティング)
# - results/[id].tsx (結果詳細)
# - settings.tsx (設定ページ)
# - ShareButtons.tsx (SNS共有コンポーネント)
# - PDFReportGenerator.tsx (PDF生成)
# - ResultImageGenerator.tsx (画像生成)
# - Chart系コンポーネント (4種類)
```

### 12.3 Phase 3: 統合テスト・デプロイ（約1時間）

#### Step 10: 統合テスト（30分）
```bash
# テスト項目:
# - Next.js開発サーバーでの動作確認
# - 3つのモード切り替え
# - 連続モード自動実行
# - 12音モード上り下り
# - 統合評価表示
# - レスポンシブ・モバイル環境確認
# - TypeScript型チェック
```

#### Step 11: Vercel デプロイ（30分）
```bash
# Vercelにデプロイ（推奨）
npm install -g vercel
vercel --prod

# または GitHub Pages（静的エクスポート）
npm run build
npm run export

# 設定項目:
# - 環境変数設定（必要に応じて）
# - ドメイン設定
# - HTTPS自動有効化
# - モバイル環境確認
```

### 12.4 実装時間・総コスト見積もり

#### 実装フェーズ別時間
- **Phase 1**: 基盤システム → 1時間
- **Phase 2**: Next.js移行・多モード・共有システム → 4.5時間  
- **Phase 3**: 統合テスト・デプロイ → 1時間
- **総実装時間**: **約6.5時間**

#### Next.js移行によるメリット
- **開発効率**: TypeScript型安全性
- **保守性**: コンポーネント化・再利用性
- **拡張性**: ページルーティング・状態管理
- **UX**: レスポンシブ・アニメーション
- **デプロイ**: Vercel自動デプロイ

---

**この統合要件定義書は、全仕様書の内容を統合し、ハイブリッドマイク許可システムと3つのトレーニングモードを含む新規開発時に確実に動作する高品質なアプリケーションを構築するための包括的なガイドラインです。**

## 📋 新規追加モード仕様サマリー

### 🎲 ランダム基音モード（基本）
- **現状**: 既存実装済み
- **動作**: 10種類の基音からランダム選択→8音階発声

### 🔁 ランダム基音連続モード（P1優先度）
- **新機能**: 自動連続実行（3/5/10回選択制）
- **統合評価**: 各ラウンド結果＋総合統計表示

### 🎹 12音モード（P2優先度）
- **新機能**: 半音階完全網羅（24ラウンド：上り12+下り12）
- **基音選択**: ユーザーが12音から選択可能
- **詳細分析**: 基音別傾向分析＋総合評価

### 🎯 実装効果
- **学習効率**: 連続モードで集中的トレーニング
- **完全性**: 12音モードで全音階網羅
- **柔軟性**: 3つのモード自由切り替え
- **共有性**: SNS連携による学習成果の可視化 [新規]
- **記録性**: PDF出力による詳細な学習記録 [新規]

*最終更新: 2025-07-16*  
*対象バージョン: v3.1.0-social-export-comprehensive（SNS連携・エクスポート対応版）*  
*統合済み仕様: HYBRID_MICROPHONE_PERMISSION_REQUIREMENTS.md + 3つのトレーニングモード + Next.js移行 + SNS連携・PDF出力*

### 🚀 Next.js移行による追加価値

#### 📈 技術的向上
- **TypeScript**: 型安全性による品質向上
- **React Hooks**: 状態管理の効率化
- **Tailwind CSS**: レスポンシブデザインの標準化
- **コンポーネント化**: 再利用性・保守性の向上

#### 🎯 UX向上
- **Page Router**: `/training/random`, `/training/continuous`, `/training/chromatic`の明確な分離
- **SPA**: ページ遷移の高速化
- **レスポンシブ**: モバイル・タブレット・デスクトップ対応
- **アニメーション**: Framer Motionによる滑らかな移行

#### 🔧 開発・運用効率
- **Vercel**: 自動デプロイ・HTTPS・CDN
- **型チェック**: 実行時エラーの事前防止
- **開発サーバー**: ホットリロードによる高速開発
- **静的解析**: ESLint・Prettierによるコード品質

#### 💡 将来拡張性
- **API Routes**: 将来のバックエンド機能追加
- **データ永続化**: localStorage・IndexedDB統合
- **プログレッシブWebApp**: PWA対応
- **多言語対応**: i18n統合準備
- **クラウド同期**: Firebase/Supabase統合によるデータ同期 [新規]
- **AIフィードバック**: OpenAI API統合による個別指導 [新規]
- **リアルタイム競争**: WebSocket対応のマルチプレイヤー機能 [新規]