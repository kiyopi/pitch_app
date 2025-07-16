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
        
        // ノイズリダクション設定追加
        this.noiseReduction = {
            enabled: true,
            highPassFilter: null,
            lowPassFilter: null,
            notchFilter: null,
            gainNode: null
        };
        
        console.log('🎤 MicrophoneManager初期化（ノイズリダクション対応）');
    }

    async requestAccess() {
        try {
            console.log('🎤 マイク許可要求開始');
            
            // AudioContext初期化（suspended状態のまま）
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('🎵 AudioContext初期化完了:', this.audioContext.state);
            
            // ⚠️ AudioContext.resume()はユーザーインタラクション時まで延期
            // Chrome 66以降、ユーザーインタラクション前のresume()は制限されるため
            console.log('📌 AudioContext.resume()はスタートボタン押下時に実行します');
            
            // マイクアクセス要求（AudioContextの状態に関係なく実行可能）
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            console.log('🎤 マイクストリーム取得成功');
            
            // アナライザー設定
            this.analyzer = this.audioContext.createAnalyser();
            this.analyzer.fftSize = 2048;
            this.analyzer.smoothingTimeConstant = 0.3;
            console.log('📊 アナライザー設定完了 (fftSize: 2048)');
            
            // ノイズリダクションフィルター初期化
            console.log('🔧 ノイズリダクションフィルター初期化開始');
            
            // AudioContextが完全に準備完了するまで少し待機
            if (this.audioContext.state !== 'running') {
                console.log('🕰️ AudioContextがまだrunning状態ではありません、少し待機...');
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            await this.initNoiseReductionFilters();
            
            // フィルターチェーン接続（ノイズリダクション対応）
            const source = this.audioContext.createMediaStreamSource(this.stream);
            console.log('🔗 メディアストリームソース作成完了');
            this.connectNoiseReductionChain(source, this.analyzer);
            
            this.isActive = true;
            console.log('✅ マイク許可成功（ノイズリダクション付き）');
            console.log('🔧 最終状態確認:');
            console.log('  - isActive:', this.isActive);
            console.log('  - audioContext.state:', this.audioContext.state);
            console.log('  - noiseReduction.enabled:', this.noiseReduction.enabled);
            console.log('  - フィルター存在:', !!this.noiseReduction.highPassFilter);
            
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

    async initNoiseReductionFilters() {
        console.log('🔧 initNoiseReductionFilters() 呼び出し開始');
        console.log('  - audioContext:', !!this.audioContext);
        console.log('  - audioContext.state:', this.audioContext?.state);
        console.log('  - noiseReduction.enabled:', this.noiseReduction.enabled);
        
        if (!this.audioContext || !this.noiseReduction.enabled) {
            console.log('🔇 ノイズリダクション無効');
            return;
        }
        
        // AudioContextが正常な状態か確認
        if (this.audioContext.state === 'closed') {
            console.log('❌ AudioContextがクローズされています');
            this.noiseReduction.enabled = false;
            return;
        }
        
        // AudioContextがsuspended状態の場合は警告のみ（ユーザーインタラクション時に再開）
        if (this.audioContext.state === 'suspended') {
            console.log('📌 AudioContext suspended状態 - ユーザーインタラクション時に再開されます');
            // フィルター作成は可能なのでそのまま続行
        }
        
        try {
            console.log('🔧 フィルター作成開始...');
            
            // ハイパスフィルター: 23-25Hz低周波ノイズ対策
            this.noiseReduction.highPassFilter = this.audioContext.createBiquadFilter();
            this.noiseReduction.highPassFilter.type = 'highpass';
            this.noiseReduction.highPassFilter.frequency.setValueAtTime(80, this.audioContext.currentTime);
            this.noiseReduction.highPassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);
            console.log('✅ ハイパスフィルター作成成功');
            
            // ローパスフィルター: 高周波ノイズカット
            this.noiseReduction.lowPassFilter = this.audioContext.createBiquadFilter();
            this.noiseReduction.lowPassFilter.type = 'lowpass';
            this.noiseReduction.lowPassFilter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
            this.noiseReduction.lowPassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);
            console.log('✅ ローパスフィルター作成成功');
            
            // ノッチフィルター: 60Hz電源ノイズカット
            this.noiseReduction.notchFilter = this.audioContext.createBiquadFilter();
            this.noiseReduction.notchFilter.type = 'notch';
            this.noiseReduction.notchFilter.frequency.setValueAtTime(60, this.audioContext.currentTime);
            this.noiseReduction.notchFilter.Q.setValueAtTime(30, this.audioContext.currentTime);
            console.log('✅ ノッチフィルター作成成功');
            
            // ゲインノード: 音量最適化
            this.noiseReduction.gainNode = this.audioContext.createGain();
            this.noiseReduction.gainNode.gain.setValueAtTime(1.2, this.audioContext.currentTime);
            console.log('✅ ゲインノード作成成功');
            
            console.log('✅ ノイズリダクションフィルター初期化完了');
            console.log('  - ハイパス: 80Hz以下カット（23-25Hz低周波対策）');
            console.log('  - ローパス: 2kHz以上カット');
            console.log('  - ノッチ: 60Hz電源ノイズカット');
            console.log('  - ゲイン: 1.2倍');
            console.log('🔧 フィルター実在確認:');
            console.log('  - highPassFilter:', !!this.noiseReduction.highPassFilter);
            console.log('  - lowPassFilter:', !!this.noiseReduction.lowPassFilter);
            console.log('  - notchFilter:', !!this.noiseReduction.notchFilter);
            console.log('  - gainNode:', !!this.noiseReduction.gainNode);
            
        } catch (error) {
            console.error('❌ ノイズリダクション初期化失敗:', error);
            console.error('❌ エラー詳細:', error.message);
            console.error('❌ エラースタック:', error.stack);
            console.error('❌ AudioContext状態:', this.audioContext?.state);
            
            // フィルターをクリアして無効化
            this.noiseReduction.highPassFilter = null;
            this.noiseReduction.lowPassFilter = null;
            this.noiseReduction.notchFilter = null;
            this.noiseReduction.gainNode = null;
            this.noiseReduction.enabled = false;
            
            console.log('⚠️ ノイズリダクションを無効化しました (直接接続で継続)');
        }
    }

    connectNoiseReductionChain(inputNode, outputNode) {
        console.log('🔗 connectNoiseReductionChain() 呼び出し開始');
        console.log('  - noiseReduction.enabled:', this.noiseReduction.enabled);
        console.log('  - highPassFilter存在:', !!this.noiseReduction.highPassFilter);
        console.log('  - lowPassFilter存在:', !!this.noiseReduction.lowPassFilter);
        console.log('  - notchFilter存在:', !!this.noiseReduction.notchFilter);
        console.log('  - gainNode存在:', !!this.noiseReduction.gainNode);
        
        if (!this.noiseReduction.enabled || !this.noiseReduction.highPassFilter || 
            !this.noiseReduction.lowPassFilter || !this.noiseReduction.notchFilter || !this.noiseReduction.gainNode) {
            inputNode.connect(outputNode);
            console.log('🔗 ノイズリダクション無効 - 直接接続');
            console.log('ℹ️ 原因: enabled=' + this.noiseReduction.enabled + ', フィルター存在=' + 
                [!!this.noiseReduction.highPassFilter, !!this.noiseReduction.lowPassFilter, 
                 !!this.noiseReduction.notchFilter, !!this.noiseReduction.gainNode].join(','));
            return;
        }
        
        // フィルターチェーン構築: 入力 → ハイパス → ローパス → ノッチ → ゲイン → 出力
        try {
            inputNode.connect(this.noiseReduction.highPassFilter);
            console.log('✅ 入力 → ハイパス 接続成功');
            
            this.noiseReduction.highPassFilter.connect(this.noiseReduction.lowPassFilter);
            console.log('✅ ハイパス → ローパス 接続成功');
            
            this.noiseReduction.lowPassFilter.connect(this.noiseReduction.notchFilter);
            console.log('✅ ローパス → ノッチ 接続成功');
            
            this.noiseReduction.notchFilter.connect(this.noiseReduction.gainNode);
            console.log('✅ ノッチ → ゲイン 接続成功');
            
            this.noiseReduction.gainNode.connect(outputNode);
            console.log('✅ ゲイン → 出力 接続成功');
            
        } catch (error) {
            console.error('❌ フィルターチェーン接続エラー:', error);
            console.error('❌ フォールバック: 直接接続で継続');
            inputNode.connect(outputNode);
            return;
        }
        
        console.log('🔗 ノイズリダクションチェーン接続完了');
        console.log('🔧 フィルターチェーン接続状況:');
        console.log('  - 入力ノード → ハイパス → ローパス → ノッチ → ゲイン → 出力ノード');
        console.log('  - 全フィルター接続完了');
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
                
                // 既存実装準拠: Salamander Grand Piano使用
                const sampler = new window.Tone.Sampler({
                    urls: {
                        "C4": "C4.mp3",
                        "D#4": "Ds4.mp3", 
                        "F#4": "Fs4.mp3",
                        "A4": "A4.mp3",
                    },
                    release: 0.5,
                    attack: 0.01,
                    volume: 6,
                    baseUrl: "https://tonejs.github.io/audio/salamander/"
                }).toDestination();

                // サンプル読み込み待機
                await window.Tone.loaded();

                // 既存実装準拠: triggerAttack + 自動リリース
                sampler.triggerAttack(this.currentBaseTone.name, undefined, 0.8);

                // 2秒後にリリース開始（既存タイミング）
                setTimeout(() => {
                    sampler.triggerRelease(this.currentBaseTone.name);
                }, 2000);

                // 2.7秒後に完全停止（永続再生防止）
                setTimeout(() => {
                    sampler.releaseAll();
                }, 2700);
                
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
            
            // ユーザーインタラクション時のAudioContext.resume()
            if (this.microphone.audioContext && this.microphone.audioContext.state === 'suspended') {
                console.log('🔄 ユーザーインタラクション時のAudioContext.resume()実行');
                await this.microphone.audioContext.resume();
                console.log('✅ AudioContext再開完了:', this.microphone.audioContext.state);
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
                
                // 💡 オクターブ補正システム復活後のデバッグログ
                console.log(`🔍 Pitchy生検出値: ${frequency.toFixed(1)}Hz, 目標: ${currentTarget.frequency.toFixed(1)}Hz (${currentTarget.name})`);
                
                if (this.isNoteCorrect(frequency, currentTarget.frequency)) {
                    console.log('✅ 正解判定!');
                    this.onNoteCorrect();
                }
            }
        }
        
        // 次のフレームで継続
        requestAnimationFrame(() => this.detectionLoop());
    }

    isNoteCorrect(detectedFreq, targetFreq) {
        // 💡 オクターブ補正システム復活（低音域検出問題解決）
        const targetFrequencies = this.baseToneManager.targetNotes.map(note => note.frequency);
        const minTargetFreq = Math.min(...targetFrequencies);
        const maxTargetFreq = Math.max(...targetFrequencies);
        
        const correctionThreshold = maxTargetFreq * 0.55;
        const correctedMin = minTargetFreq * 0.8;
        const correctedMax = maxTargetFreq * 1.2;
        
        let checkFreq = detectedFreq;
        let correctionApplied = false;
        
        if (detectedFreq < correctionThreshold && 
            detectedFreq * 2 >= correctedMin && 
            detectedFreq * 2 <= correctedMax) {
            checkFreq = detectedFreq * 2;
            correctionApplied = true;
        }
        
        const cents = 1200 * Math.log2(checkFreq / targetFreq);
        const isCorrect = Math.abs(cents) < 50;
        
        console.log(`🎯 判定: ${detectedFreq.toFixed(1)}Hz${correctionApplied ? ` → ${checkFreq.toFixed(1)}Hz(補正後)` : ''} vs ${targetFreq.toFixed(1)}Hz, 誤差: ${cents.toFixed(1)}¢, 結果: ${isCorrect ? '✅正解' : '❌不正解'}`);
        
        return isCorrect;
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
        
        // マイクは停止せず、音程検出のみリセット
        // this.microphone.stop(); // ← 再スタート時にマイク再初期化が必要になるため削除
        console.log('🔄 リトライ準備完了 - マイクは継続使用');
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
        try {
            await app.microphone.requestAccess();
            console.log('✅ マイク初期化完了');
        } catch (error) {
            console.error('❌ マイク初期化失敗:', error);
            throw error; // 上位のcatchに再throw
        }
        
        // 事前準備: 音程検出初期化
        console.log('🎵 音程検出事前準備開始');
        try {
            await app.pitchDetector.initialize(app.microphone.audioContext);
            console.log('✅ 音程検出初期化完了');
        } catch (error) {
            console.error('❌ 音程検出初期化失敗:', error);
            throw error; // 上位のcatchに再throw
        }
        
        // 準備完了
        app.isReady = true;
        console.log('✅ 事前準備完了 - アプリケーション使用可能');
        
        // ノイズリダクション最終状態確認
        console.log('🔍 ノイズリダクション最終状態確認:');
        console.log('  - enabled:', app.microphone.noiseReduction.enabled);
        console.log('  - highPassFilter:', !!app.microphone.noiseReduction.highPassFilter);
        console.log('  - lowPassFilter:', !!app.microphone.noiseReduction.lowPassFilter);
        console.log('  - notchFilter:', !!app.microphone.noiseReduction.notchFilter);
        console.log('  - gainNode:', !!app.microphone.noiseReduction.gainNode);
        
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