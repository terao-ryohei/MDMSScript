import type { Role } from "./RoleTypes";
import type { OccupationName } from "./OccupationTypes";
import type { BaseAbility } from "./AbilityTypes";
import type { Player } from "@minecraft/server";

// プレイヤーの状態
export interface PlayerState {
  player: Player;
  role: Role;
  occupation: OccupationName;
  abilities: PlayerAbilities;
}

// プレイヤーの能力
export interface PlayerAbilities {
  roleAbilities: BaseAbility[];
  occupationAbilities: BaseAbility[];
}

// 組み合わせ制約
export interface CombinationConstraint {
  role: Role;
  allowedOccupations: OccupationName[];
  forbiddenOccupations: OccupationName[];
}
