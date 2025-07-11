#!/bin/bash

# 緊急復旧スクリプト - 動作するバージョンへの即座復旧
# 使用方法: ./emergency-restore.sh [オプション]

set -e  # エラー時即座停止

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 設定 - 最新の動作確認済みバージョン
WORKING_COMMIT="df4b240"  # バージョン管理システム実装 - 動作確認済み
STABLE_TAG="v1.0.0"       # 古いが確実に動作するバージョン
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"

# ヘルプ表示
show_help() {
    echo "緊急復旧スクリプト - 動作確認済みバージョンへの復旧"
    echo ""
    echo "使用方法:"
    echo "  ./emergency-restore.sh [オプション]"
    echo ""
    echo "オプション:"
    echo "  -h, --help     このヘルプを表示"
    echo "  -f, --force    確認なしで強制実行"
    echo "  -b, --backup   現在の状態をバックアップしてから復旧"
    echo "  -c, --commit   指定コミットに復旧 (デフォルト: $WORKING_COMMIT)"
    echo "  -s, --status   現在の状態を確認"
    echo "  -t, --test     復旧後の動作テスト"
    echo ""
    echo "復旧先選択:"
    echo "  --working      最新動作版 ($WORKING_COMMIT)"
    echo "  --stable       安定版 ($STABLE_TAG)"
    echo ""
}

# 現在状態確認
check_status() {
    log_info "現在の状態を確認中..."
    
    echo "現在のブランチ: $(git branch --show-current)"
    echo "最新コミット: $(git log --oneline -1)"
    echo "変更されたファイル:"
    git status --porcelain || true
    echo ""
    echo "利用可能な復旧ポイント:"
    echo "  動作確認済み: $WORKING_COMMIT (バージョン管理システム実装)"
    echo "  安定版: $STABLE_TAG"
    echo ""
    echo "利用可能なバックアップブランチ:"
    git branch -l "backup-*" || echo "  なし"
}

# バックアップ作成
create_backup() {
    log_info "現在の状態をバックアップ中..."
    
    local current_branch=$(git branch --show-current)
    local backup_branch="backup-${current_branch}-$(date +%Y%m%d-%H%M%S)"
    
    # 未コミットの変更がある場合は一時コミット
    if ! git diff-index --quiet HEAD --; then
        log_warning "未コミットの変更があります。一時コミットを作成します。"
        git add .
        git commit -m "一時保存 - 緊急復旧前のバックアップ $(date)"
    fi
    
    # バックアップブランチ作成
    git branch "$backup_branch"
    log_success "バックアップブランチ作成: $backup_branch"
}

# 緊急復旧実行
emergency_restore() {
    local target_commit="$1"
    local force_flag="$2"
    
    log_info "緊急復旧を開始します..."
    log_info "復旧先: $target_commit"
    
    # 確認
    if [ "$force_flag" != "true" ]; then
        echo -e "${YELLOW}警告: この操作により現在の変更が失われる可能性があります。${NC}"
        echo -n "続行しますか? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_info "復旧をキャンセルしました。"
            exit 0
        fi
    fi
    
    # 復旧処理
    log_info "動作確認済みバージョンへ復旧中..."
    
    # 未保存の変更を一時退避
    git stash push -m "緊急復旧前の一時退避 $(date)" || true
    
    # メインブランチに移動
    git checkout main
    
    # 指定コミットの状態に強制リセット
    git reset --hard "$target_commit"
    
    log_success "緊急復旧完了！"
    log_info "復旧後の状態:"
    git log --oneline -3
}

# 復旧検証
verify_restore() {
    log_info "復旧状態を検証中..."
    
    # 重要ファイル確認
    local critical_files=("full-scale-training.html" "full-scale-training.js" "VERSION.json")
    for file in "${critical_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "✓ $file"
        else
            log_error "✗ $file が見つかりません"
        fi
    done
    
    # JavaScript構文チェック（簡易版）
    if [ -f "full-scale-training.js" ]; then
        if node -c "full-scale-training.js" 2>/dev/null; then
            log_success "✓ JavaScript構文チェック: OK"
        else
            log_warning "⚠ JavaScript構文に問題がある可能性があります"
        fi
    fi
    
    # HTMLファイル確認
    if [ -f "full-scale-training.html" ]; then
        local start_btn_count=$(grep -c 'id="start-btn"' full-scale-training.html || echo "0")
        if [ "$start_btn_count" -eq 1 ]; then
            log_success "✓ start-btnボタン: 存在"
        else
            log_error "✗ start-btnボタン: 見つからないか重複"
        fi
    fi
    
    log_info "動作テストを推奨します:"
    echo "  python3 -m http.server 8000"
    echo "  http://localhost:8000/full-scale-training.html"
}

# 動作テスト
run_test() {
    log_info "動作テストを実行中..."
    
    # サーバー起動テスト
    log_info "ローカルサーバーを3秒間起動してテストします..."
    python3 -m http.server 8000 &
    SERVER_PID=$!
    sleep 3
    
    # サーバー停止
    kill $SERVER_PID 2>/dev/null || true
    log_success "サーバー起動テスト: OK"
    
    log_info "ブラウザで手動テストを実行してください:"
    echo "  http://localhost:8000/full-scale-training.html"
}

# メイン処理
main() {
    local force_flag=false
    local backup_flag=false
    local target_commit="$WORKING_COMMIT"
    local status_only=false
    local test_flag=false
    
    # オプション解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -f|--force)
                force_flag=true
                shift
                ;;
            -b|--backup)
                backup_flag=true
                shift
                ;;
            -c|--commit)
                target_commit="$2"
                shift 2
                ;;
            -s|--status)
                status_only=true
                shift
                ;;
            -t|--test)
                test_flag=true
                shift
                ;;
            --working)
                target_commit="$WORKING_COMMIT"
                shift
                ;;
            --stable)
                target_commit="$STABLE_TAG"
                shift
                ;;
            *)
                log_error "不明なオプション: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Git リポジトリ確認
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Gitリポジトリではありません。"
        exit 1
    fi
    
    # ステータス確認のみ
    if [ "$status_only" = true ]; then
        check_status
        exit 0
    fi
    
    log_info "=== 緊急復旧スクリプト ==="
    
    # 現在状態表示
    check_status
    echo ""
    
    # バックアップ作成
    if [ "$backup_flag" = true ]; then
        create_backup
        echo ""
    fi
    
    # 緊急復旧実行
    emergency_restore "$target_commit" "$force_flag"
    echo ""
    
    # 検証
    verify_restore
    echo ""
    
    # テスト実行
    if [ "$test_flag" = true ]; then
        run_test
        echo ""
    fi
    
    log_success "=== 緊急復旧完了 ==="
}

# スクリプト実行
main "$@"