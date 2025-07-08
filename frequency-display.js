class FrequencyDisplay {
    constructor() {
        console.log('🎤 FrequencyDisplay v1.0.0 初期化開始');
        
        // 基本プロパティ
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
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.noteNamesJP = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
        
        // 初期化
        this.setupEventListeners();
        this.log('🎤 FrequencyDisplay v1.0.0 初期化完了');
    }
    
    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startCapture();
        });
        
        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopCapture();
        });
    }
    
    async startCapture() {
        try {
            this.log('🚀 マイクキャプチャ開始...');
            
            // UI更新
            document.getElementById('start-btn').style.display = 'none';
            document.getElementById('stop-btn').style.display = 'inline-block';
            
            // AudioContext初期化
            await this.initAudioContext();
            
            // マイクアクセス（mic-test成功手法）
            await this.initMicrophone();
            
            // isRunningを先に設定
            this.isRunning = true;
            
            // 周波数検出開始
            this.startFrequencyDetection();
            
            this.log('✅ 周波数検出開始');
            
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
        this.log(`✅ AudioContext: ${this.audioContext.state}`);
    }
    
    async initMicrophone() {
        this.log('🎤 マイクアクセス要求中...');
        
        // mic-test成功手法: シンプルな制約
        const constraints = { audio: true };
        this.log('📋 マイク制約:', constraints);
        
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        this.log(`📡 マイクストリーム取得成功 (ID: ${this.mediaStream.id})`);
        this.updateStatus('mic-status', 'アクティブ', 'active');
        
        // オーディオ解析器設定（mic-test成功手法）
        this.analyzer = this.audioContext.createAnalyser();
        this.analyzer.fftSize = 2048;
        this.analyzer.smoothingTimeConstant = 0.1;
        this.analyzer.minDecibels = -100;
        this.analyzer.maxDecibels = -10;
        
        this.log('📊 アナライザー設定完了');
        
        // マイク接続（mic-test成功手法: ゲインノード経由）
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
        
        // データ取得テスト
        setTimeout(() => this.testDataFlow(), 500);
    }
    
    testDataFlow() {
        this.log('🔍 データフローテスト開始...');
        
        const timeData = new Uint8Array(this.analyzer.fftSize);
        const freqData = new Float32Array(this.analyzer.frequencyBinCount);
        
        this.analyzer.getByteTimeDomainData(timeData);
        this.analyzer.getFloatFrequencyData(freqData);
        
        const timeDataActive = timeData.filter(v => v !== 128).length;
        const freqDataActive = freqData.filter(v => v > -Infinity).length;
        
        this.log(`📊 データフローテスト: 時間=${timeDataActive}/${timeData.length}, 周波数=${freqDataActive}/${freqData.length}`);
        
        if (timeDataActive > 0 || freqDataActive > 0) {
            this.log('✅ データフロー正常');
        } else {
            this.log('⚠️ データフロー確認できず');
        }
    }
    
    startFrequencyDetection() {
        this.log('📊 周波数検出ループ開始');
        
        const detectLoop = () => {
            if (!this.isRunning) {
                this.log('⚠️ 周波数検出停止: isRunning=false');
                return;
            }
            
            this.frameCount++;
            this.updateStatus('frame-count', this.frameCount.toString());
            
            // データ取得
            const timeData = new Uint8Array(this.analyzer.fftSize);
            const freqData = new Float32Array(this.analyzer.frequencyBinCount);
            
            this.analyzer.getByteTimeDomainData(timeData);
            this.analyzer.getFloatFrequencyData(freqData);
            
            // 音量計算
            const volume = this.calculateVolume(timeData);
            this.updateStatus('volume-status', `${Math.round(volume)}%`, volume > 1 ? 'active' : '');
            
            // 周波数検出
            const frequency = this.detectPitch(freqData);
            
            // 周波数表示更新
            this.updateFrequencyDisplay(frequency);
            
            // 音程検出
            if (frequency > 0) {
                const noteInfo = this.frequencyToNote(frequency);
                this.updateNoteDisplay(noteInfo);
            } else {
                this.updateNoteDisplay(null);
            }
            
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
        
        // 閾値チェック
        if (maxValue < -70) return 0; // -70dB以下は無視
        
        const nyquist = this.audioContext.sampleRate / 2;
        const frequency = (maxIndex * nyquist) / freqData.length;
        
        return frequency;
    }
    
    frequencyToNote(frequency) {
        // A4 (440Hz) からの半音数を計算
        const A4 = 440;
        const noteNumber = 12 * Math.log2(frequency / A4);
        const roundedNoteNumber = Math.round(noteNumber);
        
        // セント (音程の精度、100セント = 1半音)
        const cents = Math.round((noteNumber - roundedNoteNumber) * 100);
        
        // 音程名を取得 (A4を基準とした相対位置)
        const noteIndex = ((roundedNoteNumber % 12) + 12) % 12; // 正の値に調整
        const octave = Math.floor((roundedNoteNumber + 57) / 12); // A4 = オクターブ4
        
        // 日本語音程名 + オクターブ
        const noteName = this.noteNamesJP[noteIndex] + octave;
        
        return {
            name: noteName,
            cents: cents,
            frequency: frequency,
            noteNumber: roundedNoteNumber
        };
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
    
    updateNoteDisplay(noteInfo) {
        const noteElement = document.getElementById('note-display');
        const accuracyElement = document.getElementById('accuracy-display');
        
        if (noteInfo && noteElement && accuracyElement) {
            noteElement.textContent = `音程: ${noteInfo.name}`;
            noteElement.style.color = '#667eea';
            
            accuracyElement.textContent = `精度: ${noteInfo.cents > 0 ? '+' : ''}${noteInfo.cents}¢`;
            
            // 精度による色分け
            if (Math.abs(noteInfo.cents) < 10) {
                accuracyElement.style.color = '#4CAF50'; // 緑：正確
            } else if (Math.abs(noteInfo.cents) < 30) {
                accuracyElement.style.color = '#FF9800'; // オレンジ：まあまあ
            } else {
                accuracyElement.style.color = '#f44336'; // 赤：ずれている
            }
        } else if (noteElement && accuracyElement) {
            noteElement.textContent = '音程: ---';
            noteElement.style.color = '#999';
            accuracyElement.textContent = '精度: ---';
            accuracyElement.style.color = '#999';
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
    
    stopCapture() {
        this.log('⏹️ 周波数検出停止中...');
        
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
        this.log('✅ 周波数検出完全停止');
    }
    
    resetUI() {
        document.getElementById('start-btn').style.display = 'inline-block';
        document.getElementById('stop-btn').style.display = 'none';
        
        // 表示リセット
        document.getElementById('frequency-main').textContent = '--- Hz';
        document.getElementById('frequency-main').style.color = '#999';
        document.getElementById('frequency-main').style.borderColor = '#e0e0e0';
        
        document.getElementById('note-display').textContent = '音程: ---';
        document.getElementById('note-display').style.color = '#999';
        
        document.getElementById('accuracy-display').textContent = '精度: ---';
        document.getElementById('accuracy-display').style.color = '#999';
        
        this.updateStatus('mic-status', '未接続');
        this.updateStatus('volume-status', '0%');
        this.updateStatus('audio-status', '未初期化');
        this.updateStatus('frame-count', '0');
        
        // Canvas クリア
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#999';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('マイク停止中', this.canvas.width/2, this.canvas.height/2);
    }
    
    updateStatus(elementId, value, className = '') {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            element.className = `status-value ${className}`;
        }
    }
    
    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logLine = `[${timestamp}] ${message}`;
        console.log(logLine);
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    new FrequencyDisplay();
});