import type { OccupationType } from "../../types/OccupationTypes";
import type { RoleType } from "../../types/AdvancedFeatureTypes";
import type {
  PlayerState,
  OccupationRules,
  OccupationBalanceRules,
} from "../../types/GameTypes";

/**
 * 職業割り当ての結果インターフェース
 */
export interface OccupationAssignmentResult {
  success: boolean;
  assignments: Map<string, OccupationType>;
  error?: string;
}

/**
 * 職業管理インターフェース
 */
export interface IOccupationManager {
  /**
   * 職業を割り当てる
   */
  assignOccupations(
    players: PlayerState[],
    rules: OccupationRules,
    balanceRules: OccupationBalanceRules,
  ): Promise<OccupationAssignmentResult>;

  /**
   * 職業の割り当てを検証する
   */
  validateOccupationAssignment(
    roleAssignments: Map<string, RoleType>,
    occupationAssignments: Map<string, OccupationType>,
  ): Promise<boolean>;

  /**
   * プレイヤーの職業を取得する
   */
  getPlayerOccupation(playerId: string): Promise<OccupationType | null>;

  /**
   * 職業に基づく相互作用が可能か確認する
   */
  canInteract(sourcePlayerId: string, targetPlayerId: string): Promise<boolean>;

  /**
   * 職業の変更を記録する
   */
  logOccupationChange(
    playerId: string,
    oldOccupation: OccupationType | null,
    newOccupation: OccupationType,
  ): Promise<void>;

  /**
   * 職業の能力使用を記録する
   */
  logAbilityUse(
    playerId: string,
    abilityId: string,
    success: boolean,
  ): Promise<void>;

  /**
   * 特定の職業の割り当て数を取得する
   */
  getOccupationCount(occupation: OccupationType): Promise<number>;
}
