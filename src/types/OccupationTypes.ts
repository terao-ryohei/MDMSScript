import type { BaseAbility } from "./AbilityTypes";

// 職業の種類
export enum OccupationName {
  GUARD = "guard",
  PRIEST = "priest",
  MERCHANT = "merchant",
  PRISONER = "prisoner",
}

// 職業のUI状態
export interface OccupationUIState {
  selectedAbilityId: string | null;
  targetPlayerId: string | null;
  showDetails: boolean;
  notifications: OccupationNotification[];
  activeAbility: string | null;
}

// 職業の通知
export interface OccupationNotification {
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

// 職業の詳細情報
export interface Occupation {
  id: number;
  name: string;
  description: string;
  objective: string;
  winCondition: string;
  abilities: BaseAbility[];
}

// プレイヤー数による職業制限
export interface OccupationDistributionRule {
  playerRange: [number, number];
  distribution: {
    [key: string]: number;
  };
}
