# 🔧 ランダム基音機能 実装ガイド

## 📋 実装詳細

### コード構造

#### 主要ファイル
```
/Users/isao/Documents/pitch_app/
├── full-scale-training.js     # メイン実装
├── full-scale-training.html   # UI・CSS
├── RANDOM_BASE_TONE_SPEC.md   # 仕様書
└── RANDOM_BASE_TONE_IMPLEMENTATION.md # 実装ガイド
```

#### 実装行数・変更箇所
```javascript
// full-scale-training.js 追加・変更箇所
行1-73:   BaseToneManagerクラス追加 (73行)
行140-159: ランダム基音システム初期化 (20行)
行161-203: 移調計算・UI更新メソッド (43行)
行473-497: スタートボタン基音表示 (25行)
行564-590: 基音再生メソッド更新 (27行)
行774-785: 停止メソッド更新 (12行)

合計: 約200行の追加・変更
```

---

## 🎯 実装のポイント

### 1. 拡張可能性を重視した設計

#### モード対応設計
```javascript
// 現在: 短音モード
this.trainingMode = 'single';

// 将来: 連続モード
this.trainingMode = 'continuous';
```

#### 基音管理の独立性
```javascript
// BaseToneManagerで基音ロジックを分離
// FullScaleTrainingから切り離してメンテナンス性向上
class BaseToneManager {
    // 基音選択ロジックのみに集中
    // 他のクラスに依存しない独立設計
}
```

### 2. 既存コードへの影響最小化

#### 既存変数の再利用
```javascript
// 既存のtargetFrequenciesとtargetNotesを更新
this.targetFrequencies = [261.63, ...]; // → 移調後の値に更新
this.targetNotes = ['ド4', ...];        // → 基音に応じた音名に更新
```

#### 既存UIとの統合
```javascript
// 既存のガイドボタンHTMLはそのまま
// JavaScriptで周波数表示のみ更新
updateGuideFrequencyDisplay() {
    // 既存のDOM要素を検索して内容更新
}
```

---

## 🎼 移調アルゴリズム詳細

### 数学的根拠

#### 12平均律による周波数計算
```javascript
// 半音の周波数比: 2^(1/12) ≈ 1.05946
// n半音上: frequency × 2^(n/12)

// 例: C4からD4 (2半音上)
// 261.63 × 2^(2/12) = 261.63 × 1.1225 = 293.66Hz
```

#### 移調比率計算
```javascript
// 基準C4 (261.63Hz) からの移調比率
const baseRatio = selectedFreq / 261.63;

// 例: D4基音の場合
const baseRatio = 293.66 / 261.63 = 1.1225;

// 全音階に適用
targetFrequencies.map(freq => freq * baseRatio);
```

### 精度管理
```javascript
// 小数点2桁での丸め処理
Math.round(freq * baseRatio * 100) / 100;

// 例: 329.6284... → 329.63Hz
```

---

## 🎨 UI実装詳細

### レスポンシブ対応

#### モバイル・デスクトップ両対応
```javascript
updateGuideFrequencyDisplay() {
    // 両方のレイアウトを同時更新
    const mobileGuides = document.querySelectorAll('#note-guide-mobile .guide-note');
    const desktopGuides = document.querySelectorAll('#note-guide-desktop .guide-note');
    
    [mobileGuides, desktopGuides].forEach(guides => {
        // 同じロジックで両方更新
    });
}
```

#### CSS動的スタイリング
```css
/* スタートボタンの基音表示 */
.main-start-btn {
    line-height: 1.2;        /* 2行表示対応 */
    text-align: center;      /* 中央揃え */
}

.main-start-btn small {
    font-size: 0.8em;        /* 基音情報は小さく */
    opacity: 0.9;            /* 少し薄く */
    display: block;          /* 改行 */
    margin-top: 5px;         /* 間隔調整 */
    font-weight: normal;     /* 通常太さ */
}
```

---

## 🎹 Tone.js統合詳細

### 動的音程対応

#### サンプル音程とピッチシフト
```javascript
// Tone.js Samplerは自動的に最適なサンプルを選択・ピッチシフト
// 利用可能サンプル: C4, D#4, F#4, A4
// 要求音程: 任意（Bb3, Db4, E4, G4等）
// → Tone.jsが自動補間

// 例: Bb3要求時
// → C4サンプルを-2半音ピッチシフト
this.pianoSampler.triggerAttack("Bb3", undefined, 0.8);
```

#### エラーハンドリング
```javascript
try {
    this.pianoSampler.triggerAttack(toneName, undefined, 0.8);
} catch (error) {
    // Tone.js失敗時は合成音フォールバック
    this.playFallbackNote(frequency, startTimestamp);
}
```

---

## 🧪 テスト戦略

### 単体テスト

#### BaseToneManagerテスト
```javascript
// ランダム性テスト
for (let i = 0; i < 100; i++) {
    const tone = manager.selectBaseToneForNewSession();
    distribution[tone.name]++;
}
// 期待値: 各基音 8-12回程度（±20%）

// 移調精度テスト
const transposed = calculateTransposedFrequencies(baseTone);
// 期待値: 数学的に正確な移調比率
```

#### UI更新テスト
```javascript
// DOM要素の確認
const buttons = document.querySelectorAll('.guide-note');
buttons.forEach((button, index) => {
    const freq = button.querySelector('.note-freq').textContent;
    // 期待値: 移調後の周波数と一致
});
```

### 統合テスト

#### エンドツーエンドフロー
```
1. アプリ起動 → 基音選択確認
2. トレーニング開始 → 新基音選択確認
3. 基音再生 → 正しい音程再生確認
4. ガイド表示 → 移調後周波数表示確認
5. ピッチ検出 → 移調後周波数で判定確認
```

---

## ⚠️ トラブルシューティング

### よくある問題

#### 1. 基音が変わらない
**症状**: 毎回同じ基音が選択される
```javascript
// 確認点
console.log(this.baseToneManager.currentBaseTone);
// → 毎回同じオブジェクトが表示される

// 原因: selectNewBaseTone()が呼ばれていない
// 解決: startTraining()内で確実に呼び出し
```

#### 2. 周波数表示が更新されない
**症状**: ガイドボタンの周波数が261Hz固定
```javascript
// 確認点
console.log(this.targetFrequencies);
// → [261.63, 293.66, ...] 固定値

// 原因: calculateTransposedFrequencies()未実行
// 解決: selectNewBaseTone()内で必ず実行
```

#### 3. Tone.js再生エラー
**症状**: 基音再生時にエラー
```javascript
// 確認点
console.log(baseTone.tonejs); // → "Bb3"
this.pianoSampler.triggerAttack("Bb3", ...);
// → Error: Unknown note name

// 原因: Tone.jsが認識しない音名
// 解決: 音名マッピングの確認
```

#### 4. UI表示が崩れる
**症状**: スタートボタンのレイアウト崩れ
```css
/* 確認点 */
.main-start-btn {
    line-height: 1.2 !important;  /* 強制適用 */
    white-space: nowrap;           /* 改行防止の場合 */
}
```

### デバッグ用ツール

#### ログ出力レベル
```javascript
// 詳細デバッグ時
this.debugMode = true;

// BaseToneManager
console.log(`🎲 選択: ${tone.note} (${tone.frequency}Hz)`);

// 移調計算
console.log(`🎼 比率: ${baseRatio.toFixed(3)}`);
console.log(`🎵 移調後: ${this.targetFrequencies}`);

// UI更新
console.log(`🎨 UI更新完了: ${guidesUpdated}個`);
```

#### 開発者コンソール確認
```javascript
// ブラウザコンソールで実行
window.fullScaleTraining.baseToneManager.currentBaseTone;
window.fullScaleTraining.targetFrequencies;
window.fullScaleTraining.selectNewBaseTone();
```

---

## 🔧 保守・運用

### コード保守のポイント

#### 1. 基音追加時
```javascript
// BaseToneManagerのbaseToneOptionsに追加
{ name: 'A#4', note: 'ラ#4', frequency: 466.16, tonejs: 'A#4' }

// 注意点:
// - Tone.jsサンプラーで対応可能な音程か確認
// - 周波数値の精度（小数点2桁）
// - UI表示文字数（モバイル対応）
```

#### 2. 移調アルゴリズム変更時
```javascript
// 現在の比率計算を変更する場合
const baseRatio = newBaseTone.frequency / 261.63;

// 注意点:
// - 数学的正確性の維持
// - 既存の音感に影響しないか
// - 極端な音程（高すぎる・低すぎる）の回避
```

#### 3. UI変更時
```javascript
// スタートボタンのテキスト変更
startBtn.innerHTML = `🎹 開始<br><small>(${baseTone.note})</small>`;

// 注意点:
// - モバイル・デスクトップ両対応
// - 文字数制限（ボタンサイズ）
// - 多言語対応の考慮
```

### パフォーマンス監視

#### 実行時間計測
```javascript
// 基音選択時間
const startTime = performance.now();
this.selectNewBaseTone();
const endTime = performance.now();
console.log(`基音選択: ${endTime - startTime}ms`);

// 目標値: < 10ms
```

#### メモリ使用量
```javascript
// 基音データのメモリ使用量監視
const baseToneSize = JSON.stringify(this.baseToneManager.baseToneOptions).length;
console.log(`基音データサイズ: ${baseToneSize} bytes`);

// 目標値: < 2KB
```

---

## 📈 今後の機能拡張

### Phase 2: 連続モード実装

#### 設計案
```javascript
class ContinuousTrainingManager extends BaseToneManager {
    constructor() {
        super('continuous');
        this.sessionCount = 5;           // 連続セッション数
        this.currentSession = 0;         // 現在のセッション
        this.sessionResults = [];        // 各セッション結果
        this.baseToneHistory = [];       // 基音履歴
    }
    
    startContinuousTraining() {
        // 5回連続のトレーニングセッション
        // 各回で異なる基音を自動選択
        // 重複回避ロジック適用
    }
    
    getNextBaseTone() {
        // 直近3回と重複しない基音を選択
        // 音域バランスも考慮
    }
    
    generateSessionReport() {
        // 全セッションの総合成績
        // 基音別の得意・不得意分析
    }
}
```

#### UI拡張
```html
<!-- 連続モード用パネル -->
<div class="continuous-mode-panel">
    <div class="session-progress">
        <span>セッション</span>
        <span class="current">3</span>
        <span>/</span>
        <span class="total">5</span>
    </div>
    
    <div class="base-tone-timeline">
        <div class="past-tones">完了: C4, F4</div>
        <div class="current-tone">現在: D4</div>
        <div class="upcoming-tones">予定: G4, Bb3</div>
    </div>
    
    <div class="session-results">
        <div class="session-score">今回: 85%</div>
        <div class="average-score">平均: 78%</div>
    </div>
</div>
```

### Phase 3: カスタマイズ機能

#### ユーザー設定
```javascript
// ユーザー設定オブジェクト
const userSettings = {
    baseToneSelection: {
        enabled: ['C4', 'D4', 'E4', 'F4', 'G4'],  // 使用する基音
        avoidRecent: 3,                           // 重複回避数
        mode: 'random'                            // 'random' | 'sequential'
    },
    ui: {
        showBaseToneInButton: true,               // ボタン内基音表示
        showFrequencyInGuide: true,               // ガイド周波数表示
        baseToneDisplayPosition: 'button'         // 'button' | 'panel'
    },
    audio: {
        baseToneDuration: 2500,                   // 基音再生時間
        volume: 6                                 // 音量
    }
};
```

### Phase 4: 学習効果分析

#### データ収集
```javascript
class LearningAnalytics {
    collectSessionData(session) {
        return {
            baseTone: session.baseTone,
            accuracy: session.accuracy,
            responseTime: session.responseTime,
            difficulty: session.difficulty,
            timestamp: new Date().toISOString()
        };
    }
    
    analyzeLearningProgress() {
        // 基音別の学習進捗
        // 苦手な音程の特定
        // 練習効果の可視化
    }
    
    generateRecommendations() {
        // 個人に最適化された練習プラン
        // 重点的に練習すべき基音の提案
    }
}
```

---

## 📚 参考資料

### 音楽理論
- [12平均律と周波数計算](https://en.wikipedia.org/wiki/Equal_temperament)
- [相対音感vs絶対音感](https://www.musictheory.net/)

### 技術文書
- [Web Audio API仕様](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Tone.js公式ドキュメント](https://tonejs.github.io/)
- [Pitchy ピッチ検出ライブラリ](https://github.com/dechristopher/pitchy)

### 実装事例
- [音楽アプリのピッチ検出実装](https://github.com/topics/pitch-detection)
- [Web Audio ピアノアプリ](https://github.com/topics/web-audio-piano)

---

**実装ガイドバージョン**: 1.0  
**最終更新**: 2025-07-12  
**対象バージョン**: v1.0.8-RandomBaseTone