import type { Occupation } from "../../types/OccupationTypes";
import type { Player } from "@minecraft/server";

/**
 * 職業割り当ての結果インターフェース
 */
export interface OccupationAssignmentResult {
  success: boolean;
  error?: string;
}

/**
 * 職業管理インターフェース
 */
export interface IOccupationAssignmentManager {
  /**
   * 職業を割り当てる
   */
  assignOccupations(): Promise<OccupationAssignmentResult>;

  /**
   * プレイヤーの職業を取得する
   */
  getPlayerOccupation(player: Player): Promise<Occupation | null>;
}
