# PDF出力機能仕様書

**作成日**: 2025-07-17  
**バージョン**: v1.0.0-pdf-export  
**対象**: Next.js版PDF詳細レポート出力機能  
**ステータス**: 詳細仕様確定版

---

## 📄 1. 概要

### 1.1 PDF出力機能の目的

- **詳細分析レポート**: トレーニング結果の詳細な分析データ提供
- **進捗記録**: 長期的な学習進捗の記録・保存
- **共有・印刷**: オフライン環境での結果確認・指導者との共有
- **アーカイブ**: 個人の音楽学習履歴の蓄積

### 1.2 対象ドキュメント

1. **単回トレーニング結果レポート**: 1回のセッション詳細
2. **進捗サマリーレポート**: 期間別の成長記録
3. **比較分析レポート**: モード別・期間別パフォーマンス比較
4. **学習推奨レポート**: AI分析による改善提案

---

## 🛠️ 2. 技術実装

### 2.1 使用ライブラリ

```typescript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Chart } from 'chart.js';
import autoTable from 'jspdf-autotable';

// 日本語フォント対応
import NotoSansJP from './fonts/NotoSansJP-Regular.ttf';
```

### 2.2 PDF生成アーキテクチャ

```typescript
interface PDFDocument {
  title: string;
  metadata: PDFMetadata;
  sections: PDFSection[];
  charts: ChartData[];
  tables: TableData[];
}

interface PDFMetadata {
  reportType: 'single' | 'progress' | 'comparison' | 'recommendation';
  generatedAt: Date;
  userInfo?: UserInfo;
  period?: { start: Date; end: Date };
  totalPages: number;
}

interface PDFSection {
  title: string;
  content: string | HTMLElement;
  type: 'text' | 'chart' | 'table' | 'image';
  pageBreak?: boolean;
}

abstract class BasePDFGenerator {
  protected doc: jsPDF;
  protected pageWidth: number;
  protected pageHeight: number;
  protected margin: number;
  protected currentY: number;
  
  constructor(orientation: 'portrait' | 'landscape' = 'portrait') {
    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4'
    });
    
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
    
    this.setupJapaneseFont();
  }
  
  private setupJapaneseFont(): void {
    // 日本語フォント設定
    this.doc.addFileToVFS('NotoSansJP.ttf', NotoSansJP);
    this.doc.addFont('NotoSansJP.ttf', 'NotoSansJP', 'normal');
    this.doc.setFont('NotoSansJP');
  }
  
  abstract generatePDF(): Promise<string>;
  
  protected addHeader(title: string): void {
    this.doc.setFontSize(20);
    this.doc.setTextColor(30, 30, 30);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 15;
    
    // 区切り線
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;
  }
  
  protected addFooter(pageNumber: number, totalPages: number): void {
    const footerY = this.pageHeight - 15;
    
    this.doc.setFontSize(10);
    this.doc.setTextColor(100, 100, 100);
    
    // 生成日時
    const now = new Date();
    const dateStr = now.toLocaleDateString('ja-JP');
    this.doc.text(`生成日: ${dateStr}`, this.margin, footerY);
    
    // ページ番号
    const pageStr = `${pageNumber} / ${totalPages}`;
    this.doc.text(pageStr, this.pageWidth - this.margin - 20, footerY);
    
    // アプリ名
    this.doc.text('Pitch Training App', this.pageWidth / 2 - 15, footerY);
  }
  
  protected checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 30) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }
}
```

---

## 📊 3. 単回トレーニング結果レポート

### 3.1 レポート構成

```typescript
interface SingleTrainingReportData {
  sessionInfo: SessionInfo;
  results: TrainingResult;
  detailedAnalysis: DetailedAnalysis;
  recommendations: string[];
}

interface SessionInfo {
  date: Date;
  mode: TrainingMode;
  duration: number;
  settings: ModeSettings;
}

interface DetailedAnalysis {
  noteAccuracy: NoteAccuracyData[];
  responseTimeAnalysis: ResponseTimeData;
  frequencyDeviationAnalysis: FrequencyDeviationData;
  progressTrend: ProgressTrendData;
}

class SingleTrainingPDFGenerator extends BasePDFGenerator {
  constructor(private reportData: SingleTrainingReportData) {
    super('portrait');
  }
  
  async generatePDF(): Promise<string> {
    // ページ1: 概要
    await this.addOverviewSection();
    
    // ページ2: 詳細分析
    this.doc.addPage();
    this.currentY = this.margin;
    await this.addDetailedAnalysisSection();
    
    // ページ3: 音程別分析
    this.doc.addPage();
    this.currentY = this.margin;
    await this.addNoteAnalysisSection();
    
    // ページ4: 改善提案
    this.doc.addPage();
    this.currentY = this.margin;
    await this.addRecommendationsSection();
    
    // フッター追加
    for (let i = 1; i <= this.doc.getNumberOfPages(); i++) {
      this.doc.setPage(i);
      this.addFooter(i, this.doc.getNumberOfPages());
    }
    
    return this.doc.output('datauristring');
  }
  
  private async addOverviewSection(): Promise<void> {
    this.addHeader('🎵 トレーニング結果レポート');
    
    // セッション情報
    this.doc.setFontSize(14);
    this.doc.setTextColor(50, 50, 50);
    this.doc.text('📅 セッション情報', this.margin, this.currentY);
    this.currentY += 10;
    
    const sessionInfo = [
      ['実施日時', this.reportData.sessionInfo.date.toLocaleString('ja-JP')],
      ['トレーニングモード', this.getModeDisplayName(this.reportData.sessionInfo.mode)],
      ['所要時間', `${Math.floor(this.reportData.sessionInfo.duration / 60)}分${this.reportData.sessionInfo.duration % 60}秒`],
      ['設定', this.getSettingsDescription(this.reportData.sessionInfo.settings)]
    ];
    
    this.addTable(sessionInfo, ['項目', '内容']);
    this.currentY += 15;
    
    // メインスコア表示
    await this.addScoreSection();
    
    // 精度チャート
    await this.addAccuracyChart();
  }
  
  private async addScoreSection(): Promise<void> {
    this.doc.setFontSize(16);
    this.doc.setTextColor(30, 30, 30);
    this.doc.text('🏆 総合結果', this.margin, this.currentY);
    this.currentY += 15;
    
    // スコアボックス描画
    const boxWidth = 60;
    const boxHeight = 40;
    const boxX = this.pageWidth / 2 - boxWidth / 2;
    
    // スコア背景
    this.doc.setFillColor(59, 130, 246); // blue-500
    this.doc.roundedRect(boxX, this.currentY, boxWidth, boxHeight, 5, 5, 'F');
    
    // スコアテキスト
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(24);
    this.doc.text(
      this.reportData.results.score.toString(),
      boxX + boxWidth / 2,
      this.currentY + boxHeight / 2 + 3,
      { align: 'center' }
    );
    
    this.doc.setFontSize(12);
    this.doc.text('総合スコア', boxX + boxWidth / 2, this.currentY + boxHeight - 5, { align: 'center' });
    
    this.currentY += boxHeight + 20;
    
    // 詳細数値
    const metrics = [
      ['精度', `${this.reportData.results.accuracy.toFixed(1)}%`],
      ['完了率', `${this.reportData.results.completionRate.toFixed(1)}%`],
      ['平均応答時間', `${this.reportData.results.averageResponseTime.toFixed(1)}秒`],
      ['完璧な音程数', `${this.reportData.results.perfectNotes}/8音`]
    ];
    
    this.addTable(metrics, ['指標', '値']);
  }
  
  private async addAccuracyChart(): Promise<void> {
    this.currentY += 10;
    this.doc.setFontSize(14);
    this.doc.setTextColor(50, 50, 50);
    this.doc.text('📈 音程別精度', this.margin, this.currentY);
    this.currentY += 10;
    
    // Chart.jsでチャート生成
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'],
        datasets: [{
          label: '精度 (%)',
          data: this.reportData.detailedAnalysis.noteAccuracy.map(n => n.accuracy),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => value + '%'
            }
          }
        }
      }
    });
    
    // チャートを画像としてPDFに追加
    const chartImage = canvas.toDataURL('image/png');
    const imgWidth = this.pageWidth - 2 * this.margin;
    const imgHeight = imgWidth * 0.5;
    
    this.checkPageBreak(imgHeight + 10);
    this.doc.addImage(chartImage, 'PNG', this.margin, this.currentY, imgWidth, imgHeight);
    this.currentY += imgHeight + 10;
  }
  
  private addTable(data: string[][], headers: string[]): void {
    (this.doc as any).autoTable({
      head: [headers],
      body: data,
      startY: this.currentY,
      styles: {
        font: 'NotoSansJP',
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: this.margin, right: this.margin }
    });
    
    this.currentY = (this.doc as any).lastAutoTable.finalY + 5;
  }
}
```

---

## 📈 4. 進捗サマリーレポート

### 4.1 長期進捗分析

```typescript
interface ProgressReportData {
  period: { start: Date; end: Date };
  sessions: SessionData[];
  statistics: ProgressStatistics;
  trends: TrendAnalysis;
  milestones: Milestone[];
}

interface ProgressStatistics {
  totalSessions: number;
  totalTrainingTime: number;
  averageScore: number;
  scoreImprovement: number;
  accuracyImprovement: number;
  consistencyScore: number;
}

interface TrendAnalysis {
  scoreProgression: { date: Date; score: number }[];
  accuracyProgression: { date: Date; accuracy: number }[];
  modePreferences: { mode: string; count: number; averageScore: number }[];
  weeklyActivity: { week: string; sessions: number; avgScore: number }[];
}

class ProgressSummaryPDFGenerator extends BasePDFGenerator {
  constructor(private progressData: ProgressReportData) {
    super('portrait');
  }
  
  async generatePDF(): Promise<string> {
    // ページ1: 進捗概要
    await this.addProgressOverview();
    
    // ページ2: トレンド分析
    this.doc.addPage();
    this.currentY = this.margin;
    await this.addTrendAnalysis();
    
    // ページ3: 詳細統計
    this.doc.addPage();
    this.currentY = this.margin;
    await this.addDetailedStatistics();
    
    // ページ4: 達成記録
    this.doc.addPage();
    this.currentY = this.margin;
    await this.addMilestones();
    
    return this.doc.output('datauristring');
  }
  
  private async addProgressOverview(): Promise<void> {
    this.addHeader('📊 進捗サマリーレポート');
    
    // 期間情報
    const periodStr = `${this.progressData.period.start.toLocaleDateString('ja-JP')} - ${this.progressData.period.end.toLocaleDateString('ja-JP')}`;
    this.doc.setFontSize(12);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text(`対象期間: ${periodStr}`, this.margin, this.currentY);
    this.currentY += 15;
    
    // 主要統計をカード形式で表示
    await this.addStatisticsCards();
    
    // スコア進捗グラフ
    await this.addProgressChart();
  }
  
  private async addStatisticsCards(): Promise<void> {
    const stats = this.progressData.statistics;
    const cardData = [
      { label: '総セッション数', value: `${stats.totalSessions}回`, color: [59, 130, 246] },
      { label: '総練習時間', value: `${Math.floor(stats.totalTrainingTime / 3600)}時間`, color: [16, 185, 129] },
      { label: '平均スコア', value: stats.averageScore.toFixed(0), color: [245, 158, 11] },
      { label: 'スコア向上', value: `+${stats.scoreImprovement.toFixed(0)}`, color: [239, 68, 68] }
    ];
    
    const cardWidth = (this.pageWidth - 2 * this.margin - 15) / 2;
    const cardHeight = 25;
    
    cardData.forEach((card, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const x = this.margin + col * (cardWidth + 5);
      const y = this.currentY + row * (cardHeight + 5);
      
      // カード背景
      this.doc.setFillColor(...card.color);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');
      
      // テキスト
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(10);
      this.doc.text(card.label, x + 5, y + 8);
      this.doc.setFontSize(16);
      this.doc.text(card.value, x + 5, y + 18);
    });
    
    this.currentY += cardHeight * 2 + 20;
  }
  
  private async addProgressChart(): Promise<void> {
    this.doc.setFontSize(14);
    this.doc.setTextColor(50, 50, 50);
    this.doc.text('📈 スコア推移', this.margin, this.currentY);
    this.currentY += 10;
    
    // 線グラフ生成
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;
    
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.progressData.trends.scoreProgression.map(p => 
          p.date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
        ),
        datasets: [
          {
            label: 'スコア',
            data: this.progressData.trends.scoreProgression.map(p => p.score),
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: '精度 (%)',
            data: this.progressData.trends.accuracyProgression.map(p => p.accuracy),
            borderColor: 'rgba(16, 185, 129, 1)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    
    const chartImage = canvas.toDataURL('image/png');
    const imgWidth = this.pageWidth - 2 * this.margin;
    const imgHeight = imgWidth * 0.375;
    
    this.checkPageBreak(imgHeight + 10);
    this.doc.addImage(chartImage, 'PNG', this.margin, this.currentY, imgWidth, imgHeight);
    this.currentY += imgHeight + 10;
  }
}
```

---

## 📋 5. PDF出力UI コンポーネント

### 5.1 メインエクスポートコンポーネント

```tsx
const PDFExportComponent: React.FC<{ reportData: any; reportType: string }> = ({ 
  reportData, 
  reportType 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeCharts: true,
    includeDetailedAnalysis: true,
    includeRecommendations: true,
    language: 'ja' as 'ja' | 'en'
  });
  
  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      let generator: BasePDFGenerator;
      
      switch (reportType) {
        case 'single':
          generator = new SingleTrainingPDFGenerator(reportData);
          break;
        case 'progress':
          generator = new ProgressSummaryPDFGenerator(reportData);
          break;
        case 'comparison':
          generator = new ComparisonPDFGenerator(reportData);
          break;
        default:
          throw new Error('Unknown report type');
      }
      
      const pdfDataUri = await generator.generatePDF();
      
      // ダウンロード実行
      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = `pitch-training-report-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      
      // 生成成功の通知
      toast.success('PDFレポートが正常に生成されました！');
      
    } catch (error) {
      console.error('PDF生成エラー:', error);
      toast.error('PDFの生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <DocumentTextIcon className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          PDFレポート出力
        </h3>
        <p className="text-gray-600 text-sm">
          詳細な分析レポートをPDFで保存・共有できます
        </p>
      </div>
      
      {/* 出力オプション */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">グラフを含める</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={exportOptions.includeCharts}
              onChange={(e) => setExportOptions(prev => ({ ...prev, includeCharts: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">詳細分析</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={exportOptions.includeDetailedAnalysis}
              onChange={(e) => setExportOptions(prev => ({ ...prev, includeDetailedAnalysis: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">改善提案</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={exportOptions.includeRecommendations}
              onChange={(e) => setExportOptions(prev => ({ ...prev, includeRecommendations: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
      
      {/* 生成ボタン */}
      <button
        onClick={generatePDF}
        disabled={isGenerating}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
          isGenerating
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700 hover:scale-105'
        } text-white shadow-lg`}
      >
        {isGenerating ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            生成中...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <DownloadIcon className="h-5 w-5 mr-2" />
            PDFレポートをダウンロード
          </div>
        )}
      </button>
      
      {/* ファイルサイズ予想 */}
      <div className="text-center mt-3">
        <span className="text-xs text-gray-500">
          予想ファイルサイズ: {getEstimatedFileSize(exportOptions)}KB
        </span>
      </div>
    </div>
  );
};

// ファイルサイズ予想
const getEstimatedFileSize = (options: ExportOptions): number => {
  let baseSize = 150; // 基本サイズ
  
  if (options.includeCharts) baseSize += 300;
  if (options.includeDetailedAnalysis) baseSize += 200;
  if (options.includeRecommendations) baseSize += 100;
  
  return baseSize;
};
```

---

## 📱 6. モバイル対応とパフォーマンス最適化

### 6.1 レスポンシブPDF生成

```typescript
class ResponsivePDFGenerator extends BasePDFGenerator {
  private isMobile: boolean;
  
  constructor(orientation: 'portrait' | 'landscape' = 'portrait') {
    super(orientation);
    this.isMobile = window.innerWidth < 768;
    
    if (this.isMobile) {
      // モバイル向け最適化
      this.setupMobileOptimizations();
    }
  }
  
  private setupMobileOptimizations(): void {
    // チャートサイズを縮小
    // フォントサイズを調整
    // メモリ使用量を削減
  }
}
```

### 6.2 チャンク処理による大容量対応

```typescript
class ChunkedPDFProcessor {
  static async processLargeDataset(data: LargeDataset): Promise<string> {
    const chunks = this.splitIntoChunks(data, 100); // 100件ずつ処理
    const pdfParts: string[] = [];
    
    for (const chunk of chunks) {
      const partialPDF = await this.processChunk(chunk);
      pdfParts.push(partialPDF);
      
      // メモリ解放のための待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return this.mergePDFParts(pdfParts);
  }
}
```

---

**この仕様書は、Next.js版相対音感トレーニングアプリの包括的PDF出力機能の詳細実装指針です。**