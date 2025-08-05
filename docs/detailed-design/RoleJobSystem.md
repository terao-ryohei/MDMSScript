# ロール・ジョブシステム詳細設計

## 1. システム概要

ファンタジー西洋城下町を舞台としたマーダーミステリーにおけるロール（役割）とジョブ（職業）の割り当てシステム。

### 1.1 基本構造

```typescript
interface Player {
  role: Role;      // マダミス上の役割（犯人、共犯者、一般人）
  job: Job;        // 城下町での職業
  abilities: Ability[]; // 3つの能力（ロール1つ、ジョブ1つ、ランダム1つ）
  objectives: Objective[]; // 3つの目的（ロール1つ、ジョブ1つ、ランダム1つ）
}
```

## 2. ロール（Role）システム

### 2.1 ロール定義

```typescript
enum RoleType {
  MURDERER = "murderer",      // 犯人
  ACCOMPLICE = "accomplice",  // 共犯者
  CITIZEN = "citizen"         // 一般人（探偵含む）
}

interface Role {
  type: RoleType;
  name: string;
  description: string;
  baseAbility: Ability;
  baseObjective: Objective;
  specialRules: string[];
}
```

### 2.2 各ロールの詳細

#### 犯人 (MURDERER)
- **基本能力**: キル能力（半径4マス以内でプレイヤーをキル）
- **基本目的**: 投票で1位にならない
- **特殊ルール**: 
  - 生活フェーズのどのタイミングでも事件を起こせる
  - 事件発生タイミングを自由に選択可能

#### 共犯者 (ACCOMPLICE)
- **基本能力**: 情報取得（犯人の名前 OR 犯行時間のいずれかを知る）
- **基本目的**: 犯人の勝利をサポート
- **特殊ルール**: 
  - 犯人と密談可能
  - 証拠隠滅行動が可能

#### 一般人 (CITIZEN)
- **基本能力**: 推理力強化（証拠の信頼性+10%）
- **基本目的**: 真犯人の特定
- **特殊ルール**: 
  - 探偵役がいる場合は推理力がさらに強化

## 3. ジョブ（Job）システム

### 3.1 ジョブ定義

```typescript
interface Job {
  id: string;
  name: string;
  description: string;
  socialStatus: "noble" | "citizen" | "merchant" | "servant";
  dailyTasks: Task[];
  ability: Ability;
  objective: Objective;
  startingLocation: string;
  accessibleAreas: string[];
}
```

### 3.2 城下町ジョブ一覧

#### 王族・貴族階級
1. **王 (King)**
   - 能力: 召喚術（好きなプレイヤーを城に一度だけ呼び出せる）
   - 目的: 浮気を誰にも指摘されない
   - タスク: 謁見、政務処理

2. **近衛隊長 (Captain of Guards)**
   - 能力: 護衛術（指定プレイヤーを1フェーズ保護）
   - 目的: 城の秩序を維持する
   - タスク: 警備巡回、兵士指導

3. **宮廷魔術師 (Court Wizard)**
   - 能力: 占術（ランダムな証拠情報を1つ得る）
   - 目的: 魔術の研究を完成させる
   - タスク: 魔術研究、薬草採取

#### 市民・商人階級
4. **行商人 (Traveling Merchant)**
   - 能力: 交渉術（他プレイヤーとアイテム交換可能）
   - 目的: 10万円相当の利益を上げる
   - タスク: 商品仕入れ、販売

5. **ギルドの受付 (Guild Receptionist)**
   - 能力: 情報収集術（全プレイヤーの行動履歴を部分的に閲覧）
   - 目的: ギルドの評判を上げる
   - タスク: 依頼受付、報告書作成

6. **鍛冶屋 (Blacksmith)**
   - 能力: 鑑定術（証拠アイテムの詳細情報を得る）
   - 目的: 伝説の武器を完成させる
   - タスク: 武器製作、修理作業

7. **酒場の店主 (Tavern Owner)**
   - 能力: 聞き込み術（プレイヤー間の会話履歴を部分的に閲覧）
   - 目的: 酒場を繁盛させる
   - タスク: 料理提供、客対応

#### 使用人・労働者階級
8. **庭師 (Gardener)**
   - 能力: 隠蔽術（指定場所の証拠を1つ隠す）
   - 目的: 美しい庭園を完成させる
   - タスク: 植物手入れ、庭園管理

9. **メイド (Maid)**
   - 能力: 盗聴術（指定プレイヤーの次の行動を事前に知る）
   - 目的: 完璧な掃除を達成する
   - タスク: 部屋掃除、給仕

10. **錬金術師の弟子 (Alchemist Apprentice)**
    - 能力: 瞬間移動術（特定の場所に一度だけワープ）
    - 目的: 師匠を超える発見をする
    - タスク: 薬草調合、実験補助

## 4. 能力（Ability）システム

### 4.1 能力構造

```typescript
interface Ability {
  id: string;
  name: string;
  description: string;
  type: "active" | "passive";
  cooldown: number; // 使用回数制限
  usagePhases: PhaseType[]; // 使用可能フェーズ
  targetType: "self" | "other" | "area" | "none";
  effect: AbilityEffect;
}

interface AbilityEffect {
  type: "teleport" | "information" | "protection" | "manipulation";
  parameters: Record<string, any>;
}
```

### 4.2 ランダム能力プール

```typescript
const randomAbilities: Ability[] = [
  {
    name: "透視術",
    description: "壁越しに隣接部屋のプレイヤーを見る",
    type: "active",
    cooldown: 2
  },
  {
    name: "変装術", 
    description: "1フェーズ間、他プレイヤーに正体を隠す",
    type: "active",
    cooldown: 1
  },
  {
    name: "記憶術",
    description: "過去のフェーズの行動を1つ思い出す",
    type: "active", 
    cooldown: 1
  },
  {
    name: "幸運",
    description: "証拠発見確率が20%上昇",
    type: "passive",
    cooldown: 0
  }
];
```

## 5. 目的（Objective）システム

### 5.1 目的構造

```typescript
interface Objective {
  id: string;
  name: string;
  description: string;
  type: "primary" | "secondary" | "hidden";
  category: "survival" | "social" | "economic" | "investigation";
  successConditions: Condition[];
  rewards: number; // 達成時の得点
  penalty: number; // 失敗時の減点
}
```

### 5.2 ランダム目的プール

```typescript
const randomObjectives: Objective[] = [
  {
    name: "金銭獲得",
    description: "10万円相当の価値を得る",
    category: "economic",
    rewards: 150
  },
  {
    name: "秘密保持",
    description: "自分の秘密を最後まで隠し通す",
    category: "social", 
    rewards: 100
  },
  {
    name: "証拠収集",
    description: "5つ以上の証拠を収集する",
    category: "investigation",
    rewards: 120
  },
  {
    name: "信頼獲得",
    description: "3人以上から信頼されている状態で終了",
    category: "social",
    rewards: 130
  }
];
```

## 6. 割り当てアルゴリズム

### 6.1 ロール割り当て

```typescript
function assignRoles(players: Player[]): void {
  const playerCount = players.length;
  
  // プレイヤー数に応じた構成
  const composition = getRoleComposition(playerCount);
  
  // ランダムシャッフル後割り当て
  const shuffledPlayers = shuffle(players);
  let index = 0;
  
  for (const [role, count] of composition) {
    for (let i = 0; i < count; i++) {
      shuffledPlayers[index].role = role;
      index++;
    }
  }
}

function getRoleComposition(playerCount: number): Map<RoleType, number> {
  if (playerCount <= 4) return new Map([[RoleType.MURDERER, 1], [RoleType.CITIZEN, playerCount - 1]]);
  if (playerCount <= 8) return new Map([[RoleType.MURDERER, 1], [RoleType.ACCOMPLICE, 1], [RoleType.CITIZEN, playerCount - 2]]);
  // 9人以上の場合は犯人2人体制も検討
  return new Map([[RoleType.MURDERER, 2], [RoleType.ACCOMPLICE, 1], [RoleType.CITIZEN, playerCount - 3]]);
}
```

### 6.2 ジョブ割り当て

```typescript
function assignJobs(players: Player[]): void {
  const availableJobs = [...ALL_JOBS];
  
  // 社会階級バランスを考慮
  const jobsByStatus = groupJobsByStatus(availableJobs);
  
  for (const player of players) {
    // プレイヤーの特性に応じてジョブを選択
    const suitableJobs = selectSuitableJobs(player, jobsByStatus);
    const assignedJob = selectRandom(suitableJobs);
    
    player.job = assignedJob;
    removeJob(availableJobs, assignedJob);
  }
}
```

## 7. UI表示システム

### 7.1 ロール・ジョブ確認UI

```typescript
interface RoleJobUI {
  displayRoleInfo(player: Player): void;
  displayJobInfo(player: Player): void;
  displayAbilities(player: Player): void;
  displayObjectives(player: Player): void;
}
```

### 7.2 能力使用UI

プレイヤーがserver-uiを通じて能力を発動できるインターフェース設計。

## 8. データ永続化

```typescript
interface PlayerData {
  playerId: string;
  roleType: RoleType;
  jobId: string;
  abilities: string[];
  objectives: string[];
  assignmentTimestamp: number;
}
```

プレイヤーのロール・ジョブ情報をゲーム開始時に記録し、フェーズ間で保持する仕組み。