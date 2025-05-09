import type { GameTime } from "../../../submodules/mc-action-logger/src/types/types";
import type { PlayerState } from "../../types/GameTypes";

/**
 * チュートリアルの状態を表すインターフェース
 */
export interface ITutorialState {
  shown: boolean;
  currentPage: number;
  totalPages: number;
}

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
/**
 * GameManagerのインターフェース
 * LogManagerで必要な最小限のインターフェースを定義
 */
export interface IGameManager {
  getGameState(): IGameState;
  getTimerManager(): ITimerManager;
  getPlayerState(playerId: string): PlayerState | undefined;

  /**
   * チュートリアルを表示する
   * @returns チュートリアルが完了したかどうか
   */
  showTutorial(): Promise<boolean>;

  /**
   * チュートリアルの状態を取得する
   * @returns 現在のチュートリアル状態
   */
  getTutorialState(): ITutorialState;
}
