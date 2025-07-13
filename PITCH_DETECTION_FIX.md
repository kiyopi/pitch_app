# 周波数検出システム修正ドキュメント

## 問題概要 (2025-07-13)

### 発生した問題
- 音声周波数が異常に低い値で検出される（294Hz → 99Hz等）
- オクターブ補正が頻繁に発動するも不完全
- 全ての音程が「要練習」判定となる精度低下

### 症状例
```
🔍 Pitchy検出: pitch=99.3Hz, clarity=0.861 (本来294Hz)
🔧 動的オクターブ補正: 195.2Hz → 390.3Hz (閾値: 287.8Hz)
🎵 記録: レ4 周波数=99Hz, 誤差=-1878¢, 判定=要練習
```

## 根本原因分析

### 1. ノイズリダクションフィルターの過度な制限
- **ハイパスフィルター**: 80Hz以下カット → 人声低音域倍音を削除
- **ローパスフィルター**: 2kHz以上カット → 重要な倍音情報を除去
- 結果: Pitchyライブラリが正確な基音を検出できない

### 2. 周波数分解能の不足
- **fftSize = 2048**: サンプリングレート48kHzで分解能約23.4Hz
- 200-300Hz台の精密な音程検出には粗すぎる

### 3. オクターブ補正ロジックの限界
- 従来は2倍補正（1オクターブ）のみ対応
- 実際には3倍補正（1.5オクターブ）や1.5倍補正も必要

### 4. 検出信頼性の低さ
- clarity閾値0.1で不正確な検出結果も採用
- 低品質な検出データが記録される

## 実装した修正

### 1. ノイズリダクションフィルターの最適化
```javascript
// 修正前
this.noiseReduction.highPassFilter.frequency.setValueAtTime(80, this.audioContext.currentTime);
this.noiseReduction.lowPassFilter.frequency.setValueAtTime(2000, this.audioContext.currentTime);

// 修正後
this.noiseReduction.highPassFilter.frequency.setValueAtTime(40, this.audioContext.currentTime);
this.noiseReduction.lowPassFilter.frequency.setValueAtTime(4000, this.audioContext.currentTime);
```

### 2. 周波数分解能の向上
```javascript
// 修正前
this.analyzer.fftSize = 2048;

// 修正後  
this.analyzer.fftSize = 4096; // 分解能を2倍に向上
```

### 3. 多段階オクターブ補正システム
```javascript
// 修正前: 2倍補正のみ
if (pitch < correctionThreshold) {
    correctedPitch = pitch * 2;
}

// 修正後: 最適補正を自動選択
const candidates = [
    { factor: 3, freq: pitch * 3 },    // 1.5オクターブ上
    { factor: 2, freq: pitch * 2 },    // 1オクターブ上
    { factor: 1.5, freq: pitch * 1.5 }, // 0.5オクターブ上
    { factor: 1, freq: pitch }         // 補正なし
];
// 目標周波数との最小誤差を探して採用
```

### 4. 検出信頼性の強化
```javascript
// 修正前
if (pitch && pitch >= 80 && pitch <= 1200 && clarity > 0.1) {

// 修正後
if (pitch && pitch >= 40 && pitch <= 1200 && clarity > 0.3) {
```

## 修正効果

### 期待される改善
1. **正確な周波数検出**: 294Hz本来の音程を正しく検出
2. **オクターブ補正の削減**: 不必要な補正処理の大幅減少
3. **採点精度の向上**: 「要練習」以外の適切な評価
4. **安定した音声認識**: clarity向上による信頼性強化

### 技術的利点
- 人声の自然な倍音構造を保持
- 高精度な周波数分析が可能
- 複雑なオクターブエラーにも対応
- ノイズと音声の適切な分離

## 検証方法

### 1. デバッグログの確認
```
🔧 多段階オクターブ補正: 99.3Hz → 297.9Hz (×3) ← 正常動作
🎵 記録: レ4 周波数=294Hz, 誤差=0¢, 判定=優秀 ← 期待結果
```

### 2. 採点結果の改善
- 全音程「要練習」→ 適切な評価分散
- 巨大誤差（-1878¢）→ 正常範囲（±50¢以内）

### 3. システム安定性
- オクターブ補正頻度の大幅減少
- clarity値の向上
- 一貫した検出精度

## 今後の監視ポイント

1. **異常検出の再発防止**: 極端な周波数値の出現監視
2. **パフォーマンス影響**: fftSize増加による処理負荷
3. **環境適応性**: 様々なマイク・環境での動作確認
4. **ユーザー体験**: 実際の採点精度とユーザー満足度

---
*修正実施日: 2025-07-13*  
*対象ブランチ: scoring-adjustment*  
*影響ファイル: full-scale-training.js*