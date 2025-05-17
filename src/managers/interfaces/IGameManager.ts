import type { GameState } from "../../types/GameTypes";
import type { PlayerState } from "../../types/GameTypes";

export interface IGameManager {
  /**
   * ゲームの現在の状態を取得するのだ
   */
  getGameState(): GameState;

  /**
   * 指定したプレイヤーの状態を取得するのだ
   * @param playerId プレイヤーID
   */
  getPlayerState(playerId: string): PlayerState | undefined;
}
