# Tone.js 仕様と設定ノート

## 概要
相対音感トレーニングアプリの基音再生に、本物のピアノサンプルを使用するためTone.jsライブラリを導入。

## Tone.js 基本情報
- **ライブラリ**: Tone.js v14.7.77
- **CDN**: `https://unpkg.com/tone@14.7.77/build/Tone.js`
- **サンプル音源**: Salamander Grand Piano (Yamaha C5 Grand Piano録音)
- **ライセンス**: Creative Commons (Alexander Holm制作)

## 現在の設定パラメータ

### Sampler設定
```javascript
this.pianoSampler = new Tone.Sampler({
    urls: {
        "C4": "C4.mp3",
        "D#4": "Ds4.mp3", 
        "F#4": "Fs4.mp3",
        "A4": "A4.mp3",
    },
    release: 0.5,      // リリース時間（フェイドアウトの長さ）
    attack: 0.01,      // アタック時間（すぐに立ち上がる）
    volume: 6,         // 音量を上げる（dB）
    baseUrl: "https://tonejs.github.io/audio/salamander/"
}).toDestination();
```

### 再生設定
```javascript
// アタック（音の開始）
this.pianoSampler.triggerAttack("C4", undefined, 0.8);

// 2秒後にリリース開始（フェイドアウト）
setTimeout(() => {
    this.pianoSampler.triggerRelease("C4");
}, 2000);

// 2.7秒後に完全停止
setTimeout(() => {
    this.pianoSampler.releaseAll();
}, 2700);
```

## 音響特性

### タイミング（最新設定 - 2025/07/11調整）
- **総再生時間**: 2.5秒
- **サスティン時間**: 2秒（トーーン）
- **フェイドアウト時間**: 0.5秒
- **完全停止**: 2.7秒後
- **ガイドアニメーション開始**: 2.5秒後

### 音量・ダイナミクス
- **volume**: +6dB（基本音量上げ）
- **velocity**: 0.8（強めの打鍵力）
- **attack**: 0.01秒（即座に立ち上がり）
- **release**: 0.5秒（自然な減衰）

## システム構成

### 初期化フロー
1. `startTraining()` - AudioContext初期化
2. `showMainStartButton()` - サンプラー事前読み込み
3. `preloadPianoSampler()` - Tone.start() + サンプル読み込み
4. `Tone.loaded()` - 読み込み完了待機

### 再生フロー
1. **事前読み込み済み**: 即座再生（ラグなし）
2. **初回読み込み**: リアルタイム読み込み（少しラグ）
3. **エラー時**: 合成音フォールバック

### 停止処理
```javascript
stopReferenceNote() {
    this.pianoSampler.triggerRelease("C4");  // 特定音停止
    this.pianoSampler.releaseAll();          // 全音停止
}
```

## フォールバック機能
Tone.js失敗時は`playFallbackNote()`で合成音に自動切り替え：
- sawtooth + sine基音
- 整数倍音（2,3,4,5倍音）
- デチューン（1.001, 0.999倍）
- 精密ADSRエンベロープ

## 使用音程
- **基音**: C4 (Do4) - 261.63Hz
- **サンプル**: C4.mp3を使用
- **ピッチシフト**: Tone.Samplerが自動補間

## パフォーマンス
- **事前読み込み**: ボタン有効化前に完了
- **再生ラグ**: < 5ms（事前読み込み時）
- **メモリ**: 4つのサンプル（C4, D#4, F#4, A4）
- **ネットワーク**: CDN + サンプルファイル

## タイムライン詳細

### 基音再生フロー（2.5秒設定）
```
0.0秒  ┃ 🎹 triggerAttack("C4") - アタック開始
       ┃ 📊 サスティン期間（トーーーン）
2.0秒  ┃ 🔽 triggerRelease("C4") - フェイドアウト開始
       ┃ 📉 0.5秒間のリリース
2.5秒  ┃ 🎼 startGuideAnimation() - ガイド開始
       ┃ 📱 UI更新・アニメーション切り替え
2.7秒  ┃ 🔇 releaseAll() - 完全停止
```

### 設定変更履歴
- **v1 (初期)**: 1.5秒 (短すぎ)
- **v2**: 3秒 (長すぎ) 
- **v3 (現在)**: 2.5秒 (最適化)

## 今後の拡張可能性
- 他の音程（Re4, Mi4等）のサンプル追加
- 音量・音色の動的調整
- エフェクト（リバーブ、EQ等）の追加
- より多くのピアノサンプル（オクターブ展開）
- タイミング設定のユーザーカスタマイズ

## トラブルシューティング
- **音が出ない**: AudioContext suspended → Tone.start()
- **ラグがある**: 事前読み込み未完了 → preloadPianoSampler()確認
- **音が切れる**: リリース時間短い → release値調整
- **音量小さい**: volume値を上げる（現在+6dB）

## 参考リンク
- [Tone.js公式](https://tonejs.github.io/)
- [Salamander Piano](https://tonejs.github.io/audio/salamander/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)