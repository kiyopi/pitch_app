# 🎨 左側ガイドボタンレイアウト図

## PC版（769px以上）デスクトップレイアウト

```
┌──────────────────────────────────────────────────────────────────────┐
│                    🎵 相対音感トレーニング                           │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                     メインパネル                               │ │
│  │                                                                 │ │
│  │  ┌──────────────────┐    ┌──────────────────────────────────┐  │ │
│  │  │ 左: ガイドパネル  │    │    右: 周波数パネル              │  │ │
│  │  │                  │    │                                  │  │ │
│  │  │ ┏━━━━━━━━━━━━━━┓ │    │ ┌────────────────────────────┐ │  │ │
│  │  │ ┃              ┃ │    │ │                            │ │  │ │
│  │  │ ┃ ド4   262Hz  ┃ │    │ │        348 Hz              │ │  │ │
│  │  │ ┃              ┃ │    │ │    (音量バー背景付き)        │ │  │ │
│  │  │ ┗━━━━━━━━━━━━━━┛ │    │ └────────────────────────────┘ │  │ │
│  │  │       ↑ 12px gap     │    │                                  │  │ │
│  │  │ ┏━━━━━━━━━━━━━━┓ │    │                                  │  │ │
│  │  │ ┃ レ4   294Hz  ┃ │    │                                  │  │ │
│  │  │ ┗━━━━━━━━━━━━━━┛ │    │                                  │  │ │
│  │  │       ↑ 12px gap     │    │                                  │  │ │
│  │  │ ┏━━━━━━━━━━━━━━┓ │    │                                  │  │ │
│  │  │ ┃ ミ4   330Hz  ┃ │    │                                  │  │ │
│  │  │ ┗━━━━━━━━━━━━━━┛ │    │                                  │  │ │
│  │  │       ↑ 12px gap     │    │                                  │  │ │
│  │  │ ┏━━━━━━━━━━━━━━┓ │    │                                  │  │ │
│  │  │ ┃ ファ4 349Hz  ┃ │    │                                  │  │ │
│  │  │ ┗━━━━━━━━━━━━━━┛ │    │                                  │  │ │
│  │  │ ┏━━━━━━━━━━━━━━┓ │    │                                  │  │ │
│  │  │ ┃ ソ4   392Hz  ┃ │    │                                  │  │ │
│  │  │ ┗━━━━━━━━━━━━━━┛ │    │                                  │  │ │
│  │  │ ┏━━━━━━━━━━━━━━┓ │    │                                  │  │ │
│  │  │ ┃ ラ4   440Hz  ┃ │    │                                  │  │ │
│  │  │ ┗━━━━━━━━━━━━━━┛ │    │                                  │  │ │
│  │  │ ┏━━━━━━━━━━━━━━┓ │    │                                  │  │ │
│  │  │ ┃ シ4   494Hz  ┃ │    │                                  │  │ │
│  │  │ ┗━━━━━━━━━━━━━━┛ │    │                                  │  │ │
│  │  │ ┏━━━━━━━━━━━━━━┓ │    │                                  │  │ │
│  │  │ ┃ ド5   523Hz  ┃ │    │                                  │  │ │
│  │  │ ┗━━━━━━━━━━━━━━┛ │    │                                  │  │ │
│  │  └──────────────────┘    └──────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## モバイル版（768px以下）

```
┌─────────────────────────────┐
│    🎵 相対音感トレーニング   │
│                             │
│ ┌─────────────────────────┐ │
│ │     メインパネル         │ │
│ │                         │ │
│ │ ┏━━━━━━━━━━━━━━━━━━━━━┓ │ │
│ │ ┃                     ┃ │ │
│ │ ┃   ド4    262Hz      ┃ │ │
│ │ ┃                     ┃ │ │
│ │ ┗━━━━━━━━━━━━━━━━━━━━━┛ │ │
│ │         ↑ 10px gap       │ │
│ │ ┏━━━━━━━━━━━━━━━━━━━━━┓ │ │
│ │ ┃   レ4    294Hz      ┃ │ │
│ │ ┗━━━━━━━━━━━━━━━━━━━━━┛ │ │
│ │         ↑ 10px gap       │ │
│ │ ┏━━━━━━━━━━━━━━━━━━━━━┓ │ │
│ │ ┃   ミ4    330Hz      ┃ │ │
│ │ ┗━━━━━━━━━━━━━━━━━━━━━┛ │ │
│ │         ↑ 10px gap       │ │
│ │ ┏━━━━━━━━━━━━━━━━━━━━━┓ │ │
│ │ ┃   ファ4  349Hz      ┃ │ │
│ │ ┗━━━━━━━━━━━━━━━━━━━━━┛ │ │
│ │          (続く...)        │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## ボタンスタイル詳細

### 通常状態
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                           ┃
┃    ド4                                            262Hz   ┃
┃                                                           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

### アニメーション中
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                           ┃
┃    ド4                                            262Hz   ┃  ← オレンジ背景 + 白文字
┃                                                           ┃  ← 1.05倍拡大 + 影
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## デザイン仕様

### 🎨 配色
- **通常背景**: クリーム色 (`#faf8f3`)
- **枠線**: ベージュ (`#d6c4a6`) 3px太線
- **文字**: 濃い茶色 (`#5d4037` / `#8d6e63`)
- **アニメーション**: オレンジ背景 (`#f57c00`) + 白文字

### 📏 サイズ・間隔
- **角丸**: 25px
- **高さ**: モバイル50px / PC55px
- **ボタン間隔**: モバイル10px / PC12px
- **コンテナ余白**: モバイル15px / PC20px

### 🔧 エフェクト
- **ホバー**: 2px上移動 + 影
- **アニメーション**: 1.05倍拡大 + オレンジ色 + 影
- **影**: 常時薄い影 + ホバー時強調

## 技術詳細

### 主要変更点
1. **`border-bottom` → `border`**: 個別枠線に変更
2. **`border-radius: 0` → `25px`**: 角丸ボタン化
3. **`gap: 0` → `10px/12px`**: ボタン間隔追加
4. **`padding` 追加**: コンテナに余白
5. **`box-shadow` 追加**: 立体感
6. **`:hover` 追加**: ホバーエフェクト

### CSS主要クラス
- `.note-guide` - コンテナ（gap, padding追加）
- `.guide-note` - 個別ボタン（角丸、影、ホバー）
- `.guide-note.animate` - アニメーション状態
- `.guide-note:hover` - ホバー状態