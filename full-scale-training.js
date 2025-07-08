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
        
        // Canvas設定
        this.canvas = document.getElementById('waveform-canvas');
        this.ctx = this.canvas.getContext('2d');
        
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
        this.animationStartDelay = 3000; // 基音再生後3秒（ピアノ音完了後）
        
        // 基音再生用
        this.referenceOscillator = null;
        this.referenceGain = null;
        
        // 状態管理
        this.trainingPhase = 'waiting'; // waiting, playing, animating, completed
        
        // 初期化
        this.setupEventListeners();
        this.log('🎵 FullScaleTraining v1.0.0 初期化完了');
    }
    
    setupEventListeners() {
        document.getElementById('start-btn').addEventListener('click', () => {
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
            
            // UI更新
            document.getElementById('start-btn').style.display = 'none';
            document.getElementById('main-start-btn').style.display = 'inline-block';
            document.getElementById('stop-btn').style.display = 'inline-block';
            document.getElementById('progress-section').style.display = 'block';
            document.getElementById('guide-section').style.display = 'block';
            document.getElementById('guidance-section').style.display = 'block';
            document.getElementById('frequency-display').style.display = 'block';
            document.getElementById('canvas-container').style.display = 'block';
            
            // AudioContext初期化
            await this.initAudioContext();
            
            // マイクアクセス（simple-pitch-test成功手法）
            await this.initMicrophone();
            
            // isRunningを先に設定
            this.isRunning = true;
            
            // 周波数検出開始
            this.startFrequencyDetection();
            
            // 初期表示更新
            this.updateProgress();
            this.updateGuidance('🎹 オレンジのボタンを押して基音を聞いてください');
            
            this.trainingPhase = 'waiting';
            this.log('✅ トレーニング開始成功');
            
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
        
        // simple-pitch-test成功手法
        const constraints = { audio: true };
        this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.log(`📡 マイクストリーム取得成功 (ID: ${this.mediaStream.id})`);
        
        // アナライザー設定
        this.analyzer = this.audioContext.createAnalyser();
        this.analyzer.fftSize = 2048;
        this.analyzer.smoothingTimeConstant = 0.1;
        this.analyzer.minDecibels = -100;
        this.analyzer.maxDecibels = -10;
        
        // マイク接続（ゲインノード経由）
        this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 1.0;
        
        this.microphone.connect(gainNode);
        gainNode.connect(this.analyzer);
        
        // 出力先接続（Safari対応）
        const outputGain = this.audioContext.createGain();
        outputGain.gain.value = 0;
        this.analyzer.connect(outputGain);
        outputGain.connect(this.audioContext.destination);
        
        this.log('🔌 マイク接続完了');
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
    
    updateGuidance(text) {
        const guidanceElement = document.getElementById('guidance-text');
        if (guidanceElement) {
            guidanceElement.textContent = text;
        }
    }
    
    playReferenceAndStartAnimation() {
        if (this.trainingPhase !== 'waiting') {
            this.log('⚠️ まだ前のアニメーションが実行中です');
            return;
        }
        
        this.log('🔊 基音再生とアニメーション準備');
        this.trainingPhase = 'playing';
        
        // Do4基音再生
        this.playReferenceNote();
        
        // ガイダンス更新
        this.updateGuidance('ピアノ音を聞いて音程を覚えてください...');
        
        // 2秒後にカウントダウン開始
        setTimeout(() => {
            this.updateGuidance('まもなくガイドが始まります...');
        }, 2000);
        
        // 3秒後にアニメーション開始
        setTimeout(() => {
            this.startGuideAnimation();
        }, this.animationStartDelay);
    }
    
    playReferenceNote() {
        const frequency = 261.63; // Do4
        this.log(`🔊 Do4 (${Math.round(frequency)}Hz) ピアノ音再生開始`);
        
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
        const duration = 2.5; // 少し長めに設定
        
        // ピアノらしいADSRエンベロープ
        this.referenceMainGain.gain.setValueAtTime(0, startTime);
        this.referenceMainGain.gain.linearRampToValueAtTime(0.6, startTime + 0.02);  // 鋭いアタック
        this.referenceMainGain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.3); // ディケイ
        this.referenceMainGain.gain.exponentialRampToValueAtTime(0.15, startTime + 1.5); // サスティン
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
                gainNode.gain.exponentialRampToValueAtTime(harmonic.gain * 0.1, startTime + 0.8);
            }
            
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
        this.updateGuidance('ガイドに合わせて歌ってください！');
        
        // メインスタートボタンを無効化
        document.getElementById('main-start-btn').style.display = 'none';
        
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
        this.updateGuidance('お疲れ様でした！結果を集計中...');
        
        // ガイドリセット
        const guideNotes = document.querySelectorAll('.guide-note');
        guideNotes.forEach(note => {
            note.classList.remove('animate');
        });
        
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
        document.getElementById('guidance-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'block';
        
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
        this.results.forEach((result) => {
            const statusIcon = result.accuracy === '完璧' ? '🎉' : 
                             result.accuracy === '良い' ? '👍' : '😭';
            detailHtml += `${statusIcon} <strong>${result.note}</strong>: ${result.cents > 0 ? '+' : ''}${result.cents}¢ (${result.accuracy})<br>`;
        });
        detailHtml += '</div>';
        
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
        
        document.getElementById('main-start-btn').style.display = 'none';
        document.getElementById('progress-section').style.display = 'none';
        document.getElementById('guide-section').style.display = 'none';
        document.getElementById('guidance-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('frequency-display').style.display = 'none';
        document.getElementById('canvas-container').style.display = 'none';
        
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
        this.ctx.fillText('トレーニング停止中', this.canvas.width/2, this.canvas.height/2);
        
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
document.addEventListener('DOMContentLoaded', () => {
    new FullScaleTraining();
});