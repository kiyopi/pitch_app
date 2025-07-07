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
            alert('マイクへのアクセスが必要です。ブラウザの設定を確認してください。');
        }
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
        
        // AudioContextの状態をチェック
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('AudioContext作成:', this.audioContext.state);
        
        // AudioContextが中断されている場合は再開
        if (this.audioContext.state === 'suspended') {
            console.log('AudioContextを再開中...');
            await this.audioContext.resume();
        }
        
        // マイクデバイスの確認
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('このブラウザはマイクアクセスをサポートしていません');
        }
        
        console.log('マイクアクセス要求中...');
        return navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: 44100
            }
        })
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
                
                this.microphone = this.audioContext.createMediaStreamSource(stream);
                this.analyzer = this.audioContext.createAnalyser();
                
                this.analyzer.fftSize = 4096;
                this.analyzer.smoothingTimeConstant = 0.8;
                this.dataArray = new Float32Array(this.analyzer.frequencyBinCount);
                
                console.log('アナライザー設定完了');
                this.microphone.connect(this.analyzer);
                console.log('マイクをアナライザーに接続完了');
                
                // ストリームを保存（停止時に使用）
                this.mediaStream = stream;
                
                this.startPitchDetection();
                console.log('ピッチ検出開始');
            })
            .catch(error => {
                console.error('マイクアクセスエラー詳細:', error);
                console.error('エラー名:', error.name);
                console.error('エラーメッセージ:', error.message);
                
                let userMessage = 'マイクへのアクセスに失敗しました。';
                if (error.name === 'NotAllowedError') {
                    userMessage = 'マイクへのアクセスが拒否されました。ブラウザの設定でマイクを許可してください。';
                } else if (error.name === 'NotFoundError') {
                    userMessage = 'マイクが見つかりません。マイクが接続されていることを確認してください。';
                }
                
                alert(userMessage);
                throw error;
            });
    }
    
    startPitchDetection() {
        console.log('ピッチ検出ループ開始...');
        
        // マイクテスト用のカウンター
        let testCounter = 0;
        
        const detectPitch = () => {
            if (!this.isTraining) return;
            
            // 最初の10回でマイクデータをテスト
            if (testCounter < 10) {
                this.analyzer.getFloatFrequencyData(this.dataArray);
                const hasData = this.dataArray.some(value => value > -100);
                console.log(`マイクテスト ${testCounter + 1}/10:`, hasData ? '音声データあり' : '音声データなし');
                testCounter++;
            }
            
            this.analyzer.getFloatFrequencyData(this.dataArray);
            const pitch = this.getPitchFromFFT(this.dataArray);
            
            this.updatePitchDisplay(pitch);
            this.drawWaveform();
            
            requestAnimationFrame(detectPitch);
        };
        
        detectPitch();
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
        if (!this.canvasContext) return;
        
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
        this.canvasContext.lineTo(width - 50, height / 2); // 音量バーのスペースを空ける
        this.canvasContext.stroke();
        
        // 時間領域の波形データを取得
        const timeDataArray = new Uint8Array(this.analyzer.frequencyBinCount);
        this.analyzer.getByteTimeDomainData(timeDataArray);
        
        // 波形を描画（右側に音量バーのスペースを空ける）
        this.canvasContext.lineWidth = 2;
        this.canvasContext.strokeStyle = '#667eea';
        this.canvasContext.beginPath();
        
        const waveformWidth = width - 60; // 音量バー用にスペースを確保
        const sliceWidth = waveformWidth / timeDataArray.length;
        let x = 0;
        
        for (let i = 0; i < timeDataArray.length; i++) {
            const v = timeDataArray[i] / 128.0;
            const y = v * height / 2;
            
            if (i === 0) {
                this.canvasContext.moveTo(x, y);
            } else {
                this.canvasContext.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.canvasContext.stroke();
        
        // 音量レベルインジケーターを追加
        this.drawVolumeIndicator(timeDataArray);
    }
    
    drawVolumeIndicator(timeDataArray) {
        // RMS（実効値）を計算してマイク感度を表示
        let sum = 0;
        for (let i = 0; i < timeDataArray.length; i++) {
            const sample = (timeDataArray[i] - 128) / 128;
            sum += sample * sample;
        }
        const rms = Math.sqrt(sum / timeDataArray.length);
        const volume = rms * 100;
        
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