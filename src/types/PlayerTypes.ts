import type { RoleCategory, RoleAbility } from "./RoleTypes";
import type { OccupationType } from "./OccupationTypes";
import type { BaseAbility } from "./AbilityTypes";

// プレイヤーの状態
export interface PlayerState {
  playerId: string;
  role: RoleCategory;
  occupation: OccupationType;
  abilities: PlayerAbilities;
}

// プレイヤーの能力
export interface PlayerAbilities {
  roleAbilities: RoleAbility[];
  occupationAbilities: BaseAbility[];
}

// 組み合わせ制約
export interface CombinationConstraint {
  role: RoleCategory;
  allowedOccupations: OccupationType[];
  forbiddenOccupations: OccupationType[];
}
