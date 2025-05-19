import { system, world } from "@minecraft/server";
import { PHASES } from "src/constants/phaseManger";
import type { Phase } from "src/types/PhaseType";
import { handleError } from "src/utils/errorHandle";
import type { ExtendedActionType } from "../types/ActionTypes";
import type { IPhaseManager } from "./interfaces/IPhaseManager";
import { TimerManager } from "./TimerManager";
import { ActionLoggerModule } from "@mc-action-logger/ActionLoggerModule";

/**
 * フェーズマネージャーのエラー型
 */
class PhaseManagerError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "PhaseManagerError";
  }
}

/**
 * フェーズマネージャークラス
 * ゲームの各フェーズを管理し、フェーズごとの制限を適用します
 */
export class PhaseManager implements IPhaseManager {
  private static instance: PhaseManager | null = null;
  private currentPhase: Phase;
  private phaseStartTime: number;
  private timerManager: TimerManager;
  private actionLogger: ActionLoggerModule;

  private constructor() {
    this.currentPhase = PHASES.preparation;
    this.phaseStartTime = system.currentTick;
    this.timerManager = TimerManager.getInstance();
    this.actionLogger = ActionLoggerModule.getInstance();
  }

  /**
   * インスタンスの作成
   */
  public static getInstance(): PhaseManager {
    if (!PhaseManager.instance) {
      PhaseManager.instance = new PhaseManager();
    }
    return PhaseManager.instance;
  }

  /**
   * 現在のフェーズを取得
   */
  public getCurrentPhase(): Phase {
    return this.currentPhase;
  }

  /**
   * フェーズの開始
   */
  public async startPhase(phase: Phase): Promise<void> {
    try {
      // // フェーズ遷移の検証
      // if (!this.validatePhaseTransition(phase)) {
      //   throw new PhaseManagerError(
      //     `無効なフェーズ遷移です: ${this.currentPhase} -> ${phase}`,
      //     "INVALID_PHASE_TRANSITION",
      //   );
      // }

      // エッジケースの検証
      if (phase.duration <= 0) {
        throw new PhaseManagerError(
          "制限時間は0より大きい値である必要があります",
          "INVALID_DURATION",
        );
      }

      // 以前のフェーズのクリーンアップを確実に実行
      try {
        this.cleanupPhaseResources();
      } catch (error) {
        console.error(
          "フェーズリソースのクリーンアップ中にエラーが発生しました:",
          error,
        );
        // クリーンアップエラーでもフェーズ遷移は続行
      }

      this.phaseStartTime = system.currentTick;

      // タイマーの開始（遷移後に実行）
      this.timerManager.startTimer(phase);

      if (phase === PHASES.daily_life) {
        this.actionLogger.start();
        world.sendMessage("§a ACTION_LOGGER_STARTED");
      }

      // フェーズ開始メッセージの送信
      world.sendMessage(
        `§e${phase.name}フェーズが開始されました（制限時間: ${phase.duration}秒）`,
      );
      this.currentPhase = phase;
    } catch (error) {
      if (error instanceof Error) {
        await handleError(error);
      }
    }
  }

  /**
   * アクションが現在のフェーズで許可されているかチェック
   */
  public isActionAllowed(action: ExtendedActionType): boolean {
    const restrictions = this.currentPhase;
    return restrictions.allowedActions.includes(action);
  }

  /**
   * フェーズ経過時間の取得（秒）
   */
  public getElapsedTime(): number {
    return Math.floor((system.currentTick - this.phaseStartTime) / 20);
  }

  /**
   * リソースの解放
   */
  public async dispose(): Promise<void> {
    try {
      this.cleanupPhaseResources();
      this.timerManager.dispose();
      PhaseManager.instance = null;
    } catch (error) {
      if (error instanceof Error) {
        await handleError(error);
      }
    }
  }

  /**
   * フェーズリソースのクリーンアップ
   */
  private cleanupPhaseResources(): void {
    // 現在のフェーズに関連するリソースをクリーンアップ
    this.timerManager.stopTimer();
    // その他のクリーンアップ処理をここに追加
  }
}
