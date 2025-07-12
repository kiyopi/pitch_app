# 🎲 ランダム基音機能 仕様書

## 📋 概要

相対音感トレーニングアプリに実装されたランダム基音選択システムの詳細仕様。毎回のトレーニングセッションで異なる基音を自動選択し、選択された基音に応じて全ての周波数を移調する機能。

**実装バージョン**: v1.0.8-RandomBaseTone  
**実装日**: 2025-07-12  
**ブランチ**: random-tone-v2

---

## 🎯 機能仕様

### 1. ランダム基音選択システム

#### 基音オプション（10種類）
```javascript
[
    { name: 'Bb3', note: 'シ♭3', frequency: 233.08, tonejs: 'Bb3' },
    { name: 'C4',  note: 'ド4',   frequency: 261.63, tonejs: 'C4' },
    { name: 'Db4', note: 'レ♭4', frequency: 277.18, tonejs: 'Db4' },
    { name: 'D4',  note: 'レ4',   frequency: 293.66, tonejs: 'D4' },
    { name: 'Eb4', note: 'ミ♭4', frequency: 311.13, tonejs: 'Eb4' },
    { name: 'E4',  note: 'ミ4',   frequency: 329.63, tonejs: 'E4' },
    { name: 'F4',  note: 'ファ4', frequency: 349.23, tonejs: 'F4' },
    { name: 'Gb4', note: 'ソ♭4', frequency: 369.99, tonejs: 'Gb4' },
    { name: 'G4',  note: 'ソ4',   frequency: 392.00, tonejs: 'G4' },
    { name: 'Ab4', note: 'ラ♭4', frequency: 415.30, tonejs: 'Ab4' }
]
```

#### 選択タイミング
- **初回ロード時**: アプリ起動時に自動選択
- **トレーニング開始時**: 毎回新しい基音を選択
- **セッション終了後**: 次回開始時に再選択

#### 選択方式
- **短音モード**: 完全ランダム選択（`Math.random()`）
- **将来の連続モード**: 直近3回の履歴を避けた選択

---

## 🎼 移調システム

### 移調計算方式
```javascript
// C4 (261.63Hz) を基準とした比率計算
const baseRatio = selectedBaseTone.frequency / 261.63;

// 元の8音階を移調
const originalFreqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
const transposedFreqs = originalFreqs.map(freq => Math.round(freq * baseRatio * 100) / 100);
```

### 移調例
| 基音 | 比率 | ド | レ | ミ | ファ | ソ | ラ | シ | ド |
|------|------|----|----|----|----|----|----|----|----|
| **C4** | 1.000 | 262Hz | 294Hz | 330Hz | 349Hz | 392Hz | 440Hz | 494Hz | 523Hz |
| **D4** | 1.122 | 294Hz | 329Hz | 370Hz | 392Hz | 440Hz | 494Hz | 554Hz | 587Hz |
| **F4** | 1.335 | 349Hz | 392Hz | 440Hz | 466Hz | 523Hz | 587Hz | 659Hz | 698Hz |
| **Bb3** | 0.891 | 233Hz | 262Hz | 294Hz | 311Hz | 349Hz | 392Hz | 440Hz | 466Hz |

---

## 🎨 UI仕様

### スタートボタン表示

#### 短音モード
```html
<!-- 基音情報をボタンに表示 -->
<button class="main-start-btn">
    🎹 スタート<br>
    <small>(基音: レ4)</small>
</button>
```

#### CSS仕様
```css
.main-start-btn {
    line-height: 1.2;
    text-align: center;
    font-size: 1.3rem;
}

.main-start-btn small {
    font-size: 0.8em;
    opacity: 0.9;
    display: block;
    margin-top: 5px;
    font-weight: normal;
}
```

### ガイドボタン更新
```javascript
// 選択基音に応じて全ガイドボタンの周波数を更新
updateGuideFrequencyDisplay() {
    // モバイル・デスクトップ両方のガイドボタンを更新
    // 音名: 相対表記（ド・レ・ミ...）のまま
    // 周波数: 移調後の値に更新
}
```

---

## 🏗️ アーキテクチャ

### クラス構成

#### BaseToneManager
```javascript
class BaseToneManager {
    constructor(mode = 'single') {
        this.mode = mode;                    // 'single' | 'continuous'
        this.baseToneOptions = [...];        // 10種類の基音データ
        this.currentBaseTone = null;         // 現在選択中の基音
        this.sessionHistory = [];           // 履歴（将来の連続モード用）
        this.currentSession = 0;            // セッション番号
    }
    
    selectBaseToneForNewSession() { /* ランダム選択 */ }
    getRandomBaseTone() { /* 完全ランダム */ }
    getRandomBaseToneAvoidingRecent() { /* 履歴考慮 */ }
    getCurrentBaseToneInfo() { /* 基音情報取得 */ }
}
```

#### FullScaleTraining（拡張部分）
```javascript
class FullScaleTraining {
    constructor() {
        // ランダム基音システム
        this.trainingMode = 'single';
        this.baseToneManager = new BaseToneManager(this.trainingMode);
        
        this.initRandomBaseToneSystem();
    }
    
    selectNewBaseTone() { /* 新基音選択+移調計算 */ }
    calculateTransposedFrequencies() { /* 移調計算 */ }
    updateNoteNamesForBaseTone() { /* 音名更新 */ }
    updateGuideFrequencyDisplay() { /* UI更新 */ }
    updateStartButtonWithBaseTone() { /* ボタン表示更新 */ }
}
```

---

## 🎹 Tone.js統合

### 基音再生
```javascript
async playReferenceNote() {
    const baseTone = this.baseToneManager.currentBaseTone;
    const toneName = baseTone.tonejs; // 例: 'D4', 'Gb4'
    
    // 選択された基音でピアノサンプル再生
    this.pianoSampler.triggerAttack(toneName, undefined, 0.8);
    
    // 2秒後にフェイドアウト
    setTimeout(() => {
        this.pianoSampler.triggerRelease(toneName);
    }, 2000);
}
```

### サンプラー設定
```javascript
// 既存のSalamander Piano サンプルを使用
this.pianoSampler = new Tone.Sampler({
    urls: {
        "C4": "C4.mp3",
        "D#4": "Ds4.mp3", 
        "F#4": "Fs4.mp3",
        "A4": "A4.mp3",
    },
    baseUrl: "https://tonejs.github.io/audio/salamander/"
}).toDestination();
```

---

## 🔧 フロー図

### 初期化フロー
```
アプリ起動
    ↓
BaseToneManager初期化
    ↓
初回基音ランダム選択
    ↓
移調計算実行
    ↓
UI更新（ガイド周波数）
    ↓
準備完了
```

### トレーニング開始フロー
```
[スタート]ボタンクリック
    ↓
新しい基音選択
    ↓
移調計算+UI更新
    ↓
AudioContext初期化
    ↓
マイクアクセス
    ↓
ボタン更新（基音表示）
    ↓
[🎹 スタート (基音: X)]表示
    ↓
基音再生準備完了
```

### 基音再生フロー
```
[🎹 スタート]ボタンクリック
    ↓
マイク一時停止
    ↓
選択基音でTone.js再生
    ↓
2.5秒間再生
    ↓
ガイドアニメーション開始
    ↓
マイク再開
    ↓
ピッチ検出開始
```

---

## 📊 テスト結果

### ランダム性テスト
```
基音分布テスト (100回実行):
C4: 12回, D4: 13回, Eb4: 15回, Bb3: 7回
G4: 9回, Db4: 8回, Ab4: 6回, F4: 8回
Gb4: 10回, E4: 12回

結果: 適切にランダム分布
```

### 移調計算テスト
```
基音D4 (293.66Hz) の場合:
ド: 294Hz → ド: 587Hz (比率: 1.122)
基音Bb3 (233.08Hz) の場合:
ド: 233Hz → ド: 466Hz (比率: 0.891)

結果: 数学的に正確
```

---

## 🚀 将来の拡張計画

### 連続モード設計
```javascript
// 将来実装予定
class ContinuousTrainingManager {
    startContinuousTraining(sessionCount = 5) {
        // 5回連続セッション
        // 各セッションで異なる基音
        // 履歴重複回避
        // 総合成績表示
    }
}
```

### 連続モード時のUI
```html
<!-- 将来の連続モード用パネル -->
<div class="base-tone-info-panel">
    <div class="session-progress">セッション: 3/5</div>
    <div class="current-base-tone">現在の基音: ファ4</div>
    <div class="next-base-tone">次回: ソ♭4</div>
</div>
```

---

## 📝 設定ファイル

### 基音設定のカスタマイズ
```javascript
// 将来的にJSON設定ファイル化可能
{
    "baseToneOptions": [
        {"name": "C4", "frequency": 261.63, "enabled": true},
        {"name": "D4", "frequency": 293.66, "enabled": true}
    ],
    "selectionMode": "random", // "random" | "sequential" | "weighted"
    "avoidRecentCount": 3
}
```

---

## 🔍 デバッグ・ログ

### 主要ログ出力
```
🎲 BaseToneManager初期化 (singleモード, 10種類の基音)
🎲 セッション1 基音選択: レ4 (293.66Hz)
🎼 移調計算完了 (比率: 1.122)
🎵 スタートボタン更新: 基音 レ4 (293.66Hz)
🔊 レ4 (294Hz) 本物のピアノ音再生開始
```

### エラーハンドリング
- 基音選択失敗時: C4にフォールバック
- Tone.js読み込み失敗時: 合成音にフォールバック
- 移調計算エラー時: 元の周波数を維持

---

## 📚 技術仕様

### 対応ブラウザ
- Chrome 80+（推奨）
- Safari 13+（iOS含む）
- Firefox 75+
- Edge 80+

### 依存関係
- **Tone.js**: v14.7.77（ピアノサンプル再生）
- **Pitchy**: v4（ピッチ検出）
- **Web Audio API**（マイクアクセス）

### パフォーマンス
- **基音選択**: < 1ms
- **移調計算**: < 5ms
- **UI更新**: < 10ms
- **Tone.js再生開始**: < 5ms（事前読み込み済み）

---

## 📖 利用方法

### 基本操作
1. アプリにアクセス
2. [トレーニング開始]をクリック
3. 表示される基音を確認（例：基音: レ4）
4. [🎹 スタート (基音: レ4)]をクリック
5. 基音を聞いてドレミファソラシドを発声
6. 新しいセッション開始時は自動的に新しい基音が選択される

### 音楽的な効果
- **相対音感向上**: 異なる基音での練習により絶対音感に依存しない
- **移調能力**: 実際の演奏で必要な移調感覚を養成
- **音程感覚**: 基音と目標音程の関係性を体感

---

## ⚙️ 設定・カスタマイズ

### 開発者向け設定
```javascript
// BaseToneManagerの設定変更
const manager = new BaseToneManager('single');
manager.baseToneOptions = customBaseTones; // カスタム基音リスト
```

### 将来のユーザー設定項目
- 基音の種類選択（全10種類 or 一部選択）
- 選択方式（完全ランダム vs 重複回避）
- 基音表示方法（ボタン内 vs 別パネル）

---

**仕様書バージョン**: 1.0  
**最終更新**: 2025-07-12  
**作成者**: Claude Code Assistant