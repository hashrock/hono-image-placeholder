画像プレースホルダ作成サービス

hono + Cloudflare workers で作ります。

## 機能

- メッシュグラデーション背景画像を作るアプリ
- サーバサイドで描画する
- URL パラメータで各座標や色を渡す
- 一度作った画像はストレージにキャッシュ
  - 外部サービスから URL を直接呼ばれる想定
- /editor で編集 UI
- img の url を書き換えて表示する
- 最終的に URL をコピーできる

## 仕様

### 画像生成
- グリッドサイズ: 6×4
- デフォルト画像サイズ: 1920×1080 (FHD)
- 出力フォーマット: WebP (高圧縮)

### ストレージ
- Cloudflare R2 を使用
- キャッシュキー: URLパラメータのハッシュ値

### エディタUI
- バニラJS で実装
- 最低限の視覚的編集機能

## 開発

```bash
# 依存関係のインストール
pnpm install

# 開発サーバー起動
pnpm dev
```

開発サーバーが起動したら、`http://localhost:8787/editor` でエディタUIにアクセスできます。

## デプロイ

### 1. R2バケットの作成

まず、Cloudflare R2バケットを作成します：

```bash
# Cloudflareにログイン
npx wrangler login

# R2バケットを作成
npx wrangler r2 bucket create image-placeholder-cache
```

### 2. デプロイ

```bash
pnpm deploy
```

デプロイが完了すると、Cloudflare Workersにアプリケーションがデプロイされます。
表示されたURLにアクセスして動作を確認してください。

### カスタムドメインの設定

Cloudflareダッシュボードから、Workers & Pagesセクションでカスタムドメインを設定できます。

## トラブルシューティング

### R2有効化エラー

```
Please enable R2 through the Cloudflare Dashboard.
```

このエラーが出た場合：

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/)にログイン
2. 左サイドバーから **R2** を選択
3. **Enable R2** ボタンをクリックして有効化
4. 支払い方法を設定（R2には無料枠があります）
   - 10 GB ストレージ
   - 100万回の書き込み/月
   - 1000万回の読み取り/月
5. 有効化後、再度バケット作成コマンドを実行

### R2なしでデプロイ（開発用）

R2を使わずに一時的にデプロイしたい場合は、`wrangler.jsonc`の`r2_buckets`セクションをコメントアウトし、`src/index.ts`のキャッシュ処理を修正してください。ただし、画像は毎回生成されるため本番環境には推奨しません。
