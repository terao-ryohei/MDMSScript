import { system, world } from "@minecraft/server";
import { GamePhase, PHASE_NAMES } from "src/constants/main";
import {
  PHASE_RESTRICTIONS,
  VALID_PHASE_TRANSITIONS,
} from "src/constants/phaseManger";
import { handleError } from "src/utils/errorHandle";
import type { ExtendedActionType } from "../types/ActionTypes";
import type { IPhaseManager } from "./interfaces/IPhaseManager";
import { TimerManager } from "./TimerManager";

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
  private currentPhase: GamePhase;
  private phaseStartTime: number;
  private timerManager: TimerManager;

  private constructor() {
    this.currentPhase = GamePhase.PREPARATION;
    this.phaseStartTime = system.currentTick;
    this.timerManager = TimerManager.getInstance();
  }

  /**
   * インスタンスの作成
   */
  public static create(): PhaseManager {
    if (!PhaseManager.instance) {
      PhaseManager.instance = new PhaseManager();
    }
    return PhaseManager.instance;
  }

  /**
   * 現在のフェーズの取得
   */
  public getCurrentPhase(): GamePhase {
    return this.currentPhase;
  }

  /**
   * フェーズの開始
   */
  public async startPhase(phase: GamePhase, duration: number): Promise<void> {
    try {
      // // フェーズ遷移の検証
      // if (!this.validatePhaseTransition(phase)) {
      //   throw new PhaseManagerError(
      //     `無効なフェーズ遷移です: ${this.currentPhase} -> ${phase}`,
      //     "INVALID_PHASE_TRANSITION",
      //   );
      // }

      // エッジケースの検証
      if (duration <= 0) {
        throw new PhaseManagerError(
          "制限時間は0より大きい値である必要があります",
          "INVALID_DURATION",
        );
      }

      const oldPhase = this.currentPhase;

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

      this.currentPhase = phase;
      this.phaseStartTime = system.currentTick;

      // タイマーの開始（遷移後に実行）
      this.timerManager.startTimer(phase, duration);

      // フェーズ開始メッセージの送信
      const currentPhaseNumber = VALID_PHASE_TRANSITIONS[oldPhase].length;
      const totalPhases = Object.keys(VALID_PHASE_TRANSITIONS).length - 1;
      world.sendMessage(
        `§e${currentPhaseNumber}/${totalPhases}フェーズ目: ${PHASE_NAMES[phase]}フェーズが開始されました（制限時間: ${duration}秒）`,
      );
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
    const restrictions = PHASE_RESTRICTIONS[this.currentPhase];
    return restrictions.allowedActions.includes(action);
  }

  /**
   * 投票が許可されているかチェック
   */
  public canVote(): boolean {
    return PHASE_RESTRICTIONS[this.currentPhase].canVote;
  }

  /**
   * 証拠収集が許可されているかチェック
   */
  public canCollectEvidence(): boolean {
    return PHASE_RESTRICTIONS[this.currentPhase].canCollectEvidence;
  }

  /**
   * チャットが許可されているかチェック
   */
  public canChat(): boolean {
    return PHASE_RESTRICTIONS[this.currentPhase].canChat;
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

  /**
   * フェーズごとのデフォルト制限時間を取得
   */
  private getDefaultDuration(phase: GamePhase): number {
    const DEFAULT_DURATIONS: Record<GamePhase, number> = {
      [GamePhase.PREPARATION]: 300, // 5分
      [GamePhase.DAILY_LIFE]: 600, // 10分
      [GamePhase.INVESTIGATION]: 480, // 8分
      [GamePhase.DISCUSSION]: 420, // 7分
      [GamePhase.PRIVATE_TALK]: 300, // 5分
      [GamePhase.FINAL_MEETING]: 420, // 7分
      [GamePhase.REASONING]: 300, // 5分
      [GamePhase.VOTING]: 180, // 3分
      [GamePhase.ENDING]: 300, // 5分
    };
    return DEFAULT_DURATIONS[phase];
  }
}
