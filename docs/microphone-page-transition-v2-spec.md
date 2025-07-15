# ページ遷移後マイク許可フロー仕様書 v2.0

**版数**: v2.0 (再設計版)  
**作成日**: 2025-07-15  
**対象**: ページ遷移後即座マイク許可機能（再実装）  
**基盤**: 安定実装 58c6b84 + 初回実装からの学習事項  

---

## 📋 目次

1. [経緯・設計方針](#1-経緯設計方針)
2. [UI状態遷移設計](#2-ui状態遷移設計)
3. [初期化シーケンス設計](#3-初期化シーケンス設計)
4. [エラーケース分析](#4-エラーケース分析)
5. [技術仕様](#5-技術仕様)
6. [実装計画](#6-実装計画)
7. [品質保証](#7-品質保証)

---

## 1. 経緯・設計方針

### 1.1 初回実装からの学習事項

**技術的問題の解決策**
- **fftSize/smoothingTimeConstant**: 固定値（2048, 0.1）使用
- **PitchDetector初期化**: Analyzer作成後に必須実行
- **重複作成防止**: 存在チェックによる安全な初期化
- **初期化順序**: getUserMedia → AudioContext → Analyzer → MediaStreamSource → PitchDetector

**設計原則の確立**
- **KISS原則**: 複雑な条件分岐を排除
- **単一責任**: 一つの関数は一つの責任のみ
- **状態最小化**: 不要な状態変数を避ける
- **エラー処理統一**: 一貫したフォールバック戦略

### 1.2 シンプル設計方針

#### **基本戦略**
1. **スタートボタン制御**: 準備完了まで無効化
2. **最小限UI**: エラー時のみメッセージ表示
3. **単一初期化経路**: 自動・手動の区別を最小化
4. **確実性優先**: 複雑な最適化より確実な動作

#### **変更最小化**
- **index.html**: URLパラメータ変更のみ
- **full-scale-training.js**: 初期化処理への最小限追加
- **existing logic**: 既存の安定したロジックは保持

---

## 2. UI状態遷移設計

### 2.1 スタートボタン状態管理

```
[ページロード]
    ↓
[モード判定: ?mode=random]
    ↓ (Yes)                    ↓ (No)
[🔄 マイク初期化中]         [✅ 手動開始待機]
スタートボタン: 無効         スタートボタン: 有効
    ↓ (成功)      ↓ (失敗)
[✅ 準備完了]    [⚠️ 手動フォールバック] 
スタートボタン: 有効  スタートボタン: 有効
    ↓
[トレーニング開始]
```

### 2.2 UI要素の状態定義

| 状態 | スタートボタン | 表示テキスト | 背景色 | 操作可能 |
|------|----------------|--------------|--------|----------|
| **初期化中** | 無効 | "🔄 マイク準備中..." | グレー | ❌ |
| **準備完了** | 有効 | "🎹 基音 [音名] でスタート" | 緑 | ✅ |
| **手動待機** | 有効 | "🎹 基音 [音名] でスタート" | 青 | ✅ |
| **エラー状態** | 有効 | "🎹 基音 [音名] でスタート" | 青 | ✅ |

### 2.3 フィードバック戦略

#### **成功時**
- スタートボタンの色変更（グレー → 緑）
- ボタンテキスト更新
- **メッセージ表示なし**（シンプル化）

#### **失敗時**
```javascript
// 最小限のエラー表示のみ
console.log('🔄 通常のスタートボタンフローに切り替え');
// ユーザーには通常のボタン表示（内部的にはフォールバック完了）
```

---

## 3. 初期化シーケンス設計

### 3.1 自動初期化シーケンス

```
🔄 DOMContentLoaded
    ↓
📋 URLパラメータ確認: ?mode=random
    ↓ (Yes)
🎤 navigator.mediaDevices.getUserMedia()
    ↓ (許可)
🎵 AudioContext.createAudioContext()
    ↓
🔍 AnalyserNode.create() + fftSize=2048
    ↓
🎯 PitchDetector.forFloat32Array()
    ↓
🔗 MediaStreamSource → Analyser接続
    ↓
✅ スタートボタン有効化
    ↓
🎹 ユーザークリック待機
```

### 3.2 エラー時フォールバック

```
❌ 任意の段階でエラー
    ↓
🔄 console.log('手動フローに切り替え')
    ↓
✅ スタートボタン有効化（通常色）
    ↓
🎹 ユーザークリック → 既存のinitMicrophone()実行
```

### 3.3 技術実装詳細

#### **自動初期化関数**
```javascript
async function initializeAutoMicrophone(app) {
    try {
        // Step 1: MediaStream取得
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        
        // Step 2: AudioContext初期化
        if (!app.audioContext) {
            await app.initAudioContext();
        }
        
        // Step 3: Analyzer作成
        if (!app.analyzer) {
            app.analyzer = app.audioContext.createAnalyser();
            app.analyzer.fftSize = 2048;
            app.analyzer.smoothingTimeConstant = 0.1;
        }
        
        // Step 4: MediaStreamSource作成・接続
        app.microphone = app.audioContext.createMediaStreamSource(stream);
        app.microphone.connect(app.analyzer);
        
        // Step 5: PitchDetector初期化
        app.initPitchDetector();
        
        // Step 6: ストリーム保存
        app.mediaStream = stream;
        app.autoMicrophoneReady = true;
        
        return true;
    } catch (error) {
        console.log('🔄 通常のスタートボタンフローに切り替え');
        return false;
    }
}
```

#### **startTraining修正**
```javascript
async startTraining() {
    // 自動初期化済みかチェック
    if (this.autoMicrophoneReady && this.mediaStream) {
        console.log('✅ 自動初期化済み - ダイアログスキップ');
        this.isRunning = true;
        this.startFrequencyDetection();
    } else {
        console.log('🎤 通常のマイク許可フロー実行');
        // 既存の処理を継続
        await this.initMicrophone();
    }
    
    // 残りは既存処理と同じ
    // ...
}
```

---

## 4. エラーケース分析

### 4.1 マイク関連エラー

| エラー種類 | 発生条件 | 対処法 | ユーザー体験 |
|------------|----------|--------|--------------|
| **NotAllowedError** | ユーザーが許可拒否 | 通常フローに切替 | スタートボタン有効（青） |
| **NotFoundError** | マイクデバイス未接続 | 通常フローに切替 | スタートボタン有効（青） |
| **NotReadableError** | ハードウェアエラー | 通常フローに切替 | スタートボタン有効（青） |
| **OverconstrainedError** | 制約設定エラー | 通常フローに切替 | スタートボタン有効（青） |

### 4.2 ブラウザ互換性エラー

| ブラウザ | 問題 | 対処法 |
|----------|------|--------|
| **Safari 14+** | Permission API不安定 | 直接getUserMedia使用 |
| **Firefox 100+** | AudioContext suspend | 既存のresume()処理で対応 |
| **Chrome 120+** | HTTPS必須 | 既存対応済み |
| **iOS Safari** | autoplay制限 | ユーザーインタラクション後実行 |

### 4.3 ネットワーク・環境エラー

| エラー | 検出方法 | フォールバック |
|--------|----------|----------------|
| **HTTPS未対応** | getUserMedia例外 | 通常フロー |
| **古いブラウザ** | AudioContext未定義 | 通常フロー |
| **Pitchy読み込み失敗** | window.PitchDetector未定義 | 通常フロー |

---

## 5. 技術仕様

### 5.1 変更ファイル

#### **index.html** (最小変更)
```javascript
// 変更前
window.location.href = 'full-scale-training.html?auto=true';

// 変更後
window.location.href = 'full-scale-training.html?mode=random';
```

#### **full-scale-training.js** (追加機能)

**1. 新規状態フラグ**
```javascript
constructor() {
    // 既存フラグ
    this.microphonePermissionGranted = false; // 削除
    
    // 新規フラグ（シンプル化）
    this.autoMicrophoneReady = false;
}
```

**2. 自動初期化関数追加**
```javascript
async initializeAutoMicrophone() {
    // 上記シーケンスの実装
}
```

**3. DOMContentLoaded修正**
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    const app = new FullScaleTraining();
    
    // モード判定
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'random') {
        const success = await initializeAutoMicrophone(app);
        if (success) {
            updateStartButtonReady();
        }
    }
    
    // 既存初期化継続
    initializeAppUI(app);
});
```

### 5.2 UI更新関数

```javascript
function updateStartButtonReady() {
    const startBtn = document.getElementById('main-start-btn');
    if (startBtn) {
        startBtn.style.backgroundColor = '#4CAF50'; // 緑色
        startBtn.style.cursor = 'pointer';
        startBtn.disabled = false;
    }
}

function updateStartButtonLoading() {
    const startBtn = document.getElementById('main-start-btn');
    if (startBtn) {
        startBtn.textContent = '🔄 マイク準備中...';
        startBtn.style.backgroundColor = '#9E9E9E'; // グレー
        startBtn.disabled = true;
    }
}
```

---

## 6. 実装計画

### 6.1 段階的実装 (各30分)

#### **Phase A: 基礎実装** 
- [ ] index.html URLパラメータ変更
- [ ] 自動初期化関数作成
- [ ] DOMContentLoaded修正
- [ ] 基本動作テスト

#### **Phase B: UI改善**
- [ ] スタートボタン状態管理
- [ ] ローディング表示
- [ ] 成功時UI更新
- [ ] 状態遷移テスト

#### **Phase C: エラー処理**
- [ ] フォールバック機構
- [ ] ブラウザ互換性対応
- [ ] エラーケーステスト
- [ ] 統合テスト

#### **Phase D: 品質確認**
- [ ] 全ブラウザテスト
- [ ] パフォーマンス確認
- [ ] UXテスト
- [ ] ドキュメント更新

### 6.2 テスト手順

#### **機能テスト**
1. **正常系**: Chrome latest → モード選択 → 自動許可 → スタートボタン有効
2. **エラー系**: マイク許可拒否 → フォールバック → 手動許可成功
3. **互換性**: Safari/Firefox/Edge での同様テスト

#### **UXテスト**
1. **応答性**: ボタンクリックから状態変化まで < 1秒
2. **直感性**: 状態がボタンの色・テキストで明確
3. **信頼性**: エラー時でも必ず動作継続

---

## 7. 品質保証

### 7.1 成功指標

#### **技術指標**
- [ ] 全ブラウザ動作確認（Chrome/Safari/Firefox/Edge）
- [ ] エラー率 < 5%（許可拒否除く）
- [ ] フォールバック成功率 100%
- [ ] 初期化時間 < 2秒

#### **UX指標**
- [ ] マイク許可回数: 1回のみ（成功時）
- [ ] UI状態の明確性: 色・テキストで判別可能
- [ ] 操作継続性: エラー時でも使用可能

### 7.2 品質ゲート

#### **コミット前チェック**
- [ ] ESLint エラーなし
- [ ] 機能テスト合格
- [ ] Chrome DevTools エラーなし
- [ ] 既存機能の回帰なし

#### **ブランチマージ前チェック**
- [ ] 全ブラウザ動作確認
- [ ] パフォーマンス測定
- [ ] UXテスト合格
- [ ] ドキュメント更新完了

---

## 8. リスク軽減

### 8.1 技術リスク対策

| リスク | 発生確率 | 影響度 | 対策 |
|--------|----------|--------|------|
| Safari互換性問題 | 中 | 中 | Permission API不使用 + フォールバック |
| 初期化タイミング問題 | 低 | 低 | DOMContentLoaded後実行 |
| パフォーマンス劣化 | 低 | 低 | 最小限の処理追加 |

### 8.2 UXリスク対策

| リスク | 発生確率 | 影響度 | 対策 |
|--------|----------|--------|------|
| ユーザー混乱 | 低 | 中 | 明確な状態表示 |
| 予期しない動作 | 低 | 高 | フォールバック機構 |
| アクセシビリティ問題 | 低 | 低 | 既存基準維持 |

---

## 9. 変更履歴

| 版数 | 日付 | 変更内容 | 更新者 |
|------|------|----------|--------|
| v2.0 | 2025-07-15 | 初回実装の学習事項を活かした再設計版作成 | Claude Code |

---

**承認**
- 仕様策定者: Claude Code
- 実装予定: 2025-07-15
- レビュー: **実装前最終確認完了**

**この仕様書に基づいて段階的実装を開始する準備完了。**