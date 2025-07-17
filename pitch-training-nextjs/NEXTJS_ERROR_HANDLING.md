# Next.js版エラーハンドリング仕様書

**作成日**: 2025-07-17  
**バージョン**: v1.0.0-error-handling  
**対象**: Next.js版包括的エラー処理システム  
**ステータス**: 詳細仕様確定版

---

## 🚨 1. エラーハンドリング概要

### 1.1 対象エラーカテゴリ

1. **音声関連エラー**: マイク許可・音声処理・デバイス関連
2. **ネットワークエラー**: API通信・リソース読み込み失敗
3. **ブラウザ互換性エラー**: 非対応機能・レガシーブラウザ
4. **ユーザー操作エラー**: 無効な入力・操作ミス
5. **システムエラー**: 予期しない例外・メモリ不足

### 1.2 エラー処理原則

- **ユーザーフレンドリー**: 技術的でない分かりやすいメッセージ
- **段階的復旧**: 自動復旧 → ユーザー操作誘導 → 代替手段提示
- **詳細ログ**: 開発者向け詳細情報の記録
- **継続性確保**: エラー発生時もアプリの基本機能を維持

---

## 🎯 2. エラー定義とタイプシステム

### 2.1 エラータイプ定義

```typescript
// 基本エラータイプ
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
type ErrorCategory = 'audio' | 'network' | 'browser' | 'user' | 'system';
type ErrorRecovery = 'automatic' | 'user-action' | 'fallback' | 'none';

interface AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recovery: ErrorRecovery;
  message: string;          // ユーザー向けメッセージ
  technicalMessage: string; // 開発者向けメッセージ
  timestamp: Date;
  context?: Record<string, any>; // エラー発生時のコンテキスト
  stack?: string;
  userAgent?: string;
  url?: string;
}

// 音声関連エラー
interface AudioError extends AppError {
  category: 'audio';
  audioContext?: {
    state: AudioContextState;
    sampleRate: number;
    baseLatency: number;
  };
  deviceInfo?: {
    hasAudioInput: boolean;
    permissionState: PermissionState;
    deviceCount: number;
  };
}

// ネットワークエラー
interface NetworkError extends AppError {
  category: 'network';
  requestInfo?: {
    url: string;
    method: string;
    status?: number;
    responseTime?: number;
  };
  retryCount?: number;
  isOnline: boolean;
}

// ブラウザ互換性エラー
interface BrowserError extends AppError {
  category: 'browser';
  featureSupport?: {
    webAudio: boolean;
    mediaDevices: boolean;
    permissionsAPI: boolean;
    webWorkers: boolean;
  };
  browserInfo?: {
    name: string;
    version: string;
    engine: string;
  };
}
```

### 2.2 エラーファクトリー

```typescript
class ErrorFactory {
  // 音声許可エラー
  static createPermissionDeniedError(context?: any): AudioError {
    return {
      id: `audio_permission_${Date.now()}`,
      category: 'audio',
      severity: 'high',
      recovery: 'user-action',
      message: 'マイクの使用許可が必要です。ブラウザの設定でマイクへのアクセスを許可してください。',
      technicalMessage: 'Microphone permission denied by user',
      timestamp: new Date(),
      context,
      deviceInfo: {
        hasAudioInput: 'mediaDevices' in navigator,
        permissionState: 'denied',
        deviceCount: 0
      }
    };
  }

  // マイクデバイス未検出エラー
  static createNoMicrophoneError(context?: any): AudioError {
    return {
      id: `audio_nodevice_${Date.now()}`,
      category: 'audio',
      severity: 'critical',
      recovery: 'fallback',
      message: 'マイクが検出されませんでした。マイクが接続されているか確認してください。',
      technicalMessage: 'No audio input devices found',
      timestamp: new Date(),
      context,
      deviceInfo: {
        hasAudioInput: false,
        permissionState: 'denied',
        deviceCount: 0
      }
    };
  }

  // 音声コンテキスト初期化エラー
  static createAudioContextError(error: Error, context?: any): AudioError {
    return {
      id: `audio_context_${Date.now()}`,
      category: 'audio',
      severity: 'high',
      recovery: 'automatic',
      message: '音声システムの初期化に失敗しました。ページを再読み込みしてください。',
      technicalMessage: `AudioContext initialization failed: ${error.message}`,
      timestamp: new Date(),
      context,
      stack: error.stack
    };
  }

  // ネットワークエラー
  static createNetworkError(requestInfo: any, error: Error): NetworkError {
    return {
      id: `network_${Date.now()}`,
      category: 'network',
      severity: 'medium',
      recovery: 'automatic',
      message: 'ネットワーク接続に問題があります。しばらく待ってから再試行してください。',
      technicalMessage: `Network request failed: ${error.message}`,
      timestamp: new Date(),
      requestInfo,
      isOnline: navigator.onLine,
      retryCount: 0
    };
  }

  // ブラウザ非対応エラー
  static createUnsupportedBrowserError(missingFeatures: string[]): BrowserError {
    return {
      id: `browser_unsupported_${Date.now()}`,
      category: 'browser',
      severity: 'critical',
      recovery: 'none',
      message: `お使いのブラウザは一部機能に対応していません。Chrome、Firefox、Safari の最新版をご利用ください。`,
      technicalMessage: `Unsupported browser features: ${missingFeatures.join(', ')}`,
      timestamp: new Date(),
      featureSupport: this.checkFeatureSupport(),
      browserInfo: this.getBrowserInfo()
    };
  }

  private static checkFeatureSupport(): any {
    return {
      webAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
      mediaDevices: 'mediaDevices' in navigator,
      permissionsAPI: 'permissions' in navigator,
      webWorkers: 'Worker' in window
    };
  }

  private static getBrowserInfo(): any {
    const ua = navigator.userAgent;
    return {
      name: this.getBrowserName(ua),
      version: this.getBrowserVersion(ua),
      engine: this.getBrowserEngine(ua)
    };
  }

  private static getBrowserName(ua: string): string {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private static getBrowserVersion(ua: string): string {
    const match = ua.match(/(Chrome|Firefox|Safari|Edge)\/(\d+)/);
    return match ? match[2] : 'Unknown';
  }

  private static getBrowserEngine(ua: string): string {
    if (ua.includes('WebKit')) return 'WebKit';
    if (ua.includes('Gecko')) return 'Gecko';
    if (ua.includes('Trident')) return 'Trident';
    return 'Unknown';
  }
}
```

---

## 🎭 3. エラー処理Hooks

### 3.1 メインエラーハンドリングHook

```typescript
interface ErrorHandlerOptions {
  enableLogging?: boolean;
  enableUserNotification?: boolean;
  enableAutoRecovery?: boolean;
  maxRetryCount?: number;
}

interface ErrorHandlerState {
  errors: AppError[];
  isRecovering: boolean;
  lastError: AppError | null;
  recoveryAttempts: number;
}

const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
  const defaultOptions: Required<ErrorHandlerOptions> = {
    enableLogging: true,
    enableUserNotification: true,
    enableAutoRecovery: true,
    maxRetryCount: 3,
    ...options
  };

  const [state, setState] = useState<ErrorHandlerState>({
    errors: [],
    isRecovering: false,
    lastError: null,
    recoveryAttempts: 0
  });

  // エラー処理メイン関数
  const handleError = useCallback(async (error: AppError) => {
    setState(prev => ({
      ...prev,
      errors: [...prev.errors, error],
      lastError: error
    }));

    // ログ記録
    if (defaultOptions.enableLogging) {
      console.error('App Error:', error);
      await logErrorToService(error);
    }

    // ユーザー通知
    if (defaultOptions.enableUserNotification) {
      showUserNotification(error);
    }

    // 自動復旧試行
    if (defaultOptions.enableAutoRecovery && error.recovery !== 'none') {
      await attemptRecovery(error);
    }
  }, [defaultOptions]);

  // 自動復旧処理
  const attemptRecovery = useCallback(async (error: AppError) => {
    if (state.recoveryAttempts >= defaultOptions.maxRetryCount) {
      return;
    }

    setState(prev => ({ ...prev, isRecovering: true }));

    try {
      switch (error.recovery) {
        case 'automatic':
          await performAutomaticRecovery(error);
          break;
        case 'user-action':
          showRecoveryInstructions(error);
          break;
        case 'fallback':
          await activateFallbackMode(error);
          break;
      }

      setState(prev => ({
        ...prev,
        isRecovering: false,
        recoveryAttempts: prev.recoveryAttempts + 1
      }));
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      setState(prev => ({ ...prev, isRecovering: false }));
    }
  }, [state.recoveryAttempts, defaultOptions.maxRetryCount]);

  // エラークリア
  const clearError = useCallback((errorId?: string) => {
    setState(prev => ({
      ...prev,
      errors: errorId 
        ? prev.errors.filter(e => e.id !== errorId)
        : [],
      lastError: null,
      recoveryAttempts: 0
    }));
  }, []);

  // エラー統計
  const getErrorStats = useCallback(() => {
    const errors = state.errors;
    return {
      total: errors.length,
      byCategory: errors.reduce((acc, error) => {
        acc[error.category] = (acc[error.category] || 0) + 1;
        return acc;
      }, {} as Record<ErrorCategory, number>),
      bySeverity: errors.reduce((acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {} as Record<ErrorSeverity, number>),
      recentErrors: errors.slice(-5)
    };
  }, [state.errors]);

  return {
    ...state,
    handleError,
    clearError,
    getErrorStats,
    isRecovering: state.isRecovering
  };
};

// 復旧処理の実装
async function performAutomaticRecovery(error: AppError): Promise<void> {
  switch (error.category) {
    case 'audio':
      // 音声コンテキスト再初期化
      await reinitializeAudioContext();
      break;
    case 'network':
      // ネットワーク要求の再試行
      await retryNetworkRequest(error);
      break;
    default:
      // ページリロード
      window.location.reload();
  }
}

async function activateFallbackMode(error: AppError): Promise<void> {
  switch (error.category) {
    case 'audio':
      // オフラインモードまたはデモモードに切り替え
      await switchToOfflineMode();
      break;
    case 'browser':
      // 基本機能のみのモードに切り替え
      await switchToBasicMode();
      break;
  }
}
```

### 3.2 音声エラー専用Hook

```typescript
const useAudioErrorHandler = () => {
  const { handleError } = useErrorHandler();

  const handlePermissionError = useCallback(async (error: Error) => {
    const audioError = ErrorFactory.createPermissionDeniedError({
      originalError: error.message,
      timestamp: new Date(),
      userAgent: navigator.userAgent
    });
    
    await handleError(audioError);
  }, [handleError]);

  const handleDeviceError = useCallback(async (error: Error) => {
    const audioError = ErrorFactory.createNoMicrophoneError({
      originalError: error.message,
      deviceInfo: await getAudioDeviceInfo()
    });
    
    await handleError(audioError);
  }, [handleError]);

  const handleContextError = useCallback(async (error: Error) => {
    const audioError = ErrorFactory.createAudioContextError(error, {
      contextState: getAudioContextState(),
      supportedFormats: getSupportedAudioFormats()
    });
    
    await handleError(audioError);
  }, [handleError]);

  return {
    handlePermissionError,
    handleDeviceError,
    handleContextError
  };
};

// ヘルパー関数
async function getAudioDeviceInfo(): Promise<any> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      audioInputDevices: devices.filter(d => d.kind === 'audioinput').length,
      hasDefaultDevice: devices.some(d => d.kind === 'audioinput' && d.deviceId === 'default')
    };
  } catch (error) {
    return { audioInputDevices: 0, hasDefaultDevice: false };
  }
}

function getAudioContextState(): any {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const tempContext = new AudioCtx();
    const state = {
      state: tempContext.state,
      sampleRate: tempContext.sampleRate,
      baseLatency: tempContext.baseLatency
    };
    tempContext.close();
    return state;
  } catch (error) {
    return { error: error.message };
  }
}
```

---

## 🎨 4. エラー表示UI コンポーネント

### 4.1 エラーダイアログコンポーネント

```tsx
interface ErrorDialogProps {
  error: AppError | null;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({ error, isOpen, onClose, onRetry }) => {
  if (!error || !isOpen) return null;

  const getErrorIcon = (category: ErrorCategory, severity: ErrorSeverity) => {
    const iconClass = "h-12 w-12 mx-auto mb-4";
    
    if (severity === 'critical') {
      return <ExclamationTriangleIcon className={`${iconClass} text-red-600`} />;
    }
    
    switch (category) {
      case 'audio':
        return <MicrophoneIcon className={`${iconClass} text-orange-600`} />;
      case 'network':
        return <WifiIcon className={`${iconClass} text-blue-600`} />;
      case 'browser':
        return <ComputerDesktopIcon className={`${iconClass} text-purple-600`} />;
      default:
        return <ExclamationCircleIcon className={`${iconClass} text-yellow-600`} />;
    }
  };

  const getRecoveryActions = (error: AppError) => {
    switch (error.recovery) {
      case 'user-action':
        return (
          <div className="space-y-3">
            <RecoveryInstructions error={error} />
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                再試行
              </button>
            )}
          </div>
        );
      case 'fallback':
        return (
          <FallbackModeButton error={error} />
        );
      case 'automatic':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">自動復旧を試行中...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center">
          {getErrorIcon(error.category, error.severity)}
          
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {getSeverityTitle(error.severity)}
          </h3>
          
          <p className="text-gray-600 mb-6">
            {error.message}
          </p>
          
          {getRecoveryActions(error)}
          
          <div className="flex space-x-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              閉じる
            </button>
            
            <button
              onClick={() => showTechnicalDetails(error)}
              className="flex-1 bg-gray-100 text-gray-600 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              詳細情報
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RecoveryInstructions: React.FC<{ error: AppError }> = ({ error }) => {
  const getInstructions = (error: AppError): string[] => {
    if (error.category === 'audio' && error.message.includes('許可')) {
      return [
        'ブラウザのアドレスバー左側のマイクアイコンをクリック',
        '「許可」または「Allow」を選択',
        'ページを再読み込みして再試行'
      ];
    }
    
    if (error.category === 'network') {
      return [
        'インターネット接続を確認',
        'しばらく待ってから再試行',
        'ブラウザのキャッシュをクリア'
      ];
    }
    
    return ['ページを再読み込みしてください'];
  };

  const instructions = getInstructions(error);

  return (
    <div className="text-left bg-blue-50 rounded-lg p-4 mb-4">
      <h4 className="font-medium text-blue-800 mb-2">解決方法:</h4>
      <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
        {instructions.map((instruction, index) => (
          <li key={index}>{instruction}</li>
        ))}
      </ol>
    </div>
  );
};

const FallbackModeButton: React.FC<{ error: AppError }> = ({ error }) => {
  const handleFallbackMode = () => {
    switch (error.category) {
      case 'audio':
        // デモモードに切り替え
        window.location.href = '/demo-mode';
        break;
      case 'browser':
        // 基本モードに切り替え
        window.location.href = '/basic-mode';
        break;
    }
  };

  return (
    <button
      onClick={handleFallbackMode}
      className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
    >
      代替モードで続行
    </button>
  );
};

// ヘルパー関数
function getSeverityTitle(severity: ErrorSeverity): string {
  switch (severity) {
    case 'critical': return '重大なエラー';
    case 'high': return 'エラー';
    case 'medium': return '問題が発生しました';
    case 'low': return '注意';
    default: return 'お知らせ';
  }
}

function showTechnicalDetails(error: AppError): void {
  const details = `
エラーID: ${error.id}
カテゴリ: ${error.category}
重要度: ${error.severity}
時刻: ${error.timestamp.toLocaleString()}
技術的詳細: ${error.technicalMessage}
${error.stack ? `\nスタックトレース: ${error.stack}` : ''}
  `.trim();
  
  navigator.clipboard.writeText(details).then(() => {
    alert('エラー詳細をクリップボードにコピーしました');
  });
}
```

### 4.2 エラートースト通知

```tsx
interface ErrorToastProps {
  error: AppError;
  onDismiss: () => void;
  autoHide?: boolean;
  duration?: number;
}

const ErrorToast: React.FC<ErrorToastProps> = ({ 
  error, 
  onDismiss, 
  autoHide = true, 
  duration = 5000 
}) => {
  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, onDismiss]);

  const getToastColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${getToastColor(error.severity)} text-white p-4 rounded-lg shadow-lg max-w-sm animate-slide-in-right`}>
      <div className="flex items-start">
        <div className="flex-1">
          <p className="font-medium text-sm mb-1">
            {getSeverityTitle(error.severity)}
          </p>
          <p className="text-sm opacity-90">
            {error.message}
          </p>
        </div>
        
        <button
          onClick={onDismiss}
          className="ml-3 text-white hover:text-gray-200 transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      
      {autoHide && (
        <div className="mt-3 bg-white bg-opacity-30 rounded-full h-1">
          <div 
            className="bg-white h-1 rounded-full animate-shrink"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      )}
    </div>
  );
};

// CSS アニメーション (globals.css に追加)
const toastAnimations = `
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes shrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}

.animate-shrink {
  animation: shrink linear;
}
`;
```

---

## 📊 5. エラー監視とログシステム

### 5.1 エラーログサービス

```typescript
interface ErrorLogService {
  log(error: AppError): Promise<void>;
  getBatch(limit?: number): Promise<AppError[]>;
  clear(): Promise<void>;
  export(): Promise<string>;
}

class LocalStorageErrorLogger implements ErrorLogService {
  private readonly storageKey = 'pitch_training_error_logs';
  private readonly maxLogs = 100;

  async log(error: AppError): Promise<void> {
    try {
      const logs = await this.getBatch();
      logs.unshift(error);
      
      // 最大数を超えた場合は古いログを削除
      const trimmedLogs = logs.slice(0, this.maxLogs);
      
      localStorage.setItem(this.storageKey, JSON.stringify(trimmedLogs));
    } catch (storageError) {
      console.warn('Error logging failed:', storageError);
    }
  }

  async getBatch(limit = this.maxLogs): Promise<AppError[]> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const logs = stored ? JSON.parse(stored) : [];
      return logs.slice(0, limit);
    } catch (error) {
      console.warn('Error log retrieval failed:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.storageKey);
  }

  async export(): Promise<string> {
    const logs = await this.getBatch();
    return JSON.stringify(logs, null, 2);
  }
}

// 外部サービス連携（オプション）
class RemoteErrorLogger implements ErrorLogService {
  private readonly endpoint = '/api/errors';

  async log(error: AppError): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
      });
    } catch (networkError) {
      // ネットワークエラーの場合はローカルに保存
      const localStorage = new LocalStorageErrorLogger();
      await localStorage.log(error);
    }
  }

  async getBatch(limit?: number): Promise<AppError[]> {
    try {
      const response = await fetch(`${this.endpoint}?limit=${limit || 50}`);
      return await response.json();
    } catch (error) {
      return [];
    }
  }

  async clear(): Promise<void> {
    await fetch(this.endpoint, { method: 'DELETE' });
  }

  async export(): Promise<string> {
    const logs = await this.getBatch(1000);
    return JSON.stringify(logs, null, 2);
  }
}
```

### 5.2 エラー分析ダッシュボード

```tsx
const ErrorAnalyticsDashboard: React.FC = () => {
  const [errorLogs, setErrorLogs] = useState<AppError[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  
  useEffect(() => {
    loadErrorLogs();
  }, [timeRange]);

  const loadErrorLogs = async () => {
    const logger = new LocalStorageErrorLogger();
    const logs = await logger.getBatch();
    
    // 時間範囲でフィルタ
    const filteredLogs = filterLogsByTimeRange(logs, timeRange);
    setErrorLogs(filteredLogs);
  };

  const errorStats = useMemo(() => {
    return analyzeErrors(errorLogs);
  }, [errorLogs]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">エラー分析ダッシュボード</h1>
          
          <div className="flex space-x-2">
            {(['1h', '24h', '7d', '30d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="総エラー数"
            value={errorStats.total}
            icon={<ExclamationTriangleIcon className="h-6 w-6" />}
            color="red"
          />
          <StatCard
            title="重大エラー"
            value={errorStats.critical}
            icon={<ExclamationCircleIcon className="h-6 w-6" />}
            color="orange"
          />
          <StatCard
            title="音声エラー"
            value={errorStats.audio}
            icon={<MicrophoneIcon className="h-6 w-6" />}
            color="blue"
          />
          <StatCard
            title="復旧成功率"
            value={`${errorStats.recoveryRate}%`}
            icon={<CheckCircleIcon className="h-6 w-6" />}
            color="green"
          />
        </div>

        {/* エラー推移グラフ */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">エラー発生推移</h3>
          <ErrorTrendChart data={errorStats.timeline} />
        </div>

        {/* エラー詳細リスト */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">最近のエラー</h3>
          </div>
          <ErrorLogTable errors={errorLogs.slice(0, 20)} />
        </div>
      </div>
    </div>
  );
};

// ヘルパー関数
function filterLogsByTimeRange(logs: AppError[], range: string): AppError[] {
  const now = Date.now();
  const ranges = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  
  const timeLimit = now - ranges[range as keyof typeof ranges];
  
  return logs.filter(log => log.timestamp.getTime() > timeLimit);
}

function analyzeErrors(logs: AppError[]) {
  const total = logs.length;
  const critical = logs.filter(e => e.severity === 'critical').length;
  const audio = logs.filter(e => e.category === 'audio').length;
  const recovered = logs.filter(e => e.recovery !== 'none').length;
  const recoveryRate = total > 0 ? Math.round((recovered / total) * 100) : 0;
  
  // 時系列データ生成
  const timeline = generateTimelineData(logs);
  
  return {
    total,
    critical,
    audio,
    recoveryRate,
    timeline
  };
}
```

---

**この仕様書は、Next.js版相対音感トレーニングアプリの包括的エラーハンドリングシステムの詳細実装指針です。**