import { system, world } from "@minecraft/server";
import { PHASES } from "src/constants/phaseManger";
import { GamePhase, type Phase } from "src/types/PhaseType";
import { handleError } from "src/utils/errorHandle";
import type { ExtendedActionType } from "../types/ActionTypes";
import type { IPhaseManager } from "./interfaces/IPhaseManager";
// Removed mc-action-logger import - using mock implementation
import { WARNING_CONFIG } from "src/constants/timeManager";
import type { TimerDisplay } from "src/types/TimerTypes";
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
  private currentTimer: number | undefined;
  private startTime = 0;
  private currentPhase = PHASES.preparation;
  private updateCallback: number | undefined;

  private constructor(private readonly actionLogger: any) {
    // 1秒ごとの表示更新を設定（より正確な間隔で）
    this.updateCallback = system.runInterval(() => {
      try {
        this.updateDisplay();
      } catch (error) {
        console.error("タイマー更新中にエラーが発生しました:", error);
        // エラーが発生しても更新は継続
      }
    }, 20); // 20 ticks = 1秒
  }

  /**
   * インスタンスの作成
   */
  public static getInstance(actionLogger: any): PhaseManager {
    if (!PhaseManager.instance) {
      PhaseManager.instance = new PhaseManager(actionLogger);
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

      // タイマーの開始（遷移後に実行）
      this.startTimer(phase);

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
   * タイマーの開始
   */
  public startTimer(phase: Phase): void {
    this.startTime = system.currentTick;

    // 既存のタイマーをクリア
    if (this.currentTimer !== undefined) {
      system.clearRun(this.currentTimer);
    }

    this.currentPhase = phase;

    // 新しいタイマーを設定
    this.currentTimer = system.runTimeout(() => {
      this.onTimerComplete();
    }, phase.duration * 20);
  }

  /**
   * 現在のタイマー状態の取得
   */
  private getTimerState(): TimerDisplay {
    const duration = this.currentPhase.duration;
    const elapsedTicks = system.currentTick - this.startTime;
    const remainingSeconds = Math.max(
      0,
      duration - Math.floor(elapsedTicks / 20),
    );
    const progress = ((duration - remainingSeconds) / duration) * 100;

    return {
      currentPhase: this.currentPhase,
      remainingTime: {
        minutes: Math.floor(remainingSeconds / 60),
        seconds: remainingSeconds % 60,
      },
      progress,
    };
  }

  /**
   * タイマー表示の更新
   */
  private updateDisplay(): void {
    if (this.currentTimer === undefined) {
      return; // タイマーが動作していない場合は更新しない
    }

    try {
      const state = this.getTimerState();
      const { minutes, seconds } = state.remainingTime;
      const phaseName = this.currentPhase.name;
      const totalSeconds = minutes * 60 + seconds;

      // 残り時間文字列の生成
      const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      // 表示色の設定（警告時は点滅効果）
      const isWarningTime = totalSeconds <= WARNING_CONFIG.threshold;
      const color = isWarningTime ? "§c" : "§a";

      // タイマー表示テキストの生成
      const displayText = `§7[${phaseName}] ${color}残り時間: ${timeString}`;

      // 全プレイヤーに表示
      for (const player of world.getAllPlayers()) {
        player.onScreenDisplay.setActionBar(displayText);
      }
    } catch (error) {
      console.error("タイマー表示の更新中にエラーが発生しました:", error);
      // エラーメッセージも全プレイヤーに表示
      for (const player of world.getAllPlayers()) {
        player.onScreenDisplay.setActionBar(
          "§cタイマー表示の更新中にエラーが発生しました",
        );
      }
    }
  }

  /**
   * タイマー完了時の処理
   */
  private onTimerComplete(): void {
    const message = `§e${this.currentPhase.name}が終了しました`;
    // 全プレイヤーに表示
    for (const player of world.getAllPlayers()) {
      player.onScreenDisplay.setActionBar(message);
    }
    this.currentTimer = undefined;

    if (this.currentPhase.name !== GamePhase.ENDING) {
      const nextPhase = Object.values(PHASES).find(
        (phase) => phase.id === this.currentPhase.id + 1,
      );
      if (nextPhase) {
        this.startPhase(nextPhase).catch((error) => {
          if (error instanceof Error) {
            handleError(error);
          }
        });
      }
    }
  }

  /**
   * リソースの解放
   */
  public async dispose(): Promise<void> {
    try {
      if (this.currentTimer !== undefined) {
        system.clearRun(this.currentTimer);
      }
      if (this.updateCallback !== undefined) {
        system.clearRun(this.updateCallback);
      }
      PhaseManager.instance = null;
    } catch (error) {
      if (error instanceof Error) {
        await handleError(error);
      }
    }
  }
}
