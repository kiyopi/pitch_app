# ページ遷移後マイク許可フロー仕様書

**版数**: v2.0  
**作成日**: 2025-07-15  
**対象**: ページ遷移後即座マイク許可機能  
**基盤**: 安定実装 58c6b84 からの改善  

---

## 📋 目次

1. [経緯・背景](#1-経緯背景)
2. [課題分析](#2-課題分析)
3. [設計方針](#3-設計方針)
4. [技術仕様](#4-技術仕様)
5. [実装計画](#5-実装計画)
6. [テスト計画](#6-テスト計画)

---

## 1. 経緯・背景

### 1.1 プロジェクト経緯

**安定実装完了 (58c6b84)**
- 2025-07-14: 段階的マイク実装完了
- ストリーム保持方式によるUX改善実現
- 全ブラウザ対応確認済み
- **課題**: スタートボタン押下時のマイク許可ダイアログ表示

**複雑実装試行 (e80718c - 42a874c)**
- 2025-07-15: モード選択時マイク許可 + ページ遷移後即座許可の複合実装
- 課題分析により以下の問題を特定：
  - Safari互換性問題（Permission API不完全サポート）
  - 複雑なURL パラメータ依存設計
  - エラーハンドリング不足
  - パフォーマンス問題（重複ストリーム処理）

**ロールバック決断 (58c6b84)**
- 2025-07-15: 安定実装への回帰
- 複雑性よりも安定性・保守性を優先
- シンプルなアプローチでの再設計決定

### 1.2 目標

**主目標**: スタートボタン押下時のマイク許可ダイアログを回避
**副目標**: 
- 既存の安定性を保持
- シンプルで保守しやすい実装
- 全ブラウザ互換性維持

---

## 2. 課題分析

### 2.1 現在のユーザーフロー

```
🎯 モード選択: [ランダム基音モード] 押下
    ↓
🔄 ページ遷移: full-scale-training.html?auto=true
    ↓
🎹 スタートボタン表示・押下
    ↓
🎤 **マイク許可ダイアログ表示** ← 課題箇所
    ↓ (許可)
🎵 トレーニング開始
```

### 2.2 前回実装で特定された課題

| 課題分類 | 具体的問題 | 影響度 |
|----------|------------|--------|
| **Safari互換性** | Permission API不完全サポート | 高 |
| **複雑性** | URL パラメータ依存設計 | 中 |
| **エラーハンドリング** | 復旧フロー不完全 | 高 |
| **パフォーマンス** | 重複ストリーム処理リスク | 中 |
| **保守性** | 複雑な条件分岐 | 高 |

### 2.3 ブラウザ制約調査

**Permission API対応状況**:
- Chrome 43+: ✅ 完全対応
- Firefox 46+: ✅ 完全対応  
- Safari 14+: ⚠️ 部分対応（不安定）
- iOS Safari: ❌ 制限あり

**getUserMedia制約**:
- 全ブラウザ: ✅ 安定対応
- HTTPS必須: ✅ 既存対応済み
- User Interaction: ⚠️ 必要（対策要）

---

## 3. 設計方針

### 3.1 基本原則

#### **KISS原則 (Keep It Simple, Stupid)**
- 複雑な条件分岐を排除
- 単一責任の明確化
- 理解しやすいコードフロー

#### **フォールバック戦略**
- エラー時は既存フローに自動復帰
- 段階的機能提供
- ユーザー体験の最低保証

#### **既存資産保護**
- 安定した部分は変更しない
- 既存のストリーム保持機能を活用
- 段階的な改善アプローチ

### 3.2 技術戦略

#### **依存性最小化**
```javascript
// ❌ 避ける: Permission API依存
if ('permissions' in navigator) {
    const status = await navigator.permissions.query({name: 'microphone'});
}

// ✅ 採用: 直接getUserMedia
const stream = await navigator.mediaDevices.getUserMedia({audio: true});
```

#### **シンプルな状態管理**
```javascript
// ❌ 避ける: 複雑なフラグ管理
this.micPermissionState = 'requesting|granted|denied|error';
this.pageTransitionType = 'index|direct|bookmark';
this.urlParameters = {mic: 'request|granted', auto: 'true|false'};

// ✅ 採用: 単純な判定
const isFromModeSelection = urlParams.get('mode') === 'random';
```

### 3.3 エラー戦略

#### **グレースフルデグラデーション**
```
自動マイク許可成功 → 最適なUX
    ↓ (エラー)
手動マイク許可 → 従来のUX（保証されたフロー）
```

#### **ユーザーフレンドリーなエラー**
- 技術的エラーを隠蔽
- 明確な次のアクション提示
- 混乱を避ける簡潔なメッセージ

---

## 4. 技術仕様

### 4.1 モード選択側実装 (index.html)

#### **変更箇所**: `selectMode`関数
```javascript
// 現在の実装
function selectMode(mode) {
    console.log(`🎯 モード選択: ${mode}`);
    switch(mode) {
        case 'random':
            window.location.href = 'full-scale-training.html?auto=true';
            break;
    }
}

// 新実装
function selectMode(mode) {
    console.log(`🎯 モード選択: ${mode}`);
    switch(mode) {
        case 'random':
            // シンプルなモードフラグのみ追加
            window.location.href = 'full-scale-training.html?mode=random';
            break;
    }
}
```

**変更点**:
- `?auto=true` → `?mode=random` に単純化
- 複雑なパラメータ組み合わせを排除

### 4.2 トレーニングページ側実装 (full-scale-training.js)

#### **新機能**: 自動マイク許可処理
```javascript
// DOMContentLoaded時の処理追加
document.addEventListener('DOMContentLoaded', async () => {
    const app = new FullScaleTraining();
    
    // モード判定（シンプル）
    const urlParams = new URLSearchParams(window.location.search);
    const isFromModeSelection = urlParams.get('mode') === 'random';
    
    if (isFromModeSelection) {
        console.log('🎤 モード選択からの遷移 - 自動マイク許可開始');
        await handleAutoMicrophonePermission(app);
    }
    
    // 既存の初期化処理継続
    initializeApp(app);
});
```

#### **コア機能**: 自動マイク許可処理
```javascript
async function handleAutoMicrophonePermission(app) {
    try {
        console.log('🎤 自動マイク許可処理開始');
        
        // 直接getUserMediaで許可要求（Permission API不使用）
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        console.log('✅ マイク許可取得成功');
        
        // アプリに設定
        app.mediaStream = stream;
        app.microphonePermissionGranted = true;
        
        // AudioContext + Analyzer初期化
        await initializeMicrophoneComponents(app, stream);
        
        console.log('🎉 自動マイク許可完了 - スタートボタン準備完了');
        
        // 成功時の UI 更新
        showAutoPermissionSuccess();
        
    } catch (error) {
        console.log('❌ 自動マイク許可失敗 - 手動モードに切り替え');
        console.error('Error details:', error);
        
        // フォールバック: 通常フローに戻す
        handleAutoPermissionFailure(error);
    }
}
```

#### **エラーハンドリング**: フォールバック処理
```javascript
function handleAutoPermissionFailure(error) {
    // エラータイプに関わらず統一的に処理
    console.log('🔄 通常のスタートボタンフローに切り替え');
    
    // スタートボタンを表示
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.style.display = 'block';
        startBtn.disabled = false;
    }
    
    // ユーザーに簡潔な説明
    showMessage('🎤 スタートボタンを押してトレーニングを開始してください', 'info');
    
    // フラグをリセット（通常フロー用）
    app.microphonePermissionGranted = false;
}
```

#### **UI フィードバック**: ユーザー案内
```javascript
function showAutoPermissionSuccess() {
    showMessage('✅ マイク準備完了 - スタートボタンを押してください', 'success');
}

function showMessage(message, type = 'info') {
    // 既存のUI表示機能を活用
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.textContent = message;
    
    // 3秒後に自動削除
    setTimeout(() => messageElement.remove(), 3000);
    document.body.appendChild(messageElement);
}
```

### 4.3 既存機能との統合

#### **スタートボタン処理の修正**
```javascript
// 既存のstartTraining()メソッド内
async startTraining() {
    // 自動許可済みかチェック
    if (this.microphonePermissionGranted && this.mediaStream) {
        console.log('✅ 自動許可済みストリーム使用 - ダイアログスキップ');
        // 既存の初期化処理をスキップして直接開始
        this.isRunning = true;
        this.startFrequencyDetection();
    } else {
        console.log('🎤 通常のマイク許可フロー実行');
        // 既存の処理を継続
        await this.initMicrophone();
    }
    
    // 残りの処理は既存通り
    await this.playReferenceNote();
    // ...
}
```

---

## 5. 実装計画

### 5.1 実装フェーズ

#### **Phase 1: 基本フロー実装** (30分)
- [ ] `index.html` の `selectMode` 関数修正
- [ ] `full-scale-training.js` の自動許可処理追加
- [ ] 基本的なエラーハンドリング実装

#### **Phase 2: UI改善** (15分)
- [ ] 成功・失敗時のユーザーフィードバック
- [ ] メッセージ表示システム統合
- [ ] スタートボタンの状態管理改善

#### **Phase 3: 統合テスト** (15分)
- [ ] Chrome での動作確認
- [ ] Safari での動作確認
- [ ] Firefox での動作確認
- [ ] エラーケースのテスト

#### **Phase 4: 最適化** (15分)
- [ ] パフォーマンス確認
- [ ] ログ出力の最適化
- [ ] コードクリーンアップ

### 5.2 リスク軽減策

#### **技術リスク**
| リスク | 対策 |
|--------|------|
| Safari互換性問題 | Permission API不使用 + getUserMediaフォールバック |
| User Interaction制約 | ページロード後の setTimeout での遅延実行 |
| ストリーム競合 | 既存初期化との条件分岐で排他制御 |

#### **UXリスク**
| リスク | 対策 |
|--------|------|
| 突然のダイアログ表示 | 事前の簡潔な説明表示 |
| エラー時の混乱 | 明確なフォールバック + 分かりやすいメッセージ |
| 動作予測困難 | 一貫したフィードバック表示 |

---

## 6. テスト計画

### 6.1 機能テスト

#### **正常系テスト**
```
TC01: モード選択からの正常フロー
前提: Chrome最新版、マイク接続済み
手順:
1. index.html でランダム基音モード選択
2. ページ遷移確認
3. 自動マイク許可ダイアログ確認
4. 許可後のスタートボタン状態確認
5. スタートボタン押下
6. ダイアログなしでトレーニング開始確認

期待結果: スムーズな1回許可フロー完了
```

#### **異常系テスト**
```
TC02: マイク許可拒否時のフォールバック
前提: Safari、マイク許可拒否
手順:
1. モード選択からの遷移
2. マイク許可ダイアログで「拒否」選択
3. フォールバック動作確認
4. スタートボタン表示確認
5. スタートボタン押下
6. 通常のマイク許可フロー確認

期待結果: 適切なフォールバック + 通常フロー完了
```

### 6.2 ブラウザ互換性テスト

| ブラウザ | バージョン | テスト項目 | 優先度 |
|----------|------------|------------|--------|
| Chrome | 120+ | 全機能 | 高 |
| Safari | 14+ | 特にPermission API制約 | 高 |
| Firefox | 100+ | 全機能 | 中 |
| Edge | 120+ | 基本機能 | 中 |
| iOS Safari | 14+ | モバイル制約 | 中 |

### 6.3 パフォーマンステスト

#### **測定項目**
- ページロード時間: < 2秒
- マイク許可処理時間: < 1秒
- メモリ使用量: ベースライン比較
- エラー復旧時間: < 3秒

---

## 7. 成功指標

### 7.1 技術指標

- [ ] **全ブラウザ動作**: Chrome, Safari, Firefox, Edge
- [ ] **エラー率**: < 5% (許可拒否除く)
- [ ] **フォールバック成功率**: 100%
- [ ] **パフォーマンス**: 既存機能への影響なし

### 7.2 UX指標

- [ ] **ダイアログ回数**: 1回のみ (成功時)
- [ ] **ユーザー混乱**: なし (適切なフィードバック)
- [ ] **操作継続性**: スムーズな遷移
- [ ] **エラー回復**: 明確な次のアクション

---

## 8. 付録

### 8.1 関連ドキュメント

- [マイク実装完了報告書](./microphone-implementation-completion.md)
- [マイク機能仕様書](./microphone-specification.md)
- [ユーザーフロー分析](./microphone-permission-userflow.md)

### 8.2 技術参考資料

- [MDN: MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [MDN: Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API)
- [Safari WebRTC Guide](https://webkit.org/blog/7726/announcing-webrtc-and-media-capture/)

### 8.3 変更履歴

| 版数 | 日付 | 変更内容 | 更新者 |
|------|------|----------|--------|
| v1.0 | 2025-07-15 | 初版作成 | Claude Code |
| v2.0 | 2025-07-15 | 経緯追加・仕様詳細化 | Claude Code |

---

**承認**
- 仕様策定者: Claude Code
- 実装予定日: 2025-07-15
- レビュー完了: 実装前要確認

**この仕様書に基づいて実装を開始します。**