class FullScaleTraining {
    constructor() {
        console.log('🎵 FullScaleTraining v1.0.0 初期化開始');
        
        // 基本プロパティ（simple-pitch-testからコピー）
        this.audioContext = null;
        this.analyzer = null;
        this.microphone = null;
        this.mediaStream = null;
        this.isRunning = false;
        this.frameCount = 0;
        
        
        // 8音階データ
        this.targetNotes = ['ド4', 'レ4', 'ミ4', 'ファ4', 'ソ4', 'ラ4', 'シ4', 'ド5'];
        this.targetFrequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
        this.currentNoteIndex = 0;
        
        // 判定設定
        this.accuracyThreshold = 20; // ±20セント以内で正解
        this.results = []; // 各音程の結果を記録
        
        // アニメーション設定
        this.isAnimating = false;
        this.animationSpeed = 600; // 各音程600ms
        this.baseToneDuration = 1500; // 基音再生時間1.5秒
        
        // 基音再生用
        this.referenceOscillator = null;
        this.referenceGain = null;
        
        // ノイズリダクション機能
        this.noiseReduction = {
            enabled: true,
            lowPassFilter: null,
            highPassFilter: null,
            notchFilter: null,
            gainNode: null
        };
        
        
        // Pitchy (McLeod Pitch Method)
        this.pitchDetector = null;
        
        // 状態管理
        this.trainingPhase = 'waiting'; // waiting, playing, animating, completed
        
        // 初期化
        this.setupEventListeners();
        this.log('🎵 FullScaleTraining v1.0.0 初期化完了');
    }
    
    initNoiseReductionFilters() {
        if (!this.audioContext || !this.noiseReduction.enabled) {
            this.log('🔇 ノイズリダクション無効または AudioContext なし');
            return null;
        }
        
        this.log('🎛️ ノイズリダクションフィルター初期化開始');
        
        try {
            // ハイパスフィルター: 低周波ノイズ（エアコン、ファンなど）をカット
            this.noiseReduction.highPassFilter = this.audioContext.createBiquadFilter();
            this.noiseReduction.highPassFilter.type = 'highpass';
            this.noiseReduction.highPassFilter.frequency.setValueAtTime(80, this.audioContext.currentTime); // 80Hz以下カット
            this.noiseReduction.highPassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);
            
            // ローパスフィルター: 高周波ノイズをカット
            this.noiseReduction.lowPassFilter = this.audioContext.createBiquadFilter();
            this.noiseReduction.lowPassFilter.type = 'lowpass';
            this.noiseReduction.lowPassFilter.frequency.setValueAtTime(2000, this.audioContext.currentTime); // 2kHz以上カット
            this.noiseReduction.lowPassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);
            
            // ノッチフィルター: 60Hz電源ノイズをカット
            this.noiseReduction.notchFilter = this.audioContext.createBiquadFilter();
            this.noiseReduction.notchFilter.type = 'notch';
            this.noiseReduction.notchFilter.frequency.setValueAtTime(60, this.audioContext.currentTime); // 60Hzノイズカット
            this.noiseReduction.notchFilter.Q.setValueAtTime(30, this.audioContext.currentTime); // 狭い範囲でカット
            
            // ゲインノード: 音量調整
            this.noiseReduction.gainNode = this.audioContext.createGain();
            this.noiseReduction.gainNode.gain.setValueAtTime(1.2, this.audioContext.currentTime); // 少し音量を上げる
            
            this.log('✅ ノイズリダクションフィルター初期化完了');
            this.log(`  - ハイパス: 80Hz以下カット`);
            this.log(`  - ローパス: 2kHz以上カット`);
            this.log(`  - ノッチ: 60Hz電源ノイズカット`);
            this.log(`  - ゲイン: 1.2倍`);
            
            return this.noiseReduction.highPassFilter; // 最初のフィルターを返す
            
        } catch (error) {
            this.log(`❌ ノイズリダクションフィルター初期化エラー: ${error.message}`);
            this.noiseReduction.enabled = false;
            return null;
        }
    }
    
    connectNoiseReductionChain(inputNode, outputNode) {
        if (!this.noiseReduction.enabled || !this.noiseReduction.highPassFilter) {
            // ノイズリダクション無効の場合は直接接続
            inputNode.connect(outputNode);
            this.log('🔗 ノイズリダクション無効 - 直接接続');
            return;
        }
        
        // フィルターチェーンを構築
        // 入力 → ハイパス → ローパス → ノッチ → ゲイン → 出力
        inputNode.connect(this.noiseReduction.highPassFilter);
        this.noiseReduction.highPassFilter.connect(this.noiseReduction.lowPassFilter);
        this.noiseReduction.lowPassFilter.connect(this.noiseReduction.notchFilter);
        this.noiseReduction.notchFilter.connect(this.noiseReduction.gainNode);
        this.noiseReduction.gainNode.connect(outputNode);
        
        this.log('🔗 ノイズリダクションチェーン接続完了');
        this.log('  マイク → ハイパス → ローパス → ノッチ → ゲイン → アナライザー');
    }
    
    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => {
            console.log('🔘 start-btnがクリックされました');
            this.log('🔘 start-btnクリック - トレーニング開始処理開始');
            this.startTraining();
        });
        
        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopTraining();
        });
        
        document.getElementById('main-start-btn').addEventListener('click', () => {
            this.playReferenceAndStartAnimation();
        });
        
    }
    
    
    
    async startTraining() {
        try {
            this.log('🚀 フルスケールトレーニング開始...');
            console.log('🚀 startTraining() メソッド実行開始');
            
            // UI更新
            this.log('📱 UI要素の表示を更新中...');
            document.getElementById('start-btn').style.display = 'none';
            document.getElementById('stop-btn').style.display = 'inline-block';
            document.getElementById('progress-section').style.display = 'block';
            document.getElementById('guide-section').style.display = 'block';
            document.getElementById('frequency-display').style.display = 'block';
            this.log('✅ UI要素表示更新完了');
            
            // メインスタートボタンを準備中状態で表示
            const mainStartBtn = document.getElementById('main-start-btn');
            mainStartBtn.style.display = 'inline-block';
            mainStartBtn.disabled = true;
            mainStartBtn.style.opacity = '0.6';
            mainStartBtn.textContent = '🔍 Loading...';
            mainStartBtn.style.animation = 'none';
            
            
            // AudioContext初期化
            this.log('🎵 AudioContext初期化開始');
            await this.initAudioContext();
            this.log('✅ AudioContext初期化完了');
            
            // マイクアクセス（simple-pitch-test成功手法）
            this.log('🎤 マイクアクセス開始');
            await this.initMicrophone();
            this.log('✅ マイクアクセス完了');
            
            // isRunningを先に設定
            this.isRunning = true;
            
            // 周波数検出開始
            this.startFrequencyDetection();
            
            // 初期表示更新
            this.updateProgress();
            
            // 初期化完了後にメインスタートボタンを表示
            this.showMainStartButton();
            
            this.trainingPhase = 'waiting';
            this.log('✅ トレーニング開始成功');
            
        } catch (error) {
            console.error('❌ startTraining()でエラーが発生:', error);
            this.log(`❌ startTraining()エラー: ${error.message}`);
            this.log(`❌ エラー詳細: ${error.stack}`);
            this.resetUI();
        }
    }
    
    async initAudioContext() {
        this.log('🎛️ AudioContext初期化中...');
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            this.log('🔄 AudioContext再開完了');
        }
        
        this.log(`✅ AudioContext: ${this.audioContext.state}`);
    }
    
    initPitchDetector() {
        if (typeof window.PitchDetector !== 'undefined') {
            try {
                // Pitchy PitchDetectorクラスの正しい初期化方法
                // FFTサイズと同じ長さのFloat32Array用のDetectorを作成
                this.pitchDetector = window.PitchDetector.forFloat32Array(this.analyzer.fftSize);
                this.log('🎯 Pitchy PitchDetector初期化完了 (fftSize: ' + this.analyzer.fftSize + ')');
            } catch (error) {
                this.log(`❌ PitchDetector初期化エラー: ${error.message}`);
                this.pitchDetector = null;
            }
        } else {
            this.log('⚠️ Pitchyライブラリが見つかりません - フォールバック使用');
        }
    }
    
    async initMicrophone() {
        this.log('🎤 マイクアクセス要求中...');
        
        // simple-pitch-test成功手法
        const constraints = { audio: true };
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.log(`📡 マイクストリーム取得成功 (ID: ${this.mediaStream.id})`);
        
        // アナライザー設定（フィルター後用）
        this.analyzer = this.audioContext.createAnalyser();
        this.analyzer.fftSize = 2048;
        this.analyzer.smoothingTimeConstant = 0.1;
        this.analyzer.minDecibels = -100;
        this.analyzer.maxDecibels = -10;
        
        
        // マイク接続（ノイズリダクション経由）
        this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        
        // ノイズリダクションフィルター初期化
        this.initNoiseReductionFilters();
        
        // ノイズリダクションチェーンでマイクとアナライザーを接続
        this.connectNoiseReductionChain(this.microphone, this.analyzer);
        
        // PitchDetector初期化（analyzerが作成された後）
        this.initPitchDetector();
        
        // 出力先接続（Safari対応）
        const outputGain = this.audioContext.createGain();
        outputGain.gain.value = 0;
        this.analyzer.connect(outputGain);
        outputGain.connect(this.audioContext.destination);
        
        this.log('🔌 ノイズリダクション付きマイク接続完了');
    }
    
    updateProgress() {
        const progressElement = document.getElementById('progress-display');
        const noteElement = document.getElementById('current-note');
        const freqElement = document.getElementById('target-freq');
        
        if (this.currentNoteIndex < this.targetNotes.length) {
            const currentNote = this.targetNotes[this.currentNoteIndex];
            const currentFreq = this.targetFrequencies[this.currentNoteIndex];
            
            progressElement.textContent = `${this.currentNoteIndex + 1}/8`;
            noteElement.textContent = `♪ ${currentNote} ♪`;
            freqElement.textContent = `目標: ${Math.round(currentFreq)} Hz`;
            
            this.log(`🎵 現在の目標: ${currentNote} (${Math.round(currentFreq)}Hz)`);
        }
    }
    
    
    showMainStartButton() {
        this.log('🔍 オーディオシステム初期化完了 - 基音ボタンを有効化');
        
        // メインスタートボタンを有効化（準備完了後）
        const mainStartBtn = document.getElementById('main-start-btn');
        mainStartBtn.disabled = false;
        mainStartBtn.style.opacity = '1';
        mainStartBtn.textContent = '🎹 基音を聞いてスタート！';
        
        
        // ボタンにパルスアニメーションを追加（準備完了の視覚的フィードバック）
        mainStartBtn.style.animation = 'pulse 2s infinite';
        
        this.log('✅ 基音ボタンがクリック可能になりました');
    }
    
    playReferenceAndStartAnimation() {
        if (this.trainingPhase !== 'waiting') {
            this.log('⚠️ まだ前のアニメーションが実行中です');
            return;
        }
        
        this.log('🔊 基音再生とアニメーション準備');
        this.trainingPhase = 'playing';
        
        // ボタンを無効化（重複クリック防止）、アニメーション停止
        const startButton = document.getElementById('main-start-btn');
        if (startButton) {
            startButton.disabled = true;
            startButton.style.opacity = '0.5';
            startButton.style.animation = 'none'; // パルスアニメーション停止
            startButton.textContent = '🎵 基音再生中...'; // テキスト変更
        }
        
        // Do4基音再生
        this.playReferenceNote();
        
        
        // 基音終了と同時にアニメーション開始
        setTimeout(() => {
            this.startGuideAnimation();
        }, this.baseToneDuration);
    }
    
    playReferenceNote() {
        const frequency = 261.63; // Do4
        const startTimestamp = performance.now();
        this.log(`🔊 Do4 (${Math.round(frequency)}Hz) ピアノ音再生開始`);
        
        // AudioContextの状態確認
        if (this.audioContext.state === 'suspended') {
            this.log('⚠️ AudioContext が suspended 状態です');
            this.audioContext.resume();
        }
        
        // 既存の再生を停止
        this.stopReferenceNote();
        
        // ピアノらしい音を作るための複合波形（基音+倍音）
        const harmonics = [
            { freq: frequency, gain: 1.0, type: 'triangle' },      // 基音（三角波でより温かい音）
            { freq: frequency * 2, gain: 0.4, type: 'sine' },      // 2倍音
            { freq: frequency * 3, gain: 0.25, type: 'sine' },     // 3倍音
            { freq: frequency * 4, gain: 0.15, type: 'sine' },     // 4倍音
            { freq: frequency * 5, gain: 0.08, type: 'sine' },     // 5倍音
        ];
        
        // 複数のオシレーターとゲインノードを保存する配列
        this.referenceOscillators = [];
        this.referenceGains = [];
        
        // メインゲインノード（全体の音量制御）
        this.referenceMainGain = this.audioContext.createGain();
        
        const startTime = this.audioContext.currentTime;
        const duration = this.baseToneDuration / 1000; // 1.5秒（ms→秒変換）
        
        // ピアノらしいADSRエンベロープ - 即座に開始
        this.referenceMainGain.gain.setValueAtTime(0, startTime);
        this.referenceMainGain.gain.linearRampToValueAtTime(0.7, startTime + 0.005);  // より鋭く大きなアタック
        this.referenceMainGain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.2); // より早いディケイ
        this.referenceMainGain.gain.exponentialRampToValueAtTime(0.15, startTime + 1.0); // サスティン
        this.referenceMainGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // リリース
        
        // 各倍音のオシレーターを作成
        harmonics.forEach((harmonic, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // オシレーター設定
            oscillator.frequency.setValueAtTime(harmonic.freq, startTime);
            oscillator.type = harmonic.type;
            
            // 倍音ごとの音量設定
            gainNode.gain.setValueAtTime(harmonic.gain, startTime);
            
            // 高次倍音は早めに減衰させる（よりリアルなピアノ音）
            if (index > 1) {
                gainNode.gain.exponentialRampToValueAtTime(harmonic.gain * 0.1, startTime + 0.6);
            }
            
            // 接続
            oscillator.connect(gainNode);
            gainNode.connect(this.referenceMainGain);
            
            // 配列に保存
            this.referenceOscillators.push(oscillator);
            this.referenceGains.push(gainNode);
            
            // 再生開始・停止 - 即座に開始
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
        
        // メインゲインを出力に接続
        this.referenceMainGain.connect(this.audioContext.destination);
        
        // 処理時間を計測
        const processingTime = performance.now() - startTimestamp;
        this.log(`⏱️ 基音準備完了: ${processingTime.toFixed(2)}ms`);
        
        // 終了時にクリーンアップ
        setTimeout(() => {
            this.stopReferenceNote();
        }, duration * 1000 + 100); // 少し余裕を持って
        
        this.log(`🎹 ピアノ音 Do4 (${harmonics.length}倍音合成) 再生中...`);
    }
    
    stopReferenceNote() {
        // 複数のオシレーターを停止
        if (this.referenceOscillators && this.referenceOscillators.length > 0) {
            this.referenceOscillators.forEach(oscillator => {
                try {
                    oscillator.stop();
                } catch (e) {
                    // 既に停止済みの場合は無視
                }
            });
            this.referenceOscillators = [];
        }
        
        // ゲインノードもクリア
        if (this.referenceGains && this.referenceGains.length > 0) {
            this.referenceGains = [];
        }
        
        // メインゲインもクリア
        if (this.referenceMainGain) {
            this.referenceMainGain = null;
        }
        
        // 旧形式との互換性のため
        if (this.referenceOscillator) {
            try {
                this.referenceOscillator.stop();
            } catch (e) {
                // 既に停止済みの場合は無視
            }
            this.referenceOscillator = null;
            this.referenceGain = null;
        }
    }
    
    startGuideAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.trainingPhase = 'animating';
        this.currentNoteIndex = 0; // アニメーション開始時にリセット
        
        this.log('🎼 ドレミファソラシド ガイドアニメーション開始');
        
        // メインスタートボタンをアニメーション中状態に変更
        const mainStartBtn = document.getElementById('main-start-btn');
        mainStartBtn.textContent = '🎵 ガイドに合わせて発声してください';
        mainStartBtn.disabled = true;
        mainStartBtn.style.opacity = '0.5';
        mainStartBtn.style.animation = 'none';
        
        const guideNotes = document.querySelectorAll('.guide-note');
        
        // すべてのガイドをリセット
        guideNotes.forEach(note => {
            note.classList.remove('current', 'completed', 'animate');
        });
        
        // 順次アニメーション
        this.targetNotes.forEach((noteName, index) => {
            setTimeout(() => {
                // 前の音程をクリア
                guideNotes.forEach(note => note.classList.remove('animate'));
                
                // 現在の音程をハイライト
                if (guideNotes[index]) {
                    guideNotes[index].classList.add('animate');
                    this.currentNoteIndex = index;
                    this.updateProgress();
                    
                    this.log(`🎼 ガイド表示: ${noteName} (音声なし)`);
                }
                
                // 最後の音程の場合はアニメーション終了
                if (index === this.targetNotes.length - 1) {
                    setTimeout(() => {
                        this.completeAnimation();
                    }, this.animationSpeed);
                }
            }, index * this.animationSpeed);
        });
    }
    
    completeAnimation() {
        this.isAnimating = false;
        this.trainingPhase = 'completed';
        
        this.log('🎼 ガイドアニメーション完了');
        
        // ガイドリセット
        const guideNotes = document.querySelectorAll('.guide-note');
        guideNotes.forEach(note => {
            note.classList.remove('animate');
        });
        
        // メインスタートボタンを結果集計中状態に変更
        const mainStartBtn = document.getElementById('main-start-btn');
        if (mainStartBtn) {
            mainStartBtn.disabled = true;
            mainStartBtn.style.opacity = '0.6';
            mainStartBtn.textContent = '🎆 結果を集計中...'; // 集計中メッセージ
            mainStartBtn.style.animation = 'none';
        }
        
        // 2秒後に結果表示
        setTimeout(() => {
            this.showResults();
        }, 2000);
    }
    
    startFrequencyDetection() {
        this.log('📊 周波数検出ループ開始');
        
        const detectLoop = () => {
            if (!this.isRunning) {
                this.log('⚠️ 周波数検出停止: isRunning=false');
                return;
            }
            
            this.frameCount++;
            
            // データ取得
            const timeData = new Uint8Array(this.analyzer.fftSize);
            const freqData = new Float32Array(this.analyzer.frequencyBinCount);
            
            this.analyzer.getByteTimeDomainData(timeData);
            this.analyzer.getFloatFrequencyData(freqData);
            
            // 音量計算
            const volume = this.calculateVolume(timeData);
            
            // 周波数検出
            const frequency = this.detectPitch(freqData);
            
            // 周波数表示更新
            this.updateFrequencyDisplay(frequency);
            
            // アニメーション中の判定（内部処理のみ）
            if (this.trainingPhase === 'animating' && frequency > 0) {
                this.recordAccuracy(frequency);
            }
            
            
            requestAnimationFrame(detectLoop);
        };
        
        detectLoop();
    }
    
    calculateVolume(timeData) {
        let sum = 0;
        let maxAmplitude = 0;
        
        for (let i = 0; i < timeData.length; i++) {
            const sample = (timeData[i] - 128) / 128;
            sum += sample * sample;
            maxAmplitude = Math.max(maxAmplitude, Math.abs(sample));
        }
        
        const rms = Math.sqrt(sum / timeData.length);
        return Math.max(rms * 200, maxAmplitude * 100);
    }
    
    detectPitch(freqData) {
        // Pitchy PitchDetectorクラスを使用
        if (this.pitchDetector) {
            try {
                // 時間域データを取得（Pitchyは時間域データが必要）
                const timeData = new Float32Array(this.analyzer.fftSize);
                this.analyzer.getFloatTimeDomainData(timeData);
                
                // PitchDetectorで基音検出（倍音問題を自動解決）
                const result = this.pitchDetector.findPitch(timeData, this.audioContext.sampleRate);
                
                if (result && Array.isArray(result) && result.length >= 2) {
                    const [pitch, clarity] = result;
                    
                    // デバッグ: 検出結果をログ出力（フレームが多すぎるので条件付き）
                    if (this.frameCount % 60 === 0) { // 1秒に1回程度
                        this.log(`🔍 Pitchy検出: pitch=${pitch?.toFixed(1)}Hz, clarity=${clarity?.toFixed(3)}`);
                    }
                    
                    // オクターブエラー検出：周波数が半分の場合は2倍して修正（動的）
                    let correctedPitch = pitch;
                    if (pitch && pitch >= 80 && pitch <= 1200 && clarity > 0.1) {
                        // 現在の目標周波数範囲に基づく動的補正
                        const minTargetFreq = Math.min(...this.targetFrequencies); // 最低目標周波数
                        const maxTargetFreq = Math.max(...this.targetFrequencies); // 最高目標周波数
                        
                        // 補正しきい値：最高目標周波数の半分＋余裕(10%)
                        const correctionThreshold = maxTargetFreq * 0.55;
                        
                        // 補正後の範囲：最低目標の80%〜最高目標の120%
                        const correctedMin = minTargetFreq * 0.8;
                        const correctedMax = maxTargetFreq * 1.2;
                        
                        if (pitch < correctionThreshold && pitch * 2 >= correctedMin && pitch * 2 <= correctedMax) {
                            correctedPitch = pitch * 2;
                            
                            if (this.frameCount % 60 === 0) {
                                this.log(`🔧 動的オクターブ補正: ${pitch.toFixed(1)}Hz → ${correctedPitch.toFixed(1)}Hz (閾値: ${correctionThreshold.toFixed(1)}Hz)`);
                            }
                        }
                        
                        return correctedPitch;
                    }
                }
                
                return 0;
                
            } catch (error) {
                this.log(`❌ Pitchy エラー: ${error.message}`);
                return this.detectPitchFallback(freqData);
            }
        } else {
            // フォールバック：元の方法
            return this.detectPitchFallback(freqData);
        }
    }
    
    detectPitchFallback(freqData) {
        let maxIndex = 0;
        let maxValue = -Infinity;
        
        // 人声の周波数範囲をチェック（85Hz-1100Hz）
        const minBin = Math.floor(85 * freqData.length / (this.audioContext.sampleRate / 2));
        const maxBin = Math.floor(1100 * freqData.length / (this.audioContext.sampleRate / 2));
        
        for (let i = minBin; i < maxBin; i++) {
            if (freqData[i] > maxValue) {
                maxValue = freqData[i];
                maxIndex = i;
            }
        }
        
        if (maxValue < -70) return 0;
        
        const nyquist = this.audioContext.sampleRate / 2;
        const frequency = (maxIndex * nyquist) / freqData.length;
        
        return frequency;
    }
    
    updateFrequencyDisplay(frequency) {
        const element = document.getElementById('frequency-main');
        if (element) {
            if (frequency > 0) {
                element.textContent = `${Math.round(frequency)} Hz`;
                element.style.color = '#4CAF50';
                element.style.borderColor = '#4CAF50';
            } else {
                element.textContent = '--- Hz';
                element.style.color = '#999';
                element.style.borderColor = '#e0e0e0';
            }
        }
    }
    
    recordAccuracy(frequency) {
        if (this.currentNoteIndex >= this.targetNotes.length) return;
        
        const targetFreq = this.targetFrequencies[this.currentNoteIndex];
        const targetNote = this.targetNotes[this.currentNoteIndex];
        
        // セント計算
        const cents = 1200 * Math.log2(frequency / targetFreq);
        const centRounded = Math.round(cents);
        
        // 判定
        let accuracy = '';
        if (Math.abs(cents) <= 10) {
            accuracy = '完璧';
        } else if (Math.abs(cents) <= this.accuracyThreshold) {
            accuracy = '良い';
        } else {
            accuracy = '要調整';
        }
        
        // 結果を記録（同じ音程の複数回記録を避けるため、最後の記録のみ保持）
        const existingIndex = this.results.findIndex(r => r.note === targetNote);
        const result = {
            note: targetNote,
            targetFreq: targetFreq,
            actualFreq: frequency,
            cents: centRounded,
            accuracy: accuracy
        };
        
        if (existingIndex >= 0) {
            this.results[existingIndex] = result;
        } else {
            this.results.push(result);
        }
        
        // デバッグログ（60フレームごと、約1秒間隔）
        if (this.frameCount % 60 === 0) {
            this.log(`🎵 記録: ${targetNote} 周波数=${Math.round(frequency)}Hz, 誤差=${centRounded}¢, 判定=${accuracy}`);
        }
    }
    
    showResults() {
        this.log('🎊 全ての音程完了！結果を表示します');
        this.log(`📊 結果データ数: ${this.results.length}`);
        
        // マイクを自動でオフにする
        this.stopMicrophone();
        
        // UI切り替え
        document.getElementById('progress-section').style.display = 'none';
        document.getElementById('guide-section').style.display = 'none';
        document.getElementById('frequency-display').style.display = 'none'; // 周波数表示を非表示
        document.getElementById('results-section').style.display = 'block';
        
        // メインスタートボタンを結果表示状態に変更
        const mainStartBtn = document.getElementById('main-start-btn');
        mainStartBtn.textContent = '🎉 トレーニング完了！';
        mainStartBtn.disabled = true;
        mainStartBtn.style.opacity = '0.6';
        mainStartBtn.style.animation = 'none';
        
        // 停止ボタンを「再開始」に変更
        const stopBtn = document.getElementById('stop-btn');
        stopBtn.textContent = '再開始';
        stopBtn.style.background = 'linear-gradient(145deg, #4CAF50, #45a049)';
        
        // 統計計算
        const perfectCount = this.results.filter(r => r.accuracy === '完璧').length;
        const goodCount = this.results.filter(r => r.accuracy === '良い').length;
        const needsWorkCount = this.results.filter(r => r.accuracy === '要調整').length;
        const totalCount = this.results.length;
        
        // 平均誤差計算
        const avgError = totalCount > 0 ? 
            Math.round(this.results.reduce((sum, r) => sum + Math.abs(r.cents), 0) / totalCount) : 0;
        
        // 総合評価
        let overallGrade = '';
        let gradeClass = '';
        if (perfectCount >= 6) {
            overallGrade = '🏆 優秀！';
            gradeClass = 'grade-excellent';
        } else if (perfectCount + goodCount >= 6) {
            overallGrade = '🎉 良好！';
            gradeClass = 'grade-good';
        } else {
            overallGrade = '😭 要練習';
            gradeClass = 'grade-practice';
        }
        
        // 結果表示
        const gradeElement = document.getElementById('overall-grade');
        const summaryElement = document.getElementById('results-summary');
        const detailElement = document.getElementById('results-detail');
        
        gradeElement.textContent = overallGrade;
        gradeElement.className = `overall-grade ${gradeClass}`;
        
        if (totalCount === 0) {
            summaryElement.innerHTML = `
                記録された結果がありません。<br>
                再度トレーニングをお試しください。
            `;
        } else {
            summaryElement.innerHTML = `
                完璧: ${perfectCount}/8<br>
                良い: ${goodCount}/8<br>
                要調整: ${needsWorkCount}/8<br>
                平均誤差: ${avgError}¢
            `;
        }
        
        // 詳細結果表示
        let detailHtml = '<div>';
        detailHtml += '<h4 style="margin-bottom: 15px; color: #333;">🎵 各音程の詳細結果</h4>';
        detailHtml += '<div style="display: grid; gap: 10px;">';
        
        this.results.forEach((result) => {
            const statusIcon = result.accuracy === '完璧' ? '🎉' : 
                             result.accuracy === '良い' ? '👍' : '😭';
            
            // 周波数比較の視覚的表示
            const targetHz = Math.round(result.targetFreq);
            const actualHz = Math.round(result.actualFreq);
            const freqDiff = actualHz - targetHz;
            const freqDiffText = freqDiff > 0 ? `+${freqDiff}Hz` : `${freqDiff}Hz`;
            
            detailHtml += `
                <div style="background: ${result.accuracy === '完璧' ? '#f0fff0' : result.accuracy === '良い' ? '#fff8f0' : '#fff0f0'}; 
                            padding: 12px; border-radius: 8px; border-left: 4px solid ${result.accuracy === '完璧' ? '#4CAF50' : result.accuracy === '良い' ? '#FF9800' : '#f44336'};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight: bold; font-size: 1.1rem;">${statusIcon} ${result.note}</span>
                        <span style="font-weight: bold; color: ${result.accuracy === '完璧' ? '#4CAF50' : result.accuracy === '良い' ? '#FF9800' : '#f44336'};">
                            ${result.cents > 0 ? '+' : ''}${result.cents}¢ (${result.accuracy})
                        </span>
                    </div>
                    <div style="font-size: 0.9rem; color: #666; display: flex; justify-content: space-between;">
                        <span>🎯 正解: <strong>${targetHz}Hz</strong></span>
                        <span>🎤 あなた: <strong>${actualHz}Hz</strong> <em style="color: ${freqDiff > 0 ? '#e91e63' : freqDiff < 0 ? '#2196f3' : '#4caf50'};">(${freqDiffText})</em></span>
                    </div>
                </div>
            `;
        });
        
        detailHtml += '</div></div>';
        
        // アイコンの意味説明
        let legendHtml = '<div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border-radius: 10px; border: 2px solid #2196F3;">';
        legendHtml += '<h4 style="margin-bottom: 10px; color: #2196F3;">📊 判定結果の見方</h4>';
        legendHtml += '<div style="font-size: 0.9rem; line-height: 1.6;">';
        legendHtml += '• 🎉 <strong>完璧</strong>: ±10セント以内（非常に正確）<br>';
        legendHtml += '• 👍 <strong>良い</strong>: ±20セント以内（良好な精度）<br>';
        legendHtml += '• 😭 <strong>要調整</strong>: ±20セント超（練習が必要）<br>';
        legendHtml += '• <strong>¢（セント）</strong>: 音程の精度単位。100¢ = 半音1つ分';
        legendHtml += '</div></div>';
        
        // 詳細結果と凡例を組み合わせ
        const finalDetailHtml = detailHtml + legendHtml;
        
        detailElement.innerHTML = finalDetailHtml;
        
        this.log(`📊 総合結果: ${overallGrade} (完璧:${perfectCount}, 良い:${goodCount}, 要調整:${needsWorkCount})`);
        
        // 自動停止を削除 - ユーザーが停止ボタンを押すまで結果を表示し続ける
    }
    
    
    stopMicrophone() {
        this.log('🔇 マイクを自動停止中...');
        
        // 周波数検出を停止
        this.isRunning = false;
        
        // マイクストリームを停止
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
                this.log(`🔇 マイクトラック停止: ${track.kind}`);
            });
            this.mediaStream = null;
        }
        
        // マイクノードを切断
        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        // アナライザーもクリア
        if (this.analyzer) {
            this.analyzer.disconnect();
            this.analyzer = null;
        }
        
        this.log('✅ マイク自動停止完了');
    }
    
    stopTraining() {
        this.log('⏹️ フルスケールトレーニング停止中...');
        
        this.isRunning = false;
        this.isAnimating = false;
        
        // 基音再生停止
        this.stopReferenceNote();
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
                this.log(`🔇 トラック停止: ${track.kind}`);
            });
            this.mediaStream = null;
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.resetUI();
        this.log('✅ フルスケールトレーニング完全停止');
    }
    
    resetUI() {
        document.getElementById('start-btn').style.display = 'inline-block';
        
        // 停止ボタンを元に戻す
        const stopBtn = document.getElementById('stop-btn');
        stopBtn.style.display = 'none';
        stopBtn.textContent = '中断';
        stopBtn.style.background = 'linear-gradient(145deg, #f44336, #d32f2f)';
        
        // メインスタートボタンの状態を完全リセット
        const mainStartBtn = document.getElementById('main-start-btn');
        mainStartBtn.style.display = 'none'; // リセット時のみ非表示
        mainStartBtn.disabled = false;
        mainStartBtn.style.opacity = '1';
        mainStartBtn.textContent = '🎹 基音を聞いてスタート！'; // テキストをデフォルトに戻す
        mainStartBtn.style.animation = 'none'; // アニメーションもリセット
        
        document.getElementById('progress-section').style.display = 'none';
        document.getElementById('guide-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('frequency-display').style.display = 'none';
        
        // 周波数表示をリセット（再試行時に備えて）
        document.getElementById('frequency-main').textContent = '--- Hz';
        document.getElementById('frequency-main').style.color = '#999';
        document.getElementById('frequency-main').style.borderColor = '#e0e0e0';
        
        // 表示リセット
        document.getElementById('frequency-main').textContent = '--- Hz';
        document.getElementById('frequency-main').style.color = '#999';
        document.getElementById('frequency-main').style.borderColor = '#e0e0e0';
        
        
        // 設定リセット
        this.frameCount = 0;
        this.currentNoteIndex = 0;
        this.results = [];
        this.trainingPhase = 'waiting';
    }
    
    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logLine = `[${timestamp}] ${message}`;
        console.log(logLine);
    }
    
}

// 初期化
function initializeApp() {
    new FullScaleTraining();
}

// DOMが既に読み込まれている場合は即座に初期化、そうでなければイベントを待つ
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}