import type { BaseAbility } from "./AbilityTypes";
import { ROLE_ABILITY_DETAILS } from "../abilities/RoleAbilities";
import { RoleType } from "./AdvancedFeatureTypes";

// 役割の種類
export enum RoleCategory {
  DETECTIVE = "detective",
  KILLER = "killer",
  ACCOMPLICE = "accomplice",
  CITIZEN = "citizen",
}

// 役割の能力
export interface RoleAbility extends BaseAbility {}

// 役割の詳細情報
export interface RoleDetails {
  name: string;
  description: string;
  objective: string;
  winCondition: string;
  abilities: RoleAbility[];
}

// 役割のUI状態
export interface RoleUIState {
  selectedAbilityId: string | null;
  targetPlayerId: string | null;
  showDetails: boolean;
  notifications: RoleNotification[];
  cooldowns: Map<string, number>;
  activeAbility: string | null;
}

// 役割の通知
export interface RoleNotification {
  id: string;
  type:
    | "info"
    | "warning"
    | "error"
    | "success"
    | "ability_use"
    | "ability_ready"
    | "ability_fail"
    | "ability_success";
  message: string;
  timestamp: number;
  duration?: number;
  priority?: "low" | "medium" | "high";
}

// 役割の統計情報
export interface RoleStatistics {
  // 勝率統計
  winRates: Map<RoleCategory, number>;
  // 能力使用統計
  abilityUsage: Map<string, number>; // ability.id をキーとする使用回数
  // プレイヤーフィードバック
  playerFeedback: {
    roleId: RoleCategory;
    rating: number; // 1-5 のレーティング
    comment?: string;
  }[];
}

// 役割詳細の定義
export const ROLE_DETAILS: Record<RoleCategory, RoleDetails> = {
  [RoleCategory.DETECTIVE]: {
    name: "探偵",
    description: "真実を追求する者なのだ",
    objective: "真犯人を見つけ出すのだ",
    winCondition: "正しい犯人を特定できれば勝利なのだ",
    abilities: ROLE_ABILITY_DETAILS[RoleCategory.DETECTIVE].abilities,
  },
  [RoleCategory.KILLER]: {
    name: "殺人者",
    description: "闇に潜む者なのだ",
    objective: "罪を逃れるのだ",
    winCondition: "最後まで生き残るか、無実の市民が処刑されれば勝利なのだ",
    abilities: ROLE_ABILITY_DETAILS[RoleCategory.KILLER].abilities,
  },
  [RoleCategory.ACCOMPLICE]: {
    name: "共犯者",
    description: "殺人者を支援する者なのだ",
    objective: "殺人者を助けるのだ",
    winCondition: "殺人者が勝利すれば勝利なのだ",
    abilities: ROLE_ABILITY_DETAILS[RoleCategory.ACCOMPLICE].abilities,
  },
  [RoleCategory.CITIZEN]: {
    name: "市民",
    description: "正義のために戦う者なのだ",
    objective: "真犯人を見つけ出すのだ",
    winCondition: "正しい犯人を特定できれば勝利なのだ",
    abilities: ROLE_ABILITY_DETAILS[RoleCategory.CITIZEN].abilities,
  },
};

// プレイヤー数による役割制限
export interface RoleDistributionRule {
  playerRange: [number, number];
  distribution: {
    [key: string]: number;
  };
}

// 役割分布のルール定義
export const ROLE_DISTRIBUTION_RULES: RoleDistributionRule[] = [
  {
    playerRange: [1, 6],
    distribution: {
      [RoleType.DETECTIVE]: 1,
      [RoleType.KILLER]: 1,
      [RoleType.ACCOMPLICE]: 0,
      [RoleType.CITIZEN]: -1, // 残りのプレイヤー
    },
  },
  {
    playerRange: [7, 12],
    distribution: {
      [RoleType.DETECTIVE]: 1,
      [RoleType.KILLER]: 1,
      [RoleType.ACCOMPLICE]: 1,
      [RoleType.CITIZEN]: -1,
    },
  },
  {
    playerRange: [13, 16],
    distribution: {
      [RoleType.DETECTIVE]: 2,
      [RoleType.KILLER]: 1,
      [RoleType.ACCOMPLICE]: 1,
      [RoleType.CITIZEN]: -1,
    },
  },
  {
    playerRange: [17, 20],
    distribution: {
      [RoleType.DETECTIVE]: 2,
      [RoleType.KILLER]: 2,
      [RoleType.ACCOMPLICE]: 2,
      [RoleType.CITIZEN]: -1,
    },
  },
];

/**
 * 役職割り当ての設定インターフェース
 */
export interface RoleAssignmentConfig {
  roleDistribution: {
    [key in RoleType]?: number;
  };
  minPlayers: number;
  maxPlayers: number;
  distribution?: RoleDistributionConfig;
}

export interface RoleDistributionConfig {
  specialRoleRatio: number;
  minDetectiveRatio: number;
  maxKillerRatio: number;
  balancePreference: "balanced" | "detective-favored" | "killer-favored";
}

/**
 * 役職割り当ての結果インターフェース
 */
export interface RoleAssignmentResult {
  success: boolean;
  assignments: Map<string, RoleType>;
  error?: string;
}
