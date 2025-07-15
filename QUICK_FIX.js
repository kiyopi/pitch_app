// 緊急修正版 - minimal-pitch-training.js の394行目付近を置き換え

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎵 Simple Pitch Training v1.0.0 開始');
    console.log('📱 DOM読み込み完了');
    
    // 必要な要素の存在確認
    const startBtn = document.getElementById('start-btn');
    if (!startBtn) {
        console.error('❌ スタートボタンが見つかりません');
        return;
    }
    console.log('✅ スタートボタン要素確認完了');
    
    // ライブラリ読み込み確認を強化
    const checkLibraries = () => {
        console.log('📚 ライブラリ確認中...');
        console.log('Tone.js:', !!window.Tone);
        console.log('PitchDetector:', !!window.PitchDetector);
        
        if (window.Tone && window.PitchDetector) {
            console.log('✅ 全ライブラリ読み込み完了');
            try {
                new SimplePitchTraining();
                console.log('✅ SimplePitchTraining初期化完了');
            } catch (error) {
                console.error('❌ SimplePitchTraining初期化エラー:', error);
            }
        } else {
            console.log('⏳ ライブラリ読み込み待機中...');
            setTimeout(checkLibraries, 100);
        }
    };
    
    checkLibraries();
});

// 使用方法:
// 1. minimal-pitch-training.js の394行目以降を削除
// 2. このファイルの内容を貼り付け
// 3. git add . && git commit -m "緊急修正: DOM要素とライブラリ確認強化"
// 4. git push origin simple-pitch-impl-001