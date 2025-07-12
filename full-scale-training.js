class FullScaleTraining {
    constructor() {
        // バージョン情報
        this.version = {
            app: 'v1.0.7',
            codename: 'SmartMicrophone',
            build: '2025-07-12',
            commit: 'mic-optimization'
        };
        
        console.log(`🎵 FullScaleTraining ${this.version.app} ${this.version.codename} 初期化開始`);
        console.log(`📦 Build: ${this.version.build} | Commit: ${this.version.commit}`);
        
        // 基本プロパティ（simple-pitch-testからコピー）
        this.audioContext = null;
        this.analyzer = null;
        this.microphone = null;
        this.mediaStream = null;
        this.isRunning = false;
        this.frameCount = 0;
        this.detectionLoopActive = false;
        
        
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
        this.baseToneDuration = 2500; // 基音再生時間2.5秒
        
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
        this.log(`🎵 FullScaleTraining ${this.version.app} ${this.version.codename} 初期化完了`);
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
    
    // 確実な画面サイズ判定（Safari リロード対応）
    isDesktopLayout() {
        // 複数の方法で判定して確実性を高める
        const windowWidth = window.innerWidth;
        const screenWidth = screen.width;
        const documentWidth = document.documentElement.clientWidth;
        
        // 最も信頼できる値を使用
        const width = Math.max(windowWidth, documentWidth);
        const isDesktop = width >= 769;
        
        this.log(`🖥️ 画面サイズ判定: ${width}px (window:${windowWidth}, doc:${documentWidth}, screen:${screenWidth}) → ${isDesktop ? 'デスクトップ' : 'モバイル'}`);
        
        return isDesktop;
    }
    
    // ガイドノート要素を取得（画面サイズに応じて）
    getGuideNotes() {
        let selector, layoutType;
        
        if (this.isDesktopLayout()) {
            selector = '#note-guide-desktop .guide-note';
            layoutType = 'デスクトップ';
        } else {
            selector = '#note-guide-mobile .guide-note';
            layoutType = 'モバイル';
        }
        
        const elements = document.querySelectorAll(selector);
        this.log(`🎯 ガイドノート取得: ${elements.length}個 (${layoutType}レイアウト)`);
        
        // 要素が見つからない場合は代替手段を試行
        if (elements.length === 0) {
            this.log('⚠️ ガイドノートが見つかりません！代替セレクターを試行...');
            const fallbackElements = document.querySelectorAll('.guide-note');
            this.log(`🔄 代替取得: ${fallbackElements.length}個のガイドノート`);
            return fallbackElements;
        }
        
        return elements;
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
            document.getElementById('training-layout').style.display = 'block';
            
            // モバイル版では上部ヘッダーを非表示
            if (!this.isDesktopLayout()) {
                const header = document.querySelector('.header');
                if (header) {
                    header.style.display = 'none';
                    this.log('📱 モバイル版: ヘッダー非表示');
                }
            }
            
            this.log('✅ UI要素表示更新完了');
            
            // メインスタートボタンを準備中状態で表示
            const mainStartBtn = document.getElementById('main-start-btn');
            mainStartBtn.style.display = 'inline-block';
            mainStartBtn.disabled = true;
            mainStartBtn.style.opacity = '0.6';
            mainStartBtn.textContent = '🔍 Loading...';
            mainStartBtn.style.animation = 'none';
            
            
            // AudioContext初期化（再利用または新規作成）
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
        
        // 既存のAudioContextがある場合は再利用
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.log('🔄 既存のAudioContextを再利用');
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                this.log('✅ AudioContext再開完了');
            }
        } else {
            // 新規作成
            this.log('🆕 新規AudioContext作成');
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                this.log('🔄 AudioContext再開完了');
            }
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
        // 現在の目標をログに記録（ガイドアニメーションで視覚的に表示）
        if (this.currentNoteIndex < this.targetNotes.length) {
            const currentNote = this.targetNotes[this.currentNoteIndex];
            const currentFreq = this.targetFrequencies[this.currentNoteIndex];
            
            this.log(`🎵 現在の目標: ${currentNote} (${Math.round(currentFreq)}Hz)`);
        }
    }
    
    
    async showMainStartButton() {
        this.log('🔍 オーディオシステム初期化完了 - 基音ボタンを有効化');
        
        // Tone.jsサンプラーを事前に準備してラグを削減
        await this.preloadPianoSampler();
        
        // メインスタートボタンを有効化（準備完了後）
        const mainStartBtn = document.getElementById('main-start-btn');
        mainStartBtn.disabled = false;
        mainStartBtn.style.opacity = '1';
        mainStartBtn.textContent = '🎹 スタート';
        
        // ボタンにパルスアニメーションを追加（準備完了の視覚的フィードバック）
        mainStartBtn.style.animation = 'pulse 2s infinite';
        
        
        this.log('✅ 基音ボタンがクリック可能になりました');
    }
    
    async preloadPianoSampler() {
        try {
            if (typeof Tone !== 'undefined') {
                this.log('🎹 ピアノサンプラー事前読み込み開始...');
                
                // Tone.jsのAudioContextを開始
                if (Tone.context.state !== 'running') {
                    await Tone.start();
                    this.log('🎵 Tone.js AudioContext 事前開始完了');
                }
                
                // サンプラーを事前に作成（音量とサスティンを調整）
                this.pianoSampler = new Tone.Sampler({
                    urls: {
                        "C4": "C4.mp3",
                        "D#4": "Ds4.mp3", 
                        "F#4": "Fs4.mp3",
                        "A4": "A4.mp3",
                    },
                    release: 0.5,      // リリース時間（フェイドアウトの長さ）
                    attack: 0.01,      // アタック時間（すぐに立ち上がる）
                    volume: 6,         // 音量を上げる（dB）
                    baseUrl: "https://tonejs.github.io/audio/salamander/"
                }).toDestination();
                
                // サンプル読み込み完了を待機
                await Tone.loaded();
                this.log('✅ ピアノサンプラー事前読み込み完了 - ラグなし再生準備完了');
            }
        } catch (error) {
            this.log(`⚠️ ピアノサンプラー事前読み込みエラー: ${error.message}`);
        }
    }
    
    playReferenceAndStartAnimation() {
        if (this.trainingPhase !== 'waiting') {
            this.log('⚠️ まだ前のアニメーションが実行中です');
            return;
        }
        
        this.log('🔊 基音再生とアニメーション準備');
        this.trainingPhase = 'playing';
        
        // 基音再生前にマイクを一時停止（雑音回避）
        this.pauseMicrophone();
        
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
    
    async playReferenceNote() {
        const frequency = 261.63; // Do4
        const startTimestamp = performance.now();
        this.log(`🔊 Do4 (${Math.round(frequency)}Hz) 本物のピアノ音再生開始`);
        
        try {
            // 事前読み込み済みのTone.jsサンプラーを使用
            if (this.pianoSampler && typeof Tone !== 'undefined') {
                this.log('🎹 事前読み込み済みピアノサンプラー使用（ラグなし）');
                
                // C4 (Do4) を手動でアタック→長時間サスティン→リリース
                this.pianoSampler.triggerAttack("C4", undefined, 0.8);
                
                // 2秒後にリリース開始（0.5秒かけてフェイドアウト）
                setTimeout(() => {
                    this.pianoSampler.triggerRelease("C4");
                    this.log('🎹 ピアノ音 フェイドアウト開始');
                }, 2000);
                
                // 2.7秒後に完全停止（フェイドアウト完了後）
                setTimeout(() => {
                    this.pianoSampler.releaseAll();
                    this.log('🔇 ピアノ音 完全停止');
                }, 2700);
                
                const processingTime = performance.now() - startTimestamp;
                this.log(`⚡ 即座にピアノ再生開始: ${processingTime.toFixed(2)}ms`);
                
                return;
            }
            
            // フォールバック: リアルタイム読み込み
            if (typeof Tone !== 'undefined') {
                this.log('🎹 Tone.js リアルタイム読み込み（初回のみ）');
                
                // Tone.jsのAudioContextを開始
                if (Tone.context.state !== 'running') {
                    await Tone.start();
                    this.log('🎵 Tone.js AudioContext 開始');
                }
                
                // 既存のサンプラーを停止
                if (this.pianoSampler) {
                    this.pianoSampler.dispose();
                }
                
                // Salamander Piano サンプラーを作成（音量とサスティンを調整）
                this.pianoSampler = new Tone.Sampler({
                    urls: {
                        "C4": "C4.mp3",
                        "D#4": "Ds4.mp3",
                        "F#4": "Fs4.mp3",
                        "A4": "A4.mp3",
                    },
                    release: 0.5,      // リリース時間（フェイドアウトの長さ）
                    attack: 0.01,      // アタック時間（すぐに立ち上がる）
                    volume: 6,         // 音量を上げる（dB）
                    baseUrl: "https://tonejs.github.io/audio/salamander/"
                }).toDestination();
                
                // サンプル読み込み完了を待機
                await Tone.loaded();
                this.log('🎹 ピアノサンプル読み込み完了');
                
                // C4 (Do4) を手動でアタック→長時間サスティン→リリース
                this.pianoSampler.triggerAttack("C4", undefined, 0.8);
                
                // 2秒後にリリース開始（0.5秒かけてフェイドアウト）
                setTimeout(() => {
                    this.pianoSampler.triggerRelease("C4");
                    this.log('🎹 ピアノ音 フェイドアウト開始');
                }, 2000);
                
                // 2.7秒後に完全停止（フェイドアウト完了後）
                setTimeout(() => {
                    this.pianoSampler.releaseAll();
                    this.log('🔇 ピアノ音 完全停止');
                }, 2700);
                
                const processingTime = performance.now() - startTimestamp;
                this.log(`⏱️ Tone.js ピアノ再生開始: ${processingTime.toFixed(2)}ms`);
                
                return;
            }
        } catch (error) {
            this.log(`❌ Tone.js ピアノ再生エラー: ${error.message}`);
            this.log('🔄 フォールバック: 合成音に切り替え');
        }
        
        // フォールバック: 従来の合成音
        this.playFallbackNote(frequency, startTimestamp);
    }
    
    playFallbackNote(frequency, startTimestamp) {
        this.log('🎵 フォールバック合成音再生');
        
        // AudioContextの状態確認
        if (this.audioContext.state === 'suspended') {
            this.log('⚠️ AudioContext が suspended 状態です');
            this.audioContext.resume();
        }
        
        // 既存の再生を停止
        this.stopReferenceNote();
        
        // よりピアノらしい音を作るための複合波形（基音中心）
        const harmonics = [
            // 基音を強く、ピアノらしい暖かい音色
            { freq: frequency, gain: 1.2, type: 'sawtooth', decay: 1.0 },           // 基音（のこぎり波で豊かな倍音）
            { freq: frequency, gain: 0.8, type: 'sine', decay: 1.0 },               // 基音補強（正弦波でクリア）
            
            // 控えめな整数倍音（ピアノは倍音が比較的少ない）
            { freq: frequency * 2, gain: 0.25, type: 'sine', decay: 0.6 },          // 2倍音
            { freq: frequency * 3, gain: 0.15, type: 'sine', decay: 0.5 },          // 3倍音
            { freq: frequency * 4, gain: 0.08, type: 'sine', decay: 0.4 },          // 4倍音
            { freq: frequency * 5, gain: 0.05, type: 'sine', decay: 0.3 },          // 5倍音
            
            // 微細なデチューンで自然さを演出
            { freq: frequency * 1.001, gain: 0.3, type: 'sine', decay: 0.9 },       // わずかなデチューン
            { freq: frequency * 0.999, gain: 0.2, type: 'sine', decay: 0.8 },       // 反対方向のデチューン
            
            // 低音域の共鳴（控えめに）
            { freq: frequency * 0.5, gain: 0.06, type: 'sine', decay: 0.7 },        // サブハーモニック
        ];
        
        // 複数のオシレーターとゲインノードを保存する配列
        this.referenceOscillators = [];
        this.referenceGains = [];
        
        // メインゲインノード（全体の音量制御）
        this.referenceMainGain = this.audioContext.createGain();
        
        const startTime = this.audioContext.currentTime;
        const duration = this.baseToneDuration / 1000; // 2.5秒（ms→秒変換）
        
        // グランドピアノの精密なADSRエンベロープ（自然なフェイドアウト）
        this.referenceMainGain.gain.setValueAtTime(0, startTime);
        // アタック: 非常に鋭い立ち上がり（ハンマーの衝撃）
        this.referenceMainGain.gain.linearRampToValueAtTime(0.9, startTime + 0.003);  
        // 初期ディケイ: 急激な減衰
        this.referenceMainGain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.05);
        // セカンダリディケイ: より緩やかな減衰
        this.referenceMainGain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.3);
        // サスティン: 長い持続
        this.referenceMainGain.gain.exponentialRampToValueAtTime(0.15, startTime + 1.0);
        // 長いリリース: 非常にゆっくりとした自然な消失
        this.referenceMainGain.gain.exponentialRampToValueAtTime(0.08, startTime + 1.5);
        this.referenceMainGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        // 各倍音のオシレーターを作成（個別のダイナミクス適用）
        harmonics.forEach((harmonic, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // オシレーター設定
            oscillator.frequency.setValueAtTime(harmonic.freq, startTime);
            oscillator.type = harmonic.type;
            
            // 倍音ごとの個別エンベロープ
            gainNode.gain.setValueAtTime(0, startTime);
            
            if (harmonic.type === 'square') {
                // 打鍵ノイズ: 瞬間的なアタックで即座に減衰
                gainNode.gain.linearRampToValueAtTime(harmonic.gain, startTime + 0.001);
                gainNode.gain.exponentialRampToValueAtTime(harmonic.gain * 0.01, startTime + 0.02);
            } else if (harmonic.freq < frequency) {
                // サブ倍音: ゆっくりとした立ち上がりと長い持続
                gainNode.gain.linearRampToValueAtTime(harmonic.gain, startTime + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(harmonic.gain * harmonic.decay, startTime + duration * 0.9);
            } else {
                // 通常の倍音: ピアノらしい減衰
                gainNode.gain.linearRampToValueAtTime(harmonic.gain, startTime + 0.005);
                gainNode.gain.exponentialRampToValueAtTime(harmonic.gain * 0.5, startTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(harmonic.gain * harmonic.decay * 0.3, startTime + duration * 0.8);
            }
            
            // 最終的にゼロに
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            // 接続
            oscillator.connect(gainNode);
            gainNode.connect(this.referenceMainGain);
            
            // 配列に保存
            this.referenceOscillators.push(oscillator);
            this.referenceGains.push(gainNode);
            
            // 再生開始・停止
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
        
        this.log(`🎹 グランドピアノ音 Do4 (${harmonics.length}成分合成: 基音+倍音+非整数倍音+打鍵音) 再生中...`);
    }
    
    stopReferenceNote() {
        // Tone.js サンプラーを完全停止
        if (this.pianoSampler) {
            try {
                this.pianoSampler.triggerRelease("C4");  // 特定の音を停止
                this.pianoSampler.releaseAll();          // 全ての音を停止
                this.log('🎹 Tone.js ピアノサンプラー完全停止');
            } catch (e) {
                this.log(`⚠️ Tone.js 停止エラー: ${e.message}`);
            }
        }
        
        // 複数のオシレーターを停止（フォールバック用）
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
        
        // ドレミアニメーション開始時にマイクを再開（発声検知のため）
        this.resumeMicrophone();
        
        // メインスタートボタンをアニメーション中状態に変更
        const mainStartBtn = document.getElementById('main-start-btn');
        mainStartBtn.textContent = '🎵 測定中...';
        mainStartBtn.disabled = true;
        mainStartBtn.style.opacity = '0.5';
        mainStartBtn.style.animation = 'none';
        
        // 現在表示されているレイアウトのguide-noteのみを取得
        const guideNotes = this.getGuideNotes();
        
        if (guideNotes.length === 0) {
            this.log('⚠️ ガイドノートが見つかりません！アニメーションを中止します。');
            return;
        }
        
        // 要素の詳細をログ出力
        guideNotes.forEach((note, i) => {
            this.log(`📋 ガイド${i}: ${note.textContent.trim()} [data-note="${note.getAttribute('data-note')}"]`);
        });
        
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
                    
                    this.log(`🎼 ガイド表示: ${noteName} (音声なし) - 要素${index}にanimateクラス追加`);
                    this.log(`🔍 要素確認: ${guideNotes[index].textContent.trim()}`);
                } else {
                    this.log(`⚠️ インデックス${index}のガイドノートが存在しません`);
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
        
        // ガイドリセット（現在表示されているレイアウトのみ）
        const guideNotes = this.getGuideNotes();
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
        // 重複実行防止
        if (this.detectionLoopActive) {
            this.log('⚠️ 周波数検出ループは既に実行中です');
            return;
        }
        
        this.log('📊 周波数検出ループ開始');
        this.detectionLoopActive = true;
        
        const detectLoop = () => {
            if (!this.isRunning) {
                this.log('⚠️ 周波数検出停止: isRunning=false');
                this.detectionLoopActive = false;
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
            this.updateFrequencyDisplay(frequency, volume);
            
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
    
    updateFrequencyDisplay(frequency, volume = 0) {
        // PCレイアウトの周波数表示を更新
        const element = document.getElementById('frequency-main');
        // モバイル用（上部表示）
        const mobileElement = document.getElementById('frequency-main-mobile');
        // 後方互換性のためのレガシー要素
        const legacyElement = document.getElementById('frequency-main-legacy');
        
        const displayText = frequency > 0 ? `${Math.round(frequency)} Hz` : '--- Hz';
        const color = frequency > 0 ? '#4CAF50' : '#999';
        const borderColor = '#4CAF50'; // 常に緑で固定
        
        // 音量を0-100%に正規化（最大値を調整）
        const volumePercent = Math.min(Math.max(volume / 30 * 100, 0), 100);
        
        // PC用（デスクトップレイアウト）
        if (element) {
            element.textContent = displayText;
            element.style.color = color;
            element.style.borderColor = borderColor;
            
            // 音量バー背景の更新
            if (frequency > 0 && volume > 1) {
                // 音を検出している時は緑のグラデーション
                element.style.backgroundImage = `linear-gradient(to top, rgba(76, 175, 80, 0.5) 0%, rgba(129, 199, 132, 0.4) ${volumePercent/2}%, rgba(165, 214, 167, 0.3) ${volumePercent}%, transparent ${volumePercent}%)`;
            } else {
                // 音を検出していない時は薄いグレー
                element.style.backgroundImage = `linear-gradient(to top, #e0e0e0 ${Math.min(volumePercent, 5)}%, transparent ${Math.min(volumePercent, 5)}%)`;
            }
        }
        
        // モバイル用（上部表示）
        if (mobileElement) {
            mobileElement.textContent = displayText;
            mobileElement.style.color = color;
            mobileElement.style.borderColor = borderColor;
            
            // モバイルにも音量バー適用
            if (frequency > 0 && volume > 1) {
                mobileElement.style.backgroundImage = `linear-gradient(to top, rgba(76, 175, 80, 0.5) 0%, rgba(129, 199, 132, 0.4) ${volumePercent/2}%, rgba(165, 214, 167, 0.3) ${volumePercent}%, transparent ${volumePercent}%)`;
            } else {
                mobileElement.style.backgroundImage = `linear-gradient(to top, #e0e0e0 ${Math.min(volumePercent, 5)}%, transparent ${Math.min(volumePercent, 5)}%)`;
            }
        }
        
        // 後方互換性用（レガシー要素もボリューム対応）
        if (legacyElement) {
            legacyElement.textContent = displayText;
            legacyElement.style.color = color;
            legacyElement.style.borderColor = borderColor;
            
            // レガシー要素にも音量バー適用
            if (frequency > 0 && volume > 1) {
                legacyElement.style.backgroundImage = `linear-gradient(to top, rgba(76, 175, 80, 0.5) 0%, rgba(129, 199, 132, 0.4) ${volumePercent/2}%, rgba(165, 214, 167, 0.3) ${volumePercent}%, transparent ${volumePercent}%)`;
            } else {
                legacyElement.style.backgroundImage = `linear-gradient(to top, #e0e0e0 ${Math.min(volumePercent, 5)}%, transparent ${Math.min(volumePercent, 5)}%)`;
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
        
        // UI切り替え（新しいレイアウトに対応）
        const trainingLayout = document.getElementById('training-layout');
        const frequencyDisplay = document.getElementById('frequency-display');
        const resultsSection = document.getElementById('results-section');
        
        if (trainingLayout) trainingLayout.style.display = 'none';
        if (frequencyDisplay) frequencyDisplay.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'block';
        
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
    
    
    pauseMicrophone() {
        this.log('⏸️ マイクを一時停止中（基音再生のため）...');
        
        // 周波数検出を一時停止
        this.isRunning = false;
        this.detectionLoopActive = false;
        
        // マイクストリームは保持、検出ループのみ停止
        this.log('✅ マイク一時停止完了（ストリーム保持）');
    }
    
    resumeMicrophone() {
        this.log('▶️ マイクを再開中（発声検知のため）...');
        
        // マイクストリームが存在する場合のみ再開
        if (this.mediaStream && this.analyzer) {
            this.isRunning = true;
            this.startFrequencyDetection();
            this.log('✅ マイク再開完了');
        } else {
            this.log('⚠️ マイクストリームが存在しません。再開をスキップ。');
        }
    }

    stopMicrophone() {
        this.log('🔇 マイクを完全停止中...');
        
        // 周波数検出を停止
        this.isRunning = false;
        this.detectionLoopActive = false;
        
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
        
        // AudioContextは再利用のためクローズしない（サスペンドのみ）
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.suspend();
            this.log('🔄 AudioContext をサスペンド（再利用のため）');
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
        mainStartBtn.textContent = '🎹 スタート'; // テキストをデフォルトに戻す
        mainStartBtn.style.animation = 'none'; // アニメーションもリセット
        
        // モバイル版でヘッダーが非表示の場合は再表示
        const header = document.querySelector('.header');
        if (header && header.style.display === 'none') {
            header.style.display = 'block';
            this.log('📱 モバイル版: ヘッダー再表示');
        }
        
        document.getElementById('training-layout').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('frequency-display').style.display = 'none';
        
        // 周波数表示をリセット（再試行時に備えて）
        const frequencyMain = document.getElementById('frequency-main');
        if (frequencyMain) {
            frequencyMain.textContent = '--- Hz';
            frequencyMain.style.color = '#999';
            frequencyMain.style.borderColor = '#e0e0e0';
            frequencyMain.style.backgroundImage = 'linear-gradient(to top, #4CAF50 0%, transparent 0%)';
        }
        
        // レガシー要素もリセット
        const legacyElement = document.getElementById('frequency-main-legacy');
        if (legacyElement) {
            legacyElement.textContent = '--- Hz';
            legacyElement.style.color = '#999';
            legacyElement.style.borderColor = '#e0e0e0';
            legacyElement.style.backgroundImage = 'linear-gradient(to top, #4CAF50 0%, transparent 0%)';
        }
        
        
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