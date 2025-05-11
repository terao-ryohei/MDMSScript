import type { RoleType, AbilityTarget } from "../../types/AdvancedFeatureTypes";
import type { RoleDetails, RoleUIState } from "../../types/RoleTypes";

/**
 * 役職UI管理のインターフェース
 */
export interface IRoleUIManager {
  /**
   * 役職情報の表示を制御する
   */
  showRoleDetails(playerId: string): Promise<void>;
  hideRoleDetails(playerId: string): Promise<void>;
  getRoleDetails(playerId: string): Promise<RoleDetails>;
  getRoleUIState(playerId: string): Promise<RoleUIState>;

  /**
   * 特殊能力の管理
   */
  activateAbility(playerId: string, abilityId: string): Promise<boolean>;
  deactivateAbility(playerId: string, abilityId: string): Promise<void>;
  useAbility(
    playerId: string,
    abilityId: string,
    target: AbilityTarget,
  ): Promise<boolean>;
  getCoolDown(playerId: string, abilityId: string): Promise<number>;
  getRemainingUses(playerId: string, abilityId: string): Promise<number>;

  /**
   * イベントハンドラー
   */
  onPhaseChange(phase: string): Promise<void>;
  onRoleAssignment(playerId: string, role: RoleType): Promise<void>;
  onAbilityUse(
    playerId: string,
    abilityId: string,
    success: boolean,
  ): Promise<void>;
}
