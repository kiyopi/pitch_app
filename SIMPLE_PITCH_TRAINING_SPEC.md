# 🎵 シンプル相対音感トレーニング仕様書

**版数**: v1.0  
**作成日**: 2025-07-15  
**対象**: 簡素で確実なマイク機能による相対音感トレーニング  
**方針**: 最小限の機能で最大限の価値を提供  

---

## 📋 目次

1. [アプリケーション概要](#1-アプリケーション概要)
2. [核心機能](#2-核心機能)
3. [ユーザーフロー](#3-ユーザーフロー)
4. [技術仕様](#4-技術仕様)
5. [実装計画](#5-実装計画)
6. [品質保証](#6-品質保証)

---

## 1. アプリケーション概要

### 1.1 目的

**相対音感トレーニングの簡素化**
- ランダム基音を聞いて、ドレミファソラシドを正確に発声
- 音程の精度を測定し、即座にフィードバック
- シンプルで直感的な操作性

### 1.2 対象ユーザー

- **主要**: 音楽学習者（初心者〜中級者）
- **デバイス**: iPhone Safari, Android Chrome
- **環境**: 静かな室内での個人練習

### 1.3 成功指標

- **起動から測定開始**: 10秒以内
- **マイク許可率**: 90%以上
- **測定精度**: ±10セント以内
- **操作迷い**: ゼロ（直感的操作）

---

## 2. 核心機能

### 2.1 必須機能（MVP）

#### **A. 基音再生**
```
- 10種類の基音からランダム選択
- 2.5秒間のピアノ音再生
- 基音名表示（例：「基音 ド4」）
```

#### **B. マイク音声検出**
```
- ユーザーのタップでマイク許可要求
- リアルタイム周波数検出
- 8音階（ドレミファソラシド）順次測定
```

#### **C. 結果表示**
```
- 各音階の正確性（○×表示）
- 全体スコア（8点満点）
- 再挑戦ボタン
```

### 2.2 除外機能

**複雑な機能は実装しない**
- 外れ値分析
- 詳細スコアリング
- 結果共有機能
- 連続モード
- 設定画面

---

## 3. ユーザーフロー

### 3.1 理想的なフロー

```
1. 【ページアクセス】
   ↓ 即座にUI表示（マイク許可待ちなし）
   
2. 【スタートボタン押下】
   ↓ マイク許可ダイアログ表示
   
3. 【マイク許可】
   ↓ 基音再生開始
   
4. 【基音確認】（2.5秒）
   ↓ 自動的に測定開始
   
5. 【発声】ドレミファソラシド順次
   ↓ リアルタイム結果表示
   
6. 【完了】結果確認
   ↓ 再挑戦 or 終了
```

### 3.2 エラーケース

#### **マイク許可拒否**
```
- 明確なエラーメッセージ表示
- 再試行ボタン提供
- 許可方法の簡単な説明
```

#### **音声検出失敗**
```
- 「もう一度発声してください」表示
- スキップボタン提供
- 環境音の影響を説明
```

---

## 4. 技術仕様

### 4.1 マイク機能

#### **A. 許可要求タイミング**
```javascript
// NG: ページ読み込み時の自動許可
// OK: スタートボタン押下時の許可要求
startButton.onclick = async () => {
    try {
        await requestMicrophoneAccess();
        startTraining();
    } catch (error) {
        showMicrophoneError(error);
    }
};
```

#### **B. ストリーム管理**
```javascript
// シンプルなストリーム管理
class MicrophoneManager {
    async requestAccess() {
        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true }
        });
    }
    
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }
}
```

### 4.2 音程検出

#### **A. 使用ライブラリ**
```
- Pitchy v4 (McLeod Pitch Method)
- 対象周波数: 80Hz-1200Hz
- 検出精度: ±5セント
```

#### **B. 判定ロジック**
```javascript
// シンプルな判定
function isNoteCorrect(detectedFreq, targetFreq) {
    const cents = 1200 * Math.log2(detectedFreq / targetFreq);
    return Math.abs(cents) < 50; // ±50セント以内で正解
}
```

### 4.3 UI仕様

#### **A. レイアウト**
```
[基音表示]
[周波数表示]
[進行状況] 1/8, 2/8, ...
[現在の音階] ド, レ, ミ, ...
[結果] ○×表示
[再挑戦ボタン]
```

#### **B. 状態管理**
```javascript
// 最小限の状態管理
const state = {
    currentNote: 0,        // 0-7 (ド-ド)
    baseTone: null,        // 基音情報
    results: [],           // 各音階の結果
    isRecording: false     // 録音状態
};
```

---

## 5. 実装計画

### 5.1 Phase 1: 基本機能（3-4時間）

#### **1. HTML構造**
```html
<!-- minimal-pitch-training.html -->
<div class="app">
    <h1>相対音感トレーニング</h1>
    <div class="base-tone">基音: ---</div>
    <div class="frequency">--- Hz</div>
    <div class="progress">準備中</div>
    <button id="start-btn">🎹 スタート</button>
    <div class="results">結果表示エリア</div>
</div>
```

#### **2. JavaScript実装**
```javascript
// minimal-pitch-training.js
class SimplePitchTraining {
    constructor() {
        this.microphone = new MicrophoneManager();
        this.baseTones = [...]; // 10種類の基音
        this.targetNotes = [...]; // ドレミファソラシド
        this.state = { currentNote: 0, results: [] };
    }
    
    async start() {
        await this.microphone.requestAccess();
        this.playBaseTone();
        this.startDetection();
    }
}
```

#### **3. CSS スタイル**
```css
/* minimal-pitch-training.css */
.app {
    max-width: 400px;
    margin: 0 auto;
    padding: 20px;
    text-align: center;
}

.start-btn {
    background: #4CAF50;
    color: white;
    padding: 15px 30px;
    border: none;
    border-radius: 25px;
    font-size: 1.2rem;
    cursor: pointer;
}
```

### 5.2 Phase 2: 機能拡張（必要に応じて）

```
- 結果の詳細表示
- 履歴機能
- 設定オプション
- アニメーション強化
```

---

## 6. 品質保証

### 6.1 テスト項目

#### **A. マイク機能テスト**
```
□ 初回マイク許可要求
□ 許可後の正常動作
□ 拒否時のエラー処理
□ 再試行機能
□ ストリーム適切な停止
```

#### **B. 音程検出テスト**
```
□ 基音再生の正確性
□ 各音階の検出精度
□ ノイズ環境での動作
□ 低音・高音の検出
□ 無音時の処理
```

#### **C. UI/UXテスト**
```
□ 10秒以内の起動
□ 直感的な操作
□ エラーメッセージの明確性
□ レスポンシブデザイン
□ モバイル操作性
```

### 6.2 パフォーマンス要件

```
- 初回読み込み: 3秒以内
- マイク許可から測定開始: 2秒以内
- 周波数検出応答: 100ms以内
- メモリ使用量: 50MB以下
- バッテリー消費: 最小限
```

---

## 7. 開発ガイドライン

### 7.1 コーディング原則

```javascript
// 1. シンプルな関数
function playBaseTone(frequency) {
    // 単一責任の原則
}

// 2. 明確な命名
const isRecording = true;
const currentNoteIndex = 0;

// 3. エラーハンドリング必須
try {
    await requestMicrophone();
} catch (error) {
    handleMicrophoneError(error);
}
```

### 7.2 ファイル構成

```
minimal-pitch-training.html    # メインHTML
minimal-pitch-training.js      # メインロジック
minimal-pitch-training.css     # スタイル
tone.js                       # 音声ライブラリ（既存）
```

---

## 8. 成功の定義

### 8.1 技術的成功
- **動作**: 100%のブラウザで正常動作
- **パフォーマンス**: 要件を全て満たす
- **バグ**: クリティカルバグゼロ

### 8.2 ユーザー体験成功
- **直感性**: 説明不要で操作可能
- **速度**: ストレスフリーな応答
- **精度**: 信頼できる測定結果

---

**この仕様書は最小限の機能で最大限の価値を提供することを目指します。**  
**複雑な機能は段階的に追加し、まずは確実に動作する基本機能を完成させます。**