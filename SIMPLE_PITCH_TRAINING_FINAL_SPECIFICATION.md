# シンプル相対音感トレーニング - 最終仕様書

**作成日**: 2025-07-15  
**対象**: simple-pitch-training.html 新規実装  
**仕様レベル**: 実装必須  

---

## 🎯 設計原則（必須遵守）

### 1. スタートボタンの純粋性
- **100%基音再生専用**: マイク初期化やその他の処理は一切含まない
- **常にアクティブ**: 準備完了後は即座に応答可能
- **予測可能**: ユーザーが押すタイミングを完全にコントロール

### 2. 事前準備の分離
- **ページ読み込み時**: マイク許可ダイアログを表示
- **準備完了後**: スタートボタンが使用可能になる
- **エラー時**: 標準ダイアログで適切に対応

### 3. 標準エラーダイアログ
- **確実性優先**: `alert()` と `confirm()` のみ使用
- **自動復旧**: `confirm()` + `location.reload()` で復旧
- **統一処理**: `ERROR_DIALOG_SPECIFICATION.md` に完全準拠

---

## 🎨 UI設計

### 必要な要素のみ
```html
<div class="app">
    <h1>🎵 相対音感トレーニング</h1>
    
    <div class="frequency" id="frequency">--- Hz</div>
    <div class="progress" id="progress">スタートボタンを押してください</div>
    <div class="current-note" id="current-note">---</div>
    
    <button id="start-btn" class="start-btn">🎹 スタート</button>
    
    <div class="results" id="results" style="display: none;">
        <h2>結果</h2>
        <div id="note-results"></div>
        <div id="final-score"></div>
        <button id="retry-btn" class="retry-btn">もう一度挑戦</button>
    </div>
</div>

<!-- 右上タイムスタンプ -->
<div class="timestamp" id="timestamp">📱 --:--:--</div>
```

### 削除する要素
- ❌ `base-tone` 要素（混乱の原因）
- ❌ `error-message` 要素（標準ダイアログ使用）
- ❌ 関連するCSS

---

## 🔧 JavaScript設計

### クラス構成
```javascript
class MicrophoneManager {
    // マイク管理のみ
    async requestAccess()
    stop()
    getFrequencyData()
}

class PitchDetectionManager {
    // 音程検出のみ
    async initialize(audioContext)
    detectPitch(audioData)
}

class BaseToneManager {
    // 基音管理のみ
    selectRandomBaseTone()
    async playBaseTone()
}

class SimplePitchTraining {
    // メインアプリケーション
    async start()  // 基音再生専用
    startMeasurement()
    retry()
}
```

### 初期化フロー
```javascript
// ページ読み込み時
1. ライブラリ読み込み確認
2. マイク許可要求（自動）
3. 音程検出初期化
4. 準備完了フラグ設定 (isReady = true)

// スタートボタン押下時
1. 準備完了チェック
2. 基音選択
3. 基音再生
4. 音程測定開始
```

---

## 🚨 エラーハンドリング

### 標準ダイアログ関数
```javascript
// 1. マイク拒否
alert('マイクの使用が許可されていません。\n\nブラウザの設定でマイクアクセスを許可してから、ページを再読み込みしてください。');

// 2. マイク未接続
if (confirm('マイクが見つかりません。\n\nマイクを接続してから再読み込みしますか？')) {
    location.reload();
}

// 3. マイク使用中
if (confirm('マイクが他のアプリケーションで使用されています。\n\n他のアプリを終了してから再読み込みしますか？')) {
    location.reload();
}

// 4. 準備未完了
if (confirm('マイクの準備ができていません。\n\nページを再読み込みしてマイクを許可しますか？')) {
    location.reload();
}

// 5. 音程検出エラー
if (confirm('音程検出の初期化に失敗しました。\n\nページを再読み込みしますか？')) {
    location.reload();
}
```

### エラー分類処理
```javascript
function handleError(error) {
    switch (error.name) {
        case 'NotAllowedError':
            showMicrophonePermissionError();
            break;
        case 'NotFoundError':
            showMicrophoneNotFoundError();
            break;
        case 'NotReadableError':
            showMicrophoneInUseError();
            break;
        default:
            showPitchyInitializationError();
    }
}
```

---

## 🎨 8色ループシステム

### タイムスタンプ色管理
```javascript
const backgroundColors = [
    'rgba(33, 150, 243, 0.9)',   // 0: 青
    'rgba(76, 175, 80, 0.9)',    // 1: 緑
    'rgba(255, 152, 0, 0.9)',    // 2: オレンジ
    'rgba(156, 39, 176, 0.9)',   // 3: 紫
    'rgba(244, 67, 54, 0.9)',    // 4: 赤
    'rgba(0, 188, 212, 0.9)',    // 5: シアン
    'rgba(141, 110, 99, 0.9)',   // 6: 茶
    'rgba(158, 158, 158, 0.9)'   // 7: グレー
];

const colorIndex = 0; // 新しい実装なので0から開始
```

---

## 📱 動作フロー

### 1. ページ読み込み
- タイムスタンプ表示（青色背景）
- マイク許可ダイアログ表示
- 許可後、準備完了

### 2. スタートボタン押下
- 基音選択（ランダム）
- 基音再生（2.5秒）
- 音程測定開始

### 3. 音程検出
- ドレミファソラシド（8音階）
- 各音程の正解判定
- 進行状況表示

### 4. 結果表示
- スコア表示
- 再挑戦ボタン

---

## 🎯 成功判定基準

### 技術的成功
- [ ] ページ読み込み時にマイク許可ダイアログ表示
- [ ] スタートボタンで即座に基音再生
- [ ] 音程検出が正常に動作
- [ ] エラー時に標準ダイアログ表示

### UX成功
- [ ] ユーザーが基音再生タイミングをコントロール可能
- [ ] 直感的で予測可能な動作
- [ ] エラー時の適切な案内

### 設計成功
- [ ] 設計原則に完全準拠
- [ ] シンプルで保守性の高いコード
- [ ] 明確な責任分離

---

## 🔧 実装詳細

### HTML構造
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎵 シンプル相対音感トレーニング</title>
    
    <!-- キャッシュ制御 -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <meta name="cache-version" content="v2.0.0-simple-clean">
    
    <!-- PWA対応 -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="mobile-web-app-capable" content="yes">
    
    <style>
        /* 統合CSS */
        /* 必要最小限のスタイル定義 */
    </style>
</head>
<body>
    <!-- タイムスタンプ -->
    <div class="timestamp" id="timestamp">📱 --:--:--</div>
    
    <!-- メインアプリ -->
    <div class="app">
        <!-- 必要な要素のみ -->
    </div>
    
    <!-- ライブラリ読み込み -->
    <script src="tone.js"></script>
    <script type="module">
        // Pitchy読み込み
        // メインスクリプト読み込み
    </script>
</body>
</html>
```

### JavaScript構造
```javascript
// 4つのクラス
class MicrophoneManager { }
class PitchDetectionManager { }
class BaseToneManager { }
class SimplePitchTraining { }

// 標準エラーダイアログ関数
function showMicrophonePermissionError() { }
function showMicrophoneNotFoundError() { }
function showMicrophoneInUseError() { }
function showMicrophoneNotReadyError() { }
function showPitchyInitializationError() { }
function handleError(error) { }

// 初期化処理
async function initializeWithPreparation() { }
function initializeApp() { }

// DOM準備完了時実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
```

---

## 📋 実装チェックリスト

### HTML実装
- [ ] 必要な要素のみ定義
- [ ] 不要な要素を除外
- [ ] タイムスタンプ要素配置
- [ ] 統合CSS定義

### JavaScript実装
- [ ] 4つのクラス実装
- [ ] 標準エラーダイアログ関数実装
- [ ] 初期化フロー実装
- [ ] エラーハンドリング実装

### 設計原則遵守
- [ ] スタートボタンの純粋性
- [ ] 事前準備の分離
- [ ] 標準エラーダイアログ使用

### 動作確認
- [ ] ページ読み込み時マイク許可
- [ ] スタートボタン即座反応
- [ ] 音程検出正常動作
- [ ] エラー時標準ダイアログ

---

## 🚨 注意事項

### 禁止事項
- ❌ スタートボタンでのマイク初期化
- ❌ 独自エラーダイアログの使用
- ❌ 基音表示要素の追加

### 必須事項
- ✅ 設計原則書の参照
- ✅ エラーダイアログ仕様書の参照
- ✅ 8色ループシステムの実装

### 品質保証
- 実装前に設計原則確認
- 実装後にチェックリスト確認
- エラー時の動作確認

---

**この仕様書は `simple-pitch-training.html` 新規実装の必須参照文書です。**

*作成日: 2025-07-15*  
*対象ファイル: simple-pitch-training.html*  
*バージョン: v2.0.0-simple-clean*