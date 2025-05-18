import type { GameState } from "../../types/GameTypes";
import type { PlayerState } from "../../types/GameTypes";
import type { Player } from "@minecraft/server";

export interface IGameManager {
  /**
   * ゲームの現在の状態を取得するのだ
   */
  getGameState(): GameState;

  /**
   * 指定したプレイヤーの状態を取得するのだ
   * @param player プレイヤーID
   */
  getPlayerState(player: Player): PlayerState | undefined;
}
