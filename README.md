# プレースホルダ画像生成サービス

**美しいメッシュグラデーション画像を高速生成するプレースホルダサービス**

## 🎯 プロジェクトの目的

このサービスは、**プレースホルダ用の画像を動的に生成・配信する**ことを目的としています。

### 解決する課題
- 開発中の画像プレースホルダの準備が面倒
- 美しいプレースホルダ画像の作成に時間がかかる
- 画像ファイルの管理・配信が複雑
- 様々なサイズ・色の画像が必要

### 提供する価値
- **URL発行**: パラメータを指定するだけで画像を即座に生成・配信
- **美しいビジュアル**: アルゴリズム生成による有機的なメッシュグラデーション
- **高速配信**: CloudFlare WorkersによるグローバルCDN配信
- **永続キャッシュ**: 一度生成した画像はR2に保存され、再生成不要
- **エディタ同梱**: ブラウザ上で直感的に画像をカスタマイズ可能

## ✨ 特徴

### 🚀 高速生成
- **WASM版**: 約1秒でFHD画像生成
- **JavaScript版**: 2秒以上で生成（重い処理）
- CloudFlare WorkersのCPU時間課金に最適化

### 🎨 美しいビジュアル
- メッシュグラデーションによる有機的な色の混在
- ディスプレイスメントマッピングで自然な歪み
- グレインテクスチャで質感を追加
- 12種類のカラープリセット

### ⚡ 高性能アーキテクチャ
- **WASM実装**: AssemblyScriptで最適化された高速レンダリング
- **オブジェクトストレージキャッシュ**: CloudFlare R2で生成画像を永続化
- **URL発行**: パラメータベースで画像を直接配信
- **エディタ同梱**: ブラウザ上でリアルタイム編集可能

## 🛠️ 技術スタック

- **フレームワーク**: Hono + CloudFlare Workers
- **画像生成**: AssemblyScript (WASM) + JavaScript
- **ストレージ**: CloudFlare R2
- **エディタ**: バニラJavaScript
- **画像フォーマット**: JPEG (品質85%, 高圧縮)

## 🚀 クイックスタート

### 1. 依存関係のインストール
```bash
pnpm install
```

### 2. WASMビルド
```bash
pnpm asbuild
```

### 3. 開発サーバー起動
```bash
pnpm dev
```

### 4. エディタにアクセス
`http://localhost:8787/editor` でビジュアルエディタを開けます。

## 📖 使用方法

### 🎨 エディタUI（推奨）
`/editor` にアクセスしてブラウザ上で画像をカスタマイズ：

- **レンダリングモード**: WASM版（高速）またはJavaScript版を選択
- **リアルタイムプレビュー**: 設定変更が即座に反映
- **カラープリセット**: 12種類のプリセットから選択
- **グリッド編集**: 6×4グリッドの各ポイントを調整
- **URL生成**: 設定を含むURLを自動生成・コピー

### 🔗 URL利用例

#### 基本的な使用例
```html
<!-- シンプルなプレースホルダ -->
<img src="https://your-domain.workers.dev/image-wasm?width=800&height=600" alt="Placeholder">

<!-- カスタムカラーのプレースホルダ -->
<img src="https://your-domain.workers.dev/image-wasm?width=1200&height=800&color0=#ff6b6b&color1=#4ecdc4&color2=#45b7d1" alt="Custom Placeholder">

<!-- 正方形のプレースホルダ -->
<img src="https://your-domain.workers.dev/image-wasm?width=500&height=500&color0=#667eea&color1=#764ba2&color2=#8b5cf6" alt="Square Placeholder">
```

#### 高度なカスタマイズ例
```html
<!-- ディスプレイスメントとグレインを有効化 -->
<img src="https://your-domain.workers.dev/image-wasm?width=1920&height=1080&color0=#ff9a9e&color1=#fecfef&color2=#fecfef&displacement=true&freq=0.002&amp=200&grain=true&grainIntensity=0.1" alt="Advanced Placeholder">

<!-- カスタムグリッドサイズ -->
<img src="https://your-domain.workers.dev/image-wasm?width=800&height=600&gridCols=8&gridRows=6&color0=#a8edea&color1=#fed6e3&color2=#d299c2" alt="Custom Grid Placeholder">
```

#### レスポンシブ対応例
```html
<!-- レスポンシブ画像 -->
<img src="https://your-domain.workers.dev/image-wasm?width=800&height=600&color0=#667eea&color1=#764ba2&color2=#8b5cf6" 
     srcset="https://your-domain.workers.dev/image-wasm?width=400&height=300&color0=#667eea&color1=#764ba2&color2=#8b5cf6 400w,
             https://your-domain.workers.dev/image-wasm?width=800&height=600&color0=#667eea&color1=#764ba2&color2=#8b5cf6 800w,
             https://your-domain.workers.dev/image-wasm?width=1200&height=900&color0=#667eea&color1=#764ba2&color2=#8b5cf6 1200w"
     sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px"
     alt="Responsive Placeholder">
```

### 📋 API エンドポイント

#### 画像生成（WASM版 - 推奨）
```
GET /image-wasm?width=1920&height=1080&color0=#667eea&color1=#764ba2&color2=#8b5cf6
```

#### 画像生成（JavaScript版）
```
GET /image?width=1920&height=1080&color0=#667eea&color1=#764ba2&color2=#8b5cf6
```

### 🔧 パラメータ一覧

| パラメータ | 説明 | デフォルト | 例 |
|-----------|------|-----------|-----|
| `width` | 画像の幅（px） | 1920 | `800` |
| `height` | 画像の高さ（px） | 1080 | `600` |
| `color0` | パレット色1 | `#667eea` | `#ff6b6b` |
| `color1` | パレット色2 | `#764ba2` | `#4ecdc4` |
| `color2` | パレット色3 | `#8b5cf6` | `#45b7d1` |
| `gridCols` | グリッド列数 | 6 | `8` |
| `gridRows` | グリッド行数 | 4 | `6` |
| `displacement` | ディスプレイスメント有効化 | `true` | `false` |
| `freq` | ディスプレイスメント周波数 | `0.0012` | `0.002` |
| `amp` | ディスプレイスメント振幅 | `125` | `200` |
| `grain` | グレイン有効化 | `true` | `false` |
| `grainIntensity` | グレイン強さ | `0.04` | `0.1` |
| `g_{row}_{col}` | グリッド各セルの色インデックス | 自動生成 | `g_0_0=0` |

## 🏗️ アーキテクチャ

### システム構成図
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ユーザー      │    │ CloudFlare       │    │ CloudFlare R2   │
│   (ブラウザ)    │    │ Workers          │    │ (オブジェクト    │
│                 │    │                  │    │  ストレージ)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │ 1. 画像リクエスト      │                        │
         │ ──────────────────────→│                        │
         │                        │                        │
         │                        │ 2. キャッシュチェック  │
         │                        │ ──────────────────────→│
         │                        │                        │
         │                        │ 3. キャッシュ結果      │
         │                        │ ←──────────────────────│
         │                        │                        │
         │                        │ 4. 画像生成            │
         │                        │ (WASM/JS)              │
         │                        │                        │
         │                        │ 5. キャッシュ保存      │
         │                        │ ──────────────────────→│
         │                        │                        │
         │ 6. JPEG画像レスポンス  │                        │
         │ ←──────────────────────│                        │
```

### 画像生成フロー
1. **リクエスト受信**: URLパラメータから画像設定を解析
2. **キャッシュチェック**: CloudFlare R2から既存画像を検索
3. **画像生成**: 
   - キャッシュなしの場合のみ実行
   - WASM版（推奨）またはJavaScript版でメッシュグラデーション生成
4. **キャッシュ保存**: 生成した画像をR2に永続化
5. **レスポンス配信**: JPEG画像をCDN経由で配信

### 技術的詳細

#### WASM版（高速）
- **言語**: AssemblyScript
- **最適化**: インライン関数、直接メモリアクセス
- **生成時間**: 約1秒（FHD 1920×1080）
- **バイナリサイズ**: 6KB

#### JavaScript版（互換性重視）
- **言語**: TypeScript
- **生成時間**: 2秒以上（重い処理）
- **用途**: WASMが利用できない環境でのフォールバック

#### ストレージ戦略
- **CloudFlare R2**: 生成画像の永続キャッシュ
- **キャッシュキー**: URLパラメータのハッシュ値
- **TTL**: 永続保存（手動削除まで保持）

### パフォーマンス最適化
- **WASM版**: 約5倍高速（214ms vs 1072ms）
- **JPEG出力**: PNG比で約6.7倍小さい（374KB vs 2.4MB）
- **メモリ効率**: StaticArrayと直接メモリアクセス
- **インライン最適化**: 関数呼び出しオーバーヘッド削減
- **CDN配信**: CloudFlareのグローバルネットワーク活用

## 🚀 デプロイ

### 1. CloudFlare R2バケット作成
```bash
npx wrangler login
npx wrangler r2 bucket create image-placeholder-cache
```

### 2. デプロイ実行
```bash
pnpm deploy
```

### 3. カスタムドメイン設定
CloudFlareダッシュボードからWorkers & Pagesでドメインを設定

## 🔧 開発

### テスト実行
```bash
pnpm test
```

### ビルド
```bash
# WASMビルド
pnpm asbuild

# リリースビルド
pnpm asbuild:release
```

## 📊 パフォーマンス

| 項目 | WASM版 | JavaScript版 |
|------|--------|-------------|
| 生成時間 | ~214ms | ~1072ms |
| ファイルサイズ | 374KB | 374KB |
| バイナリサイズ | 6KB | - |
| 依存関係 | なし | あり |

## 🎯 具体的な用途例

### 1. 開発時のプレースホルダ
```html
<!-- ブログ記事のサムネイルプレースホルダ -->
<img src="https://your-domain.workers.dev/image-wasm?width=400&height=250&color0=#667eea&color1=#764ba2&color2=#8b5cf6" alt="Article Thumbnail">

<!-- 商品画像のプレースホルダ -->
<img src="https://your-domain.workers.dev/image-wasm?width=300&height=300&color0=#ff9a9e&color1=#fecfef&color2=#fecfef" alt="Product Image">
```

### 2. 背景画像として活用
```css
/* CSS背景画像 */
.hero-section {
  background-image: url('https://your-domain.workers.dev/image-wasm?width=1920&height=1080&color0=#667eea&color1=#764ba2&color2=#8b5cf6');
  background-size: cover;
  background-position: center;
}
```

### 3. レスポンシブ画像
```html
<!-- 様々なデバイスサイズに対応 -->
<picture>
  <source media="(max-width: 600px)" 
          srcset="https://your-domain.workers.dev/image-wasm?width=400&height=300&color0=#667eea&color1=#764ba2&color2=#8b5cf6">
  <source media="(max-width: 1200px)" 
          srcset="https://your-domain.workers.dev/image-wasm?width=800&height=600&color0=#667eea&color1=#764ba2&color2=#8b5cf6">
  <img src="https://your-domain.workers.dev/image-wasm?width=1200&height=900&color0=#667eea&color1=#764ba2&color2=#8b5cf6" 
       alt="Responsive Placeholder">
</picture>
```

### 4. デザインシステムでの活用
```javascript
// 動的にプレースホルダを生成
function generatePlaceholder(width, height, theme = 'default') {
  const themes = {
    default: ['#667eea', '#764ba2', '#8b5cf6'],
    warm: ['#ff9a9e', '#fecfef', '#fecfef'],
    cool: ['#a8edea', '#fed6e3', '#d299c2']
  };
  
  const colors = themes[theme];
  return `https://your-domain.workers.dev/image-wasm?width=${width}&height=${height}&color0=${colors[0]}&color1=${colors[1]}&color2=${colors[2]}`;
}
```

### 5. プロトタイピング
- **Figma/Sketch代替**: 迅速なモックアップ作成
- **ワイヤーフレーム**: 視覚的な要素の配置確認
- **A/Bテスト**: 異なる色・サイズでの比較検証

## 📝 ライセンス

MIT License

---

**注意**: このサービスはCloudFlare WorkersのCPU時間で課金されます。WASM版の使用を強く推奨します。