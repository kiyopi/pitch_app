# CLAUDE.md - 作業ルール・ガイドライン

## 🎯 使い捨てブランチ運用（スマートロールバック対応）

### 基本概念

**問題**: 従来のブランチ運用では、ローカルロールバック後のリモート同期で強制プッシュが必要
**解決**: 使い捨てブランチ運用でGitHub履歴をクリーンに保つ

### 🏷️ 使い捨てブランチ命名規則

```
[機能名]-v[版数]-impl-[番号]
例: microphone-v2-impl-001
    microphone-v2-impl-002  # 失敗時の再実装
    microphone-v2-final     # 成功時の最終版
```

### 🔄 使い捨て運用フロー

#### **新機能開発開始時**
```bash
# 1. 安定版から開始
git checkout 1e44e2e  # 真の安定版 v1.2.0

# 2. 使い捨て作業ブランチ作成
git switch -c microphone-v2-impl-001

# 3. リモートにプッシュ
git push -u origin microphone-v2-impl-001
```

#### **失敗・ロールバック時（スマート対応）**
```bash
# 問題発生時: ブランチ削除して再作成（強制プッシュ不要）
git checkout 1e44e2e
git branch -D microphone-v2-impl-001
git push origin --delete microphone-v2-impl-001

# 新しい番号で再開
git switch -c microphone-v2-impl-002
git push -u origin microphone-v2-impl-002
```

#### **成功時の最終化**
```bash
# 実装成功時: 最終ブランチ作成
git switch -c microphone-v2-final
git push -u origin microphone-v2-final

# 作業ブランチ削除
git branch -D microphone-v2-impl-001
git push origin --delete microphone-v2-impl-001
```

### 🎯 メリット

- ✅ **強制プッシュ不要**: GitHub履歴が常にクリーン
- ✅ **失敗時のリスクゼロ**: ブランチ削除で完全リセット
- ✅ **並行実装可能**: 複数アプローチを同時試行
- ✅ **履歴の明確性**: 成功版のみが残る

## 🔒 安全な作業基準

### 🚨 安定版定義

```bash
# 真の安定版（複雑実装前のクリーン状態）
STABLE_BASE="1e44e2e"  # v1.2.0 OutlierPenalty-Enhanced

# 安全復帰コマンド
alias go-stable="git checkout 1e44e2e"
alias verify-stable="git log --oneline -1 && echo '期待値: 1e44e2e バージョンv1.2.0 OutlierPenalty-Enhancedに更新'"
```

### 🚨 実装前承認（厳守）

1. **作業ログ確認**: `WORK_LOG.md`で現在の作業状況を確認
2. **対象ファイル確認**: ブランチ仕様書で修正対象ファイルを必ず特定
3. **設計原則確認**: `SIMPLE_PITCH_TRAINING_DESIGN_PRINCIPLES.md`を必ず確認
4. **エラーダイアログ仕様確認**: `ERROR_DIALOG_SPECIFICATION.md`を必ず確認
5. **ユーザー対象確認**: 修正対象ファイルをユーザーに明示的に確認
6. **仕様書作成**: 詳細な技術仕様書を作成
7. **ユーザー承認**: 実装開始の明示的承認を取得
8. **作業ログ更新**: 作業開始をWORK_LOG.mdに記録
9. **使い捨てブランチ作成**: 安定版から新ブランチ
10. **GitHub Pages確認**: iPhone確認フロー完了

⚠️ **絶対禁止**: ユーザー承認なしの実装開始
⚠️ **必須参照**: 修正時は必ず設計原則書を参照
⚠️ **エラー処理**: `ERROR_DIALOG_SPECIFICATION.md`の仕様に従う
⚠️ **仕様書確認義務**: ファイル修正前に必ず該当仕様書を読み込み、確認した仕様書名を明記
⚠️ **徹底確認プロセス**: 修正前に全関連仕様書をリスト表示し、各仕様書の確認ログを出力し、修正案提示後にユーザー許可を得てから実行
⚠️ **作業ログ確認義務**: 作業開始前にWORK_LOG.mdで現在状況を確認
⚠️ **対象ファイル確認義務**: ブランチ仕様書で修正対象ファイルを必ず特定
⚠️ **ユーザー確認強化**: 修正対象ファイルをユーザーに明示的に確認
⚠️ **作業ログ更新義務**: 各作業段階でWORK_LOG.mdを即座更新

## 📱 GitHub Pages確認フロー

### iPhone確認手順

```bash
# 1. 実装完了後プッシュ
git add . && git commit -m "実装完了"
git push origin microphone-v2-impl-001

# 2. ユーザー様の手動作業
# GitHub → Settings → Pages → Source を作業ブランチに変更

# 3. iPhone確認
# https://kiyopi.github.io/pitch_app/
# 右上タイムスタンプで更新確認（📱 HH:MM:SS）
```

### 更新確認デバッグ機能

**タイムスタンプ表示**: 
- index.html, full-scale-training.html の右上に時刻表示
- ページ読み込み時刻でGitHub Pages更新を確認
- iPhoneキャッシュ問題の解決

**8色ループシステム**:
- 修正のたびにタイムスタンプの色を変更（GitHub Pages更新確認用）
- 色順序: 青→緑→オレンジ→紫→赤→シアン→茶→グレー→（ループ）
- 場所: full-scale-training.html 1194行目 `colorIndex` 値
- ⚠️ **重要**: バージョンアップ時は必ずcolorIndexを次の番号に更新

## 🔒 メインブランチ保護

### 🚨 絶対禁止事項
```bash
# ❌ 絶対にやってはいけない
git checkout main && git merge [任意のブランチ]
git push origin main
```

### ✅ 正しいマージ手順
```bash
# 1. プルリクエスト作成
gh pr create --title "マイク許可最適化 v1.3.0"

# 2. ユーザー承認待ち（必須）
echo "⚠️ ユーザー承認なしにマージ禁止"

# 3. 承認後マージ（ユーザー指示後のみ）
```

## 📊 バージョン管理

### バージョンアップ基準
- **パッチ** (v1.2.0 → v1.2.1): バグ修正・微調整
- **マイナー** (v1.2.0 → v1.3.0): 新機能追加
- **メジャー** (v1.2.0 → v2.0.0): 大幅仕様変更

### 必須更新箇所（バージョンアップ時）
1. index.html フッター
2. full-scale-training.html フッター
3. full-scale-training.js constructor
4. about.html（存在する場合）
5. **タイムスタンプ色更新** (full-scale-training.html 1194行目 colorIndex)

---

## 📋 作業ステータス管理システム

### 🔄 作業ステータス更新ルール

#### **必須更新タイミング**
1. **作業開始時**: WORK_LOG.mdに開始記録、対象ファイル明記
2. **重要決定時**: DECISION_LOG.mdに決定内容と根拠を記録
3. **エラー発生時**: ERROR_LOG.mdにエラー内容と対策を即座記録
4. **ファイル修正時**: WORK_LOG.mdに修正ファイルと内容を詳細記録
5. **コミット時**: WORK_LOG.mdにコミットハッシュとメッセージを記録
6. **作業完了時**: WORK_LOG.mdに完了ステータスと次回引き継ぎ事項を記録

#### **記録必須項目**
- **対象ブランチ**: 現在作業中のブランチ名
- **対象ファイル**: 修正予定・修正済みファイル名
- **実行内容**: 具体的な作業内容
- **意思決定**: 判断した理由と根拠
- **発生問題**: エラー・問題とその解決策
- **次回作業**: 未完了項目と引き継ぎ事項

#### **更新頻度**
- **リアルタイム**: エラー発生時、重要決定時
- **作業単位**: ファイル修正、コミット毎
- **セッション単位**: 作業開始時、完了時

### 📋 作業記録

### 2025-07-16
- **重大ミス発生**: 修正対象ファイル間違い（full-scale-training.html）
- 作業ログシステム導入（WORK_LOG.md, ERROR_LOG.md, DECISION_LOG.md）
- CLAUDE.md徹底確認プロセス強化
- 作業ステータス更新ルール明文化

### 2025-07-15
- 使い捨てブランチ運用システム確立
- スマートロールバック対応（強制プッシュ不要）
- GitHub Pages確認フロー最適化
- タイムスタンプデバッグ機能追加

### 現在の状況
- **安定版**: 1e44e2e (v1.2.0 OutlierPenalty-Enhanced)
- **作業ブランチ**: simple-pitch-impl-001
- **対象ファイル**: simple-pitch-training.html + simple-pitch-training.js
- **次期バージョン**: v2.0.0-simple-clean 予定

---

**このファイルは安全で効率的な開発のための重要なガイドラインです。**
**使い捨てブランチ運用により、ロールバック時の強制プッシュ問題を根本解決します。**