# ActionLogger Sample Addon

このプロジェクトは、MinecraftのActionLoggerライブラリを使用したサンプルアドオンです。プレイヤーの行動をログに記録し、分析するための基本的な機能を実装しています。

## 機能

- プレイヤーのアイテム使用を記録
- ブロックの破壊/設置を記録
- プレイヤーの定期的な位置情報の記録
- システムの起動/シャットダウン状態の記録

## 必要条件

- Minecraft Bedrock Edition 1.20.0以上
- Node.js 18.0.0以上
- npm または yarn

## セットアップ

1. リポジトリをクローン：
```bash
git clone [repository-url]
cd MDMS
```

2. 依存関係のインストール：
```bash
npm install
```

3. アドオンのビルド：
```bash
npm run build
```

## 使用方法

1. ビルドされたアドオンをMinecraftのbehavior_packsフォルダにコピー
2. Minecraftを起動し、ワールドの設定でアドオンを有効化
3. ゲーム内でプレイヤーの行動を開始すると、自動的にログが記録されます

### デバッグモード

プレイヤーに「debug」タグを付与すると、アクションのログがゲーム内チャットに表示されます：

```
/tag @s add debug
```

## ログの確認

ログは以下の場所に保存されます：
- JSON形式のログ：`./logs/` ディレクトリ
- コンソールログ：Minecraftのログウィンドウ

## ライセンス

MITライセンス

## 開発者向け情報

### プロジェクト構造

```
MDMS/
├── src/
│   ├── main.ts          # メインスクリプト
│   └── logger/          # ロギング関連のモジュール
├── scripts/             # ビルドされたJavaScriptファイル
├── manifest.json        # アドオンの設定ファイル
├── package.json        # プロジェクト設定
└── tsconfig.json       # TypeScript設定
```

### ビルドプロセス

1. TypeScriptコードのコンパイル：
```bash
npm run build
```

2. 継続的な開発時の自動コンパイル：
```bash
npm run watch
```

## トラブルシューティング

1. ログが記録されない場合：
   - スクリプトエンジンが有効になっているか確認
   - コンソールでエラーメッセージを確認

2. デバッグメッセージが表示されない場合：
   - プレイヤーに「debug」タグが付与されているか確認
   - コンソールでエラーを確認

## バグ報告

問題を見つけた場合は、GitHubのIssuesで報告してください。