# ゲーム設定カスタマイズガイド

MDMS（Murder Mystery Detection System）の役職、職業、能力、目的を簡単にカスタマイズする方法を説明します。

## 📁 設定ファイルの構造

```
src/data/
├── RoleDefinitions.ts    # 役職定義
├── JobDefinitions.ts     # 職業定義  
├── AbilityDefinitions.ts # 能力定義
└── ObjectiveDefinitions.ts # 目的定義
```

## 🎭 役職設定の変更

### ファイル: `src/data/RoleDefinitions.ts`

#### 基本的な役職設定

```typescript
[RoleType.CITIZEN]: {
  type: RoleType.CITIZEN,
  name: "一般人",                    // 表示名
  description: "真犯人を特定することが目標",  // 説明
  baseAbilityId: "deduction_boost",      // 基本能力ID
  baseObjectiveId: "identify_murderer",  // 基本目的ID
  specialRules: [                        // 特別ルール
    "証拠の信頼性が10%向上する",
    "探偵役がいる場合は推理力がさらに強化される"
  ]
}
```

#### プレイヤー数と役職構成の調整

```typescript
ROLE_COMPOSITION_RULES = {
  COMPOSITIONS: [
    {
      playerRange: { min: 3, max: 3 },              // 対象プレイヤー数
      composition: { murderers: 1, accomplices: 0, citizens: 2 }, // 役職構成
      description: "バランス重視：犯人1人、市民2人"     // 説明
    }
  ]
}
```

### カスタマイズのポイント

- **役職の追加**: 新しい `RoleType` を追加して定義を作成
- **バランス調整**: `ROLE_COMPOSITION_RULES` でプレイヤー数別の構成を調整
- **勝利条件**: `ROLE_VICTORY_CONDITIONS` で各役職のポイント配分を調整

## 👔 職業設定の変更

### ファイル: `src/data/JobDefinitions.ts`

#### 基本的な職業設定

```typescript
[JobType.KING]: {
  type: JobType.KING,
  name: "王",
  description: "王国を統治する最高権力者",
  socialStatus: SocialStatus.NOBLE,          // 社会階級
  dailyTasks: [                              // 日常タスク
    "朝の謁見で民の声を聞く",
    "重要な政務書類に目を通す"
  ],
  abilityId: "royal_summon",                 // 固有能力
  objectiveId: "hide_adultery",              // 固有目的
  startingArea: "throne_room",               // 開始エリア
  accessibleAreas: ["throne_room", "royal_chambers"], // アクセス可能エリア
  specialPrivileges: [                       // 特別権限
    "全エリアへのアクセス権",
    "他プレイヤーを強制召喚可能"
  ]
}
```

#### 社会階級バランスの調整

```typescript
JOB_DISTRIBUTION_SETTINGS = {
  SOCIAL_STATUS_RATIOS: {
    [SocialStatus.NOBLE]: 20,    // 貴族20%
    [SocialStatus.CITIZEN]: 50,  // 市民50%
    [SocialStatus.SERVANT]: 30   // 使用人30%
  }
}
```

### カスタマイズのポイント

- **新職業の追加**: `JobType` enum に追加後、定義を作成
- **バランス調整**: 社会階級の比率を変更して職業分布を調整
- **特別権限**: 各職業独自の能力や制限を設定

## ⚡ 能力設定の変更

### ファイル: `src/data/AbilityDefinitions.ts`

#### 基本的な能力設定

```typescript
royal_summon: {
  id: "royal_summon",
  name: "王の召喚",
  description: "指定したプレイヤーを自分の元に強制召喚する",
  type: AbilityType.COMMUNICATE,
  targetType: AbilityTargetType.PLAYER,     // 対象タイプ
  cooldownTime: 300,                        // クールダウン時間（秒）
  usesPerGame: 3,                          // ゲーム中の使用回数制限
  usesPerPhase: 1,                         // フェーズ中の使用回数制限
  requiresTarget: true,                    // 対象が必要か
  duration: 0,                             // 効果持続時間（秒）
  range: 999,                              // 効果範囲（ブロック）
  detectRange: 0,                          // 検出範囲（ブロック）
  allowedRoles: [],                        // 使用可能役職
  allowedJobs: [JobType.KING],            // 使用可能職業
  allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.DISCUSSION], // 使用可能フェーズ
  requiresAlive: true                      // 生存が必要か
}
```

### 能力分類

- **ROLE_BASIC**: 役職基本能力
- **JOB_SPECIFIC**: 職業専用能力
- **COMMON_RANDOM**: ランダム配布される共通能力
- **SPECIAL_EVIL**: 犯人・共犯専用の特殊能力

### カスタマイズのポイント

- **威力調整**: `cooldownTime`, `usesPerGame`, `range` などで能力の強さを調整
- **使用条件**: `allowedRoles`, `allowedJobs`, `allowedPhases` で使用制限を設定
- **新能力追加**: `AbilityType` enum に追加後、定義を作成

## 🎯 目的設定の変更

### ファイル: `src/data/ObjectiveDefinitions.ts`

#### 基本的な目的設定

```typescript
identify_murderer: {
  id: "identify_murderer",
  name: "真犯人の特定",
  description: "証拠を集めて真犯人を特定し、正しい投票をする",
  category: ObjectiveCategory.ROLE_PRIMARY,   // カテゴリ
  difficulty: ObjectiveDifficulty.NORMAL,     // 難易度
  points: { completion: 200, bonus: 100 },    // ポイント設定
  conditions: [                               // 達成条件
    { type: "correct_vote", description: "犯人に正しく投票する" },
    { type: "survive", description: "最後まで生存する" }
  ],
  hints: [                                    // ヒント
    "他プレイヤーの行動を注意深く観察しよう",
    "矛盾した証言を見つけよう"
  ]
}
```

### 目的カテゴリ

- **ROLE_PRIMARY**: 役職の主目的
- **JOB_TASK**: 職業課題
- **PERSONAL**: 個人的目標
- **SOCIAL**: 社会的目標
- **MYSTERY**: 謎解き目標

### 難易度設定

- **EASY**: 簡単（初心者向け）
- **NORMAL**: 普通（標準的な難易度）
- **HARD**: 難しい（上級者向け）
- **EXPERT**: 専門的（熟練者向け）

## 🔧 実装手順

### 1. 設定変更

1. 該当するファイル（`src/data/*.ts`）を編集
2. 必要に応じて `src/types/*.ts` の型定義も追加

### 2. ビルドとテスト

```bash
npm run compile  # TypeScriptコンパイル
npm run build    # 完全ビルド
```

### 3. ゲーム内テスト

1. `.mcaddon` ファイルをMinecraftにインポート
2. テストワールドで機能を確認
3. 必要に応じて調整を繰り返し

## 📝 設定例

### 少人数向け設定（2-3人）

```typescript
// RoleDefinitions.ts - 役職構成を調整
{
  playerRange: { min: 2, max: 3 },
  composition: { murderers: 1, accomplices: 0, citizens: -1 },
  description: "少人数用：犯人1人、残り市民"
}

// JobDefinitions.ts - 社会階級比率を調整  
SOCIAL_STATUS_RATIOS: {
  [SocialStatus.NOBLE]: 33,   // 貴族33%
  [SocialStatus.CITIZEN]: 33, // 市民33% 
  [SocialStatus.SERVANT]: 34  // 使用人34%
}
```

### 大人数向け設定（15-20人）

```typescript
// 複数犯人システム
{
  playerRange: { min: 15, max: 20 },
  composition: { murderers: 2, accomplices: 2, citizens: -1 },
  description: "大人数用：犯人2人、共犯2人、残り市民"
}
```

### カスタム職業追加例

```typescript
// types/JobTypes.ts に追加
export enum JobType {
  // ... 既存の職業
  PRIEST = "priest"  // 新職業を追加
}

// data/JobDefinitions.ts に定義追加
[JobType.PRIEST]: {
  type: JobType.PRIEST,
  name: "司祭",
  description: "神に仕える聖職者",
  socialStatus: SocialStatus.CITIZEN,
  dailyTasks: ["祈り", "説教", "信者の相談"],
  abilityId: "blessing",
  objectiveId: "spread_faith",
  startingArea: "church",
  accessibleAreas: ["church", "cemetery", "hospital"],
  specialPrivileges: ["死者の情報確認", "プレイヤーの浄化"]
}
```

## ⚠️ 注意事項

1. **型整合性**: TypeScript の型定義と実装を一致させる
2. **バランス**: 能力や目的の難易度バランスに注意
3. **ID管理**: 能力IDや目的IDの重複を避ける
4. **フェーズ制限**: 各能力の使用可能フェーズを適切に設定
5. **テスト**: 変更後は必ずゲーム内でテストする

## 🎮 推奨カスタマイズ

### 初心者向け

- 能力のクールダウン時間を短縮
- 目的の難易度を下げる
- ヒントを増やす

### 上級者向け

- より複雑な職業と能力を追加
- 制限時間を短縮
- 新しい勝利条件を追加

### テーマ別カスタマイズ

- **現代版**: 職業を現代的に変更（警察官、記者、医師など）
- **SF版**: 未来的な職業と能力を追加
- **ホラー版**: より緊張感のある設定に変更

このガイドを参考に、あなたの好みに合ったマーダーミステリーゲームを作成してください！