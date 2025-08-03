import type { Role } from "../../types/RoleTypes";
import type { Player } from "@minecraft/server";

/**
 * 役割管理インターフェース
 */
export interface IRoleAssignmentManager {
  /**
   * 役割を割り当てる
   */
  assignRoles(): Promise<{ success: boolean; error?: string }>;

  /**
   * プレイヤーの役割を取得する
   */
  getPlayerRole(player: Player): Promise<Role | null>;
}
