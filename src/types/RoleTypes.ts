import type { BaseAbility } from "./AbilityTypes";

// 役割の種類
export enum RoleName {
  DETECTIVE = "detective",
  KILLER = "killer",
  ACCOMPLICE = "accomplice",
  CITIZEN = "citizen",
}

// 役割のUI状態
export interface RoleUIState {
  selectedAbilityId: string | null;
  targetPlayerId: string | null;
  showDetails: boolean;
  notifications: RoleNotification[];
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

// 役割の詳細情報
export interface Role {
  id: number;
  name: string;
  description: string;
  objective: string;
  winCondition: string;
  abilities: BaseAbility[];
}

// プレイヤー数による役割制限
export interface RoleDistributionRule {
  playerRange: [number, number];
  distribution: {
    [key: string]: number;
  };
}
