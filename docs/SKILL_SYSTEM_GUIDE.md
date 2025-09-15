# スキルシステム - 関心の分離ガイド

## 概要

スキルシステムは以下の3層に分離され、関心の分離が明確になりました：

```
┌─────────────────────┐
│   使用者（Manager）   │ ← 既存のコードはここだけ変更
├─────────────────────┤
│  SkillRegistry.ts   │ ← 統合管理層（システム変更時）
├─────────────────────┤
│ AbilityDefinitions  │ ← 設定データ（新スキル追加時）
│ SkillExecutors.ts   │ ← 実行ロジック（新スキル追加時）
└─────────────────────┘
```

## 1. 新しいスキルを追加する場合

### 手順 1: 設定データの追加

`src/data/AbilityDefinitions.ts` に設定を追加：

```typescript
export const ABILITY_DEFINITIONS: Record<string, AbilityDefinition> = {
  // 既存の設定...
  
  my_new_skill: {
    id: "my_new_skill",
    name: "新しいスキル",
    description: "新しいスキルの説明",
    type: AbilityType.OBSERVE,
    targetType: AbilityTargetType.SELF,
    cooldownTime: 120, // 2分
    usesPerGame: 3,
    usesPerPhase: 1,
    requiresTarget: false,
    duration: 0,
    range: 0,
    detectRange: 0,
    allowedPhases: [GamePhase.INVESTIGATION],
    requiresAlive: true,
  },
};
```

### 手順 2: 実行関数の追加

`src/executors/SkillExecutors.ts` に実行ロジックを追加：

```typescript
export const SKILL_EXECUTORS: Record<string, SkillExecutor> = {
  // 既存の実行関数...
  
  my_new_skill: async (player: Player, target?: Player, args?: Record<string, unknown>) => {
    // 新しいスキルの実際の動作を実装
    
    // 引数チェック
    if (/* 必要に応じて条件チェック */) {
      return {
        success: false,
        message: "実行条件を満たしていません"
      };
    }
    
    // 実際の処理
    // TODO: ここに具体的な動作を実装
    
    return {
      success: true,
      message: "新しいスキルを実行しました"
    };
  },
};
```

### 手順 3: 自動統合

SkillRegistry が自動的に設定データと実行関数を紐付けします。追加作業は不要です。

## 2. システムの根本的な変更をする場合

### 変更対象: `src/core/SkillRegistry.ts`

```typescript
// 例: 新しい実行条件チェックを追加
public canExecuteSkill(skillId: string, player: Player, currentPhase: string): boolean {
  const skill = this.getSkill(skillId);
  if (!skill) return false;

  // 既存の条件チェック...

  // 新しい条件を追加
  if (/* 新しいシステム要件 */) {
    return false;
  }

  return true;
}
```

### 変更対象: `src/managers/SkillManager.ts`

```typescript
// 例: スキル使用時の新しい処理を追加
export async function useSkill(...): Promise<SkillExecutionResult> {
  // 既存の処理...

  // 新しいシステム処理を追加
  if (/* 新しい条件 */) {
    // 新しい処理
  }

  // 既存の処理...
}
```

## 3. 既存コードの移行

### 移行前（従来のコード）
```typescript
import { JOB_SKILLS, ROLE_SKILLS } from "../types/SkillTypes";

// 直接参照
const jobSkill = JOB_SKILLS[JobType.LORD];
```

### 移行後（新しいシステム）
```typescript
import { getSkillRegistry } from "../core/SkillRegistry";

// レジストリ経由でアクセス
const registry = getSkillRegistry();
const jobSkill = registry.getSkill("royal_summon");
```

## 4. ファイル構成

### 設定関連ファイル
- `src/data/AbilityDefinitions.ts` - 能力の設定データ
- `src/types/AbilityTypes.ts` - 能力関連の型定義

### 実行関連ファイル
- `src/executors/SkillExecutors.ts` - スキル実行関数集
- `src/types/SkillTypes.ts` - スキル関連の型定義（純粋な型のみ）

### 統合管理ファイル
- `src/core/SkillRegistry.ts` - 設定と実行の統合管理
- `src/managers/SkillManager.ts` - プレイヤースキル管理

## 5. 開発ワークフロー

### 新しいスキル開発
1. 企画 → AbilityDefinitions.ts で設定データ作成
2. 実装 → SkillExecutors.ts で実行ロジック作成
3. テスト → 自動的に統合されて利用可能

### システム改修
1. 要件定義 → どの層を変更するか決定
2. SkillRegistry.ts → 共通ロジックの変更
3. SkillManager.ts → プレイヤー管理ロジックの変更

### バグ修正
- 設定の問題 → AbilityDefinitions.ts
- 実行ロジックの問題 → SkillExecutors.ts
- 統合の問題 → SkillRegistry.ts

## 6. 注意事項

### 型の互換性
- `ExecutableSkill` は `Skill` インターフェースと互換性を持つように設計されています
- 新しいプロパティを追加する場合は両方の型定義を更新してください

### パフォーマンス
- SkillRegistry はシングルトンパターンで実装されています
- 初期化は一度だけ実行され、以降はキャッシュされたデータを使用します

### 拡張性
- 新しいスキルタイプを追加する場合は AbilityType enum を拡張してください
- 新しいターゲットタイプを追加する場合は AbilityTargetType enum を拡張してください

## 7. トラブルシューティング

### Q: 新しいスキルが認識されない
A: 以下を確認してください：
1. AbilityDefinitions.ts にスキルIDが追加されているか
2. SkillExecutors.ts に同じスキルIDで実行関数が追加されているか
3. TypeScriptコンパイルエラーがないか

### Q: スキル実行時にエラーが発生する
A: 以下を確認してください：
1. 実行関数内での引数チェック
2. 必要なプロパティがすべて設定されているか
3. フェーズ制限や使用回数制限に引っかかっていないか

### Q: システム全体でスキルが動作しない
A: 以下を確認してください：
1. SkillRegistry の初期化が正常に実行されているか
2. SkillManager の assignPlayerSkills が呼ばれているか
3. コンソールにエラーログが出力されていないか

このガイドに従うことで、スキルシステムの保守性と拡張性が大幅に向上します。