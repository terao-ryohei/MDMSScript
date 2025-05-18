import { system, world } from "@minecraft/server";
import { RoleAssignmentError } from "src/managers/RoleAssignmentManager";

/**
 * エラーハンドリング
 */
export async function handleError(error: Error): Promise<void> {
  const errorDetails = {
    message: error.message,
    code: error instanceof RoleAssignmentError ? error.code : "UNKNOWN_ERROR",
    timestamp: system.currentTick,
    level: "error",
  };

  // 重要なエラーメッセージのみを表示
  const errorMessage = `§cエラー: ${errorDetails.message} (コード: ${errorDetails.code})`;
  world.sendMessage(errorMessage);
}
