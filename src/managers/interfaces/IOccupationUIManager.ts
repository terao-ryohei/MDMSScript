import type { OccupationType } from "../../types/OccupationTypes";
import type {
  OccupationDetails,
  OccupationUIState,
} from "../../types/OccupationTypes";
import type { AbilityTarget } from "../../types/AdvancedFeatureTypes";

/**
 * 職業UI管理のインターフェース
 */
export interface IOccupationUIManager {
  /**
   * 職業情報の表示を制御する
   */
  showOccupationDetails(playerId: string): Promise<void>;
  hideOccupationDetails(playerId: string): Promise<void>;
  getOccupationDetails(playerId: string): Promise<OccupationDetails | null>;
  getOccupationUIState(playerId: string): Promise<OccupationUIState>;

  /**
   * 特殊能力の管理
   */
  useAbility(
    playerId: string,
    abilityId: string,
    target: AbilityTarget,
  ): Promise<boolean>;
  getCoolDown(playerId: string, abilityId: string): Promise<number>;
  getRemainingUses(playerId: string, abilityId: string): Promise<number>;

  /**
   * プレイヤーの職業を取得
   */
  getPlayerOccupation(playerId: string): Promise<OccupationType | null>;

  /**
   * イベントハンドラー
   */
  onOccupationAssignment(
    playerId: string,
    occupation: OccupationType,
  ): Promise<void>;
  onAbilityUse(
    playerId: string,
    abilityId: string,
    success: boolean,
  ): Promise<void>;

  /**
   * 通知関連
   */
  showNotification(
    playerId: string,
    type: "info" | "warning" | "error" | "success",
    message: string,
    duration?: number,
  ): Promise<void>;
}
