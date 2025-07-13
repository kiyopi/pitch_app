# ブランチ管理ドキュメント

## 2025-07-13 ブランチ整理作業

### 背景
- `scoring-adjustment`ブランチに採点ロジック修正とマイク修正が混在
- 採点関連の有益な修正を保持したまま、マイク修正を分離する必要があった

### 実施した作業

#### 1. 現在の状態をバックアップ
```bash
git branch scoring-adjustment-backup
```

#### 2. マイク修正用ブランチ作成
```bash
git checkout 2280197  # バックグラウンド検知+自動マイク制御機能実装
git checkout -b microphone-hang-fix
```

#### 3. scoring-adjustmentを採点専用に戻す
```bash
git checkout scoring-adjustment  
git reset --hard 2280197
```

#### 4. リモートにプッシュ
```bash
git push -u origin microphone-hang-fix
git push origin scoring-adjustment --force-with-lease
git push -u origin scoring-adjustment-backup
```

### 現在のブランチ構成

#### 🎯 scoring-adjustment
- **目的**: 採点ロジック修正専用
- **状態**: マイク修正前の状態（2280197）
- **含む機能**: 
  - 外れ値ペナルティ制採点システム
  - 結果表示レイアウト改善
  - バックグラウンド検知+自動マイク制御機能

#### 🎤 microphone-hang-fix
- **目的**: マイク「準備中」ハング問題修正専用
- **状態**: マイク修正前の状態（2280197）から開始
- **対象問題**: 
  - 「マイク準備中」で無限ハング
  - AudioContext.resume()のユーザーインタラクション制限
  - 即座音再生機能の維持

#### 💾 scoring-adjustment-backup
- **目的**: 元の状態の完全バックアップ
- **状態**: 採点修正+マイク修正が混在した状態（2416e0b）
- **用途**: 必要に応じて参照・復旧用

### 重要なコミットハッシュ

- `2280197` - バックグラウンド検知+自動マイク制御機能実装（分岐点）
- `463fc74` - 即座音再生機能実装 - マイク初期化前倒し（マイク修正開始）
- `2416e0b` - 「マイク準備中」ハング問題を修正（バックアップ地点）

### 今後の作業方針

#### 採点ロジック修正 (`scoring-adjustment`)
- 外れ値ペナルティ制の改善
- 採点精度の向上
- UI/UX改善
- **🔧 周波数検出システム修正** (詳細: [PITCH_DETECTION_FIX.md](./PITCH_DETECTION_FIX.md))

#### マイク修正 (`microphone-hang-fix`) 
- AudioContext初期化の最適化
- ユーザーインタラクション制限への対応
- 即座音再生機能の維持
- 連続再生機能への対応

### 注意事項

1. **force-push使用**: `scoring-adjustment`ブランチでforce-pushを使用したため、他の開発者がいる場合は事前通知が必要

2. **バックアップ重要性**: `scoring-adjustment-backup`ブランチは重要な修正を含むため削除しない

3. **ブランチ目的明確化**: 各ブランチは単一の目的に特化し、混在を避ける

### 復旧手順（緊急時）

採点修正を失った場合の復旧：
```bash
git checkout scoring-adjustment-backup
git checkout -b scoring-adjustment-restore
# 必要な修正のみを選択的にcherry-pick
```

---

## 🗑️ ドキュメント削除タイミング

**このドキュメントは以下の作業完了後に削除してください：**

### 削除条件
1. ✅ **採点ロジック修正完了** (`scoring-adjustment`ブランチ)
   - 外れ値ペナルティ制の改善完了
   - 採点精度向上完了
   - メインブランチにマージ完了

2. ✅ **マイク修正完了** (`microphone-hang-fix`ブランチ)
   - 「マイク準備中」ハング問題解決完了
   - 即座音再生機能動作確認完了
   - メインブランチにマージ完了

3. ✅ **バックアップブランチ整理**
   - `scoring-adjustment-backup`ブランチ削除
   - 不要なブランチのクリーンアップ完了

### 削除コマンド
```bash
# ローカルドキュメント削除
rm /Users/isao/Documents/pitch_app/BRANCH_MANAGEMENT.md

# バックアップブランチ削除
git branch -d scoring-adjustment-backup
git push origin --delete scoring-adjustment-backup
```

**⚠️ 注意**: 全ての作業が完了し、安定動作を確認してから削除すること

---
*作成日: 2025-07-13*
*最終更新: 2025-07-13*
*削除予定: 採点・マイク修正完了後*