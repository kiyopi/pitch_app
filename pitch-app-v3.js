class PitchTrainingAppV3 {
    constructor() {
        console.log('🎵 PitchTrainingApp v3.3.1 初期化開始 (周波数デバッグ追加)');
        
        // 基本プロパティ
        this.audioContext = null;
        this.analyzer = null;
        this.microphone = null;
        this.mediaStream = null;
        this.isRunning = false;
        this.frameCount = 0;
        
        // トレーニング用プロパティ
        this.isTraining = false;
        this.currentNoteIndex = 0;
        this.targetNotes = ['ド4', 'レ4', 'ミ4', 'ファ4', 'ソ4', 'ラ4', 'シ4', 'ド5'];
        this.targetFrequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
        
        // 音程判定用
        this.accuracyThreshold = 20; // ±20セント以内で正解
        this.consecutiveCorrect = 0;
        this.requiredConsecutive = 15; // 15フレーム連続で正解なら次へ（約0.25秒）
        
        // Canvas設定
        this.canvas = document.getElementById('waveform-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 音程検出用データ
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.noteNamesJP = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
        
        // 基準周波数 (A4 = 440Hz)
        this.A4 = 440;
        
        // 初期化
        this.setupEventListeners();
        this.log('🎵 PitchTrainingApp v3.3.1 初期化完了');
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
            this.log('🚀 音程トレーニング開始...');
            
            // UI更新
            document.getElementById('start-btn').style.display = 'none';
            document.getElementById('stop-btn').style.display = 'inline-block';
            
            // AudioContext初期化
            await this.initAudioContext();
            
            // マイクアクセス（mic-test成功手法）
            await this.initMicrophone();
            
            // トレーニング開始
            this.startTraining();
            
            this.isRunning = true;
            this.log('✅ 音程トレーニング正常開始');
            
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
    
    startTraining() {
        this.log('🎯 トレーニングモード開始');
        this.isTraining = true;
        this.currentNoteIndex = 0;
        
        // 最初の音程を表示
        this.showCurrentNote();
        
        // データ取得開始
        this.log('🔄 データ取得開始...');
        this.startDataCollection();
    }
    
    showCurrentNote() {
        const noteElement = document.getElementById('training-note');
        if (noteElement) {
            const currentNote = this.targetNotes[this.currentNoteIndex];
            const targetFreq = this.targetFrequencies[this.currentNoteIndex];
            const progress = `${this.currentNoteIndex + 1}/${this.targetNotes.length}`;
            noteElement.textContent = `♪ ${currentNote} ♪ (${progress})`;
            this.log(`🎵 現在の目標: ${currentNote} (${progress}) - ${Math.round(targetFreq)}Hz`);
        }
    }
    
    updateFrequencyDisplay(frequency) {
        const element = document.getElementById('frequency-display');
        if (element) {
            if (frequency > 0) {
                const targetFreq = this.isTraining ? this.targetFrequencies[this.currentNoteIndex] : 0;
                const targetNote = this.isTraining ? this.targetNotes[this.currentNoteIndex] : '';
                
                if (targetFreq > 0) {
                    const diff = frequency - targetFreq;
                    const diffText = diff > 0 ? `+${Math.round(diff)}` : Math.round(diff);
                    element.textContent = `現在: ${Math.round(frequency)}Hz | 目標: ${Math.round(targetFreq)}Hz (${targetNote}) | 差: ${diffText}Hz`;
                } else {
                    element.textContent = `現在の周波数: ${Math.round(frequency)}Hz`;
                }
                element.style.background = '#e8f5e8';
                element.style.borderColor = '#4CAF50';
            } else {
                element.textContent = '現在の周波数: 検出なし';
                element.style.background = '#ffebee';
                element.style.borderColor = '#f44336';
            }
        }
    }
    
    checkNoteAccuracy(frequency, noteInfo) {
        const targetFreq = this.targetFrequencies[this.currentNoteIndex];
        const targetNote = this.targetNotes[this.currentNoteIndex];
        
        // 現在の音程と目標音程の差をセントで計算
        const cents = 1200 * Math.log2(frequency / targetFreq);
        
        // 精度判定
        if (Math.abs(cents) <= this.accuracyThreshold) {
            this.consecutiveCorrect++;
            this.log(`✅ 正確! ${targetNote} (${this.consecutiveCorrect}/${this.requiredConsecutive})`);
            
            // 必要フレーム数連続で正解なら次へ
            if (this.consecutiveCorrect >= this.requiredConsecutive) {
                this.advanceToNextNote();
            }
        } else {
            if (this.consecutiveCorrect > 0) {
                this.log(`❌ 音程ずれ: ${Math.round(cents)}¢`);
            }
            this.consecutiveCorrect = 0;
        }
    }
    
    advanceToNextNote() {
        this.consecutiveCorrect = 0;
        this.currentNoteIndex++;
        
        if (this.currentNoteIndex >= this.targetNotes.length) {
            // 全て完了
            this.completeTraining();
        } else {
            // 次の音程へ
            this.showCurrentNote();
            this.log(`🎉 ${this.targetNotes[this.currentNoteIndex - 1]} クリア! 次は ${this.targetNotes[this.currentNoteIndex]}`);
        }
    }
    
    completeTraining() {
        this.log('🎊 トレーニング完了! おめでとうございます!');
        const noteElement = document.getElementById('training-note');
        if (noteElement) {
            noteElement.textContent = '🎊 完了! おめでとうございます! 🎊';
        }
        
        // 3秒後に停止
        setTimeout(() => {
            this.stopTest();
        }, 3000);
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
            this.updateStatus('data-status', '取得中', 'active');
            this.log('✅ データフロー正常');
        } else {
            this.updateStatus('data-status', 'データなし', 'error');
            this.log('⚠️ データフロー確認できず');
        }
    }
    
    startDataCollection() {
        this.log('📊 データ収集ループ開始');
        
        const collectData = () => {
            if (!this.isRunning) {
                this.log('⚠️ データ収集停止: isRunning=false');
                return;
            }
            
            this.frameCount++;
            this.updateStatus('frame-count', this.frameCount.toString());
            
            // 最初の数フレームでデバッグ
            if (this.frameCount <= 3) {
                this.log(`📈 フレーム ${this.frameCount}: データ収集中...`);
            }
            
            // データ取得
            if (!this.analyzer) {
                this.log('❌ アナライザーが存在しません');
                return;
            }
            
            const timeData = new Uint8Array(this.analyzer.fftSize);
            const freqData = new Float32Array(this.analyzer.frequencyBinCount);
            
            this.analyzer.getByteTimeDomainData(timeData);
            this.analyzer.getFloatFrequencyData(freqData);
            
            // 最初の数フレームでデータを確認
            if (this.frameCount <= 3) {
                this.log(`📊 データサンプル ${this.frameCount}:`, {
                    timeDataSample: timeData.slice(0, 5),
                    freqDataSample: freqData.slice(0, 5),
                    timeDataActive: timeData.filter(v => v !== 128).length,
                    freqDataActive: freqData.filter(v => v > -Infinity).length
                });
            }
            
            // 音量計算（mic-test成功手法）
            const volume = this.calculateVolume(timeData);
            this.updateStatus('volume-value', `${Math.round(volume)}%`, volume > 1 ? 'active' : '');
            
            // 周波数検出（mic-test成功手法）
            const frequency = this.detectPitch(freqData);
            
            // 強制的に周波数表示を更新（デバッグ用）
            this.updateFrequencyDisplay(frequency);
            
            if (frequency > 0) {
                this.updateStatus('frequency-value', `${Math.round(frequency)}Hz`, 'active');
                
                // 音程検出追加
                const noteInfo = this.frequencyToNote(frequency);
                this.updateStatus('note-name', noteInfo.name, 'active');
                this.updateStatus('note-accuracy', `${noteInfo.cents}¢`, 
                    Math.abs(noteInfo.cents) < 10 ? 'active' : '');
                
                // トレーニング中の音程判定
                if (this.isTraining) {
                    this.checkNoteAccuracy(frequency, noteInfo);
                }
            } else {
                this.updateStatus('frequency-value', '検出なし');
                this.updateStatus('note-name', '-');
                this.updateStatus('note-accuracy', '-');
                
                // 音量をチェックして表示
                if (this.frameCount % 30 === 0) {
                    console.log(`❌ 周波数検出失敗 - 音量: ${Math.round(volume)}% データ活性: ${dataActive}`);
                }
            }
            
            // 波形描画（mic-test成功手法）
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
        
        // デバッグ情報
        if (this.frameCount % 60 === 0) { // 1秒ごと
            console.log('🔍 周波数検出デバッグ:', {
                freqDataLength: freqData.length,
                sampleRate: this.audioContext.sampleRate,
                minBin, maxBin,
                freqDataSample: freqData.slice(0, 10),
                maxInRange: Math.max(...freqData.slice(minBin, Math.min(maxBin, freqData.length)))
            });
        }
        
        for (let i = minBin; i < maxBin; i++) {
            if (freqData[i] > maxValue) {
                maxValue = freqData[i];
                maxIndex = i;
            }
        }
        
        // 閾値を下げてテスト
        if (maxValue < -80) return 0; // 閾値を-60から-80に下げる
        
        const nyquist = this.audioContext.sampleRate / 2;
        const frequency = (maxIndex * nyquist) / freqData.length;
        
        // 検出時にログ出力
        if (frequency > 0 && this.frameCount % 30 === 0) {
            console.log(`🎵 周波数検出: ${Math.round(frequency)}Hz (maxValue: ${Math.round(maxValue)}dB)`);
        }
        
        return frequency;
    }
    
    // 周波数から音程を検出
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
        
        // 音量バー描画
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
        this.log('⏹️ 音程トレーニング停止中...');
        
        this.isRunning = false;
        this.isTraining = false;
        this.consecutiveCorrect = 0;
        
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
        this.log('✅ 音程トレーニング完全停止');
    }
    
    resetUI() {
        document.getElementById('start-btn').style.display = 'inline-block';
        document.getElementById('stop-btn').style.display = 'none';
        
        this.updateStatus('frequency-value', '待機中');
        this.updateStatus('volume-value', '待機中');
        this.updateStatus('mic-status', '未接続');
        this.updateStatus('audio-status', '未初期化');
        this.updateStatus('data-status', '停止中');
        this.updateStatus('frame-count', '0');
        this.updateStatus('note-name', '-');
        this.updateStatus('note-accuracy', '-');
        
        // トレーニング表示リセット
        const noteElement = document.getElementById('training-note');
        if (noteElement) {
            noteElement.textContent = '準備中...';
        }
        
        // 周波数表示リセット
        const freqElement = document.getElementById('frequency-display');
        if (freqElement) {
            freqElement.textContent = '現在の周波数: - Hz';
            freqElement.style.background = '#e8f5e8';
            freqElement.style.borderColor = '#4CAF50';
        }
        
        // Canvas クリア
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#999';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('トレーニング停止中', this.canvas.width/2, this.canvas.height/2);
    }
    
    updateStatus(elementId, value, className = '') {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            element.className = `debug-value ${className}`;
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
    new PitchTrainingAppV3();
});