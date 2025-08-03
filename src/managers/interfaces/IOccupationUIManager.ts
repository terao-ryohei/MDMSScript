import type { Player } from "@minecraft/server";

/**
 * 職業UI管理のインターフェース
 */
export interface IOccupationUIManager {
  /**
   * 職業情報の表示を制御する
   */
  showOccupation(player: Player): Promise<void>;

  dispose(): void;
}
