# 仕様書ファイル管理分析レポート

**作成日**: 2025-07-16  
**調査対象**: pitch_app プロジェクトの仕様書ファイル管理状況  
**目的**: ブランチ間での仕様書ファイル分散状況の把握と管理戦略の策定

## 📋 調査結果サマリー

### ブランチ別仕様書ファイル数
| ブランチ | ファイル数 | 状態 |
|---------|------------|------|
| **安定版** (1e44e2e) | 13ファイル | ✅ 基本仕様書 |
| **新規開発** (nextjs-training-v3-impl-001) | 13ファイル | ✅ 基本仕様書 |
| **問題ブランチ** (simple-pitch-impl-001) | 21ファイル | ⚠️ 仕様書散乱 |

### 重要な発見
1. **CLAUDE.md不在**: 新規開発ブランチに存在しない
2. **設計原則書不在**: 新規開発に必要な仕様書が不足
3. **仕様書散乱**: 問題ブランチに8つの追加仕様書が存在

## 🔍 詳細分析

### 共通仕様書ファイル（全ブランチ存在）
```
✅ COMPREHENSIVE_REQUIREMENTS_SPECIFICATION.md    (44,722 bytes)
✅ DEVELOPMENT_RULES.md                           (3,681 bytes)
✅ HYBRID_MICROPHONE_PERMISSION_REQUIREMENTS.md  (17,385 bytes)
✅ NEXTJS_TRAINING_V3_DETAILED_IMPLEMENTATION_PLAN.md (14,795 bytes)
✅ PITCHY_SPECS.md                               (4,932 bytes)
✅ RANDOM_BASE_TONE_DEPLOYMENT.md               (13,782 bytes)
✅ RANDOM_BASE_TONE_IMPLEMENTATION.md           (12,613 bytes)
✅ RANDOM_BASE_TONE_README.md                   (9,541 bytes)
✅ RANDOM_BASE_TONE_SPEC.md                     (10,044 bytes)
✅ README.md                                    (11 bytes)
✅ TIMING_SETTINGS.md                           (3,764 bytes)
✅ TONE_JS_NOTES.md                             (4,537 bytes)
✅ layout_diagram.md                            (9,382 bytes)
```

### 問題ブランチ限定ファイル（simple-pitch-impl-001のみ）
```
🚨 CLAUDE.md                                     (11,639 bytes) ★重要
🚨 DEBUG_STATUS.md                              (4,122 bytes)
🚨 DECISION_LOG.md                              (7,703 bytes)
🚨 ERROR_DIALOG_SPECIFICATION.md               (8,923 bytes) ★重要
🚨 ERROR_LOG.md                                 (2,876 bytes)
🚨 SIMPLE_PITCH_TRAINING_DESIGN_PRINCIPLES.md  (8,170 bytes) ★重要
🚨 SIMPLE_PITCH_TRAINING_FINAL_SPECIFICATION.md (9,212 bytes)
🚨 WORK_CONTINUATION.md                         (2,243 bytes)
🚨 WORK_LOG.md                                  (7,013 bytes) ★参考
```

## 🎯 管理戦略決定

### 採用戦略: **戦略A - 必要な仕様書のみ選択移植**

#### 移植対象ファイル（必須）
1. **CLAUDE.md** - 開発ルール・使い捨てブランチ運用
2. **SIMPLE_PITCH_TRAINING_DESIGN_PRINCIPLES.md** - 設計原則
3. **ERROR_DIALOG_SPECIFICATION.md** - エラーダイアログ仕様

#### 移植対象ファイル（参考）
4. **WORK_LOG.md** - 作業履歴（参考程度）

#### 除外ファイル（新規開発に不要）
- ❌ DEBUG_STATUS.md（旧実装専用）
- ❌ DECISION_LOG.md（旧実装専用）
- ❌ ERROR_LOG.md（旧実装専用）
- ❌ SIMPLE_PITCH_TRAINING_FINAL_SPECIFICATION.md（旧実装専用）
- ❌ WORK_CONTINUATION.md（旧実装専用）

## 📋 実行手順

### Phase 1: 問題ブランチから必要ファイル取得
```bash
# 問題ブランチに移動
git checkout simple-pitch-impl-001

# 必要ファイルを一時保存
cp CLAUDE.md /tmp/
cp SIMPLE_PITCH_TRAINING_DESIGN_PRINCIPLES.md /tmp/
cp ERROR_DIALOG_SPECIFICATION.md /tmp/
cp WORK_LOG.md /tmp/
```

### Phase 2: 新規開発ブランチに移植
```bash
# 新規開発ブランチに移動
git checkout nextjs-training-v3-impl-001

# 必要ファイルを配置
cp /tmp/CLAUDE.md .
cp /tmp/SIMPLE_PITCH_TRAINING_DESIGN_PRINCIPLES.md .
cp /tmp/ERROR_DIALOG_SPECIFICATION.md .
cp /tmp/WORK_LOG.md .
```

### Phase 3: Git管理下に追加
```bash
# 新規ファイルを追加
git add CLAUDE.md
git add SIMPLE_PITCH_TRAINING_DESIGN_PRINCIPLES.md
git add ERROR_DIALOG_SPECIFICATION.md
git add WORK_LOG.md

# コミット
git commit -m "仕様書移植: 新規開発に必要な仕様書を追加

- CLAUDE.md: 開発ルール・使い捨てブランチ運用
- SIMPLE_PITCH_TRAINING_DESIGN_PRINCIPLES.md: 設計原則
- ERROR_DIALOG_SPECIFICATION.md: エラーダイアログ仕様
- WORK_LOG.md: 作業履歴（参考）

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## 🚨 注意事項

### ファイル内容の検証
移植前に各ファイルの内容を確認し、新規開発に適応させる必要がある場合は修正を行う。

### 新規開発ブランチでの仕様書優先度
```
優先度1: 新規開発仕様書
├── COMPREHENSIVE_REQUIREMENTS_SPECIFICATION.md
├── HYBRID_MICROPHONE_PERMISSION_REQUIREMENTS.md
├── NEXTJS_TRAINING_V3_DETAILED_IMPLEMENTATION_PLAN.md
└── CLAUDE.md（移植）

優先度2: 技術仕様書
├── PITCHY_SPECS.md
├── TONE_JS_NOTES.md
├── SIMPLE_PITCH_TRAINING_DESIGN_PRINCIPLES.md（移植）
└── ERROR_DIALOG_SPECIFICATION.md（移植）

優先度3: 参考資料
├── DEVELOPMENT_RULES.md
├── WORK_LOG.md（移植）
└── その他レガシー仕様書
```

## ✅ 期待効果

### 管理効率化
- 必要な仕様書のみを新規開発ブランチに集約
- 不要な仕様書を除外し、混乱を防止
- CLAUDE.mdルールの適用が可能に

### 開発効率向上
- 設計原則書・エラーダイアログ仕様の参照が可能
- 一貫した開発ルールの適用
- 作業履歴の引き継ぎ

### 将来的な管理改善
- 新規開発完了後の仕様書整理の基盤
- 成功時の仕様書セット確定
- 失敗時の使い捨てブランチ運用実践

## 📊 移植後の仕様書構成予測

| カテゴリ | ファイル数 | 説明 |
|---------|------------|------|
| **基本仕様書** | 13ファイル | 既存の共通仕様書 |
| **移植仕様書** | 4ファイル | 問題ブランチから移植 |
| **総計** | 17ファイル | 新規開発に最適化された仕様書セット |

---

**調査実施日**: 2025-07-16  
**調査者**: Claude Code Assistant  
**承認**: 戦略A実行承認済み  
**次のアクション**: 仕様書移植の実行