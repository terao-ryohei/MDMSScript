import type { GameTime } from "../../../submodules/mc-action-logger/src/types/types";
import type { PlayerState, GameState } from "../../types/GameTypes";
import type { GamePhase } from "../../constants/main";
import type { RoleType } from "../../types/AdvancedFeatureTypes";

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
 */
export interface IGameManager {
  getGameState(): GameState;
  getTimerManager(): ITimerManager;
  getPlayerState(playerId: string): PlayerState | undefined;

  /**
   * プレイヤーの役職を更新する
   * @param playerId プレイヤーID
   * @param role 新しい役職
   */
  updatePlayerRole(playerId: string, role: RoleType): void;

  /**
   * イベントリスナーを登録する
   * @param event イベント名
   * @param handler イベントハンドラ
   */
  on(event: "phaseChanged", handler: (phase: GamePhase) => void): void;
  on(event: "playerJoined", handler: (playerId: string) => void): void;
  on(event: "playerLeft", handler: (playerId: string) => void): void;

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
