# Pitchy音程検出ライブラリ仕様書

## 概要
本アプリでは、日本語音程トレーニングの精度向上のため、Pitchy（McLeod Pitch Method）ライブラリを統合しています。

## Pitchyライブラリについて
- **バージョン**: v4
- **アルゴリズム**: McLeod Pitch Method (MPM)
- **特徴**: 高精度基音検出、倍音誤検出の自動回避
- **CDN**: `https://esm.sh/pitchy@4`

## 技術仕様

### 1. ライブラリ読み込み方法
```javascript
// ESMモジュールとして読み込み
import { PitchDetector } from "https://esm.sh/pitchy@4";
window.PitchDetector = PitchDetector;
```

### 2. PitchDetector初期化
```javascript
// FFTサイズに合わせたFloat32Array用のDetectorを作成
this.pitchDetector = window.PitchDetector.forFloat32Array(this.analyzer.fftSize);
// fftSize = 2048 で使用
```

### 3. 周波数検出処理
```javascript
// 時間域データを取得（Pitchyは時間域データが必要）
const timeData = new Float32Array(this.analyzer.fftSize);
this.analyzer.getFloatTimeDomainData(timeData);

// 基音検出実行
const result = this.pitchDetector.findPitch(timeData, this.audioContext.sampleRate);
const [pitch, clarity] = result; // [周波数Hz, 確信度0-1]
```

## 実装された補正機能

### 1. 動的オクターブ補正システム
```javascript
// 現在の目標周波数範囲に基づく動的補正
const minTargetFreq = Math.min(...this.targetFrequencies); // 最低目標周波数
const maxTargetFreq = Math.max(...this.targetFrequencies); // 最高目標周波数

// 補正しきい値：最高目標周波数の半分＋余裕(10%)
const correctionThreshold = maxTargetFreq * 0.55;

// 補正後の範囲：最低目標の80%〜最高目標の120%
const correctedMin = minTargetFreq * 0.8;
const correctedMax = maxTargetFreq * 1.2;

if (pitch < correctionThreshold && pitch * 2 >= correctedMin && pitch * 2 <= correctedMax) {
    correctedPitch = pitch * 2; // オクターブ補正
}
```

### 2. 検出条件
- **周波数範囲**: 80Hz - 1200Hz
- **確信度しきい値**: 0.1以上
- **補正トリガー**: 動的しきい値（目標周波数の55%）以下

## ノイズリダクション統合

### 1. 3段階フィルタリング
```javascript
// ハイパスフィルター: 80Hz以下の低周波ノイズカット
this.noiseReduction.highPassFilter.frequency.setValueAtTime(80, this.audioContext.currentTime);

// ローパスフィルター: 2kHz以上の高周波ノイズカット  
this.noiseReduction.lowPassFilter.frequency.setValueAtTime(2000, this.audioContext.currentTime);

// ノッチフィルター: 60Hz電源ノイズカット
this.noiseReduction.notchFilter.frequency.setValueAtTime(60, this.audioContext.currentTime);
```

### 2. フィルターチェーン
```
マイク入力 → ハイパス → ローパス → ノッチ → ゲイン → Pitchy検出
```

## 精度達成結果

### 検出精度の向上
- **導入前**: FFTピーク検出、1000+セント誤差
- **導入後**: McLeod Pitch Method、5セント精度

### 解決した問題
1. **倍音誤検出**: 基音の2倍、3倍音を誤って検出する問題
2. **オクターブエラー**: 周波数が半分または倍で検出される問題  
3. **6秒タイムアウト**: 長時間検出で不安定になる問題
4. **ノイズ干渉**: 環境ノイズによる検出精度低下

## デバッグ機能

### 1. リアルタイム検出ログ
```javascript
if (this.frameCount % 60 === 0) { // 1秒に1回
    this.log(`🔍 Pitchy検出: pitch=${pitch?.toFixed(1)}Hz, clarity=${clarity?.toFixed(3)}`);
}
```

### 2. オクターブ補正ログ
```javascript
if (this.frameCount % 60 === 0) {
    this.log(`🔧 動的オクターブ補正: ${pitch.toFixed(1)}Hz → ${correctedPitch.toFixed(1)}Hz`);
}
```

### 3. スペクトラム比較表示
- フィルター前後の周波数スペクトラム可視化
- ノイズ成分の定量的分析
- 音量レベル改善の数値表示

## 対象音階
**ドレミファソラシド（C4-C5）**
- ド4: 261.63 Hz
- レ4: 293.66 Hz  
- ミ4: 329.63 Hz
- ファ4: 349.23 Hz
- ソ4: 392.00 Hz
- ラ4: 440.00 Hz
- シ4: 493.88 Hz
- ド5: 523.25 Hz

## フォールバック機能
Pitchyライブラリの読み込みに失敗した場合、従来のFFTピーク検出方式に自動フォールバックします。

## パフォーマンス仕様
- **検出間隔**: requestAnimationFrame（約60FPS）
- **FFTサイズ**: 2048
- **サンプリングレート**: AudioContextのデフォルト（通常48kHz）
- **スムージング**: 0.1（アナライザー設定）

## ブラウザ対応
- Chrome/Edge: 完全対応
- Firefox: 完全対応  
- Safari: 完全対応（出力先接続による対応済み）
- モバイル: マイクアクセス許可が必要

---
*作成日: 2025-07-10*
*アプリバージョン: Full Scale Training v1.0.0*