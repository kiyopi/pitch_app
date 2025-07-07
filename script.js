class PitchTrainingApp {
    constructor() {
        this.audioContext = null;
        this.analyzer = null;
        this.microphone = null;
        this.mediaStream = null;
        this.dataArray = null;
        this.canvas = null;
        this.canvasContext = null;
        this.currentOscillator = null;
        
        this.selectedGender = null;
        this.selectedTraining = null;
        this.isTraining = false;
        this.currentNoteIndex = 0;
        this.trainingResults = [];
        
        this.notes = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
        this.frequencies = {
            male: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25], // C4-C5
            female: [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50] // C5-C6
        };
        
        // デバッグモード（URLパラメータで有効化）
        this.debugMode = new URLSearchParams(window.location.search).has('debug');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.canvas = document.getElementById('pitch-canvas');
        if (this.canvas) {
            this.canvas.width = 400;
            this.canvas.height = 200;
            this.canvasContext = this.canvas.getContext('2d');
            this.drawInitialCanvas();
        }
        
        // デバッグモード時の情報表示
        if (this.debugMode) {
            this.showDebugInfo();
            this.initDebugPanel();
        }
    }
    
    showDebugInfo() {
        const debugInfo = document.createElement('div');
        debugInfo.id = 'debug-info';
        debugInfo.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 9999;
            max-width: 300px;
        `;
        
        const info = {
            'User Agent': navigator.userAgent,
            'Platform': navigator.platform,
            'iOS Safari': /iPad|iPhone|iPod/.test(navigator.userAgent),
            'HTTPS': location.protocol === 'https:',
            'AudioContext': !!(window.AudioContext || window.webkitAudioContext),
            'MediaDevices': !!navigator.mediaDevices,
            'getUserMedia': !!navigator.mediaDevices?.getUserMedia
        };
        
        debugInfo.innerHTML = Object.entries(info)
            .map(([key, value]) => `${key}: ${value}`)
            .join('<br>');
        
        document.body.appendChild(debugInfo);
        console.log('デバッグ情報:', info);
    }
    
    initDebugPanel() {
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
            debugPanel.style.display = 'block';
            console.log('デバッグパネルを表示しました');
        }
    }
    
    updateDebugPanel(data) {
        if (!this.debugMode) return;
        
        const elements = {
            frequency: document.getElementById('debug-frequency'),
            volume: document.getElementById('debug-volume'),
            waveform: document.getElementById('debug-waveform'),
            context: document.getElementById('debug-context'),
            mic: document.getElementById('debug-mic'),
            frames: document.getElementById('debug-frames')
        };
        
        // 周波数情報
        if (elements.frequency) {
            if (data.frequency) {
                elements.frequency.textContent = `${Math.round(data.frequency)}Hz`;
                elements.frequency.className = 'debug-value active';
            } else {
                elements.frequency.textContent = '検出なし';
                elements.frequency.className = 'debug-value';
            }
        }
        
        // 音量レベル
        if (elements.volume) {
            elements.volume.textContent = `${Math.round(data.volume || 0)}%`;
            elements.volume.className = data.volume > 5 ? 'debug-value active' : 'debug-value';
        }
        
        // 波形データ状態
        if (elements.waveform) {
            const status = data.waveformActive ? '取得中' : '待機中';
            elements.waveform.textContent = status;
            elements.waveform.className = data.waveformActive ? 'debug-value active' : 'debug-value';
        }
        
        // AudioContext状態
        if (elements.context) {
            const state = this.audioContext?.state || 'なし';
            elements.context.textContent = state;
            elements.context.className = state === 'running' ? 'debug-value active' : 'debug-value error';
        }
        
        // マイク状態
        if (elements.mic) {
            const status = this.mediaStream?.active ? 'アクティブ' : '非アクティブ';
            elements.mic.textContent = status;
            elements.mic.className = this.mediaStream?.active ? 'debug-value active' : 'debug-value error';
        }
        
        // フレーム数
        if (elements.frames) {
            elements.frames.textContent = data.frameCount || 0;
            elements.frames.className = 'debug-value';
        }
    }
    
    drawInitialCanvas() {
        if (!this.canvasContext) return;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 初期状態の背景
        this.canvasContext.fillStyle = '#f8f9fa';
        this.canvasContext.fillRect(0, 0, width, height);
        
        // 中央線を描画
        this.canvasContext.strokeStyle = '#e0e0e0';
        this.canvasContext.lineWidth = 1;
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(0, height / 2);
        this.canvasContext.lineTo(width, height / 2);
        this.canvasContext.stroke();
        
        // 初期メッセージ
        this.canvasContext.fillStyle = '#999';
        this.canvasContext.font = '16px Arial';
        this.canvasContext.textAlign = 'center';
        this.canvasContext.fillText('トレーニング開始でマイク波形を表示', width / 2, height / 2 - 10);
        this.canvasContext.fillText('🎤 マイクの準備をしてください', width / 2, height / 2 + 20);
    }
    
    setupEventListeners() {
        // モード選択
        document.querySelectorAll('[data-gender]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-gender]').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedGender = e.target.dataset.gender;
                this.updateStartButton();
            });
        });
        
        document.querySelectorAll('[data-training]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-training]').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.selectedTraining = e.target.dataset.training;
                this.updateStartButton();
            });
        });
        
        // スタートボタン
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startTraining();
        });
        
        // 停止ボタン
        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopTraining();
        });
        
        // もう一度ボタン
        document.getElementById('retry-btn').addEventListener('click', () => {
            this.resetApp();
        });
        
        // 共有ボタン
        document.getElementById('share-btn').addEventListener('click', () => {
            this.shareResults();
        });
    }
    
    updateStartButton() {
        const startBtn = document.getElementById('start-btn');
        if (this.selectedGender && this.selectedTraining) {
            startBtn.disabled = false;
        } else {
            startBtn.disabled = true;
        }
    }
    
    async startTraining() {
        try {
            // iOS Safari対応: 明示的にユーザーインタラクションを確認
            await this.ensureUserInteraction();
            
            await this.initAudio();
            this.showTrainingScreen();
            
            // 3秒カウントダウンを実行
            await this.showCountdown();
            
            this.isTraining = true;
            this.currentNoteIndex = 0;
            this.trainingResults = [];
            
            if (this.selectedTraining === 'sequential') {
                await this.runSequentialTraining();
            } else {
                await this.runOctaveTraining();
            }
            
        } catch (error) {
            console.error('音声初期化エラー:', error);
            let errorMessage = 'マイクへのアクセスが必要です。';
            
            if (error.message.includes('AudioContext')) {
                errorMessage = 'オーディオシステムを初期化できません。画面をタップしてから再試行してください。';
            } else if (error.message.includes('マイク')) {
                errorMessage = error.message;
            }
            
            alert(errorMessage);
        }
    }
    
    async ensureUserInteraction() {
        // iOS Safari対応: AudioContextを事前に初期化
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        console.log('AudioContext初期状態:', this.audioContext.state);
        
        // AudioContextが中断されている場合、ユーザーインタラクションで再開
        if (this.audioContext.state === 'suspended') {
            console.log('ユーザーインタラクションでAudioContextを再開します');
            
            // iOS Safari対応: 明示的にユーザーインタラクションを待つ
            try {
                await this.audioContext.resume();
                console.log('AudioContext再開成功:', this.audioContext.state);
            } catch (error) {
                console.error('AudioContext再開エラー:', error);
                // 再試行のための短い待機
                await this.wait(100);
                await this.audioContext.resume();
            }
        }
        
        // iOS Safari対応: AudioContextの状態を確認
        if (this.audioContext.state !== 'running') {
            console.warn('AudioContextが実行中ではありません:', this.audioContext.state);
            throw new Error('AudioContextが正常に開始されませんでした。再度お試しください。');
        }
        
        console.log('AudioContext最終状態:', this.audioContext.state);
    }
    
    async showCountdown() {
        const currentNoteEl = document.getElementById('current-note');
        const originalText = currentNoteEl.textContent;
        
        // カウントダウン表示
        for (let i = 3; i >= 1; i--) {
            currentNoteEl.textContent = i;
            currentNoteEl.className = 'current-note countdown-number';
            await this.wait(1000);
        }
        
        // スタート表示
        currentNoteEl.textContent = 'スタート！';
        currentNoteEl.className = 'current-note countdown-start';
        await this.wait(500);
        
        // 元の状態に戻す
        currentNoteEl.className = 'current-note';
        currentNoteEl.textContent = originalText;
    }
    
    async initAudio() {
        console.log('オーディオ初期化開始...');
        
        // iOS Safari対応: HTTPS確認
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            throw new Error('マイクアクセスにはHTTPS接続が必要です。');
        }
        
        // iOS Safari対応: ユーザーインタラクションが必要
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        console.log('AudioContext作成:', this.audioContext.state);
        
        // AudioContextが中断されている場合は再開（iOS Safari対応）
        if (this.audioContext.state === 'suspended') {
            console.log('AudioContextを再開中...');
            try {
                await this.audioContext.resume();
                console.log('AudioContext再開成功:', this.audioContext.state);
            } catch (error) {
                console.error('AudioContext再開失敗:', error);
                throw new Error('AudioContextの再開に失敗しました。画面をタップしてから再試行してください。');
            }
        }
        
        // iOS Safari対応: AudioContextの状態を再確認
        if (this.audioContext.state !== 'running') {
            console.warn('AudioContextが実行中ではありません. 状態:', this.audioContext.state);
            // 少し待ってから再確認
            await this.wait(100);
            if (this.audioContext.state !== 'running') {
                throw new Error('AudioContextが正常に開始されませんでした。デバイスを再起動してから再試行してください。');
            }
        }
        
        // マイクデバイスの確認
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('このブラウザはマイクアクセスをサポートしていません');
        }
        
        console.log('マイクアクセス要求中...');
        
        // iOS Safari向け最適化されたマイク設定
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const audioConstraints = {
            audio: isIOS ? {
                // iOS Safari向け最小限の設定
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            } : {
                // デスクトップ向け詳細設定
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                channelCount: 1,
                mozNoiseSuppression: false,
                mozAutoGainControl: false
            }
        };
        
        console.log('マイク設定:', audioConstraints);
        console.log('iOS Safari:', isIOS);
        
        // iOS Safari対応: 権限チェック
        if (isIOS && navigator.permissions) {
            try {
                const permission = await navigator.permissions.query({ name: 'microphone' });
                console.log('マイク権限状態:', permission.state);
                if (permission.state === 'denied') {
                    throw new Error('マイクアクセスが拒否されています。設定から許可してください。');
                }
            } catch (error) {
                console.log('権限チェックエラー:', error);
            }
        }
        
        return navigator.mediaDevices.getUserMedia(audioConstraints)
            .then(stream => {
                console.log('マイクストリーム取得成功');
                console.log('ストリーム情報:', stream);
                console.log('オーディオトラック数:', stream.getAudioTracks().length);
                
                // ストリームが有効かチェック
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length === 0) {
                    throw new Error('オーディオトラックが見つかりません');
                }
                
                console.log('オーディオトラック状態:', audioTracks[0].readyState);
                console.log('オーディオトラック設定:', audioTracks[0].getSettings());
                
                // iOS Safari対応: トラックが有効か確認
                if (audioTracks[0].readyState !== 'live') {
                    console.warn('オーディオトラックが非アクティブです');
                    throw new Error('マイクが使用できません。他のアプリでマイクが使用中でないか確認してください。');
                }
                
                // iOS Safari対応: アナライザーの設定を先に行う
                this.analyzer = this.audioContext.createAnalyser();
                this.analyzer.fftSize = 2048;
                this.analyzer.smoothingTimeConstant = 0.3;
                this.analyzer.minDecibels = -90;
                this.analyzer.maxDecibels = -10;
                
                console.log('アナライザー設定完了');
                
                // マイクソースの作成と接続
                this.microphone = this.audioContext.createMediaStreamSource(stream);
                this.dataArray = new Float32Array(this.analyzer.frequencyBinCount);
                
                console.log('マイクソース作成完了');
                
                console.log('FFTサイズ:', this.analyzer.fftSize);
                console.log('バッファサイズ:', this.analyzer.frequencyBinCount);
                
                // iOS Safari対応: 確実な接続を行う
                try {
                    this.microphone.connect(this.analyzer);
                    console.log('マイクをアナライザーに接続完了');
                    
                    // iOS Safari対応: ダミーの出力先も接続（データ取得を確実にするため）
                    const dummyGain = this.audioContext.createGain();
                    dummyGain.gain.value = 0; // 音は出さない
                    this.analyzer.connect(dummyGain);
                    dummyGain.connect(this.audioContext.destination);
                    console.log('ダミー出力接続完了');
                    
                } catch (error) {
                    console.error('オーディオノード接続エラー:', error);
                    throw new Error('オーディオ処理の初期化に失敗しました。');
                }
                
                // iOS Safari対応: 接続状態の詳細確認
                console.log('マイクノード情報:', {
                    numberOfInputs: this.microphone.numberOfInputs,
                    numberOfOutputs: this.microphone.numberOfOutputs,
                    channelCount: this.microphone.channelCount,
                    channelCountMode: this.microphone.channelCountMode
                });
                
                console.log('アナライザー情報:', {
                    fftSize: this.analyzer.fftSize,
                    frequencyBinCount: this.analyzer.frequencyBinCount,
                    minDecibels: this.analyzer.minDecibels,
                    maxDecibels: this.analyzer.maxDecibels,
                    smoothingTimeConstant: this.analyzer.smoothingTimeConstant
                });
                
                // iOS Safari対応: データ取得テスト
                setTimeout(() => {
                    this.performMicrophoneTest();
                }, 500);
                
                // ストリームを保存（停止時に使用）
                this.mediaStream = stream;
                
                this.startPitchDetection();
                console.log('ピッチ検出開始');
            })
            .catch(error => {
                console.error('マイクアクセスエラー詳細:', error);
                console.error('エラー名:', error.name);
                console.error('エラーメッセージ:', error.message);
                console.error('エラーコード:', error.code);
                
                // iOS Safari固有の問題をチェック
                console.log('ブラウザ情報:');
                console.log('  UserAgent:', navigator.userAgent);
                console.log('  Platform:', navigator.platform);
                console.log('  iOS Safari:', /iPad|iPhone|iPod/.test(navigator.userAgent));
                console.log('  AudioContext対応:', !!(window.AudioContext || window.webkitAudioContext));
                console.log('  MediaDevices対応:', !!navigator.mediaDevices);
                
                let userMessage = 'マイクへのアクセスに失敗しました。';
                if (error.name === 'NotAllowedError') {
                    userMessage = 'マイクへのアクセスが拒否されました。設定でマイクを許可してください。';
                } else if (error.name === 'NotFoundError') {
                    userMessage = 'マイクが見つかりません。デバイスにマイクが接続されているか確認してください。';
                } else if (error.name === 'NotSupportedError') {
                    userMessage = 'このブラウザまたはデバイスではマイクアクセスがサポートされていません。';
                } else if (error.name === 'NotReadableError') {
                    userMessage = 'マイクが他のアプリで使用中です。他のアプリを終了してから再試行してください。';
                } else if (error.name === 'AbortError') {
                    userMessage = 'マイクアクセスが中断されました。';
                } else if (error.name === 'SecurityError') {
                    userMessage = 'セキュリティエラー: HTTPSサイトでのみマイクアクセスが可能です。';
                }
                
                // iOS Safari特有のアドバイスを追加
                if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                    userMessage += '\n\niOS Safari使用時の注意:\n• サイレントモードを解除してください\n• 他のアプリでマイクが使用中でないか確認してください\n• Safariの設定でマイクアクセスを許可してください';
                }
                
                alert(userMessage);
                throw error;
            });
    }
    
    startPitchDetection() {
        console.log('ピッチ検出ループ開始...');
        
        // マイクテスト用のカウンター
        let testCounter = 0;
        let frameCounter = 0;
        
        const detectPitch = () => {
            if (!this.isTraining) return;
            
            frameCounter++;
            
            // 最初の10回でマイクデータをテスト
            if (testCounter < 10) {
                this.analyzer.getFloatFrequencyData(this.dataArray);
                const hasData = this.dataArray.some(value => value > -100);
                console.log(`マイクテスト ${testCounter + 1}/10:`, hasData ? '音声データあり' : '音声データなし');
                testCounter++;
            }
            
            // 周波数データと時間データの両方を取得
            this.analyzer.getFloatFrequencyData(this.dataArray);
            const pitch = this.getPitchFromFFT(this.dataArray);
            
            // 時間データ（波形）の確認
            const timeData = new Uint8Array(this.analyzer.fftSize);
            this.analyzer.getByteTimeDomainData(timeData);
            const hasTimeData = timeData.some(v => v !== 128);
            
            // デバッグ: データ取得状況を確認
            if (this.debugMode && frameCounter % 60 === 0) { // 1秒ごと
                console.log('データ取得状況:', {
                    frequency: this.dataArray.some(v => v > -100),
                    waveform: hasTimeData,
                    pitch: pitch,
                    analyzerState: this.analyzer ? 'active' : 'inactive'
                });
            }
            
            this.updatePitchDisplay(pitch);
            this.drawWaveform();
            
            // デバッグパネルの更新
            if (this.debugMode) {
                // 音量計算
                const volume = this.calculateCurrentVolume();
                
                this.updateDebugPanel({
                    frequency: pitch,
                    volume: volume,
                    waveformActive: hasTimeData,
                    frameCount: frameCounter
                });
            }
            
            requestAnimationFrame(detectPitch);
        };
        
        detectPitch();
    }
    
    calculateCurrentVolume() {
        if (!this.analyzer) return 0;
        
        try {
            const timeData = new Uint8Array(this.analyzer.fftSize);
            this.analyzer.getByteTimeDomainData(timeData);
            
            let sum = 0;
            let maxAmplitude = 0;
            
            for (let i = 0; i < timeData.length; i++) {
                const sample = (timeData[i] - 128) / 128;
                sum += sample * sample;
                maxAmplitude = Math.max(maxAmplitude, Math.abs(sample));
            }
            
            const rms = Math.sqrt(sum / timeData.length);
            return Math.max(rms * 200, maxAmplitude * 100);
        } catch (error) {
            console.error('音量計算エラー:', error);
            return 0;
        }
    }
    
    performMicrophoneTest() {
        console.log('=== マイクテスト開始 ===');
        
        if (!this.analyzer) {
            console.error('アナライザーが存在しません');
            return;
        }
        
        // 周波数データテスト
        const freqData = new Float32Array(this.analyzer.frequencyBinCount);
        this.analyzer.getFloatFrequencyData(freqData);
        const nonInfinityFreq = freqData.filter(v => v > -Infinity && v < 0).length;
        console.log('周波数データ:', {
            total: freqData.length,
            nonInfinity: nonInfinityFreq,
            sample: freqData.slice(0, 10)
        });
        
        // 時間データテスト
        const timeData = new Uint8Array(this.analyzer.fftSize);
        this.analyzer.getByteTimeDomainData(timeData);
        const nonMidpoint = timeData.filter(v => v !== 128).length;
        console.log('時間データ:', {
            total: timeData.length,
            nonMidpoint: nonMidpoint,
            sample: timeData.slice(0, 10),
            min: Math.min(...timeData),
            max: Math.max(...timeData)
        });
        
        // AudioContextの状態確認
        console.log('AudioContext状態:', {
            state: this.audioContext.state,
            sampleRate: this.audioContext.sampleRate,
            currentTime: this.audioContext.currentTime
        });
        
        console.log('=== マイクテスト終了 ===');
    }
    
    getPitchFromFFT(dataArray) {
        let maxIndex = 0;
        let maxValue = -Infinity;
        
        for (let i = 1; i < dataArray.length / 8; i++) {
            if (dataArray[i] > maxValue) {
                maxValue = dataArray[i];
                maxIndex = i;
            }
        }
        
        if (maxValue < -80) return null; // 音が小さすぎる
        
        const nyquist = this.audioContext.sampleRate / 2;
        const frequency = (maxIndex * nyquist) / dataArray.length;
        
        return frequency > 50 && frequency < 2000 ? frequency : null;
    }
    
    updatePitchDisplay(detectedPitch) {
        const userPitchEl = document.getElementById('user-pitch');
        
        if (detectedPitch) {
            const noteInfo = this.frequencyToNote(detectedPitch);
            userPitchEl.textContent = `${noteInfo.note} (${Math.round(detectedPitch)}Hz)`;
            userPitchEl.style.color = '#7b1fa2';
        } else {
            userPitchEl.textContent = '♪';
            userPitchEl.style.color = '#ccc';
        }
    }
    
    frequencyToNote(frequency) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const A4 = 440;
        const C0 = A4 * Math.pow(2, -4.75);
        
        if (frequency > 0) {
            const h = Math.round(12 * Math.log2(frequency / C0));
            const octave = Math.floor(h / 12);
            const n = h % 12;
            return {
                note: noteNames[n],
                octave: octave,
                cents: Math.round(1200 * Math.log2(frequency / (C0 * Math.pow(2, h / 12))))
            };
        }
        return { note: '?', octave: 0, cents: 0 };
    }
    
    drawWaveform() {
        if (!this.canvasContext || !this.analyzer) {
            console.warn('Canvas context or analyzer not available');
            return;
        }
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 背景をクリア
        this.canvasContext.fillStyle = '#f8f9fa';
        this.canvasContext.fillRect(0, 0, width, height);
        
        // 中央線を描画
        this.canvasContext.strokeStyle = '#e0e0e0';
        this.canvasContext.lineWidth = 1;
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(0, height / 2);
        this.canvasContext.lineTo(width - 50, height / 2);
        this.canvasContext.stroke();
        
        try {
            // 時間領域の波形データを取得
            const bufferLength = this.analyzer.fftSize;
            const timeDataArray = new Uint8Array(bufferLength);
            this.analyzer.getByteTimeDomainData(timeDataArray);
            
            // データの検証
            const nonMidpoint = timeDataArray.filter(v => v !== 128).length;
            const dataRange = { min: Math.min(...timeDataArray), max: Math.max(...timeDataArray) };
            
            if (this.debugMode && nonMidpoint > 0) {
                console.log('波形データ取得:', { 
                    nonMidpoint, 
                    total: bufferLength, 
                    range: dataRange,
                    sample: timeDataArray.slice(0, 5)
                });
            }
            
            // 波形描画（データがある場合のみ）
            if (nonMidpoint > 0) {
                this.canvasContext.lineWidth = 2;
                this.canvasContext.strokeStyle = '#667eea';
                this.canvasContext.beginPath();
                
                const waveformWidth = width - 60;
                const sliceWidth = waveformWidth / bufferLength;
                
                for (let i = 0; i < bufferLength; i += 4) { // サンプリング間隔を広げて軽量化
                    const v = (timeDataArray[i] - 128) / 128.0;
                    const x = (i / bufferLength) * waveformWidth;
                    const y = (height / 2) + (v * height / 3); // 振幅を少し大きく
                    
                    if (i === 0) {
                        this.canvasContext.moveTo(x, y);
                    } else {
                        this.canvasContext.lineTo(x, y);
                    }
                }
                
                this.canvasContext.stroke();
            } else {
                // データがない場合の表示
                this.canvasContext.fillStyle = '#999';
                this.canvasContext.font = '14px Arial';
                this.canvasContext.textAlign = 'center';
                this.canvasContext.fillText('マイクデータ待機中...', width / 2, height / 2 + 20);
            }
            
            // 音量レベルインジケーター
            this.drawVolumeIndicator(timeDataArray);
            
        } catch (error) {
            console.error('波形描画エラー:', error);
            // エラー時の表示
            this.canvasContext.fillStyle = '#f44336';
            this.canvasContext.font = '14px Arial';
            this.canvasContext.textAlign = 'center';
            this.canvasContext.fillText('波形取得エラー', width / 2, height / 2);
        }
    }
    
    drawVolumeIndicator(timeDataArray) {
        // RMS（実効値）を計算してマイク感度を表示
        let sum = 0;
        let maxAmplitude = 0;
        
        for (let i = 0; i < timeDataArray.length; i++) {
            const sample = (timeDataArray[i] - 128) / 128;
            sum += sample * sample;
            maxAmplitude = Math.max(maxAmplitude, Math.abs(sample));
        }
        
        const rms = Math.sqrt(sum / timeDataArray.length);
        const volume = Math.max(rms * 200, maxAmplitude * 100); // 感度を上げる
        
        // デバッグ情報
        if (this.debugMode && volume > 1) {
            console.log('音量レベル:', Math.round(volume), '% RMS:', Math.round(rms * 100), '% Max:', Math.round(maxAmplitude * 100), '%');
        }
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 音量バーを描画
        const barWidth = 20;
        const barHeight = height * 0.8;
        const barX = width - 30;
        const barY = height * 0.1;
        
        // 背景バー
        this.canvasContext.fillStyle = '#e0e0e0';
        this.canvasContext.fillRect(barX, barY, barWidth, barHeight);
        
        // 音量レベル
        const levelHeight = (volume / 100) * barHeight;
        const levelY = barY + barHeight - levelHeight;
        
        // 色を音量に応じて変更
        if (volume > 80) {
            this.canvasContext.fillStyle = '#f44336'; // 赤（音量大）
        } else if (volume > 40) {
            this.canvasContext.fillStyle = '#4CAF50'; // 緑（適切）
        } else if (volume > 10) {
            this.canvasContext.fillStyle = '#FF9800'; // オレンジ（低め）
        } else {
            this.canvasContext.fillStyle = '#ccc'; // グレー（静寂）
        }
        
        this.canvasContext.fillRect(barX, levelY, barWidth, levelHeight);
        
        // マイクアイコンと状態表示
        this.canvasContext.fillStyle = volume > 5 ? '#4CAF50' : '#ccc';
        this.canvasContext.font = '12px Arial';
        this.canvasContext.fillText('🎤', barX - 25, barY + 15);
        
        // 音量値を表示
        this.canvasContext.fillStyle = '#666';
        this.canvasContext.font = '10px Arial';
        this.canvasContext.fillText(`${Math.round(volume)}%`, barX - 20, barY + barHeight + 15);
    }
    
    async runSequentialTraining() {
        const frequencies = this.frequencies[this.selectedGender];
        
        for (let i = 0; i < this.notes.length; i++) {
            if (!this.isTraining) break;
            
            this.currentNoteIndex = i;
            this.updateProgress();
            
            // ピアノ音再生
            await this.playPianoNote(frequencies[i]);
            await this.wait(2000);
            
            if (!this.isTraining) break;
            
            // ユーザー発声記録
            const result = await this.recordUserSinging(frequencies[i], 3500);
            this.trainingResults.push(result);
            
            await this.wait(500);
        }
        
        if (this.isTraining) {
            this.showResults();
        }
    }
    
    async runOctaveTraining() {
        const frequencies = this.frequencies[this.selectedGender];
        
        for (let i = 0; i < this.notes.length - 1; i++) { // 最後のドは除く
            if (!this.isTraining) break;
            
            this.currentNoteIndex = i;
            this.updateProgress();
            
            // 基準音再生
            await this.playPianoNote(frequencies[i]);
            await this.wait(1000);
            
            if (!this.isTraining) break;
            
            // オクターブ上の音再生
            await this.playPianoNote(frequencies[i] * 2);
            await this.wait(1000);
            
            if (!this.isTraining) break;
            
            // ユーザー発声記録
            const result = await this.recordUserSinging(frequencies[i], 3500);
            this.trainingResults.push(result);
            
            await this.wait(500);
        }
        
        if (this.isTraining) {
            this.showResults();
        }
    }
    
    async playPianoNote(frequency) {
        // 既存のオシレーターを停止
        if (this.currentOscillator) {
            this.currentOscillator.stop();
            this.currentOscillator = null;
        }
        
        const gainNode = this.audioContext.createGain();
        const compressor = this.audioContext.createDynamicsCompressor();
        const reverb = this.audioContext.createConvolver();
        
        // リバーブ用のインパルスレスポンス生成
        const reverbBuffer = this.createReverbImpulse();
        reverb.buffer = reverbBuffer;
        
        // グランドピアノ音を作成（より複雑な倍音構造）
        const oscillators = [];
        const gains = [];
        
        // グランドピアノの倍音構造（基音 + 複数の部分音）
        const harmonicRatios = [1, 2, 3, 4, 5, 6.5, 8, 10, 12];
        const harmonicAmps = [1.0, 0.4, 0.25, 0.15, 0.1, 0.08, 0.06, 0.04, 0.03];
        const harmonicTypes = ['sine', 'triangle', 'sine', 'sawtooth', 'sine', 'triangle', 'sine', 'sine', 'sine'];
        
        for (let i = 0; i < harmonicRatios.length; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.frequency.setValueAtTime(frequency * harmonicRatios[i], this.audioContext.currentTime);
            osc.type = harmonicTypes[i];
            
            // 各倍音に微小なデチューンを追加（リアル感向上）
            const detune = (Math.random() - 0.5) * 8;
            osc.detune.setValueAtTime(detune, this.audioContext.currentTime);
            
            gain.gain.setValueAtTime(harmonicAmps[i] * 0.15, this.audioContext.currentTime);
            
            osc.connect(gain);
            gain.connect(gainNode);
            
            oscillators.push(osc);
            gains.push(gain);
        }
        
        // ローパスフィルターでより自然な音色に
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(frequency * 8, this.audioContext.currentTime);
        filter.Q.setValueAtTime(1.5, this.audioContext.currentTime);
        
        // オーディオグラフの接続
        gainNode.connect(filter);
        filter.connect(compressor);
        
        // ドライ信号
        const dryGain = this.audioContext.createGain();
        dryGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        compressor.connect(dryGain);
        dryGain.connect(this.audioContext.destination);
        
        // ウェット信号（リバーブ）
        const wetGain = this.audioContext.createGain();
        wetGain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        compressor.connect(reverb);
        reverb.connect(wetGain);
        wetGain.connect(this.audioContext.destination);
        
        // コンプレッサー設定
        compressor.threshold.setValueAtTime(-18, this.audioContext.currentTime);
        compressor.knee.setValueAtTime(6, this.audioContext.currentTime);
        compressor.ratio.setValueAtTime(3, this.audioContext.currentTime);
        compressor.attack.setValueAtTime(0.005, this.audioContext.currentTime);
        compressor.release.setValueAtTime(0.3, this.audioContext.currentTime);
        
        // グランドピアノ風のADSRエンベロープ
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.7, this.audioContext.currentTime + 0.02); // 鋭いアタック
        gainNode.gain.exponentialRampToValueAtTime(0.5, this.audioContext.currentTime + 0.15); // ディケイ
        gainNode.gain.exponentialRampToValueAtTime(0.35, this.audioContext.currentTime + 0.8); // サステイン
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 2.5); // 長いリリース
        
        // フィルターエンベロープ（音色の変化）
        filter.frequency.exponentialRampToValueAtTime(frequency * 6, this.audioContext.currentTime + 0.5);
        filter.frequency.exponentialRampToValueAtTime(frequency * 4, this.audioContext.currentTime + 2.0);
        
        // すべてのオシレーターを開始
        const startTime = this.audioContext.currentTime;
        const stopTime = startTime + 2.5;
        
        oscillators.forEach(osc => {
            osc.start(startTime);
            osc.stop(stopTime);
        });
        
        this.currentOscillator = oscillators[0];
        
        // 現在の音程表示
        const noteIndex = this.currentNoteIndex;
        document.getElementById('current-note').textContent = this.notes[noteIndex];
        document.getElementById('target-pitch').textContent = `${this.notes[noteIndex]} (${Math.round(frequency)}Hz)`;
    }
    
    createReverbImpulse() {
        const length = this.audioContext.sampleRate * 2; // 2秒のリバーブ
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, 2);
                channelData[i] = (Math.random() * 2 - 1) * decay * 0.1;
            }
        }
        
        return impulse;
    }
    
    async recordUserSinging(targetFrequency, duration) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const samples = [];
            
            const samplePitch = () => {
                if (Date.now() - startTime >= duration) {
                    // 記録終了
                    const accuracy = this.calculateAccuracy(samples, targetFrequency);
                    resolve({
                        note: this.notes[this.currentNoteIndex],
                        targetFrequency,
                        samples,
                        accuracy,
                        timestamp: Date.now()
                    });
                    return;
                }
                
                this.analyzer.getFloatFrequencyData(this.dataArray);
                const pitch = this.getPitchFromFFT(this.dataArray);
                
                if (pitch) {
                    samples.push(pitch);
                }
                
                setTimeout(samplePitch, 50); // 20Hz sampling
            };
            
            samplePitch();
        });
    }
    
    calculateAccuracy(samples, targetFrequency) {
        if (samples.length === 0) return 0;
        
        const validSamples = samples.filter(sample => 
            sample > targetFrequency * 0.5 && sample < targetFrequency * 2
        );
        
        if (validSamples.length === 0) return 0;
        
        const avgFrequency = validSamples.reduce((sum, freq) => sum + freq, 0) / validSamples.length;
        const cents = 1200 * Math.log2(avgFrequency / targetFrequency);
        const accuracy = Math.max(0, 100 - Math.abs(cents) * 2);
        
        return Math.round(accuracy);
    }
    
    updateProgress() {
        const progress = ((this.currentNoteIndex + 1) / this.notes.length) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;
        document.getElementById('progress-text').textContent = `${this.currentNoteIndex + 1}/${this.notes.length}`;
    }
    
    showTrainingScreen() {
        document.getElementById('mode-selection').style.display = 'none';
        document.getElementById('training-screen').style.display = 'block';
        document.getElementById('results-screen').style.display = 'none';
    }
    
    showResults() {
        this.isTraining = false;
        document.getElementById('training-screen').style.display = 'none';
        document.getElementById('results-screen').style.display = 'block';
        
        this.displayResults();
        this.saveResults();
    }
    
    displayResults() {
        const totalScore = Math.round(
            this.trainingResults.reduce((sum, result) => sum + result.accuracy, 0) / this.trainingResults.length
        );
        
        const accurateCount = this.trainingResults.filter(r => r.accuracy >= 75).length;
        const accuracyRate = Math.round((accurateCount / this.trainingResults.length) * 100);
        
        document.getElementById('total-score').textContent = `${totalScore}点`;
        document.getElementById('accuracy-rate').textContent = `${accuracyRate}%`;
        
        this.displayDetailedResults();
        this.drawResultsChart();
    }
    
    displayDetailedResults() {
        const container = document.getElementById('note-results');
        container.innerHTML = '';
        
        this.trainingResults.forEach((result) => {
            const div = document.createElement('div');
            div.className = `note-result ${result.accuracy >= 75 ? 'accurate' : 'inaccurate'}`;
            
            div.innerHTML = `
                <div class="note-name">${result.note}</div>
                <div class="note-accuracy">${result.accuracy}点</div>
            `;
            
            container.appendChild(div);
        });
    }
    
    drawResultsChart() {
        const ctx = document.getElementById('results-chart').getContext('2d');
        
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: this.trainingResults.map(r => r.note),
                datasets: [{
                    label: '精度',
                    data: this.trainingResults.map(r => r.accuracy),
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
    
    saveResults() {
        const results = {
            date: new Date().toISOString(),
            gender: this.selectedGender,
            training: this.selectedTraining,
            totalScore: Math.round(this.trainingResults.reduce((sum, result) => sum + result.accuracy, 0) / this.trainingResults.length),
            details: this.trainingResults
        };
        
        const history = JSON.parse(localStorage.getItem('pitchTrainingHistory') || '[]');
        history.push(results);
        localStorage.setItem('pitchTrainingHistory', JSON.stringify(history));
    }
    
    shareResults() {
        const totalScore = Math.round(
            this.trainingResults.reduce((sum, result) => sum + result.accuracy, 0) / this.trainingResults.length
        );
        
        const text = `音程トレーニングで${totalScore}点獲得！🎵\n#音程トレーニング #歌唱練習`;
        const url = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: '音程トレーニング結果',
                text: text,
                url: url
            });
        } else {
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            window.open(twitterUrl, '_blank');
        }
    }
    
    stopTraining() {
        console.log('トレーニング停止開始...');
        this.isTraining = false;
        
        // マイクストリームを停止
        if (this.mediaStream) {
            console.log('マイクストリーム停止中...');
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
                console.log('トラック停止:', track.kind);
            });
            this.mediaStream = null;
        }
        
        // マイクノードを切断
        if (this.microphone) {
            console.log('マイクノード切断中...');
            this.microphone.disconnect();
            this.microphone = null;
        }
        
        // AudioContextを閉じる
        if (this.audioContext && this.audioContext.state !== 'closed') {
            console.log('AudioContext終了中...');
            this.audioContext.close();
            this.audioContext = null;
        }
        
        console.log('トレーニング停止完了');
        this.resetApp();
    }
    
    resetApp() {
        this.isTraining = false;
        this.currentNoteIndex = 0;
        this.trainingResults = [];
        
        document.getElementById('mode-selection').style.display = 'block';
        document.getElementById('training-screen').style.display = 'none';
        document.getElementById('results-screen').style.display = 'none';
        
        // 選択状態をリセット
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('selected'));
        this.selectedGender = null;
        this.selectedTraining = null;
        this.updateStartButton();
    }
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// アプリ初期化
document.addEventListener('DOMContentLoaded', () => {
    new PitchTrainingApp();
});