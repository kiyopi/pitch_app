# 採点システム強化・成果記録機能 仕様書

**版数**: v1.0  
**作成日**: 2025-07-13  
**対象ブランチ**: scoring-adjustment  
**前提**: 外れ値ペナルティ制導入による採点精度向上

---

## 目次

1. [概要](#1-概要)
2. [外れ値ペナルティ制仕様](#2-外れ値ペナルティ制仕様)
3. [連続モード拡張仕様](#3-連続モード拡張仕様)
4. [成果記録・共有システム](#4-成果記録共有システム)
5. [技術実装設計](#5-技術実装設計)
6. [段階的実装ロードマップ](#6-段階的実装ロードマップ)

---

## 1. 概要

### 1.1 目的
相対音感トレーニングアプリの採点システムを強化し、学習効果を最大化する機能拡張を行う。

### 1.2 主要改善点
- **外れ値ペナルティ制**: 一貫性のある音感能力を正確に評価
- **連続モード対応**: 5回連続判定による総合評価機能
- **成果記録システム**: SNS共有・ローカル保存・アプリ連携機能

### 1.3 解決する問題
1. 7音優秀・1音大外れでも「優秀」判定される現象
2. 学習者の成長記録・モチベーション維持の困難
3. 練習成果の可視化・共有手段の不足

---

## 2. 外れ値ペナルティ制仕様

### 2.1 基本コンセプト
```
目的: 一貫性のある音感能力を正確に評価
問題解決: 極端な外れ値による評価歪曲を防止
教育効果: 安定した相対音感の重要性を学習者に伝達
```

### 2.2 外れ値判定基準
| レベル | 誤差範囲 | 分類 | 色分け |
|--------|----------|------|--------|
| レベル1 | ±50-80セント | 注意 | 🟡 |
| レベル2 | ±80-120セント | 警告 | 🟠 |
| レベル3 | ±120セント超 | 重大 | 🔴 |

### 2.3 ペナルティルール
```
【優秀→良好への降格条件】
✓ レベル1以上の外れ値が1個以上存在

【良好→要練習への降格条件】
✓ レベル1以上の外れ値が2個以上存在
✓ または レベル2以上の外れ値が1個以上存在

【追加表示情報】
✓ 外れ値の個数と程度を明示
✓ 安定性向上のアドバイス表示
✓ 次回改善ポイントの提案
```

### 2.4 実装データ構造
```javascript
const outlierAnalysis = {
    count: 1,                    // 外れ値総数
    severity: 'level1',          // 最高レベル
    details: [
        {
            note: '完全5度',
            cents: 65,
            level: 'level1',
            impact: 'downgrade'
        }
    ],
    penaltyApplied: true,        // ペナルティ適用状況
    originalGrade: '優秀',       // 元の判定
    finalGrade: '良好'          // ペナルティ適用後
};
```

---

## 3. 連続モード拡張仕様

### 3.1 連続モードの概要
```
機能名: 連続判定モード
対象: 5回連続の全音程トレーニング
評価: セッション単位 + 総合評価
自動化: 基音自動変更・連続実行
```

### 3.2 評価構造の階層化
```
レベル1: 個別音程評価（±15/30/40セント）
    ↓
レベル2: セッション評価（8音程1セット + 外れ値ペナルティ）
    ↓
レベル3: 総合評価（5セッション統合分析）
```

### 3.3 総合評価算出方法

#### セッション評価重み付け
```javascript
const sessionScoring = {
    '優秀': 100,     // 完璧な演奏
    '良好': 75,      // 良好な演奏
    '要練習': 50     // 基礎練習必要
};
```

#### 総合評価ランク
| 平均点数 | ランク | 評価 | 説明 |
|----------|--------|------|------|
| 90点以上 | 🏆 マスター級 | 非常に優秀 | プロレベルの安定性 |
| 75点以上 | 🥇 上級者 | 優秀 | 高い相対音感能力 |
| 60点以上 | 🥈 中級者 | 良好 | 基本的な音感習得済み |
| 60点未満 | 🥉 初級者 | 要練習 | 基礎練習推奨 |

### 3.4 進歩分析機能
```javascript
const progressAnalysis = {
    trend: 'improving',          // improving/stable/declining
    consistency: 0.85,           // 0-1の安定性指標
    weakIntervals: ['完全4度'],  // 苦手音程の特定
    strongIntervals: ['長3度'],  // 得意音程の特定
    recommendation: '完全4度の集中練習を推奨'
};
```

---

## 4. 成果記録・共有システム

### 4.1 SNS投稿機能仕様

#### Web Share API活用
```javascript
const shareData = {
    title: '🎵 相対音感トレーニング結果',
    text: `🏆 優秀！ 8音中7音完璧 平均誤差12¢\n基音: C4 | ${new Date().toLocaleDateString()}`,
    url: window.location.href,
    files: [resultImageBlob]     // 結果画像（将来拡張）
};
```

#### 対応プラットフォーム
```
【優先対応】
- Twitter/X: ハッシュタグ #相対音感トレーニング
- LINE: 友人との成果シェア
- Instagram: ストーリーズ投稿

【将来対応】
- Discord: 音楽系サーバーでのシェア
- Facebook: グループ内でのシェア
```

#### シェア用画像生成
```javascript
const generateResultImage = (sessionResult) => {
    // Canvas APIで結果画像を生成
    // - グラデーション背景
    // - 結果データの視覚化
    // - QRコード（アプリへのリンク）
    // - ブランディング要素
    return imageBlob;
};
```

### 4.2 結果ドキュメント化機能

#### 出力形式オプション
```
【軽量形式】
- JSON: 詳細データ（開発者・分析用）
- CSV: 表計算ソフト対応
- TXT: シンプルな記録

【リッチ形式】
- PDF: 印刷可能な成績表
- HTML: Webページ形式（オフライン閲覧可能）
```

#### ローカルストレージ活用
```javascript
const saveToLocalHistory = (sessionResult) => {
    const history = JSON.parse(localStorage.getItem('pitchTrainingHistory') || '[]');
    history.push({
        ...sessionResult,
        id: generateUniqueId(),
        savedAt: Date.now()
    });
    
    // 最新100件のみ保持（容量制限対応）
    if (history.length > 100) {
        history.splice(0, history.length - 100);
    }
    
    localStorage.setItem('pitchTrainingHistory', JSON.stringify(history));
};
```

#### 成績レポートテンプレート
```
=================================
🎵 相対音感トレーニング成績表
=================================
実施日: 2025-07-13 10:30
基音: C4 (261.63Hz)
モード: ランダム基音モード

【総合評価】🏆 優秀！
完璧: 7/8 (87.5%)
良い: 1/8 (12.5%)
要調整: 0/8 (0%)
平均誤差: 12¢

【詳細結果】
1. 完全2度: +3¢ 🎉完璧
2. 長2度: -8¢ 🎉完璧
3. 短3度: +52¢ 🟡注意レベル
...

【外れ値分析】
※1音に注意レベルの外れあり
推奨: 短3度の重点練習

【統計情報】
最高精度: ±2¢
安定性指標: 0.78
次回目標: 安定性向上
=================================
```

### 4.3 アプリケーション連携仕様

#### カレンダー連携
```javascript
const createCalendarEvent = (sessionResult) => {
    const icalContent = `
BEGIN:VEVENT
SUMMARY:🎵 相対音感トレーニング (${sessionResult.finalGrade})
DTSTART:${sessionResult.timestamp}
DESCRIPTION:基音${sessionResult.baseTone.name} 平均誤差${sessionResult.avgError}¢
END:VEVENT
    `;
    return new Blob([icalContent], { type: 'text/calendar' });
};
```

#### 楽譜アプリ連携（将来拡張）
```
【対応予定】
- MuseScore: 練習楽譜の自動生成
- Piano Marvel: 弱点音程の練習課題作成
- SmartMusic: カスタム練習プラン
```

#### 学習管理システム連携（将来拡張）
```javascript
const exportToGoogleSheets = async (historyData) => {
    // OAuth認証後
    // スプレッドシートに練習履歴を自動記録
    // グラフ・分析機能付き
};
```

---

## 5. 技術実装設計

### 5.1 採点エンジンの分離設計
```javascript
class ScoreCalculator {
    // 基本採点ロジック
    calculateBasicScore(results) {
        // 従来の完璧/良い/要調整判定
    }
    
    // 外れ値分析
    analyzeOutliers(results) {
        // レベル別外れ値の検出・分類
    }
    
    // ペナルティ適用
    applyOutlierPenalty(basicScore, outlierAnalysis) {
        // 降格ルールの適用
    }
    
    // モード別評価（将来拡張）
    evaluateByMode(mode, sessionResults) {
        // 単発/連続モード別の評価ロジック
    }
}
```

### 5.2 設定可能なパラメータ
```javascript
const scoringConfig = {
    // 基本閾値（改善後）
    perfectThreshold: 15,        // ±15セント（従来10→15）
    goodThreshold: 30,           // ±30セント（従来20→30）
    
    // 外れ値判定
    outlierLevels: [50, 80, 120], // 3段階の外れ値判定
    
    // ペナルティ設定
    outlierPenalty: {
        level1: 'downgrade',         // 1ランクダウン
        level2: 'double_penalty',    // 2ランクダウン
        multiple: 'cumulative'       // 累積ペナルティ
    },
    
    // モード別設定
    modes: {
        single: {
            requiredPerfect: 6,      // 優秀判定に必要な完璧数
            requiredGood: 6          // 良好判定に必要な良い以上数
        },
        continuous: {
            sessionWeight: [1,1,1,1,1], // 各セッションの重み
            bonusThreshold: 90       // ボーナス付与閾値
        }
    }
};
```

### 5.3 データ構造の拡張
```javascript
// セッション結果（単発・連続共通）
const sessionResult = {
    id: 'session_001',
    mode: 'single',              // single/continuous
    baseTone: { name: 'C4', frequency: 261.63 },
    results: [/* 8音程の結果 */],
    
    // 基本評価
    basicGrade: '優秀',
    finalGrade: '良好',          // ペナルティ適用後
    
    // 外れ値分析
    outlierAnalysis: {
        count: 1,
        severity: 'level1',
        details: [/* 外れ値詳細 */],
        penaltyApplied: true
    },
    
    // 統計情報
    statistics: {
        avgError: 12,
        maxError: 52,
        consistency: 0.78,
        strongIntervals: ['長3度'],
        weakIntervals: ['短3度']
    },
    
    timestamp: '2025-07-13T10:30:00Z'
};

// 連続モード総合結果
const continuousResult = {
    mode: 'continuous_5',
    sessions: [/* 5つのセッション結果 */],
    
    // 総合評価
    overallScore: 82,            // 100点満点
    overallGrade: '🥇 上級者',
    
    // 進歩分析
    progressTrend: 'improving',  // improving/stable/declining
    consistencyTrend: 0.85,      // 安定性の推移
    
    // 推奨事項
    recommendation: '短3度の集中練習を推奨',
    nextTarget: '安定性向上（目標0.9以上）',
    
    createdAt: '2025-07-13T11:00:00Z'
};
```

### 5.4 プライバシー重視設計
```
原則:
- デフォルトはローカル保存のみ
- 外部送信は明示的な許可のみ
- 個人情報は一切収集しない
- 匿名化された統計のみ活用

実装:
- localStorage中心の設計
- 暗号化オプション（将来拡張）
- データ削除機能の提供
- GDPR準拠の設計
```

---

## 6. 段階的実装ロードマップ

### Phase 1: 基本シェア機能（v1.2.0）
**目標リリース**: 2025年8月

**実装内容**:
- ✅ 外れ値ペナルティ制の導入
- ✅ Web Share APIでのSNS投稿
- ✅ JSON/CSV/TXT形式での結果保存
- ✅ ローカルストレージでの履歴管理

**技術要件**:
- Canvas API（画像生成）
- Web Share API
- File API（ダウンロード）
- LocalStorage API

### Phase 2: リッチ出力機能（v1.3.0）
**目標リリース**: 2025年9月

**実装内容**:
- 📋 PDF成績表生成
- 🎨 シェア用画像生成（デザイン強化）
- 📊 履歴分析・統計機能
- 🔍 弱点音程の特定・アドバイス

**技術要件**:
- jsPDF（PDF生成）
- Chart.js（グラフ描画）
- 統計ライブラリ

### Phase 3: 連続モード機能（v1.4.0）
**目標リリース**: 2025年10月

**実装内容**:
- 🔄 連続5回モードの実装
- 📈 総合評価システム
- 📅 カレンダーアプリ連携
- ☁️ 基本的なクラウドストレージ対応

**技術要件**:
- 自動基音変更システム
- 進歩分析アルゴリズム
- iCalendar形式対応

### Phase 4: 外部連携機能（v1.5.0）
**目標リリース**: 2025年12月

**実装内容**:
- 🎼 楽譜アプリ連携
- 🔗 Google Sheets連携
- 📱 PWA機能強化
- 🔔 練習リマインダー

**技術要件**:
- OAuth認証
- Google Sheets API
- Service Worker
- Web Push API

### Phase 5: アカウント機能（v2.0.0）
**目標リリース**: 2026年3月

**実装内容**:
- 👤 簡易ユーザー登録（ローカル）
- 🏆 成績ランキング（匿名）
- 🎯 個人目標設定・達成管理
- 🤝 学習コミュニティ機能

**技術要件**:
- IndexedDB
- WebRTC（P2P通信）
- 暗号化ライブラリ

---

## 7. 成功指標・KPI

### 7.1 ユーザビリティ指標
```
- 外れ値ペナルティによる評価精度向上: 90%以上
- シェア機能利用率: 20%以上
- 履歴保存機能利用率: 50%以上
- 連続モード完走率: 30%以上
```

### 7.2 技術的指標
```
- ページ読み込み速度: 3秒以内
- 画像生成時間: 2秒以内
- ローカルストレージ容量: 10MB以内
- ブラウザ互換性: 95%以上
```

### 7.3 教育効果指標
```
- 学習継続率の向上: 25%向上
- 平均精度の改善: セッション毎に5%向上
- 安定性指標の向上: 0.1ポイント/月
```

---

## 8. 付録

### 8.1 関連ドキュメント
- [マイク機能仕様書](./microphone-specification.md)
- [基本機能仕様書](../README.md)
- [技術詳細](../about.html)

### 8.2 更新履歴
| 版数 | 日付 | 更新内容 | 更新者 |
|------|------|----------|--------|
| v1.0 | 2025-07-13 | 初版作成 | Claude Code |

### 8.3 承認記録
| 役割 | 氏名 | 承認日 | 署名 |
|------|------|--------|------|
| 仕様策定者 | Claude Code | 2025-07-13 | ✅ |
| レビュー担当 | - | - | - |
| 承認者 | - | - | - |

---

**文書管理**
- 最終更新: 2025-07-13
- 更新者: Claude Code
- レビュー: 実装開始前に要レビュー
- 保存場所: `/docs/scoring-system-enhancement-specification.md`