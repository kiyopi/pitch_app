class MicrophoneTest {
    constructor() {
        this.audioContext = null;
        this.analyzer = null;
        this.microphone = null;
        this.mediaStream = null;
        this.isRunning = false;
        this.frameCount = 0;
        
        this.canvas = document.getElementById('waveform-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.setupEventListeners();
        this.log('🎤 マイクテストクラス初期化完了');
    }
    
    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startTest();
        });
        
        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopTest();
        });
    }
    
    async startTest() {
        try {
            this.log('🚀 マイクテスト開始...');
            
            // UI更新
            document.getElementById('start-btn').style.display = 'none';
            document.getElementById('stop-btn').style.display = 'block';
            
            // AudioContext初期化
            await this.initAudioContext();
            
            // マイクアクセス
            await this.initMicrophone();
            
            // データ取得開始
            this.startDataCollection();
            
            this.isRunning = true;
            this.log('✅ マイクテスト正常開始');
            
        } catch (error) {
            this.log(`❌ エラー: ${error.message}`);
            this.resetUI();
        }
    }
    
    async initAudioContext() {
        this.log('🎛️ AudioContext初期化中...');
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.updateStatus('audio-status', this.audioContext.state, 'active');
        
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            this.log('🔄 AudioContext再開完了');
        }
        
        this.updateStatus('audio-status', this.audioContext.state, 'active');
    }
    
    async initMicrophone() {
        this.log('🎤 マイクアクセス要求中...');
        
        const constraints = { audio: true };
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        this.log(`📡 マイクストリーム取得成功 (ID: ${this.mediaStream.id})`);
        this.updateStatus('mic-status', 'アクティブ', 'active');
        
        // オーディオ解析器設定
        this.analyzer = this.audioContext.createAnalyser();
        this.analyzer.fftSize = 2048;
        this.analyzer.smoothingTimeConstant = 0.1;
        this.analyzer.minDecibels = -100;
        this.analyzer.maxDecibels = -10;
        
        // マイク接続
        this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        // ゲインノード経由で接続（データフロー確保）
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 1.0;
        
        this.microphone.connect(gainNode);
        gainNode.connect(this.analyzer);
        
        // 出力先接続（Safari対応）
        const outputGain = this.audioContext.createGain();
        outputGain.gain.value = 0; // 音は出さない
        this.analyzer.connect(outputGain);
        outputGain.connect(this.audioContext.destination);
        
        this.log('🔗 オーディオグラフ接続完了');
        
        // データ取得テスト
        setTimeout(() => this.testDataFlow(), 500);
    }
    
    testDataFlow() {
        const timeData = new Uint8Array(this.analyzer.fftSize);
        const freqData = new Float32Array(this.analyzer.frequencyBinCount);
        
        this.analyzer.getByteTimeDomainData(timeData);
        this.analyzer.getFloatFrequencyData(freqData);
        
        const timeDataActive = timeData.filter(v => v !== 128).length;
        const freqDataActive = freqData.filter(v => v > -Infinity).length;
        
        this.log(`📊 データフローテスト: 時間=${timeDataActive}/${timeData.length}, 周波数=${freqDataActive}/${freqData.length}`);
        
        if (timeDataActive > 0 || freqDataActive > 0) {
            this.updateStatus('data-status', '取得中', 'active');
        } else {
            this.updateStatus('data-status', 'データなし', 'error');
        }
    }
    
    startDataCollection() {
        const collectData = () => {
            if (!this.isRunning) return;
            
            this.frameCount++;
            this.updateStatus('frame-count', this.frameCount.toString());
            
            // データ取得
            const timeData = new Uint8Array(this.analyzer.fftSize);
            const freqData = new Float32Array(this.analyzer.frequencyBinCount);
            
            this.analyzer.getByteTimeDomainData(timeData);
            this.analyzer.getFloatFrequencyData(freqData);
            
            // 音量計算
            const volume = this.calculateVolume(timeData);
            this.updateStatus('volume-value', `${Math.round(volume)}%`, volume > 1 ? 'active' : '');
            
            // 周波数検出
            const frequency = this.detectPitch(freqData);
            if (frequency > 0) {
                this.updateStatus('frequency-value', `${Math.round(frequency)}Hz`, 'active');
            } else {
                this.updateStatus('frequency-value', '検出なし');
            }
            
            // 波形描画
            this.drawWaveform(timeData, volume);
            
            // データ状態更新
            const dataActive = timeData.filter(v => v !== 128).length;
            if (dataActive > 100) {
                this.updateStatus('data-status', '正常取得', 'active');
            } else if (dataActive > 0) {
                this.updateStatus('data-status', '微弱信号');
            } else {
                this.updateStatus('data-status', 'データなし', 'error');
            }
            
            // ログ出力（10秒ごと）
            if (this.frameCount % 600 === 0) {
                this.log(`📈 ${this.frameCount}フレーム処理完了 - 音量:${Math.round(volume)}% データ:${dataActive}`);
            }
            
            requestAnimationFrame(collectData);
        };
        
        collectData();
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
        
        if (maxValue < -60) return 0; // 閾値以下は無視
        
        const nyquist = this.audioContext.sampleRate / 2;
        return (maxIndex * nyquist) / freqData.length;
    }
    
    drawWaveform(timeData, volume) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 背景クリア
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, width, height);
        
        // 中央線
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, height / 2);
        this.ctx.lineTo(width - 80, height / 2);
        this.ctx.stroke();
        
        // 波形描画
        const waveformWidth = width - 80;
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = volume > 5 ? '#667eea' : '#ffb74d';
        this.ctx.beginPath();
        
        for (let i = 0; i < timeData.length; i += 3) {
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
        
        // 音量バー
        this.drawVolumeBar(volume, width, height);
        
        // 状態表示
        this.ctx.fillStyle = '#333';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`音量: ${Math.round(volume)}%`, 10, 20);
        
        const dataPoints = timeData.filter(v => v !== 128).length;
        this.ctx.fillText(`データ: ${dataPoints}/${timeData.length}`, 10, 35);
    }
    
    drawVolumeBar(volume, width, height) {
        const barWidth = 20;
        const barHeight = height * 0.8;
        const barX = width - 50;
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
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🎤', barX + barWidth/2, barY - 10);
    }
    
    stopTest() {
        this.log('⏹️ マイクテスト停止中...');
        
        this.isRunning = false;
        
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
        this.log('✅ マイクテスト完全停止');
    }
    
    resetUI() {
        document.getElementById('start-btn').style.display = 'block';
        document.getElementById('stop-btn').style.display = 'none';
        
        this.updateStatus('frequency-value', '待機中');
        this.updateStatus('volume-value', '待機中');
        this.updateStatus('mic-status', '未接続');
        this.updateStatus('audio-status', '未初期化');
        this.updateStatus('data-status', '停止中');
        this.updateStatus('frame-count', '0');
        
        // Canvas クリア
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#999';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('マイクテスト停止中', this.canvas.width/2, this.canvas.height/2);
    }
    
    updateStatus(elementId, value, className = '') {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            element.className = `status-value ${className}`;
        }
    }
    
    log(message) {
        const logContainer = document.getElementById('log-container');
        const timestamp = new Date().toLocaleTimeString();
        const logLine = `[${timestamp}] ${message}`;
        
        logContainer.innerHTML += `\n${logLine}`;
        logContainer.scrollTop = logContainer.scrollHeight;
        
        console.log(logLine);
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    new MicrophoneTest();
});