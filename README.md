# share-badget（共有家計簿）

同居人・カップル・ルームシェアなど、複数人でお金を管理するための共有家計簿アプリです。Googleログインでルーム（家計簿の共有単位）に参加し、支出の記録・割り勘・固定費・予算管理・レポートをメンバー全員で共有できます。

## 主な機能

- **Googleログイン**: Firebase Authenticationでログインし、実名・アイコンでメンバーを識別
- **ルーム制**: 「合言葉」でルームを保護。ルーム作成時に発行される招待コード＋合言葉を知っている人だけが参加可能。1人が複数ルームに所属可能（直近参加したルームがメインルームとして表示される）
- **カレンダー入力**: 日付ごとに支出・予定を記録。月間の支出合計をカレンダー上に表示
- **割り勘（わりかん）**: 支出ごとに割り勘ON/OFFを切り替え、均等・比率・金額の3種類の方法で分担額を計算。支払った人・精算済みステータスも記録
- **精算サマリー**: 未精算の割り勘支出から「誰が誰にいくら払えばよいか」を自動計算（送金回数を最小化する簡略化ロジック）
- **固定費管理**: 家賃・水道光熱費・サブスクなど毎月かかる費用を管理。割り勘設定は支出入力と共通
- **カテゴリ別予算**: カテゴリごとに月間予算を設定し、レポートで予算超過を確認
- **レポート**: 月別の支出サマリー、直近6ヶ月の推移、カテゴリ別内訳
- **ダークモード対応**

## 技術スタック

- [Next.js 16](https://nextjs.org/)（App Router / Turbopack）
- React 19 / TypeScript
- Tailwind CSS 4
- Firebase（Authentication / Firestore）

> **Note**: このプロジェクトが依存する Next.js のバージョンは通常のNext.jsと破壊的変更が含まれています。実装前に `node_modules/next/dist/docs/` 配下のドキュメントを確認してください（詳細は [AGENTS.md](./AGENTS.md) を参照）。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Firebaseプロジェクトの準備

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. Authentication で **Google** サインインを有効化
3. Firestore Database を作成（本番モード）
4. `firestore.rules` の内容をFirebase Consoleのルールに反映して公開
5. Web アプリを追加し、発行された設定値を `.env.local` に設定

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3001](http://localhost:3001) を開いて確認してください。

## スクリプト

| コマンド | 説明 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動（port 3001） |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバーを起動 |
| `npm run lint` | ESLint実行 |

## データモデルの概要

Firestore上では `groups/{groupId}/data/{docName}` の形式で、支出（entries）・カテゴリ（categories）・メンバー（members）・参加者（participants）・固定費（fixedCosts）・予定（calendarEvents）・ルーム情報（meta）をそれぞれ1ドキュメントの配列としてルームごとに保存します。`groupId` は合言葉のSHA-256ハッシュで、招待コード（`inviteCodes/{code}`）はグループIDを引くための非秘匿な目印です。

変更履歴はアプリ内の「メニュー」→バージョン情報（[lib/changelog.ts](./lib/changelog.ts)）から確認できます。
