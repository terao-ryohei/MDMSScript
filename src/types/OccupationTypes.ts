import type { BaseAbility } from "./AbilityTypes";
import type { OccupationType } from "./OccupationEnum";
export { OccupationType } from "./OccupationEnum";

// 職業の能力
export interface OccupationAbility extends BaseAbility {}

// 職業の詳細情報
export interface OccupationDetails {
  name: string;
  description: string;
  abilities: OccupationAbility[];
}

// 職業のUI状態
export interface OccupationUIState {
  selectedAbilityId: string | null;
  targetPlayerId: string | null;
  showDetails: boolean;
  notifications: OccupationNotification[];
  cooldowns: Map<string, number>;
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
