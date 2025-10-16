# プレースホルダ画像生成サービス

**美しいメッシュグラデーション画像を高速生成するプレースホルダサービス**

このプロジェクトは、プレースホルダ用の画像を動的に生成・配信するサービスです。アルゴリズムベースの美しいメッシュグラデーション画像を生成し、CloudFlare Workers上で高速配信します。

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

### エディタUI
- **レンダリングモード**: WASM版（高速）またはJavaScript版を選択
- **リアルタイムプレビュー**: 設定変更が即座に反映
- **カラープリセット**: 12種類のプリセットから選択
- **グリッド編集**: 6×4グリッドの各ポイントを調整
- **URL生成**: 設定を含むURLを自動生成・コピー

### API エンドポイント

#### 画像生成（WASM版 - 推奨）
```
GET /image-wasm?width=1920&height=1080&color0=#667eea&color1=#764ba2&color2=#8b5cf6
```

#### 画像生成（JavaScript版）
```
GET /image?width=1920&height=1080&color0=#667eea&color1=#764ba2&color2=#8b5cf6
```

#### パラメータ
- `width`, `height`: 画像サイズ（デフォルト: 1920×1080）
- `color0`, `color1`, `color2`: 3色パレット
- `gridCols`, `gridRows`: グリッドサイズ（デフォルト: 6×4）
- `displacement`: ディスプレイスメント有効化（true/false）
- `freq`, `amp`: ディスプレイスメント周波数・振幅
- `grain`: グレイン有効化（true/false）
- `grainIntensity`: グレイン強さ
- `g_{row}_{col}`: グリッド各セルの色インデックス

## 🏗️ アーキテクチャ

### 画像生成フロー
1. **URLパラメータ解析**: リクエストから設定を抽出
2. **キャッシュチェック**: R2から既存画像を検索
3. **画像生成**: WASM/JSでメッシュグラデーション生成
4. **キャッシュ保存**: 生成画像をR2に永続化
5. **レスポンス**: JPEG画像を配信

### パフォーマンス最適化
- **WASM版**: 約5倍高速（214ms vs 1072ms）
- **JPEG出力**: PNG比で約6.7倍小さい（374KB vs 2.4MB）
- **メモリ効率**: StaticArrayと直接メモリアクセス
- **インライン最適化**: 関数呼び出しオーバーヘッド削減

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

## 🎯 用途

- **プレースホルダ画像**: 開発中の画像プレースホルダ
- **背景画像**: 美しいグラデーション背景
- **デザイン素材**: カスタマイズ可能なビジュアル素材
- **プロトタイプ**: 迅速なUIプロトタイピング

## 📝 ライセンス

MIT License

---

**注意**: このサービスはCloudFlare WorkersのCPU時間で課金されます。WASM版の使用を強く推奨します。