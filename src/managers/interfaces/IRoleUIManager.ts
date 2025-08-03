import type { Player } from "@minecraft/server";

/**
 * 役職UI管理のインターフェース
 */
export interface IRoleUIManager {
  /**
   * 役職情報の表示を制御する
   */
  showRoleDetails(player: Player): Promise<void>;
}
