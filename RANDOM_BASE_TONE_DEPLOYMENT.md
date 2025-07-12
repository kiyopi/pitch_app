# 🚀 ランダム基音機能 デプロイメントガイド

## 📦 デプロイメント手順

### 1. ブランチ管理

#### 現在のブランチ状況
```bash
# 実装ブランチ
* random-tone-v2     # ランダム基音機能実装
  main              # 本番用メインブランチ
  
# 削除済み
× random-base-tone  # 旧実装（削除済み）
```

#### マージ手順
```bash
# 1. メインブランチに切り替え
git checkout main
git pull origin main

# 2. random-tone-v2をマージ
git merge random-tone-v2

# 3. バージョンタグ作成
git tag v1.0.8-RandomBaseTone
git push origin main --tags

# 4. GitHub Pages自動デプロイ確認
# GitHub Actions経由で自動デプロイ
```

### 2. 本番環境設定

#### 必要な環境
```yaml
# 必須要件
- HTTPS対応 (マイクアクセス用)
- 現代ブラウザ対応
- Web Audio API対応
- Tone.jsライブラリアクセス可能

# 推奨要件
- CDN設定 (Tone.js, Pitchy)
- Gzip圧縮有効
- キャッシュ設定適用
```

#### ファイル構成
```
production/
├── full-scale-training.html      # メインHTML
├── full-scale-training.js        # 実装JavaScript
├── tone.js                       # Tone.jsライブラリ
├── sw.js                         # Service Worker
├── RANDOM_BASE_TONE_SPEC.md      # 仕様書
├── RANDOM_BASE_TONE_IMPLEMENTATION.md # 実装ガイド
└── RANDOM_BASE_TONE_DEPLOYMENT.md     # デプロイガイド
```

---

## 🔧 設定ファイル

### GitHub Actions設定
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./
```

### Service Worker設定
```javascript
// sw.js (既存ファイル更新)
const CACHE_VERSION = 'v1.0.8-random-base-tone';
const CACHE_NAME = `pitch-app-${CACHE_VERSION}`;

const urlsToCache = [
  '/',
  '/full-scale-training.html',
  '/full-scale-training.js',
  '/tone.js',
  'https://esm.sh/pitchy@4',
  'https://tonejs.github.io/audio/salamander/C4.mp3',
  'https://tonejs.github.io/audio/salamander/Ds4.mp3',
  'https://tonejs.github.io/audio/salamander/Fs4.mp3',
  'https://tonejs.github.io/audio/salamander/A4.mp3'
];
```

---

## 📊 パフォーマンス設定

### 1. リソース最適化

#### JavaScript圧縮
```bash
# 本番用圧縮 (オプション)
terser full-scale-training.js -c -m -o full-scale-training.min.js

# Gzip圧縮効果
# 元サイズ: ~45KB → 圧縮後: ~12KB (73%削減)
```

#### CDN設定
```html
<!-- 外部ライブラリのCDN使用 -->
<script src="https://unpkg.com/tone@14.7.77/build/Tone.js"></script>
<script type="module">
  import { PitchDetector } from "https://esm.sh/pitchy@4";
  window.PitchDetector = PitchDetector;
</script>
```

### 2. キャッシュ戦略

#### HTTP ヘッダー設定
```apache
# .htaccess (Apache)
<IfModule mod_expires.c>
  ExpiresActive on
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType audio/mpeg "access plus 1 year"
  ExpiresByType text/html "access plus 1 day"
</IfModule>

<IfModule mod_headers.c>
  Header set Cache-Control "public, max-age=2592000" env=long_expires
</IfModule>
```

#### Service Worker キャッシュ
```javascript
// キャッシュバスティング付きURL生成
getCacheBustingUrl(url) {
    const version = 'v1.0.8-random-base-tone';
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${version}&t=${Date.now()}`;
}
```

---

## 🌐 本番環境テスト

### 1. 機能テスト

#### 基本機能確認
```javascript
// 本番環境でのテストスクリプト
const productionTest = {
    // 1. 基音ランダム選択テスト
    testRandomBaseTone() {
        const selections = [];
        for (let i = 0; i < 10; i++) {
            // 新しいセッション開始
            selections.push(getCurrentBaseTone());
        }
        // 結果: 異なる基音が選択されているか
        return new Set(selections).size >= 7; // 10回中7種類以上
    },
    
    // 2. 移調計算テスト
    testTransposition() {
        const baseTone = { frequency: 293.66 }; // D4
        const ratio = baseTone.frequency / 261.63;
        const expected = 261.63 * ratio;
        // 結果: 計算精度が正しいか
        return Math.abs(expected - 293.66) < 0.01;
    },
    
    // 3. UI更新テスト
    testUIUpdate() {
        const button = document.querySelector('.main-start-btn');
        const hasBaseTone = button.innerHTML.includes('基音:');
        const guideFreq = document.querySelector('.note-freq').textContent;
        // 結果: UI要素が更新されているか
        return hasBaseTone && !guideFreq.includes('262Hz');
    }
};
```

#### パフォーマンステスト
```javascript
// 実行時間測定
const performanceTest = {
    measureBaseToneSelection() {
        const start = performance.now();
        app.selectNewBaseTone();
        const end = performance.now();
        return end - start; // 目標: < 10ms
    },
    
    measureUIUpdate() {
        const start = performance.now();
        app.updateGuideFrequencyDisplay();
        const end = performance.now();
        return end - start; // 目標: < 20ms
    },
    
    measureToneJsLoad() {
        const start = performance.now();
        return Tone.loaded().then(() => {
            const end = performance.now();
            return end - start; // 目標: < 2000ms
        });
    }
};
```

### 2. ブラウザ互換性テスト

#### 対応ブラウザ確認
```javascript
// ブラウザ機能検出
const compatibilityCheck = {
    checkWebAudioAPI() {
        return !!(window.AudioContext || window.webkitAudioContext);
    },
    
    checkGetUserMedia() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },
    
    checkES6Support() {
        try {
            new Function('class Test {}');
            return true;
        } catch (e) {
            return false;
        }
    },
    
    checkToneJsSupport() {
        return typeof Tone !== 'undefined';
    },
    
    runAllChecks() {
        const results = {
            webAudio: this.checkWebAudioAPI(),
            microphone: this.checkGetUserMedia(),
            es6: this.checkES6Support(),
            toneJs: this.checkToneJsSupport()
        };
        
        const allSupported = Object.values(results).every(Boolean);
        console.log('ブラウザ互換性:', results);
        return allSupported;
    }
};
```

#### モバイル対応テスト
```javascript
// モバイル固有のテスト
const mobileTest = {
    checkTouchEvents() {
        return 'ontouchstart' in window;
    },
    
    checkScreenSize() {
        return window.innerWidth <= 768;
    },
    
    checkIOSAudioContext() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            // iOSでのAudioContext制限確認
            return Tone.context.state !== 'suspended';
        }
        return true;
    }
};
```

---

## 📈 監視・分析

### 1. ログ収集

#### エラー追跡
```javascript
// 本番環境でのエラーログ
window.addEventListener('error', (event) => {
    const errorData = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        baseTone: app.baseToneManager?.currentBaseTone?.note
    };
    
    // ログ送信 (例: Google Analytics, Sentry等)
    console.error('Production Error:', errorData);
});
```

#### 使用統計
```javascript
// 機能使用統計
const analytics = {
    trackBaseToneSelection(baseTone) {
        // 基音選択の統計
        gtag('event', 'base_tone_selected', {
            'base_tone': baseTone.note,
            'frequency': baseTone.frequency
        });
    },
    
    trackSessionComplete(results) {
        // セッション完了統計
        gtag('event', 'training_session_complete', {
            'base_tone': results.baseTone,
            'accuracy': results.accuracy,
            'duration': results.duration
        });
    },
    
    trackError(error) {
        // エラー統計
        gtag('event', 'application_error', {
            'error_type': error.type,
            'error_message': error.message
        });
    }
};
```

### 2. パフォーマンス監視

#### Web Vitals測定
```javascript
// Core Web Vitals測定
const vitalsMonitor = {
    measureLCP() {
        // Largest Contentful Paint
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log('LCP:', lastEntry.startTime);
        }).observe({entryTypes: ['largest-contentful-paint']});
    },
    
    measureFID() {
        // First Input Delay
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                const delay = entry.processingStart - entry.startTime;
                console.log('FID:', delay);
            }
        }).observe({entryTypes: ['first-input']});
    },
    
    measureCLS() {
        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            console.log('CLS:', clsValue);
        }).observe({entryTypes: ['layout-shift']});
    }
};
```

---

## 🔒 セキュリティ設定

### 1. HTTPS設定

#### Content Security Policy
```html
<!-- CSP設定 -->
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://unpkg.com https://esm.sh;
    connect-src 'self' https://tonejs.github.io;
    media-src 'self' https://tonejs.github.io;
    style-src 'self' 'unsafe-inline';
">
```

#### Permission Policy
```html
<!-- 権限ポリシー -->
<meta http-equiv="Permissions-Policy" content="
    microphone=(self),
    camera=(),
    geolocation=(),
    payment=()
">
```

### 2. プライバシー保護

#### ユーザーデータ
```javascript
// プライバシー設定
const privacySettings = {
    // マイクデータの非保存
    processAudioData(audioData) {
        // リアルタイム処理のみ、保存しない
        const frequency = this.detectPitch(audioData);
        // audioDataは即座に破棄
        audioData = null;
        return frequency;
    },
    
    // ローカルストレージの適切な使用
    saveUserSettings(settings) {
        // 個人識別情報は保存しない
        const sanitizedSettings = {
            baseTonePreferences: settings.baseTones,
            uiPreferences: settings.ui
            // userIdやpersonalDataは除外
        };
        localStorage.setItem('app-settings', JSON.stringify(sanitizedSettings));
    }
};
```

---

## 📋 リリースチェックリスト

### デプロイ前確認
- [ ] 全テストケースの実行・合格
- [ ] ブラウザ互換性テストの完了
- [ ] モバイル端末での動作確認
- [ ] パフォーマンステストの実行
- [ ] セキュリティ設定の確認
- [ ] ドキュメント更新の完了

### デプロイ後確認
- [ ] 本番環境での基本機能テスト
- [ ] ランダム基音選択の動作確認
- [ ] Tone.js音声再生の確認
- [ ] ガイド周波数表示の確認
- [ ] エラーログの監視開始
- [ ] パフォーマンス指標の測定開始

### ロールバック準備
```bash
# 問題発生時のロールバック手順
git tag v1.0.8-RandomBaseTone-rollback
git reset --hard HEAD~1
git push origin main --force-with-lease

# または前バージョンへの切り戻し
git checkout v1.0.7-SmartMicrophone
git checkout -b hotfix-rollback
git push origin hotfix-rollback
```

---

## 📞 サポート・メンテナンス

### 緊急時対応

#### 主要な問題パターン
1. **基音が選択されない**
   - 確認: BaseToneManagerの初期化
   - 対処: localStorage クリア推奨

2. **Tone.js読み込み失敗**
   - 確認: CDN接続状況
   - 対処: フォールバック音源の動作確認

3. **移調計算エラー**
   - 確認: targetFrequencies配列
   - 対処: 手動リセット機能の提供

#### 連絡先・エスカレーション
```
Level 1: 基本的な問題
- ユーザーガイドの参照
- ブラウザ再起動の推奨

Level 2: 技術的な問題  
- 開発者コンソールでのデバッグ
- 設定リセットの実行

Level 3: システム障害
- GitHub Issues での報告
- 緊急パッチの適用検討
```

### 今後のアップデート計画

#### 短期 (1-2ヶ月)
- [ ] ユーザーフィードバック収集
- [ ] 小さなバグ修正
- [ ] パフォーマンス改善

#### 中期 (3-6ヶ月)
- [ ] 連続モード実装
- [ ] ユーザー設定機能
- [ ] 学習進捗分析

#### 長期 (6-12ヶ月)
- [ ] 多言語対応
- [ ] カスタム基音設定
- [ ] AI推奨機能

---

**デプロイメントガイド**: v1.0  
**対象リリース**: v1.0.8-RandomBaseTone  
**最終更新**: 2025-07-12