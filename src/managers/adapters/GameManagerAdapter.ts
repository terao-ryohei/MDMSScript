import type { GameTime } from "../../../submodules/mc-action-logger/src/types";
import type { GameManager } from "../GameManager";
import type { ILoggerManager } from "../interfaces/ILoggerManager";
import { system } from "@minecraft/server";

/**
 * GameManager用のアダプタークラス
 * LogManagerが必要とするインターフェースを提供します
 */
export class GameManagerAdapter implements ILoggerManager {
  constructor(private gameManager: GameManager) {}

  public getGameState() {
    const state = this.gameManager.getGameState();
    return {
      isRunning: state.isActive,
    };
  }

  public getTimerManager() {
    return {
      getGameTime: (): GameTime => {
        const state = this.gameManager.getGameState();
        const currentTick = system.currentTick;
        const ticksPerDay = 24000;
        const ticksInCurrentDay = (currentTick - state.startTime) % ticksPerDay;

        return {
          day: state.currentDay,
          hour: Math.floor((ticksInCurrentDay % 24000) / 1000),
          minute: Math.floor((ticksInCurrentDay % 1000) / 16.6667),
        };
      },
    };
  }

  /**
   * ゲーム内アクションをログに記録
   * @param data ログに記録するアクションデータ
   */
  public async logAction(data: {
    type: string;
    playerId: string;
    details: unknown;
  }): Promise<void> {
    const state = this.gameManager.getGameState();
    if (!state.isActive) {
      console.warn("Cannot log action: game is not active");
      return;
    }
    this.logSystemAction(data.type, data.details);
  }

  public logSystemAction(type: string, details: unknown): void {
    this.gameManager.logSystemAction(type, details);
  }
}
