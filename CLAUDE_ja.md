# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのコードベースで作業する際のガイダンスを提供します。

## 開発コマンド

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動 (http://localhost:3000 で実行)
npm start

# ウォッチモードでテストを実行
npm test

# 本番用ビルドの作成
npm run build

# 本番ビルドをローカルで実行 (PORT環境変数が必要)
PORT=3000 npm run start:prod
```

## アーキテクチャ概要

これは、マイクロサービスベースのブログ/フォーラムシステムのReact 18クライアントアプリケーションです。このアプリケーションは2つの独立したバックエンドサービスと通信します：

- **Posts Service**: `http://localhost:4000` - 投稿の作成と取得を処理
- **Comments Service**: `http://localhost:4001` - 投稿のコメントを管理

### 環境設定

サービスURLは環境変数で設定できます：
- `REACT_APP_POSTS_SERVICE_URL` - Posts サービス URL (デフォルトは http://localhost:4000)
- `REACT_APP_COMMENTS_SERVICE_URL` - Comments サービス URL (デフォルトは http://localhost:4001)

本番ビルドの場合、これらはビルド時に設定する必要があります：
```bash
REACT_APP_POSTS_SERVICE_URL=https://api.example.com/posts \
REACT_APP_COMMENTS_SERVICE_URL=https://api.example.com/comments \
npm run build
```

### コンポーネント構造

アプリケーションは `/src` でシンプルでフラットなコンポーネント構造を使用します：

- `App.js` - PostCreateとPostListをレンダリングするルートコンポーネント
- `PostCreate.js` - 新しい投稿を作成するためのフォームコンポーネント
- `PostList.js` - すべての投稿を取得して表示し、コメント機能を統合
- `CommentCreate.js` - 特定の投稿にコメントを追加するフォーム
- `CommentList.js` - 指定された投稿のコメントを表示

### 重要なパターン

1. **状態管理**: React hooks によるローカル状態 (useState, useEffect)
2. **API通信**: マイクロサービスへのHTTPリクエストにAxiosを使用
3. **スタイリング**: Bootstrap 4.3.1 (public/index.html のCDN経由で読み込み)
4. **ルーティングなし**: クライアントサイドルーティングのないシングルページアプリケーション
5. **コンポーネント設計**: 関数コンポーネントのみ使用、クラスコンポーネントは使用しない
6. **データフロー**: propsを使用した単方向データフロー、グローバル状態管理なし

### サービス統合

アプリケーションは以下のエンドポイントが利用可能であることを想定しています：

- `GET /posts` - すべての投稿を取得 ({id, title} オブジェクトの配列を返す)
- `POST /posts` - 新しい投稿を作成 (リクエストボディで {title} を期待)
- `GET /posts/:id/comments` - 投稿のコメントを取得 ({id, content} オブジェクトの配列を返す)
- `POST /posts/:id/comments` - 投稿にコメントを追加 (リクエストボディで {content} を期待)

### Docker デプロイメント

アプリケーションはコンテナ化デプロイメント用のDocker設定を含みます：

```bash
# Docker イメージをビルド
docker build -t client .

# 環境変数を使用して実行
docker run -p 8080:80 \
  -e REACT_APP_POSTS_SERVICE_URL=http://posts-service:4000 \
  -e REACT_APP_COMMENTS_SERVICE_URL=http://comments-service:4001 \
  client
```

Dockerfileはマルチステージビルドとnginxを使用した本番サービングを使用します。

### テスト

これは、JestとReact Testing Libraryが事前設定されたCreate React Appプロジェクトです。`npm test` を使用してテストを実行します。

注意：コードベースには現在カスタムテストは存在しません。テストインフラストラクチャは準備済みですが使用されていません。