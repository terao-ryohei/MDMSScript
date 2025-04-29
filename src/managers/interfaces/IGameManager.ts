import type { GameTime } from "../../../submodules/mc-action-logger/src/types";
import type { PlayerState } from "../../types/GameTypes";

export interface IGameState {
  isRunning: boolean;
  startTime: number;
  remainingTime: number;
}

export interface ITimerManager {
  getGameTime(): GameTime;
}

/**
 * GameManagerのインターフェース
 * LogManagerで必要な最小限のインターフェースを定義
 */
export interface IGameManager {
  getGameState(): IGameState;
  getTimerManager(): ITimerManager;
  getPlayerState(playerId: string): PlayerState | undefined;
}
