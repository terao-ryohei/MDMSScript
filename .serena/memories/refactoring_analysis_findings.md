# MDMSコードベース冗長性分析結果

## 主要な冗長性問題

### 1. calculateDistance関数の重複
**場所**: 5つのファイルに同じ関数が重複定義
- `src/managers/abilities/UtilityExecutors.ts`
- `src/managers/ActionTrackingManager.ts`
- `src/managers/NPCManager.ts`
- `src/managers/AbilityUIManager.ts`
- `src/managers/AbilityManager.ts`

**問題**: 同一のVector3距離計算ロジックが複数箇所に散在

### 2. UIフォーム作成パターンの冗長性
**場所**: 8つのUIManagerファイル
- 全ファイルで `new ActionFormData()` の同様なパターンを繰り返し使用
- フォーム作成、ボタン追加、表示のボイラープレートコードが大量重複

**発見されたパターン**:
```typescript
const form = new ActionFormData()
  .title("タイトル")
  .body("説明文")
  .button("ボタン1", "icon1")
  .button("ボタン2", "icon2")
```

### 3. プレイヤー状態アクセス関数の頻繁な呼び出し
**場所**: 20以上のファイルで使用
- `getPlayerRole(player)` - 20ファイル
- `getPlayerJob(player)` - 15ファイル  
- `isPlayerAlive(player)` - 12ファイル

**問題**: これらの関数は頻繁に呼ばれるが、結果をキャッシュしていない

### 4. UI表示関数の命名と構造の不統一
**場所**: UIManagerファイル群
- `showAbilityMenu`, `showRoleDetails`, `showJobDetails` など
- 似た機能だが命名規則や実装パターンが統一されていない

### 5. エラーハンドリングパターンの重複
**場所**: 各Manager
- 同様のtry-catchブロックとエラーメッセージ処理が繰り返し記述

### 6. ActionFormDataとMessageFormDataのインポート重複
**場所**: 8つのUIManagerファイル
- 全ファイルで同じインポート文が重複

## 特に問題となる重複コード量
- `calculateDistance`: 同一関数が5回定義（約30行×5 = 150行）
- UIフォーム作成: 類似パターンが100回以上使用
- プレイヤー状態チェック: 同様な処理が50回以上繰り返し

## コードベース全体の冗長性レベル
- **高**: calculateDistance、UIフォーム作成パターン
- **中**: エラーハンドリング、プレイヤー状態アクセス
- **低**: 各Managerの専用ロジック

## 改善の優先度
1. **最優先**: 共通ユーティリティ関数の統合
2. **高**: UIベースクラス/共通パターンの作成
3. **中**: プレイヤー状態キャッシングの実装