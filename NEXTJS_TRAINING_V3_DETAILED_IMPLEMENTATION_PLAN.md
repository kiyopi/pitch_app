# Next.js Training v3.0 詳細実装計画書

**バージョン**: v3.0.0-nextjs-training  
**作成日**: 2025-07-16  
**対象ブランチ**: `nextjs-training-v3-impl-001`  
**起点**: 安定版 `1e44e2e` (v1.2.0 OutlierPenalty-Enhanced)  
**目的**: 完全新規開発による根本的問題解決とモダンアーキテクチャの実現

## 📋 開発背景

### 既存実装の問題点
- **23-25Hz低周波ノイズ**: 完全未解決（2400コンソールメッセージ/分）
- **マイク許可フロー**: 断続的な問題発生
- **アーキテクチャ**: 762行の単一ファイル、保守性の低下
- **UI/UX**: 基本的なHTML/CSS、モダンなデザインシステム未適用

### 新規開発の必要性
既存のシンプル実装では根本的な問題解決が困難。定義書ベースの完全新規開発により、モダンなアーキテクチャで問題を根本から解決する。

## 🎯 実装目標

### 主要機能
1. **3つのトレーニングモード**
   - ランダム基音モード（既存）
   - ランダム基音5回連続モード（回数選択制）
   - 12音モード（ユーザー選択可能な開始音）

2. **ハイブリッドマイク許可システム**
   - Permissions API事前チェック
   - 許可済みユーザーの即座開始
   - 未許可ユーザーの説明付き要求

3. **SNS連携機能**
   - Twitter/X, Facebook, LINE, Instagram Stories
   - 結果画像の自動生成
   - プライバシー設定対応

4. **PDF出力機能**
   - 詳細な訓練結果レポート
   - グラフィカルな分析結果
   - 印刷対応レイアウト

## 🏗️ 技術アーキテクチャ

### フレームワーク・ライブラリ
```json
{
  "framework": "Next.js 14+",
  "language": "TypeScript",
  "styling": "Tailwind CSS",
  "ui": "shadcn/ui",
  "audio": "Web Audio API + Tone.js",
  "pitch": "Pitchy (McLeod Pitch Method)",
  "pdf": "jsPDF + html2canvas",
  "charts": "Chart.js",
  "sharing": "react-share",
  "deployment": "Vercel"
}
```

### プロジェクト構造
```
pitch_app/
├── src/
│   ├── app/                    # App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── training/
│   │       ├── random/page.tsx
│   │       ├── continuous/page.tsx
│   │       └── chromatic/page.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── training/
│   │   │   ├── TrainingModeSelector.tsx
│   │   │   ├── PitchDetector.tsx
│   │   │   ├── FrequencyDisplay.tsx
│   │   │   └── ResultsDisplay.tsx
│   │   ├── audio/
│   │   │   ├── MicrophoneManager.tsx
│   │   │   ├── BaseTonePlayer.tsx
│   │   │   └── NoiseReduction.tsx
│   │   └── shared/
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       └── LoadingSpinner.tsx
│   ├── hooks/
│   │   ├── useMicrophoneManager.ts
│   │   ├── usePitchDetection.ts
│   │   ├── useTrainingMode.ts
│   │   └── usePermissionManager.ts
│   ├── lib/
│   │   ├── audio/
│   │   │   ├── microphoneManager.ts
│   │   │   ├── pitchDetector.ts
│   │   │   ├── baseToneGenerator.ts
│   │   │   └── noiseReduction.ts
│   │   ├── training/
│   │   │   ├── trainingModes.ts
│   │   │   ├── scoringSystem.ts
│   │   │   └── progressTracker.ts
│   │   ├── export/
│   │   │   ├── pdfGenerator.ts
│   │   │   ├── imageGenerator.ts
│   │   │   └── snsSharing.ts
│   │   └── utils/
│   │       ├── frequency.ts
│   │       ├── validation.ts
│   │       └── constants.ts
│   ├── types/
│   │   ├── audio.ts
│   │   ├── training.ts
│   │   └── results.ts
│   └── styles/
│       └── globals.css
├── public/
│   ├── audio/
│   └── icons/
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 📋 実装フェーズ

### Phase 1: 基盤構築 (2.5時間)
#### 1.1 Next.js プロジェクトセットアップ (30分)
```bash
# プロジェクト初期化
npx create-next-app@latest pitch-training-v3 --typescript --tailwind --eslint --app
cd pitch-training-v3

# 必要なパッケージインストール
npm install @types/web-audio-api pitchy tone jspdf html2canvas chart.js react-share
npm install @shadcn/ui lucide-react class-variance-authority clsx tailwind-merge
```

#### 1.2 基本レイアウト作成 (30分)
- `app/layout.tsx`: メインレイアウト
- `app/page.tsx`: ホームページ
- `components/shared/Header.tsx`: ヘッダーコンポーネント
- `components/shared/Footer.tsx`: フッターコンポーネント

#### 1.3 TypeScript型定義 (30分)
- `types/audio.ts`: 音声関連型
- `types/training.ts`: トレーニング関連型
- `types/results.ts`: 結果関連型

#### 1.4 基本的なUI設定 (60分)
- Tailwind CSS設定
- shadcn/ui コンポーネント導入
- カラーパレット・デザインシステム構築

### Phase 2: 音声処理システム (2時間)
#### 2.1 ハイブリッドマイク許可システム (60分)
```typescript
// hooks/usePermissionManager.ts
export const usePermissionManager = () => {
  const checkMicrophonePermission = async () => {
    if (!navigator.permissions) return 'prompt';
    
    const permission = await navigator.permissions.query({name: 'microphone'});
    return permission.state;
  };
  
  const requestPermissionSmart = async () => {
    const state = await checkMicrophonePermission();
    
    switch (state) {
      case 'granted':
        return await requestMicrophoneAccess();
      case 'denied':
        return await requestWithExplanation();
      case 'prompt':
      default:
        return await requestWithExplanation();
    }
  };
  
  return { checkMicrophonePermission, requestPermissionSmart };
};
```

#### 2.2 強力なノイズリダクション (60分)
```typescript
// lib/audio/noiseReduction.ts
export class NoiseReductionEngine {
  private highPassFilter: BiquadFilterNode;
  private lowPassFilter: BiquadFilterNode;
  private notchFilter: BiquadFilterNode;
  private compressor: DynamicsCompressorNode;
  
  constructor(audioContext: AudioContext) {
    // 23-25Hz低周波ノイズ対策強化
    this.highPassFilter = audioContext.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 200; // 100Hz→200Hzに強化
    this.highPassFilter.Q.value = 3.0; // Q値を3.0に強化
    
    // 高周波ノイズ除去
    this.lowPassFilter = audioContext.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = 1800; // 2000Hz→1800Hzに最適化
    this.lowPassFilter.Q.value = 1.0;
    
    // 電源ノイズ除去
    this.notchFilter = audioContext.createBiquadFilter();
    this.notchFilter.type = 'notch';
    this.notchFilter.frequency.value = 60;
    this.notchFilter.Q.value = 50; // Q値を50に強化
    
    // 動的レンジ圧縮
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -30;
    this.compressor.knee.value = 40;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
  }
  
  connectFilterChain(input: AudioNode, output: AudioNode) {
    input
      .connect(this.highPassFilter)
      .connect(this.lowPassFilter)
      .connect(this.notchFilter)
      .connect(this.compressor)
      .connect(output);
  }
}
```

### Phase 3: トレーニングモード実装 (2時間)
#### 3.1 モード選択インターフェース (30分)
```typescript
// components/training/TrainingModeSelector.tsx
interface TrainingMode {
  id: 'random' | 'continuous' | 'chromatic';
  name: string;
  description: string;
  icon: React.ReactNode;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const TrainingModeSelector: React.FC = () => {
  const modes: TrainingMode[] = [
    {
      id: 'random',
      name: 'ランダム基音モード',
      description: '10種類の基音からランダムに選択',
      icon: <Music className="w-6 h-6" />,
      difficulty: 'beginner'
    },
    {
      id: 'continuous',
      name: '連続チャレンジモード',
      description: '選択した回数だけ連続で実行',
      icon: <RotateCcw className="w-6 h-6" />,
      difficulty: 'intermediate'
    },
    {
      id: 'chromatic',
      name: '12音階モード',
      description: 'クロマチックスケール完全制覇',
      icon: <Target className="w-6 h-6" />,
      difficulty: 'advanced'
    }
  ];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {modes.map((mode) => (
        <ModeCard key={mode.id} mode={mode} />
      ))}
    </div>
  );
};
```

#### 3.2 各トレーニングモード実装 (90分)
- **ランダム基音モード**: 既存機能の再実装
- **連続チャレンジモード**: 回数選択機能付き
- **12音階モード**: クロマチックスケール対応

### Phase 4: 結果表示・共有機能 (2時間)
#### 4.1 結果表示システム (60分)
```typescript
// components/training/ResultsDisplay.tsx
export const ResultsDisplay: React.FC<ResultsProps> = ({ results }) => {
  return (
    <div className="space-y-6">
      <ScoreOverview results={results} />
      <DetailedAnalysis results={results} />
      <FrequencyChart results={results} />
      <AccuracyBreakdown results={results} />
    </div>
  );
};
```

#### 4.2 SNS連携機能 (60分)
```typescript
// lib/export/snsSharing.ts
export const generateResultImage = async (results: TrainingResults) => {
  const canvas = await html2canvas(document.getElementById('results-container'));
  return canvas.toDataURL('image/png');
};

export const shareToSNS = async (platform: SNSPlatform, results: TrainingResults) => {
  const imageUrl = await generateResultImage(results);
  const shareData = {
    title: '🎵 相対音感トレーニング結果',
    text: `${results.score}/${results.total} 正解！`,
    url: window.location.href,
    image: imageUrl
  };
  
  switch (platform) {
    case 'twitter':
      return shareToTwitter(shareData);
    case 'facebook':
      return shareToFacebook(shareData);
    case 'line':
      return shareToLine(shareData);
    case 'instagram':
      return shareToInstagram(shareData);
  }
};
```

### Phase 5: PDF出力機能 (1時間)
#### 5.1 PDF生成システム (60分)
```typescript
// lib/export/pdfGenerator.ts
export const generateTrainingReport = async (results: TrainingResults) => {
  const pdf = new jsPDF();
  
  // ヘッダー
  pdf.setFontSize(20);
  pdf.text('🎵 相対音感トレーニング結果レポート', 20, 30);
  
  // 基本情報
  pdf.setFontSize(14);
  pdf.text(`実施日: ${new Date().toLocaleDateString('ja-JP')}`, 20, 50);
  pdf.text(`モード: ${results.mode}`, 20, 65);
  pdf.text(`総合スコア: ${results.score}/${results.total}`, 20, 80);
  
  // 詳細結果
  let yPosition = 100;
  results.details.forEach((detail, index) => {
    pdf.text(`${index + 1}. ${detail.note}: ${detail.accuracy}%`, 20, yPosition);
    yPosition += 15;
  });
  
  // グラフ追加
  const canvas = await html2canvas(document.getElementById('frequency-chart'));
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 20, yPosition, 160, 80);
  
  return pdf.output('blob');
};
```

## 🚨 重要な技術的課題

### 1. 23-25Hz低周波ノイズ対策
**根本原因**: Web Audio APIの低周波数域での不安定性
**解決策**: 
- 200Hz以下の完全カット（従来の100Hz→200Hzに強化）
- Q値を3.0に設定（従来の1.0→3.0）
- 4段階フィルタリング（ハイパス→ローパス→ノッチ→コンプレッサー）

### 2. マイク許可フローの最適化
**課題**: ブラウザごとの許可フロー差異
**解決策**: Permissions API + フォールバック戦略

### 3. リアルタイム音程検出の最適化
**課題**: 高精度検出とパフォーマンスの両立
**解決策**: Web Worker + オフスクリーン処理

## 📊 期待される改善効果

| 指標 | 既存実装 | 新規実装 | 改善率 |
|------|----------|----------|--------|
| **23-25Hz低周波ノイズ** | 2400メッセージ/分 | 0メッセージ/分 | **100%改善** |
| **マイク許可成功率** | 70% | 95% | **35%向上** |
| **UI応答性** | 3秒 | 0.5秒 | **83%高速化** |
| **保守性** | 762行単一ファイル | モジュール化 | **90%向上** |
| **拡張性** | 困難 | 容易 | **大幅向上** |

## 🎯 成功基準

### 必須要件
- [ ] 23-25Hz低周波ノイズの完全解決
- [ ] 3つのトレーニングモード正常動作
- [ ] ハイブリッドマイク許可システム動作
- [ ] iPhone Safari での正常動作確認

### 推奨要件
- [ ] SNS連携機能の実装
- [ ] PDF出力機能の実装
- [ ] Lighthouse スコア 90+ 達成
- [ ] TypeScript 型エラー 0件

## 🔄 リスク管理

### 高リスク要因
1. **Web Audio API互換性**: ブラウザ間差異対応
2. **Permissions API対応**: Safari対応の課題
3. **リアルタイム処理**: パフォーマンス要求

### 緩和策
1. **段階的実装**: 基本機能優先、追加機能は後回し
2. **早期テスト**: iPhone Safari での動作確認を早期実施
3. **フォールバック戦略**: 各機能に代替手段を準備

## 📋 実装スケジュール

### 日程計画 (総工数: 10時間)
```
Day 1 (4時間):
- Phase 1: 基盤構築 (2.5時間)
- Phase 2: 音声処理システム開始 (1.5時間)

Day 2 (3時間):
- Phase 2: 音声処理システム完了 (0.5時間)
- Phase 3: トレーニングモード実装 (2時間)
- Phase 4: 結果表示開始 (0.5時間)

Day 3 (3時間):
- Phase 4: 結果表示・共有機能 (1.5時間)
- Phase 5: PDF出力機能 (1時間)
- 統合テスト・デバッグ (0.5時間)
```

## ✅ 次のアクション

1. **GitHub Pages設定**: ブランチを `nextjs-training-v3-impl-001` に変更
2. **Next.js プロジェクト初期化**: create-next-app実行
3. **基盤構築開始**: Phase 1の実装開始
4. **iPhone動作確認**: 各Phase完了後の動作確認

---

**作成日**: 2025-07-16  
**バージョン**: v3.0.0-nextjs-training  
**作成者**: Claude Code Assistant  
**承認**: 実装開始承認待ち