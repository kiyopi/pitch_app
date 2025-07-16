/**
 * シンプル相対音感トレーニング
 * SIMPLE_PITCH_TRAINING_FINAL_SPECIFICATION.md準拠
 * Version: 2.0.0-simple-clean
 */

// マイク管理クラス
class MicrophoneManager {
    constructor() {
        this.stream = null;
        this.audioContext = null;
        this.analyzer = null;
        this.isActive = false;
        console.log('🎤 MicrophoneManager初期化');
    }

    async requestAccess() {
        try {
            console.log('🎤 マイク許可要求開始');
            
            // AudioContext初期化
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // マイクアクセス要求
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // アナライザー設定
            this.analyzer = this.audioContext.createAnalyser();
            this.analyzer.fftSize = 2048;
            this.analyzer.smoothingTimeConstant = 0.3;
            
            // マイクとアナライザーを接続
            const source = this.audioContext.createMediaStreamSource(this.stream);
            source.connect(this.analyzer);
            
            this.isActive = true;
            console.log('✅ マイク許可成功');
            
        } catch (error) {
            console.error('❌ マイク許可失敗:', error);
            throw error;
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.isActive = false;
        console.log('🎤 マイク停止');
    }

    getFrequencyData() {
        if (!this.analyzer || !this.isActive) return null;
        
        const bufferLength = this.analyzer.fftSize;
        const dataArray = new Float32Array(bufferLength);
        this.analyzer.getFloatTimeDomainData(dataArray);
        
        return dataArray;
    }
}

// 音程検出クラス
class PitchDetectionManager {
    constructor() {
        this.detector = null;
        this.audioContext = null;
        this.isInitialized = false;
        console.log('🎵 PitchDetectionManager初期化');
    }

    async initialize(audioContext) {
        try {
            if (window.PitchDetector) {
                // PITCHY_SPECS.mdに従ってFFTサイズに合わせた初期化
                this.detector = window.PitchDetector.forFloat32Array(2048);
                this.audioContext = audioContext;
                this.isInitialized = true;
                console.log('✅ Pitchy初期化成功 (FFTサイズ: 2048)');
            } else {
                throw new Error('Pitchyライブラリが読み込まれていません');
            }
        } catch (error) {
            console.error('❌ Pitchy初期化失敗:', error);
            throw error;
        }
    }

    detectPitch(audioData) {
        if (!this.isInitialized || !this.detector) return null;
        
        try {
            // PITCHY_SPECS.mdに従ってfindPitchメソッドを使用
            const result = this.detector.findPitch(audioData, this.audioContext.sampleRate);
            const [pitch, clarity] = result; // [周波数Hz, 確信度0-1]
            
            // 確信度しきい値: 0.1以上で有効
            return clarity > 0.1 ? pitch : null;
        } catch (error) {
            console.warn('⚠️ 音程検出エラー:', error);
            return null;
        }
    }
}

// 基音管理クラス
class BaseToneManager {
    constructor() {
        this.baseTones = [
            { name: 'Bb3', note: 'シ♭3', frequency: 233.08 },
            { name: 'C4',  note: 'ド4',   frequency: 261.63 },
            { name: 'Db4', note: 'レ♭4', frequency: 277.18 },
            { name: 'D4',  note: 'レ4',   frequency: 293.66 },
            { name: 'Eb4', note: 'ミ♭4', frequency: 311.13 },
            { name: 'E4',  note: 'ミ4',   frequency: 329.63 },
            { name: 'F4',  note: 'ファ4', frequency: 349.23 },
            { name: 'Gb4', note: 'ソ♭4', frequency: 369.99 },
            { name: 'G4',  note: 'ソ4',   frequency: 392.00 },
            { name: 'Ab4', note: 'ラ♭4', frequency: 415.30 }
        ];
        
        this.currentBaseTone = null;
        this.targetNotes = [];
        console.log('🎲 BaseToneManager初期化');
    }

    selectRandomBaseTone() {
        const randomIndex = Math.floor(Math.random() * this.baseTones.length);
        this.currentBaseTone = this.baseTones[randomIndex];
        
        // 基音に対応するドレミファソラシドの周波数を計算
        const baseFreq = this.currentBaseTone.frequency;
        this.targetNotes = [
            { name: 'ド', frequency: baseFreq },
            { name: 'レ', frequency: baseFreq * Math.pow(2, 2/12) },
            { name: 'ミ', frequency: baseFreq * Math.pow(2, 4/12) },
            { name: 'ファ', frequency: baseFreq * Math.pow(2, 5/12) },
            { name: 'ソ', frequency: baseFreq * Math.pow(2, 7/12) },
            { name: 'ラ', frequency: baseFreq * Math.pow(2, 9/12) },
            { name: 'シ', frequency: baseFreq * Math.pow(2, 11/12) },
            { name: 'ド', frequency: baseFreq * 2 }
        ];
        
        console.log(`🎲 基音選択: ${this.currentBaseTone.note} (${this.currentBaseTone.frequency}Hz)`);
        return this.currentBaseTone;
    }

    async playBaseTone() {
        if (!this.currentBaseTone) return;
        
        try {
            // Tone.jsで基音を再生
            if (window.Tone) {
                await window.Tone.start();
                
                const synth = new window.Tone.Synth().toDestination();
                synth.triggerAttackRelease(this.currentBaseTone.name, '2.5s');
                
                console.log(`🔊 基音再生: ${this.currentBaseTone.note}`);
            }
        } catch (error) {
            console.error('❌ 基音再生エラー:', error);
            throw error;
        }
    }
}

// メインアプリケーションクラス
class SimplePitchTraining {
    constructor() {
        this.microphone = new MicrophoneManager();
        this.pitchDetector = new PitchDetectionManager();
        this.baseToneManager = new BaseToneManager();
        
        this.state = {
            currentNote: 0,
            results: [],
            isRecording: false,
            isCompleted: false
        };
        
        // 設計原則: 事前準備完了フラグ
        this.isReady = false;
        
        this.elements = {
            frequency: document.getElementById('frequency'),
            progress: document.getElementById('progress'),
            currentNote: document.getElementById('current-note'),
            startBtn: document.getElementById('start-btn'),
            results: document.getElementById('results'),
            noteResults: document.getElementById('note-results'),
            finalScore: document.getElementById('final-score'),
            retryBtn: document.getElementById('retry-btn')
        };
        
        this.initializeEvents();
        console.log('🎵 SimplePitchTraining初期化完了');
    }

    initializeEvents() {
        console.log('🎮 イベントハンドラ初期化');
        this.elements.startBtn.addEventListener('click', () => {
            console.log('🎹 スタートボタンクリック検出');
            this.start();
        });
        this.elements.retryBtn.addEventListener('click', () => this.retry());
    }

    async start() {
        try {
            console.log('🎹 スタートボタンが押されました');
            
            // 設計原則: 事前準備完了チェック
            if (!this.isReady) {
                showMicrophoneNotReadyError();
                return;
            }
            
            // 設計原則: 基音再生専用処理
            console.log('🎲 基音選択開始');
            this.baseToneManager.selectRandomBaseTone();
            
            console.log('🔊 基音再生開始');
            await this.baseToneManager.playBaseTone();
            
            // 測定開始
            console.log('📊 測定開始');
            this.startMeasurement();
            
        } catch (error) {
            console.error('❌ start()でエラー:', error);
            showPitchyInitializationError();
        }
    }

    startMeasurement() {
        this.state.isRecording = true;
        this.state.currentNote = 0;
        this.state.results = [];
        
        this.elements.startBtn.style.display = 'none';
        this.updateProgress();
        
        // 音程検出ループ開始
        this.detectionLoop();
    }

    detectionLoop() {
        if (!this.state.isRecording) return;
        
        const audioData = this.microphone.getFrequencyData();
        if (audioData) {
            const frequency = this.pitchDetector.detectPitch(audioData);
            
            if (frequency) {
                this.elements.frequency.textContent = `${frequency.toFixed(1)} Hz`;
                this.updateFrequencyDisplay(frequency);
                
                // 現在の音階と比較
                const currentTarget = this.baseToneManager.targetNotes[this.state.currentNote];
                if (this.isNoteCorrect(frequency, currentTarget.frequency)) {
                    this.onNoteCorrect();
                }
            }
        }
        
        // 次のフレームで継続
        requestAnimationFrame(() => this.detectionLoop());
    }

    isNoteCorrect(detectedFreq, targetFreq) {
        // オクターブ補正: 1/2, 1, 2倍の周波数をチェック
        const frequencies = [
            detectedFreq / 2,  // 1オクターブ下
            detectedFreq,      // 同じオクターブ
            detectedFreq * 2   // 1オクターブ上
        ];
        
        for (const freq of frequencies) {
            const cents = 1200 * Math.log2(freq / targetFreq);
            if (Math.abs(cents) < 50) { // ±50セント以内で正解
                return true;
            }
        }
        return false;
    }

    onNoteCorrect() {
        const currentTarget = this.baseToneManager.targetNotes[this.state.currentNote];
        this.state.results.push({
            note: currentTarget.name,
            correct: true
        });
        
        this.state.currentNote++;
        
        if (this.state.currentNote >= this.baseToneManager.targetNotes.length) {
            this.completeTraining();
        } else {
            this.updateProgress();
        }
    }

    updateProgress() {
        const currentTarget = this.baseToneManager.targetNotes[this.state.currentNote];
        this.elements.progress.textContent = `${this.state.currentNote + 1}/8`;
        this.elements.currentNote.textContent = `${currentTarget.name} を発声してください`;
    }

    updateFrequencyDisplay(frequency) {
        const currentTarget = this.baseToneManager.targetNotes[this.state.currentNote];
        const cents = 1200 * Math.log2(frequency / currentTarget.frequency);
        const accuracy = Math.max(0, Math.min(100, 100 - Math.abs(cents)));
        
        this.elements.frequency.style.backgroundSize = `100% ${accuracy}%`;
    }

    completeTraining() {
        this.state.isRecording = false;
        this.state.isCompleted = true;
        
        this.microphone.stop();
        this.showResults();
    }

    showResults() {
        this.elements.results.style.display = 'block';
        
        // 各音階の結果表示
        this.elements.noteResults.innerHTML = '';
        this.state.results.forEach(result => {
            const div = document.createElement('div');
            div.className = 'note-result';
            div.innerHTML = `
                <span class="note-name">${result.note}</span>
                <span class="result-status correct">✓</span>
            `;
            this.elements.noteResults.appendChild(div);
        });
        
        // 最終スコア表示
        const score = this.state.results.length;
        const scoreText = `${score}/8 正解`;
        
        this.elements.finalScore.textContent = scoreText;
        
        if (score === 8) {
            this.elements.finalScore.className = 'final-score excellent';
        } else if (score >= 6) {
            this.elements.finalScore.className = 'final-score good';
        } else {
            this.elements.finalScore.className = 'final-score practice';
        }
    }

    retry() {
        this.elements.results.style.display = 'none';
        this.elements.startBtn.style.display = 'block';
        this.elements.startBtn.disabled = false;
        this.elements.startBtn.textContent = '🎹 スタート';
        
        this.elements.frequency.textContent = '--- Hz';
        this.elements.frequency.style.backgroundSize = '100% 0%';
        this.elements.progress.textContent = 'スタートボタンを押してください';
        this.elements.currentNote.textContent = '---';
        
        this.state = {
            currentNote: 0,
            results: [],
            isRecording: false,
            isCompleted: false
        };
        
        this.microphone.stop();
    }
}

// 標準エラーダイアログ関数 (ERROR_DIALOG_SPECIFICATION.md準拠)
const showMicrophonePermissionError = () => {
    alert('マイクの使用が許可されていません。\n\nブラウザの設定でマイクアクセスを許可してから、ページを再読み込みしてください。');
};

const showMicrophoneNotFoundError = () => {
    if (confirm('マイクが見つかりません。\n\nマイクを接続してから再読み込みしますか？')) {
        location.reload();
    }
};

const showMicrophoneInUseError = () => {
    if (confirm('マイクが他のアプリケーションで使用されています。\n\n他のアプリを終了してから再読み込みしますか？')) {
        location.reload();
    }
};

const showMicrophoneNotReadyError = () => {
    if (confirm('マイクの準備ができていません。\n\nページを再読み込みしてマイクを許可しますか？')) {
        location.reload();
    }
};

const showPitchyInitializationError = () => {
    if (confirm('音程検出の初期化に失敗しました。\n\nページを再読み込みしますか？')) {
        location.reload();
    }
};

// エラーハンドリング統一関数
const handleError = (error) => {
    console.error('❌ エラー発生:', error);
    
    switch (error.name) {
        case 'NotAllowedError':
            showMicrophonePermissionError();
            break;
        case 'NotFoundError':
            showMicrophoneNotFoundError();
            break;
        case 'NotReadableError':
            showMicrophoneInUseError();
            break;
        default:
            showPitchyInitializationError();
    }
};

// アプリケーション開始
const initializeApp = () => {
    console.log('🎵 Simple Pitch Training v2.0.0 開始');
    console.log('📱 DOM読み込み完了');
    
    // 必要な要素の存在確認
    const startBtn = document.getElementById('start-btn');
    if (!startBtn) {
        console.error('❌ スタートボタンが見つかりません');
        alert('ページの読み込みに問題があります。再読み込みしてください。');
        return;
    }
    console.log('✅ スタートボタン要素確認完了');
    
    // Tone.jsとPitchyの読み込み確認
    const checkLibraries = () => {
        console.log('📚 ライブラリ確認中...');
        console.log('Tone.js:', !!window.Tone);
        console.log('PitchDetector:', !!window.PitchDetector);
        
        if (window.Tone && window.PitchDetector) {
            console.log('✅ 全ライブラリ読み込み完了');
            try {
                // 設計原則に従って事前準備を実行
                initializeWithPreparation();
            } catch (error) {
                console.error('❌ アプリケーション初期化エラー:', error);
                alert('アプリケーションの初期化に失敗しました: ' + error.message);
            }
        } else {
            console.log('⏳ ライブラリ読み込み待機中...');
            setTimeout(checkLibraries, 100);
        }
    };
    
    checkLibraries();
};

// 設計原則に従った事前準備付き初期化
const initializeWithPreparation = async () => {
    console.log('🚀 事前準備開始');
    
    try {
        // アプリケーションインスタンス作成
        const app = new SimplePitchTraining();
        
        // 事前準備: マイク初期化
        console.log('🎤 マイク事前準備開始');
        await app.microphone.requestAccess();
        
        // 事前準備: 音程検出初期化
        console.log('🎵 音程検出事前準備開始');
        await app.pitchDetector.initialize(app.microphone.audioContext);
        
        // 準備完了
        app.isReady = true;
        console.log('✅ 事前準備完了 - アプリケーション使用可能');
        
        // グローバル変数に設定（スタートボタンからアクセス可能にする）
        window.pitchTrainingApp = app;
        
    } catch (error) {
        console.error('❌ 事前準備失敗:', error);
        handleError(error);
    }
};

// DOMの状態に関係なく実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}