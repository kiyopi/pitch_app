# トレーニングモード仕様書

**作成日**: 2025-07-17  
**バージョン**: v1.0.0-training-modes  
**対象**: Next.js版3つのトレーニングモード  
**ステータス**: 詳細仕様確定版

---

## 🎯 1. 概要

### 1.1 実装対象の3つのモード

1. **ランダム基音モード**: 毎回異なる基音でトレーニング
2. **5ラウンド連続モード**: 選択可能ラウンド数での連続トレーニング
3. **12音クロマティックモード**: ユーザー選択開始音によるクロマティック音階

### 1.2 共通設計方針

- **統一インターフェース**: 全モード共通のTrainingMode型
- **個別カスタマイズ**: モードごとの独自設定
- **結果統合**: 統一的な結果表示・共有システム

---

## 🎮 2. モード1: ランダム基音モード

### 2.1 機能概要

**目的**: 予測不可能な基音により、真の相対音感を鍛える

**特徴**:
- 10種類の基音候補からランダム選択
- 毎回異なる音域でのトレーニング
- 固定パターン記憶の防止

### 2.2 基音候補仕様

```typescript
interface BaseTone {
  note: string;
  octave: number;
  frequency: number;
}

const BASE_TONE_CANDIDATES: BaseTone[] = [
  { note: 'C', octave: 3, frequency: 130.81 },   // C3
  { note: 'D', octave: 3, frequency: 146.83 },   // D3
  { note: 'E', octave: 3, frequency: 164.81 },   // E3
  { note: 'F', octave: 3, frequency: 174.61 },   // F3
  { note: 'G', octave: 3, frequency: 196.00 },   // G3
  { note: 'A', octave: 3, frequency: 220.00 },   // A3
  { note: 'C', octave: 4, frequency: 261.63 },   // C4 (Middle C)
  { note: 'E', octave: 4, frequency: 329.63 },   // E4
  { note: 'G', octave: 4, frequency: 392.00 },   // G4
  { note: 'A', octave: 4, frequency: 440.00 },   // A4 (Concert pitch)
];
```

### 2.3 ランダム選択アルゴリズム

```typescript
interface RandomModeConfig {
  excludeLastTone?: boolean; // 直前の基音を除外
  weightedSelection?: boolean; // 難易度による重み付け
  userPreference?: 'low' | 'mid' | 'high' | 'all'; // 音域設定
}

class RandomBaseToneSelector {
  private lastSelectedTone: BaseTone | null = null;
  
  selectBaseTone(config: RandomModeConfig = {}): BaseTone {
    let candidates = [...BASE_TONE_CANDIDATES];
    
    // 直前基音除外
    if (config.excludeLastTone && this.lastSelectedTone) {
      candidates = candidates.filter(tone => 
        tone.frequency !== this.lastSelectedTone?.frequency
      );
    }
    
    // 音域フィルタリング
    if (config.userPreference && config.userPreference !== 'all') {
      candidates = this.filterByRange(candidates, config.userPreference);
    }
    
    // ランダム選択
    const selectedTone = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastSelectedTone = selectedTone;
    
    return selectedTone;
  }
  
  private filterByRange(candidates: BaseTone[], range: string): BaseTone[] {
    switch (range) {
      case 'low': return candidates.filter(t => t.octave === 3);
      case 'mid': return candidates.filter(t => t.octave === 3 || t.octave === 4);
      case 'high': return candidates.filter(t => t.octave === 4);
      default: return candidates;
    }
  }
}
```

### 2.4 UI/UX設計

```tsx
const RandomModeCard = () => (
  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 shadow-xl">
    <div className="flex items-center mb-4">
      <ShuffleIcon className="h-8 w-8 text-blue-600 mr-3" />
      <h3 className="text-xl font-bold text-gray-800">ランダム基音モード</h3>
    </div>
    <p className="text-gray-600 mb-4">
      毎回異なる基音でトレーニング。予測不可能な音域で真の相対音感を鍛えます。
    </p>
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">基音範囲:</span>
        <select className="text-sm border rounded px-2 py-1">
          <option value="all">全音域 (C3-A4)</option>
          <option value="low">低音域 (C3-A3)</option>
          <option value="mid">中音域 (C3-A4)</option>
          <option value="high">高音域 (C4-A4)</option>
        </select>
      </div>
    </div>
  </div>
);
```

---

## 🔄 3. モード2: 5ラウンド連続モード

### 3.1 機能概要

**目的**: 持続的な集中力と安定した相対音感の習得

**特徴**:
- ユーザー選択可能ラウンド数（3-10ラウンド）
- 同一基音での連続トレーニング
- 累積スコア・進捗追跡

### 3.2 連続モード設定

```typescript
interface ContinuousModeConfig {
  rounds: number; // 3-10ラウンド選択可能
  baseTone: BaseTone; // 固定基音
  restBetweenRounds: number; // ラウンド間休憩時間（秒）
  showProgressBar: boolean; // 進捗表示
  enableQuickMode: boolean; // 短縮モード
}

interface ContinuousModeState {
  currentRound: number;
  totalRounds: number;
  roundResults: RoundResult[];
  overallScore: number;
  averageAccuracy: number;
  totalTime: number;
  isResting: boolean;
}

interface RoundResult {
  roundNumber: number;
  score: number;
  accuracy: number; // パーセンテージ
  completionTime: number; // 秒
  noteResults: NoteResult[];
  perfectNotes: number; // 正確に歌えた音数
}
```

### 3.3 進捗管理システム

```typescript
class ContinuousTrainingManager {
  private state: ContinuousModeState;
  private config: ContinuousModeConfig;
  
  constructor(config: ContinuousModeConfig) {
    this.config = config;
    this.state = {
      currentRound: 1,
      totalRounds: config.rounds,
      roundResults: [],
      overallScore: 0,
      averageAccuracy: 0,
      totalTime: 0,
      isResting: false
    };
  }
  
  async startNextRound(): Promise<void> {
    if (this.state.currentRound > this.state.totalRounds) {
      await this.completeTraining();
      return;
    }
    
    if (this.state.currentRound > 1 && this.config.restBetweenRounds > 0) {
      await this.startRestPeriod();
    }
    
    await this.executeRound();
  }
  
  private async startRestPeriod(): Promise<void> {
    this.state.isResting = true;
    return new Promise(resolve => {
      setTimeout(() => {
        this.state.isResting = false;
        resolve();
      }, this.config.restBetweenRounds * 1000);
    });
  }
  
  completeRound(result: RoundResult): void {
    this.state.roundResults.push(result);
    this.updateOverallStats();
    this.state.currentRound++;
  }
  
  private updateOverallStats(): void {
    const results = this.state.roundResults;
    this.state.overallScore = results.reduce((sum, r) => sum + r.score, 0);
    this.state.averageAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
    this.state.totalTime = results.reduce((sum, r) => sum + r.completionTime, 0);
  }
}
```

### 3.4 UI/UX設計

```tsx
const ContinuousModeCard = () => {
  const [selectedRounds, setSelectedRounds] = useState(5);
  
  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center mb-4">
        <RepeatIcon className="h-8 w-8 text-green-600 mr-3" />
        <h3 className="text-xl font-bold text-gray-800">連続ラウンドモード</h3>
      </div>
      <p className="text-gray-600 mb-4">
        同じ基音で複数ラウンド連続実行。持続的な集中力を鍛えます。
      </p>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">ラウンド数:</span>
          <div className="flex space-x-2">
            {[3, 5, 7, 10].map(num => (
              <button
                key={num}
                onClick={() => setSelectedRounds(num)}
                className={`px-3 py-1 rounded text-sm ${
                  selectedRounds === num 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {num}回
              </button>
            ))}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            推定時間: {selectedRounds * 2}分
          </div>
          <div className="text-sm text-gray-500">
            (1ラウンド約2分 + 休憩時間)
          </div>
        </div>
      </div>
    </div>
  );
};

const ContinuousProgressDisplay = ({ state }: { state: ContinuousModeState }) => (
  <div className="bg-white rounded-xl p-6 shadow-lg">
    <div className="flex justify-between items-center mb-4">
      <h4 className="text-lg font-bold">進捗状況</h4>
      <span className="text-sm text-gray-500">
        {state.currentRound - 1}/{state.totalRounds} 完了
      </span>
    </div>
    
    {/* 進捗バー */}
    <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
      <div 
        className="bg-green-600 h-3 rounded-full transition-all duration-500"
        style={{ width: `${((state.currentRound - 1) / state.totalRounds) * 100}%` }}
      />
    </div>
    
    {/* 統計情報 */}
    <div className="grid grid-cols-3 gap-4 text-center">
      <div>
        <div className="text-2xl font-bold text-blue-600">{state.overallScore}</div>
        <div className="text-sm text-gray-500">総合スコア</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-green-600">{state.averageAccuracy.toFixed(1)}%</div>
        <div className="text-sm text-gray-500">平均精度</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-purple-600">{Math.floor(state.totalTime / 60)}分</div>
        <div className="text-sm text-gray-500">累積時間</div>
      </div>
    </div>
  </div>
);
```

---

## 🎵 4. モード3: 12音クロマティックモード

### 4.1 機能概要

**目的**: 半音階の精密な聞き分け能力の習得

**特徴**:
- ユーザー選択開始音（C-B）
- 上行・下行・両方向選択可能
- 12音すべての半音関係習得

### 4.2 クロマティック音階設定

```typescript
type ChromaticNote = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
type Direction = 'up' | 'down' | 'both';

interface ChromaticModeConfig {
  startingNote: ChromaticNote; // ユーザー選択開始音
  octave: number; // 基準オクターブ
  direction: Direction; // 進行方向
  includeEnharmonics: boolean; // 異名同音表示
  practiceMode: 'sequence' | 'random' | 'intervals'; // 練習形式
}

interface ChromaticSequence {
  notes: ChromaticNote[];
  frequencies: number[];
  intervals: number[]; // セント単位の音程差
}

class ChromaticScaleGenerator {
  private static readonly CHROMATIC_NOTES: ChromaticNote[] = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
  ];
  
  static generateSequence(config: ChromaticModeConfig): ChromaticSequence {
    const startIndex = this.CHROMATIC_NOTES.indexOf(config.startingNote);
    let notes: ChromaticNote[] = [];
    
    switch (config.direction) {
      case 'up':
        notes = this.generateUpSequence(startIndex);
        break;
      case 'down':
        notes = this.generateDownSequence(startIndex);
        break;
      case 'both':
        notes = [...this.generateUpSequence(startIndex), ...this.generateDownSequence(startIndex).slice(1)];
        break;
    }
    
    const frequencies = this.notesToFrequencies(notes, config.octave);
    const intervals = this.calculateIntervals(frequencies);
    
    return { notes, frequencies, intervals };
  }
  
  private static generateUpSequence(startIndex: number): ChromaticNote[] {
    const sequence: ChromaticNote[] = [];
    for (let i = 0; i < 12; i++) {
      const noteIndex = (startIndex + i) % 12;
      sequence.push(this.CHROMATIC_NOTES[noteIndex]);
    }
    return sequence;
  }
  
  private static generateDownSequence(startIndex: number): ChromaticNote[] {
    const sequence: ChromaticNote[] = [];
    for (let i = 0; i < 12; i++) {
      const noteIndex = (startIndex - i + 12) % 12;
      sequence.push(this.CHROMATIC_NOTES[noteIndex]);
    }
    return sequence;
  }
  
  private static notesToFrequencies(notes: ChromaticNote[], octave: number): number[] {
    const A4_FREQUENCY = 440; // A4 = 440Hz
    const A4_NOTE_NUMBER = 69; // MIDI note number for A4
    
    return notes.map(note => {
      const noteNumber = this.getNoteNumber(note, octave);
      return A4_FREQUENCY * Math.pow(2, (noteNumber - A4_NOTE_NUMBER) / 12);
    });
  }
  
  private static getNoteNumber(note: ChromaticNote, octave: number): number {
    const noteOffset = this.CHROMATIC_NOTES.indexOf(note);
    return (octave + 1) * 12 + noteOffset;
  }
  
  private static calculateIntervals(frequencies: number[]): number[] {
    const intervals: number[] = [];
    for (let i = 1; i < frequencies.length; i++) {
      const cents = Math.round(1200 * Math.log2(frequencies[i] / frequencies[i-1]));
      intervals.push(cents);
    }
    return intervals;
  }
}
```

### 4.3 練習形式設計

```typescript
interface ChromaticPracticeMode {
  sequence: '連続練習'; // 順番に12音
  random: 'ランダム練習'; // ランダム順序
  intervals: '音程練習'; // 特定音程のみ
}

class ChromaticTrainingSession {
  private config: ChromaticModeConfig;
  private sequence: ChromaticSequence;
  private currentNoteIndex: number = 0;
  
  constructor(config: ChromaticModeConfig) {
    this.config = config;
    this.sequence = ChromaticScaleGenerator.generateSequence(config);
  }
  
  getCurrentNote(): { note: ChromaticNote; frequency: number; interval?: number } {
    const noteIndex = this.currentNoteIndex;
    return {
      note: this.sequence.notes[noteIndex],
      frequency: this.sequence.frequencies[noteIndex],
      interval: noteIndex > 0 ? this.sequence.intervals[noteIndex - 1] : undefined
    };
  }
  
  nextNote(): boolean {
    this.currentNoteIndex++;
    return this.currentNoteIndex < this.sequence.notes.length;
  }
  
  getProgress(): { current: number; total: number; percentage: number } {
    return {
      current: this.currentNoteIndex + 1,
      total: this.sequence.notes.length,
      percentage: ((this.currentNoteIndex + 1) / this.sequence.notes.length) * 100
    };
  }
}
```

### 4.4 UI/UX設計

```tsx
const ChromaticModeCard = () => {
  const [startingNote, setStartingNote] = useState<ChromaticNote>('C');
  const [direction, setDirection] = useState<Direction>('up');
  const [practiceMode, setPracticeMode] = useState<'sequence' | 'random' | 'intervals'>('sequence');
  
  const chromaticNotes: ChromaticNote[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center mb-4">
        <MusicalNoteIcon className="h-8 w-8 text-purple-600 mr-3" />
        <h3 className="text-xl font-bold text-gray-800">12音クロマティックモード</h3>
      </div>
      <p className="text-gray-600 mb-4">
        半音階すべてを網羅。精密な音程感覚を身につけます。
      </p>
      
      <div className="space-y-4">
        {/* 開始音選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">開始音</label>
          <div className="grid grid-cols-6 gap-2">
            {chromaticNotes.map(note => (
              <button
                key={note}
                onClick={() => setStartingNote(note)}
                className={`px-3 py-2 rounded text-sm font-medium ${
                  startingNote === note
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {note}
              </button>
            ))}
          </div>
        </div>
        
        {/* 方向選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">進行方向</label>
          <div className="flex space-x-3">
            {[
              { value: 'up', label: '上行 ↗', icon: '📈' },
              { value: 'down', label: '下行 ↘', icon: '📉' },
              { value: 'both', label: '両方向 ↕', icon: '🔄' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setDirection(option.value as Direction)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm ${
                  direction === option.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="mr-2">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* 練習形式 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">練習形式</label>
          <select 
            value={practiceMode}
            onChange={(e) => setPracticeMode(e.target.value as any)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="sequence">連続練習（順番に実行）</option>
            <option value="random">ランダム練習（順序をシャッフル）</option>
            <option value="intervals">音程練習（特定音程のみ）</option>
          </select>
        </div>
        
        {/* 予想難易度 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">予想難易度:</span>
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon
                  key={i}
                  className={`h-4 w-4 ${
                    i < getDifficultyLevel(direction, practiceMode)
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            推定時間: {getEstimatedTime(direction, practiceMode)}分
          </div>
        </div>
      </div>
    </div>
  );
};

const ChromaticProgressVisualizer = ({ session }: { session: ChromaticTrainingSession }) => {
  const progress = session.getProgress();
  const currentNote = session.getCurrentNote();
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <div className="text-center mb-6">
        <h4 className="text-2xl font-bold text-purple-600 mb-2">
          {currentNote.note}
        </h4>
        <div className="text-sm text-gray-500">
          {currentNote.frequency.toFixed(2)}Hz
          {currentNote.interval && (
            <span className="ml-2">({currentNote.interval > 0 ? '+' : ''}{currentNote.interval}セント)</span>
          )}
        </div>
      </div>
      
      {/* 12音クロマティック表示 */}
      <div className="grid grid-cols-12 gap-1 mb-6">
        {session.sequence.notes.map((note, index) => (
          <div
            key={index}
            className={`h-8 rounded text-xs flex items-center justify-center font-medium ${
              index < progress.current
                ? 'bg-green-500 text-white'
                : index === progress.current - 1
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {note}
          </div>
        ))}
      </div>
      
      {/* 進捗情報 */}
      <div className="text-center">
        <div className="text-lg font-bold text-gray-800">
          {progress.current}/{progress.total} ({progress.percentage.toFixed(0)}%)
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
```

---

## 🔄 5. 共通実装インターフェース

### 5.1 統一モード管理

```typescript
interface TrainingMode {
  id: 'random' | 'continuous' | 'chromatic';
  name: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedTime: number; // 分
  
  // モード固有設定
  config: RandomModeConfig | ContinuousModeConfig | ChromaticModeConfig;
  
  // 共通メソッド
  initialize(): Promise<void>;
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  getProgress(): ProgressData;
  getResults(): TrainingResult;
}

interface ProgressData {
  current: number;
  total: number;
  percentage: number;
  elapsedTime: number;
  estimatedRemainingTime: number;
}

interface TrainingResult {
  mode: TrainingMode['id'];
  score: number;
  accuracy: number;
  completionTime: number;
  detailedResults: NoteResult[];
  summary: ResultSummary;
}

interface ResultSummary {
  perfectNotes: number;
  goodNotes: number;
  okNotes: number;
  missedNotes: number;
  averageResponseTime: number;
  strongestInterval: string;
  weakestInterval: string;
  improvementSuggestions: string[];
}
```

### 5.2 モード切り替えUI

```tsx
const TrainingModeSelector = () => {
  const [selectedMode, setSelectedMode] = useState<TrainingMode['id']>('random');
  
  const modes: { id: TrainingMode['id']; component: React.ComponentType }[] = [
    { id: 'random', component: RandomModeCard },
    { id: 'continuous', component: ContinuousModeCard },
    { id: 'chromatic', component: ChromaticModeCard }
  ];
  
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          トレーニングモードを選択
        </h2>
        <p className="text-gray-600">
          あなたの目標とレベルに合わせて最適なモードを選んでください
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        {modes.map(mode => {
          const Component = mode.component;
          return (
            <div
              key={mode.id}
              className={`cursor-pointer transition-all duration-300 ${
                selectedMode === mode.id 
                  ? 'ring-4 ring-blue-500 ring-opacity-50' 
                  : 'hover:scale-105'
              }`}
              onClick={() => setSelectedMode(mode.id)}
            >
              <Component />
            </div>
          );
        })}
      </div>
      
      <div className="text-center">
        <button
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          onClick={() => startTraining(selectedMode)}
        >
          {selectedMode === 'random' && '🎲 ランダムトレーニング開始'}
          {selectedMode === 'continuous' && '🔄 連続トレーニング開始'}
          {selectedMode === 'chromatic' && '🎵 クロマティック開始'}
        </button>
      </div>
    </div>
  );
};
```

---

**この仕様書は、Next.js版相対音感トレーニングアプリの3つのトレーニングモードの詳細実装指針です。**