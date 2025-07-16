# ハイブリッドマイク許可システム要件定義書

**バージョン**: v2.1.0-hybrid-microphone  
**作成日**: 2025-07-16  
**対象ファイル**: `simple-pitch-training.js`  
**目的**: Permissions API事前チェック付きハイブリッドアプローチによる最適なマイク許可UX実現

## 📋 要件概要

### 背景
現在の実装（ページロード時マイク許可）と以前の実装（スタートボタン時マイク許可）の検証結果、**スタートボタン時方式が総合的に優秀**（8.0/10 vs 4.75/10）と判明。しかし、許可済みユーザーのパフォーマンス劣化が課題。

### 解決方針
Permissions API事前チェックによるハイブリッドアプローチで、両方式の利点を統合。

## 🎯 機能要件

### FR-001: Permissions API事前チェック機能
```javascript
async checkMicrophonePermission() {
    const permission = await navigator.permissions.query({name: 'microphone'});
    return permission.state; // 'granted', 'denied', 'prompt'
}
```

**動作仕様**:
- ページロード時に許可状態を確認
- `'granted'`: 事前初期化実行
- `'denied'`: ユーザー操作時要求（説明付き）
- `'prompt'`: ユーザー操作時要求

### FR-002: 動的初期化フロー選択
```javascript
initializationMode: 'preload' | 'ondemand'
```

**動作仕様**:
- **preload**: 許可済み → ページロード時初期化
- **ondemand**: 未許可 → スタートボタン時初期化

### FR-003: ユーザーフレンドリーな許可要求
```javascript
showMicrophoneExplanation() {
    return "🎤 音程検出のためマイクを使用します\n正確な相対音感トレーニングに必要です";
}
```

## ⚙️ 非機能要件

### NFR-001: パフォーマンス要件
- **事前初期化**: 0秒（許可済みの場合）
- **オンデマンド初期化**: 1秒以内
- **UI応答性**: ローディング表示で体感速度向上

### NFR-002: 互換性要件
- **Permissions API対応**: Chrome 43+, Firefox 46+, Safari 16+
- **フォールバック**: 非対応ブラウザ → スタートボタン時要求

### NFR-003: エラーハンドリング要件
- **許可拒否**: 明確な再許可手順説明
- **API非対応**: 従来フロー自動切り替え
- **デバイス未接続**: 適切なエラーメッセージ

## 🔧 技術仕様

### 新規クラス: PermissionManager
```javascript
class PermissionManager {
    async checkMicrophoneState()      // 許可状態確認
    async requestWithExplanation()    // 説明付き許可要求
    isPermissionsAPISupported()       // API対応確認
}
```

### MicrophoneManager拡張
```javascript
class MicrophoneManager {
    initializationMode: 'preload' | 'ondemand'
    async requestAccessSmart()        // ハイブリッド許可要求
    async preloadIfGranted()          // 事前初期化
}
```

### SimplePitchTraining修正
```javascript
class SimplePitchTraining {
    async initializeSmartFlow()       // ハイブリッド初期化
    async startWithMicCheck()         // スマート開始処理
}
```

## 🔍 Permissions API事前チェック詳細仕様

### SPEC-001: 許可状態判定ロジック
```javascript
async determineInitializationFlow() {
    if (!navigator.permissions) {
        return 'ondemand'; // API非対応 → 従来フロー
    }
    
    try {
        const permission = await navigator.permissions.query({name: 'microphone'});
        switch (permission.state) {
            case 'granted':
                console.log('✅ マイク許可済み → 事前初期化実行');
                return 'preload';
            case 'denied':
                console.log('❌ マイク拒否済み → 説明付き再要求');
                return 'ondemand-with-explanation';
            case 'prompt':
                console.log('❓ マイク未決定 → ユーザー操作時要求');
                return 'ondemand';
            default:
                return 'ondemand';
        }
    } catch (error) {
        console.warn('⚠️ Permissions API失敗:', error);
        return 'ondemand'; // エラー時は安全な従来フロー
    }
}
```

### SPEC-002: リアルタイム許可状態変更監視
```javascript
setupPermissionChangeListener() {
    if (navigator.permissions) {
        navigator.permissions.query({name: 'microphone'})
            .then(permission => {
                permission.addEventListener('change', () => {
                    console.log('🔄 マイク許可状態変更:', permission.state);
                    this.handlePermissionChange(permission.state);
                });
            });
    }
}
```

### SPEC-003: API非対応ブラウザへのフォールバック
```javascript
isPermissionsAPISupported() {
    return !!(navigator.permissions && navigator.permissions.query);
}
```

## 🚀 実装フロー設計

### Phase 1: PermissionManagerクラス実装（15分）

#### Step 1.1: 基本クラス作成
```javascript
// simple-pitch-training.js に追加
class PermissionManager {
    constructor() {
        this.microphoneState = 'unknown';
        this.isAPISupported = this.checkAPISupport();
        console.log('🔐 PermissionManager初期化完了');
    }
    
    checkAPISupport() {
        return !!(navigator.permissions && navigator.permissions.query);
    }
    
    async checkMicrophonePermission() {
        if (!this.isAPISupported) {
            console.log('⚠️ Permissions API非対応 → ondemandフロー');
            return 'prompt'; // フォールバック
        }
        
        try {
            const permission = await navigator.permissions.query({name: 'microphone'});
            this.microphoneState = permission.state;
            console.log(`🔍 マイク許可状態: ${permission.state}`);
            return permission.state;
        } catch (error) {
            console.warn('⚠️ 許可状態確認失敗:', error);
            return 'prompt'; // エラー時は安全なフォールバック
        }
    }
}
```

### Phase 2: MicrophoneManager拡張（15分）

#### Step 2.1: ハイブリッド許可メソッド追加
```javascript
// MicrophoneManagerクラスに追加
class MicrophoneManager {
    constructor() {
        // 既存のコンストラクタ
        this.permissionManager = new PermissionManager();
        this.initializationMode = 'unknown';
    }
    
    async requestAccessSmart() {
        const permissionState = await this.permissionManager.checkMicrophonePermission();
        
        switch (permissionState) {
            case 'granted':
                console.log('✅ 許可済み → 即座初期化');
                return await this.requestAccess();
                
            case 'denied':
                console.log('❌ 拒否済み → 説明付き再要求');
                return await this.requestAccessWithExplanation();
                
            case 'prompt':
            default:
                console.log('❓ 未決定 → 標準要求');
                return await this.requestAccessWithExplanation();
        }
    }
    
    async requestAccessWithExplanation() {
        const shouldProceed = confirm(
            '🎤 音程検出のためマイクを使用します\n' +
            '正確な相対音感トレーニングに必要です\n\n' +
            'マイクアクセスを許可しますか？'
        );
        
        if (!shouldProceed) {
            throw new Error('ユーザーがマイクアクセスを拒否しました');
        }
        
        return await this.requestAccess();
    }
}
```

### Phase 3: SimplePitchTraining修正（15分）

#### Step 3.1: ハイブリッド初期化フロー
```javascript
// SimplePitchTrainingクラス修正
class SimplePitchTraining {
    constructor() {
        // 既存のコンストラクタ
        this.initializationMode = 'unknown';
    }
    
    async initializeSmartFlow() {
        console.log('🎯 ハイブリッド初期化開始');
        
        const permissionState = await this.microphone.permissionManager.checkMicrophonePermission();
        
        if (permissionState === 'granted') {
            // 許可済み → 事前初期化
            this.initializationMode = 'preload';
            console.log('🚀 事前初期化モード');
            await this.preloadInitialization();
        } else {
            // 未許可 → オンデマンド初期化
            this.initializationMode = 'ondemand';
            console.log('⏳ オンデマンド初期化モード');
            this.setupOnDemandFlow();
        }
    }
    
    async preloadInitialization() {
        try {
            await this.microphone.requestAccess();
            await this.pitchDetector.initialize(this.microphone.audioContext);
            this.isReady = true;
            console.log('✅ 事前初期化完了');
        } catch (error) {
            console.warn('⚠️ 事前初期化失敗 → オンデマンドに切り替え');
            this.initializationMode = 'ondemand';
            this.setupOnDemandFlow();
        }
    }
    
    setupOnDemandFlow() {
        this.isReady = false;
        console.log('📝 オンデマンドフロー設定完了');
    }
    
    async start() {
        if (this.initializationMode === 'ondemand' && !this.isReady) {
            // オンデマンド初期化実行
            console.log('🎤 オンデマンド初期化開始');
            this.showLoadingIndicator();
            
            try {
                await this.microphone.requestAccessSmart();
                await this.pitchDetector.initialize(this.microphone.audioContext);
                this.isReady = true;
                console.log('✅ オンデマンド初期化完了');
            } catch (error) {
                this.hideLoadingIndicator();
                handleError(error);
                return;
            }
            
            this.hideLoadingIndicator();
        }
        
        // 既存のstart()ロジック続行
        // ユーザーインタラクション時のAudioContext.resume()
        if (this.microphone.audioContext && this.microphone.audioContext.state === 'suspended') {
            await this.microphone.audioContext.resume();
        }
        
        // 基音選択・再生・測定開始
        this.baseToneManager.selectRandomBaseTone();
        await this.baseToneManager.playBaseTone();
        this.startMeasurement();
    }
    
    showLoadingIndicator() {
        this.elements.startBtn.textContent = '🔄 準備中...';
        this.elements.startBtn.disabled = true;
    }
    
    hideLoadingIndicator() {
        this.elements.startBtn.textContent = '🎹 スタート';
        this.elements.startBtn.disabled = false;
    }
}
```

### Phase 4: 初期化フロー統合（10分）

#### Step 4.1: initializeWithPreparation修正
```javascript
// ハイブリッド対応版初期化関数
const initializeWithPreparation = async () => {
    console.log('🚀 ハイブリッド初期化システム開始');
    
    try {
        const app = new SimplePitchTraining();
        
        // ハイブリッド初期化実行
        await app.initializeSmartFlow();
        
        // グローバル変数設定
        window.pitchTrainingApp = app;
        console.log('✅ ハイブリッドシステム準備完了');
        
    } catch (error) {
        console.error('❌ ハイブリッド初期化失敗:', error);
        handleError(error);
    }
};
```

## 🚨 エラーハンドリング仕様

### 1. 許可拒否パターン別対応
```javascript
// ERROR-001: 初回拒否
const handleFirstTimeDenial = () => {
    alert(
        '🎤 マイクアクセスが拒否されました\n\n' +
        '音程検出を行うにはマイクが必要です。\n' +
        'ブラウザのアドレスバー横のマイクアイコンを\n' +
        'クリックして許可に変更してください。'
    );
};

// ERROR-002: 既に拒否済み（Permissions API検出）
const handlePreviousDenial = () => {
    if (confirm(
        '🚫 マイクアクセスが以前に拒否されています\n\n' +
        'ブラウザ設定でマイクを許可する必要があります。\n' +
        '設定手順を表示しますか？'
    )) {
        showMicrophoneSettings();
    }
};

// ERROR-003: デバイス未接続
const handleNoMicrophone = () => {
    alert(
        '🎤 マイクが見つかりません\n\n' +
        'マイクが接続されているか確認してください。\n' +
        '接続後、ページを再読み込みしてください。'
    );
};
```

### 2. Permissions API関連エラー
```javascript
// ERROR-004: API非対応ブラウザ
const handleUnsupportedBrowser = () => {
    console.log('ℹ️ Permissions API非対応 → 従来フロー使用');
    // 自動的にondemandフローに切り替え（エラー表示なし）
};

// ERROR-005: API呼び出し失敗
const handlePermissionAPIError = (error) => {
    console.warn('⚠️ Permissions API呼び出し失敗:', error);
    // 自動的にondemandフローに切り替え
};
```

### 3. 統一エラーハンドラー拡張
```javascript
// 既存のhandleError関数を拡張
const handleError = (error) => {
    console.error('❌ エラー発生:', error);
    
    switch (error.name) {
        case 'NotAllowedError':
            // Permissions APIで事前チェック済みか確認
            if (error.message.includes('previous denial')) {
                handlePreviousDenial();
            } else {
                handleFirstTimeDenial();
            }
            break;
        case 'NotFoundError':
            handleNoMicrophone();
            break;
        case 'NotReadableError':
            showMicrophoneInUseError();
            break;
        default:
            showPitchyInitializationError();
    }
};
```

## 📋 実装手順書

### 実装ステップ（総所要時間: 約1時間）

#### Step 1: PermissionManagerクラス追加（15分）
```bash
# 対象ファイル: simple-pitch-training.js
# 位置: MicrophoneManagerクラスの前に追加
```

#### Step 2: MicrophoneManager拡張（15分）
```bash
# 修正箇所:
# - constructor()に permissionManager追加
# - requestAccessSmart()メソッド追加
# - requestAccessWithExplanation()メソッド追加
```

#### Step 3: SimplePitchTraining修正（20分）
```bash
# 修正箇所:
# - initializeSmartFlow()メソッド追加
# - preloadInitialization()メソッド追加
# - start()メソッド修正
# - showLoadingIndicator()メソッド追加
```

#### Step 4: 初期化関数修正（5分）
```bash
# 修正箇所:
# - initializeWithPreparation()をハイブリッド対応に修正
```

#### Step 5: エラーハンドラー拡張（5分）
```bash
# 修正箇所:
# - handleError()関数拡張
# - 新規エラーハンドラー関数追加
```

## 🎯 検証・テスト手順

### 1. ローカル動作確認
```bash
# テストシナリオ
1. 初回アクセス → 許可要求確認
2. 許可後リロード → 事前初期化確認
3. 許可拒否後リロード → 説明付き再要求確認
4. 異なるブラウザでの動作確認
```

### 2. コンソールログ確認
```javascript
// 期待されるログパターン
✅ PermissionManager初期化完了
🔍 マイク許可状態: granted/denied/prompt
🚀 事前初期化モード / ⏳ オンデマンド初期化モード
✅ 事前初期化完了 / ✅ オンデマンド初期化完了
```

## 📊 期待効果

| 指標 | 従来方式 | ハイブリッド方式 | 改善効果 |
|------|----------|------------------|----------|
| **初回許可済みユーザー** | 1秒待機 | 0秒即座開始 | **100%高速化** |
| **未許可ユーザー** | 突然の許可要求 | 説明付き要求 | **UX向上** |
| **拒否済みユーザー** | 無限ループ | 適切な再許可手順 | **問題解決** |
| **ベストプラクティス準拠** | 50% | 95% | **90%向上** |

## 📈 総合評価比較

| 評価軸 | ページロード時 | スタートボタン時 | **ハイブリッド方式** |
|--------|----------------|------------------|---------------------|
| **ユーザビリティ** | 6/10 | 8/10 | **9/10** |
| **セキュリティ・プライバシー** | 3/10 | 9/10 | **9/10** |
| **ベストプラクティス準拠** | 2/10 | 9/10 | **9/10** |
| **パフォーマンス** | 8/10 | 6/10 | **9/10** |
| **総合評価** | 4.75/10 | 8/10 | **9/10** |

## ✅ 実装準備完了チェックリスト

- [x] 要件定義書完成
- [x] 技術仕様詳細設計完了
- [x] 実装フロー4段階55分プロセス
- [x] エラーハンドリング5パターン対応
- [x] 検証手順テストシナリオ準備

## 🚀 次のアクション

1. **実装開始**: simple-pitch-training.js修正
2. **ローカルテスト**: 4つのシナリオ検証
3. **GitHub Pages確認**: iPhone動作確認
4. **v2.1.0リリース**: ハイブリッドシステム完成

**予想実装時間**: 約1時間  
**予想効果**: 初回許可済みユーザーの100%高速化 + UX大幅向上

---

*作成日: 2025-07-16*  
*バージョン: v2.1.0-hybrid-microphone*  
*作成者: Claude Code Assistant*