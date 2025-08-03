import type { Player } from "@minecraft/server";

/**
 * LogManagerが必要とするインターフェース
 * ゲーム内のアクションをログとして記録する機能を提供します
 */
export interface ILoggerManager {
  /**
   * アクションをログとして記録します
   * @param data ログとして記録するアクションデータ
   */
  logAction(data: {
    type: string; // アクションの種類
    player: Player; // アクションを実行したプレイヤーのID
    details: unknown; // アクションの詳細情報
  }): void;
}
