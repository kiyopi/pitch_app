class SimplePitchTest {
    constructor() {
        console.log('🎵 SimplePitchTest v1.0.0 初期化開始');
        
        // 基本プロパティ（frequency-display.jsからコピー）
        this.audioContext = null;
        this.analyzer = null;
        this.microphone = null;
        this.mediaStream = null;
        this.isRunning = false;
        this.frameCount = 0;
        
        // Canvas設定
        this.canvas = document.getElementById('waveform-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 音程検出用データ
        this.noteNamesJP = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
        
        // Do4設定
        this.targetFrequency = 261.63; // Do4
        this.targetNote = 'Do4';
        this.accuracyThreshold = 20; // ±20セント以内で正解
        
        // 基音再生用
        this.referenceOscillator = null;
        this.referenceGain = null;
        
        // 初期化
        this.setupEventListeners();
        this.log('🎵 SimplePitchTest v1.0.0 初期化完了');
    }
    
    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startTest();
        });
        
        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopTest();
        });
        
        document.getElementById('play-btn').addEventListener('click', () => {
            this.playReferenceNote();
        });
    }
    
    async startTest() {
        try {
            this.log('🚀 テスト開始...');
            
            // UI更新
            document.getElementById('start-btn').style.display = 'none';
            document.getElementById('stop-btn').style.display = 'inline-block';
            document.getElementById('play-btn').style.display = 'inline-block';
            document.getElementById('target-section').style.display = 'block';
            document.getElementById('judgment-section').style.display = 'block';
            
            // AudioContext初期化
            await this.initAudioContext();
            
            // マイクアクセス（frequency-display成功手法）
            await this.initMicrophone();
            
            // isRunningを先に設定
            this.isRunning = true;
            
            // 周波数検出開始
            this.startFrequencyDetection();
            
            this.log('✅ テスト開始成功');
            
        } catch (error) {
            this.log(`❌ エラー: ${error.message}`);
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
    
    async initMicrophone() {
        this.log('🎤 マイクアクセス要求中...');
        
        // frequency-display成功手法: シンプルな制約
        const constraints = { audio: true };
        this.log('📋 マイク制約:', constraints);
        
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        this.log(`📡 マイクストリーム取得成功 (ID: ${this.mediaStream.id})`);
        
        // オーディオ解析器設定（frequency-display成功手法）
        this.analyzer = this.audioContext.createAnalyser();
        this.analyzer.fftSize = 2048;
        this.analyzer.smoothingTimeConstant = 0.1;
        this.analyzer.minDecibels = -100;
        this.analyzer.maxDecibels = -10;
        
        this.log('📊 アナライザー設定完了');
        
        // マイク接続（frequency-display成功手法: ゲインノード経由）
        this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 1.0;
        
        this.microphone.connect(gainNode);
        gainNode.connect(this.analyzer);
        
        this.log('🔗 ゲインノード経由接続完了');
        
        // 出力先接続（Safari対応）
        const outputGain = this.audioContext.createGain();
        outputGain.gain.value = 0; // 音は出さない
        this.analyzer.connect(outputGain);
        outputGain.connect(this.audioContext.destination);
        
        this.log('🔌 出力先接続完了');
    }
    
    startFrequencyDetection() {
        this.log('📊 周波数検出ループ開始');
        
        const detectLoop = () => {
            if (!this.isRunning) {
                this.log('⚠️ 周波数検出停止: isRunning=false');
                return;
            }
            
            this.frameCount++;
            
            // データ取得（frequency-display成功手法）
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
            
            // 音程判定
            this.judgeAccuracy(frequency);
            
            // 波形描画
            this.drawWaveform(timeData, volume);
            
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
    
    judgeAccuracy(frequency) {
        const statusElement = document.getElementById('judgment-status');
        const detailElement = document.getElementById('judgment-detail');
        
        if (frequency <= 0) {
            statusElement.textContent = '歌ってください';
            statusElement.className = 'judgment-status';
            detailElement.textContent = '基音を聞いてから同じ高さで歌ってください';
            return;
        }
        
        // セント計算
        const cents = 1200 * Math.log2(frequency / this.targetFrequency);
        const centRounded = Math.round(cents);
        
        // 判定
        if (Math.abs(cents) <= 10) {
            statusElement.textContent = '🎉 完璧！';
            statusElement.className = 'judgment-status perfect';
            detailElement.textContent = `誤差: ${centRounded > 0 ? '+' : ''}${centRounded}¢ (±10¢以内)`;
        } else if (Math.abs(cents) <= this.accuracyThreshold) {
            statusElement.textContent = '👍 良い！';
            statusElement.className = 'judgment-status good';
            detailElement.textContent = `誤差: ${centRounded > 0 ? '+' : ''}${centRounded}¢ (±20¢以内)`;
        } else {
            statusElement.textContent = '📈 調整が必要';
            statusElement.className = 'judgment-status needs-work';
            if (cents > 0) {
                detailElement.textContent = `高すぎます: +${centRounded}¢ (もう少し低く)`;
            } else {
                detailElement.textContent = `低すぎます: ${centRounded}¢ (もう少し高く)`;
            }
        }
        
        this.log(`🎵 判定: 周波数=${Math.round(frequency)}Hz, 誤差=${centRounded}¢`);
    }
    
    playReferenceNote() {
        this.log(`🔊 Do4 (${Math.round(this.targetFrequency)}Hz) 再生開始`);
        
        // 既存の再生を停止
        this.stopReferenceNote();
        
        // オシレーター作成
        this.referenceOscillator = this.audioContext.createOscillator();
        this.referenceGain = this.audioContext.createGain();
        
        // 設定
        this.referenceOscillator.frequency.setValueAtTime(this.targetFrequency, this.audioContext.currentTime);
        this.referenceOscillator.type = 'sine'; // 純音
        
        // 音量設定（フェードイン・アウト）
        this.referenceGain.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.referenceGain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
        this.referenceGain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 1.5);
        this.referenceGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 2.0);
        
        // 接続
        this.referenceOscillator.connect(this.referenceGain);
        this.referenceGain.connect(this.audioContext.destination);
        
        // 再生（2秒間）
        this.referenceOscillator.start(this.audioContext.currentTime);
        this.referenceOscillator.stop(this.audioContext.currentTime + 2.0);
        
        // 終了時にクリーンアップ
        this.referenceOscillator.addEventListener('ended', () => {
            this.stopReferenceNote();
        });
        
        this.log(`🎵 Do4 (${Math.round(this.targetFrequency)}Hz) 再生中...`);
    }
    
    stopReferenceNote() {
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
    
    drawWaveform(timeData, volume) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 背景クリア
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, width, height);
        
        // 中央線
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, height / 2);
        this.ctx.lineTo(width - 60, height / 2);
        this.ctx.stroke();
        
        // 波形描画
        const waveformWidth = width - 60;
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = volume > 5 ? '#667eea' : '#ffb74d';
        this.ctx.beginPath();
        
        for (let i = 0; i < timeData.length; i += 4) {
            const v = (timeData[i] - 128) / 128.0;
            const x = (i / timeData.length) * waveformWidth;
            const y = (height / 2) + (v * height / 3);
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
        
        // 音量バー描画
        this.drawVolumeBar(volume, width, height);
    }
    
    drawVolumeBar(volume, width, height) {
        const barWidth = 15;
        const barHeight = height * 0.8;
        const barX = width - 40;
        const barY = height * 0.1;
        
        // 背景
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // レベル
        const levelHeight = Math.min(volume / 100, 1) * barHeight;
        const levelY = barY + barHeight - levelHeight;
        
        if (volume > 80) {
            this.ctx.fillStyle = '#f44336';
        } else if (volume > 20) {
            this.ctx.fillStyle = '#4CAF50';
        } else if (volume > 5) {
            this.ctx.fillStyle = '#FF9800';
        } else {
            this.ctx.fillStyle = '#ccc';
        }
        
        this.ctx.fillRect(barX, levelY, barWidth, levelHeight);
        
        // マイクアイコン
        this.ctx.fillStyle = volume > 2 ? '#4CAF50' : '#ccc';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🎤', barX + barWidth/2, barY - 5);
    }
    
    stopTest() {
        this.log('⏹️ テスト停止中...');
        
        this.isRunning = false;
        
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
        this.log('✅ テスト完全停止');
    }
    
    resetUI() {
        document.getElementById('start-btn').style.display = 'inline-block';
        document.getElementById('stop-btn').style.display = 'none';
        document.getElementById('play-btn').style.display = 'none';
        document.getElementById('target-section').style.display = 'none';
        document.getElementById('judgment-section').style.display = 'none';
        
        // 表示リセット
        document.getElementById('frequency-main').textContent = '--- Hz';
        document.getElementById('frequency-main').style.color = '#999';
        document.getElementById('frequency-main').style.borderColor = '#e0e0e0';
        
        // Canvas クリア
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#999';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('テスト停止中', this.canvas.width/2, this.canvas.height/2);
        
        // 設定リセット
        this.frameCount = 0;
    }
    
    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logLine = `[${timestamp}] ${message}`;
        console.log(logLine);
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    new SimplePitchTest();
});