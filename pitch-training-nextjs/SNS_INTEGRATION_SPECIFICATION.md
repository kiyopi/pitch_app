# SNS連携機能仕様書

**作成日**: 2025-07-17  
**バージョン**: v1.0.0-sns-integration  
**対象**: Next.js版SNS共有機能  
**ステータス**: 詳細仕様確定版

---

## 🌐 1. 概要

### 1.1 対象SNSプラットフォーム

1. **Twitter/X**: テキスト + 画像投稿
2. **Facebook**: テキスト + 画像投稿  
3. **LINE**: テキスト + 画像共有
4. **Instagram Stories**: 画像 + テキスト投稿

### 1.2 共有コンテンツ

- **トレーニング結果スコア**
- **達成バッジ・レベル**
- **進捗グラフ画像**
- **カスタムメッセージ**

---

## 📱 2. 実装アーキテクチャ

### 2.1 技術スタック

```typescript
// 使用ライブラリ
import { 
  TwitterShareButton, 
  FacebookShareButton, 
  LineShareButton,
  TwitterIcon,
  FacebookIcon,
  LineIcon
} from 'react-share';
import html2canvas from 'html2canvas';
```

### 2.2 共有データ構造

```typescript
interface ShareData {
  text: string;           // 共有テキスト
  url: string;           // アプリURL
  imageUrl?: string;     // 生成画像URL
  hashtags?: string[];   // ハッシュタグ
  customMessage?: string; // ユーザーカスタムメッセージ
}

interface TrainingShareContent {
  mode: 'random' | 'continuous' | 'chromatic';
  score: number;
  accuracy: number;
  completionTime: number;
  achievements: Achievement[];
  level: number;
  rank: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
```

---

## 🎨 3. 画像生成システム

### 3.1 結果画像生成

```typescript
interface ResultImageConfig {
  width: number;      // 1080px (Instagram最適)
  height: number;     // 1080px
  backgroundColor: string;
  theme: 'light' | 'dark' | 'gradient';
  includeQRCode: boolean; // アプリURLのQRコード
}

class TrainingResultImageGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor(private config: ResultImageConfig) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = config.width;
    this.canvas.height = config.height;
    this.ctx = this.canvas.getContext('2d')!;
  }
  
  async generateResultImage(shareContent: TrainingShareContent): Promise<string> {
    // 背景描画
    await this.drawBackground();
    
    // ヘッダー（アプリタイトル）
    await this.drawHeader();
    
    // メインスコア
    await this.drawMainScore(shareContent.score, shareContent.accuracy);
    
    // モード情報
    await this.drawModeInfo(shareContent.mode, shareContent.completionTime);
    
    // 達成バッジ
    await this.drawAchievements(shareContent.achievements);
    
    // レベル・ランク表示
    await this.drawLevelRank(shareContent.level, shareContent.rank);
    
    // QRコード（オプション）
    if (this.config.includeQRCode) {
      await this.drawQRCode();
    }
    
    // フッター
    await this.drawFooter();
    
    return this.canvas.toDataURL('image/png');
  }
  
  private async drawBackground(): Promise<void> {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.config.height);
    
    switch (this.config.theme) {
      case 'light':
        gradient.addColorStop(0, '#f8fafc');
        gradient.addColorStop(1, '#e2e8f0');
        break;
      case 'dark':
        gradient.addColorStop(0, '#1e293b');
        gradient.addColorStop(1, '#0f172a');
        break;
      case 'gradient':
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(0.5, '#764ba2');
        gradient.addColorStop(1, '#f093fb');
        break;
    }
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);
  }
  
  private async drawMainScore(score: number, accuracy: number): Promise<void> {
    // 大きなスコア表示
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 120px Inter';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(score.toString(), this.config.width / 2, 400);
    
    // 精度表示
    this.ctx.font = 'bold 48px Inter';
    this.ctx.fillText(`精度: ${accuracy.toFixed(1)}%`, this.config.width / 2, 480);
  }
  
  private async drawAchievements(achievements: Achievement[]): Promise<void> {
    const startY = 600;
    const itemHeight = 80;
    
    achievements.slice(0, 3).forEach((achievement, index) => {
      const y = startY + index * itemHeight;
      
      // バッジアイコン（絵文字）
      this.ctx.font = '48px Arial';
      this.ctx.fillText(achievement.icon, 200, y);
      
      // 達成名
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 32px Inter';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(achievement.name, 280, y - 10);
      
      // 説明
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = '24px Inter';
      this.ctx.fillText(achievement.description, 280, y + 20);
    });
  }
}
```

### 3.2 React Component統合

```tsx
const ResultImageCanvas: React.FC<{ shareContent: TrainingShareContent }> = ({ shareContent }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  
  const generateImage = useCallback(async () => {
    if (!canvasRef.current) return;
    
    try {
      const canvas = await html2canvas(canvasRef.current, {
        width: 1080,
        height: 1080,
        backgroundColor: null,
        scale: 2, // 高解像度
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      setImageUrl(dataUrl);
    } catch (error) {
      console.error('画像生成エラー:', error);
    }
  }, [shareContent]);
  
  useEffect(() => {
    generateImage();
  }, [generateImage]);
  
  return (
    <>
      {/* 画像生成用のDIV（非表示） */}
      <div
        ref={canvasRef}
        className="absolute -left-[9999px] w-[1080px] h-[1080px] bg-gradient-to-br from-blue-600 to-purple-600 text-white p-16"
      >
        <ResultImageContent shareContent={shareContent} />
      </div>
      
      {/* 生成された画像のプレビュー */}
      {imageUrl && (
        <div className="mt-4">
          <img 
            src={imageUrl} 
            alt="共有用画像" 
            className="w-64 h-64 object-cover rounded-lg border-2 border-gray-300"
          />
        </div>
      )}
    </>
  );
};

const ResultImageContent: React.FC<{ shareContent: TrainingShareContent }> = ({ shareContent }) => (
  <div className="h-full flex flex-col justify-between">
    {/* ヘッダー */}
    <div className="text-center">
      <h1 className="text-6xl font-bold mb-4">🎵 Pitch Training</h1>
      <div className="text-2xl opacity-80">相対音感トレーニング結果</div>
    </div>
    
    {/* メインスコア */}
    <div className="text-center">
      <div className="text-[120px] font-bold leading-none">{shareContent.score}</div>
      <div className="text-4xl mt-4">精度: {shareContent.accuracy.toFixed(1)}%</div>
      <div className="text-3xl mt-2 opacity-80">
        {shareContent.mode === 'random' && '🎲 ランダム基音モード'}
        {shareContent.mode === 'continuous' && '🔄 連続ラウンドモード'}
        {shareContent.mode === 'chromatic' && '🎵 クロマティックモード'}
      </div>
    </div>
    
    {/* 達成バッジ */}
    <div className="space-y-4">
      {shareContent.achievements.slice(0, 2).map((achievement, index) => (
        <div key={index} className="flex items-center space-x-6">
          <div className="text-5xl">{achievement.icon}</div>
          <div>
            <div className="text-3xl font-bold">{achievement.name}</div>
            <div className="text-2xl opacity-80">{achievement.description}</div>
          </div>
        </div>
      ))}
    </div>
    
    {/* フッター */}
    <div className="text-center text-2xl opacity-60">
      Level {shareContent.level} • {shareContent.rank} • 
      {Math.floor(shareContent.completionTime / 60)}分{shareContent.completionTime % 60}秒
    </div>
  </div>
);
```

---

## 📤 4. SNS別実装

### 4.1 Twitter/X 統合

```tsx
const TwitterShareComponent: React.FC<{ shareData: ShareData }> = ({ shareData }) => {
  const twitterConfig = {
    text: shareData.text,
    url: shareData.url,
    hashtags: shareData.hashtags,
    via: 'PitchTrainingApp', // アプリのTwitterアカウント
  };
  
  return (
    <TwitterShareButton
      {...twitterConfig}
      className="flex items-center space-x-3 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors duration-200"
    >
      <TwitterIcon size={24} round />
      <span className="font-medium">Twitterで共有</span>
    </TwitterShareButton>
  );
};

// Twitter投稿テキスト生成
const generateTwitterText = (shareContent: TrainingShareContent): string => {
  const modeText = {
    random: 'ランダム基音モード',
    continuous: '連続ラウンドモード', 
    chromatic: 'クロマティックモード'
  }[shareContent.mode];
  
  const timeText = `${Math.floor(shareContent.completionTime / 60)}分${shareContent.completionTime % 60}秒`;
  
  return `🎵 相対音感トレーニング完了！\n\n` +
         `📊 スコア: ${shareContent.score}\n` +
         `🎯 精度: ${shareContent.accuracy.toFixed(1)}%\n` +
         `⏱️ 時間: ${timeText}\n` +
         `🎼 モード: ${modeText}\n\n` +
         `#相対音感 #音楽トレーニング #PitchTraining`;
};
```

### 4.2 Facebook 統合

```tsx
const FacebookShareComponent: React.FC<{ shareData: ShareData }> = ({ shareData }) => {
  const facebookConfig = {
    url: shareData.url,
    quote: shareData.text,
    hashtag: '#相対音感トレーニング',
  };
  
  return (
    <FacebookShareButton
      {...facebookConfig}
      className="flex items-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors duration-200"
    >
      <FacebookIcon size={24} round />
      <span className="font-medium">Facebookで共有</span>
    </FacebookShareButton>
  );
};

const generateFacebookText = (shareContent: TrainingShareContent): string => {
  return `相対音感トレーニングで新記録達成！🎵\n\n` +
         `今回の結果：\n` +
         `・スコア: ${shareContent.score}点\n` +
         `・精度: ${shareContent.accuracy.toFixed(1)}%\n` +
         `・トレーニング時間: ${Math.floor(shareContent.completionTime / 60)}分\n\n` +
         `継続的な練習で音感が向上中です！\n` +
         `皆さんも一緒に音感を鍛えませんか？ 🎼`;
};
```

### 4.3 LINE 統合

```tsx
const LineShareComponent: React.FC<{ shareData: ShareData }> = ({ shareData }) => {
  const lineConfig = {
    url: shareData.url,
    title: shareData.text,
  };
  
  return (
    <LineShareButton
      {...lineConfig}
      className="flex items-center space-x-3 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors duration-200"
    >
      <LineIcon size={24} round />
      <span className="font-medium">LINEで共有</span>
    </LineShareButton>
  );
};

// LINE用のシンプルなテキスト
const generateLineText = (shareContent: TrainingShareContent): string => {
  return `🎵 音感トレーニング結果\n` +
         `スコア: ${shareContent.score} (精度: ${shareContent.accuracy.toFixed(1)}%)\n` +
         `一緒に音感を鍛えませんか？`;
};
```

### 4.4 Instagram Stories対応

```tsx
const InstagramShareComponent: React.FC<{ imageUrl: string }> = ({ imageUrl }) => {
  const handleInstagramShare = useCallback(async () => {
    if (navigator.share) {
      try {
        // Web Share API使用（モバイル）
        await navigator.share({
          title: '相対音感トレーニング結果',
          text: '音感トレーニングで新記録達成！',
          url: window.location.href,
        });
      } catch (error) {
        console.log('シェアがキャンセルされました');
      }
    } else {
      // デスクトップ：画像ダウンロード
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'pitch-training-result.png';
      link.click();
    }
  }, [imageUrl]);
  
  return (
    <button
      onClick={handleInstagramShare}
      className="flex items-center space-x-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg transition-all duration-200"
    >
      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
        <span className="text-purple-500 text-sm">📷</span>
      </div>
      <span className="font-medium">Instagram Storiesで共有</span>
    </button>
  );
};
```

---

## 🎨 5. 統合共有コンポーネント

### 5.1 メイン共有UI

```tsx
const ShareResultsComponent: React.FC<{ shareContent: TrainingShareContent }> = ({ shareContent }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const shareData: ShareData = {
    text: generateShareText(shareContent, customMessage),
    url: `${window.location.origin}?ref=share`,
    hashtags: ['相対音感', '音楽トレーニング', 'PitchTraining'],
    imageUrl,
    customMessage,
  };
  
  const generateImage = async () => {
    setIsGeneratingImage(true);
    try {
      const generator = new TrainingResultImageGenerator({
        width: 1080,
        height: 1080,
        backgroundColor: '#667eea',
        theme: 'gradient',
        includeQRCode: true,
      });
      
      const url = await generator.generateResultImage(shareContent);
      setImageUrl(url);
    } catch (error) {
      console.error('画像生成エラー:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };
  
  useEffect(() => {
    generateImage();
  }, [shareContent]);
  
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          結果をシェアしよう！ 🎉
        </h3>
        <p className="text-gray-600">
          あなたの成果をSNSで友達と共有しませんか？
        </p>
      </div>
      
      {/* カスタムメッセージ入力 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          カスタムメッセージ (オプション)
        </label>
        <textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="あなたの感想や目標を追加できます..."
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          maxLength={100}
        />
        <div className="text-right text-xs text-gray-500 mt-1">
          {customMessage.length}/100文字
        </div>
      </div>
      
      {/* 画像プレビュー */}
      <div className="mb-6 text-center">
        {isGeneratingImage ? (
          <div className="w-48 h-48 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : imageUrl ? (
          <img 
            src={imageUrl} 
            alt="共有用画像プレビュー" 
            className="w-48 h-48 mx-auto rounded-lg shadow-md"
          />
        ) : (
          <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
            画像生成中...
          </div>
        )}
      </div>
      
      {/* SNSボタン */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <TwitterShareComponent shareData={shareData} />
        <FacebookShareComponent shareData={shareData} />
        <LineShareComponent shareData={shareData} />
        <InstagramShareComponent imageUrl={imageUrl} />
      </div>
      
      {/* 共有統計 */}
      <div className="border-t border-gray-200 pt-4">
        <div className="text-center text-sm text-gray-500">
          <span>🏆 あなたは上位 15% の成績です！</span>
          <br />
          <span>📈 今月の共有数: 1,234件</span>
        </div>
      </div>
    </div>
  );
};

// テキスト生成ヘルパー
const generateShareText = (shareContent: TrainingShareContent, customMessage: string): string => {
  const baseText = generateTwitterText(shareContent);
  return customMessage ? `${baseText}\n\n${customMessage}` : baseText;
};
```

---

## 📊 6. 共有分析・統計

### 6.1 共有トラッキング

```typescript
interface ShareEvent {
  platform: 'twitter' | 'facebook' | 'line' | 'instagram';
  shareContent: TrainingShareContent;
  timestamp: Date;
  userId?: string;
}

class ShareAnalytics {
  static trackShare(event: ShareEvent): void {
    // Google Analytics または独自分析システムに送信
    if (typeof gtag !== 'undefined') {
      gtag('event', 'share', {
        method: event.platform,
        content_type: 'training_result',
        content_id: `${event.shareContent.mode}_${event.shareContent.score}`,
      });
    }
    
    // ローカルストレージに保存（オプション）
    const shareHistory = this.getShareHistory();
    shareHistory.push(event);
    localStorage.setItem('shareHistory', JSON.stringify(shareHistory.slice(-50))); // 最新50件のみ保持
  }
  
  static getShareHistory(): ShareEvent[] {
    const history = localStorage.getItem('shareHistory');
    return history ? JSON.parse(history) : [];
  }
  
  static getShareStats(): { totalShares: number; topPlatform: string; averageScore: number } {
    const history = this.getShareHistory();
    const platformCounts = history.reduce((acc, event) => {
      acc[event.platform] = (acc[event.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topPlatform = Object.entries(platformCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'twitter';
    
    const averageScore = history.reduce((sum, event) => sum + event.shareContent.score, 0) / history.length || 0;
    
    return {
      totalShares: history.length,
      topPlatform,
      averageScore: Math.round(averageScore),
    };
  }
}
```

---

**この仕様書は、Next.js版相対音感トレーニングアプリのSNS共有機能の詳細実装指針です。**