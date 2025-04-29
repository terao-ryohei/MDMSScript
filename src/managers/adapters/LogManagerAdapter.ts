import type { GameTime } from "../../../submodules/mc-action-logger/src/types";

/**
 * LogManager用のアダプターインターフェース
 */
export interface ILogManagerAdapter {
  getGameState(): {
    isRunning: boolean;
    startTime: number;
    remainingTime: number;
  };
  getTimerManager(): { getGameTime(): GameTime };
}
