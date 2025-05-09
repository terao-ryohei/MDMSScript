import { system, world } from "@minecraft/server";
import { MurderMysteryActions } from "../types/ActionTypes";
import type { ExtendedActionType } from "../types/ActionTypes";
import type {
  IPhaseGameManager,
  IPhaseRestrictions,
} from "./interfaces/IPhaseManager";
import { TimerManager } from "./TimerManager";
import { GamePhase, PHASE_NAMES } from "src/constants/main";

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
 * フェーズ遷移の定義
 */
const VALID_PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  [GamePhase.PREPARATION]: [GamePhase.DAILY_LIFE],
  [GamePhase.DAILY_LIFE]: [GamePhase.INVESTIGATION],
  [GamePhase.INVESTIGATION]: [GamePhase.DISCUSSION],
  [GamePhase.DISCUSSION]: [GamePhase.PRIVATE_TALK],
  [GamePhase.PRIVATE_TALK]: [GamePhase.FINAL_MEETING],
  [GamePhase.FINAL_MEETING]: [GamePhase.REASONING],
  [GamePhase.REASONING]: [GamePhase.VOTING],
  [GamePhase.VOTING]: [GamePhase.ENDING],
  [GamePhase.ENDING]: [],
};

/**
 * フェーズマネージャークラス
 * ゲームの各フェーズを管理し、フェーズごとの制限を適用します
 */
export class PhaseManager {
  private static instance: PhaseManager | null = null;
  private currentPhase: GamePhase;
  private phaseStartTime: number;
  private timerManager: TimerManager;

  private readonly phaseRestrictions: Record<GamePhase, IPhaseRestrictions> = {
    [GamePhase.PREPARATION]: {
      allowedActions: [MurderMysteryActions.TALK_TO_NPC],
      canVote: false,
      canCollectEvidence: false,
      canChat: true,
    },
    [GamePhase.DAILY_LIFE]: {
      allowedActions: [
        MurderMysteryActions.TALK_TO_NPC,
        MurderMysteryActions.COLLECT_EVIDENCE,
        MurderMysteryActions.PERFORM_MURDER,
        MurderMysteryActions.CREATE_ALIBI,
      ],
      canVote: false,
      canCollectEvidence: true,
      canChat: true,
    },
    [GamePhase.INVESTIGATION]: {
      allowedActions: [
        MurderMysteryActions.INVESTIGATE_SCENE,
        MurderMysteryActions.COLLECT_EVIDENCE,
        MurderMysteryActions.ANALYZE_EVIDENCE,
        MurderMysteryActions.TALK_TO_NPC,
      ],
      canVote: false,
      canCollectEvidence: true,
      canChat: true,
    },
    [GamePhase.DISCUSSION]: {
      allowedActions: [
        MurderMysteryActions.EVIDENCE_SHARE,
        MurderMysteryActions.TALK_TO_NPC,
      ],
      canVote: false,
      canCollectEvidence: false,
      canChat: true,
    },
    [GamePhase.PRIVATE_TALK]: {
      allowedActions: [
        MurderMysteryActions.INVESTIGATE_SCENE,
        MurderMysteryActions.COLLECT_EVIDENCE,
        MurderMysteryActions.ANALYZE_EVIDENCE,
        MurderMysteryActions.TALK_TO_NPC,
      ],
      canVote: false,
      canCollectEvidence: true,
      canChat: true,
    },
    [GamePhase.FINAL_MEETING]: {
      allowedActions: [
        MurderMysteryActions.EVIDENCE_SHARE,
        MurderMysteryActions.TALK_TO_NPC,
      ],
      canVote: false,
      canCollectEvidence: false,
      canChat: true,
    },
    [GamePhase.REASONING]: {
      allowedActions: [
        MurderMysteryActions.EVIDENCE_SHARE,
        MurderMysteryActions.TALK_TO_NPC,
        MurderMysteryActions.PRESENT_EVIDENCE,
      ],
      canVote: false,
      canCollectEvidence: false,
      canChat: true,
    },
    [GamePhase.VOTING]: {
      allowedActions: [MurderMysteryActions.VOTE_CAST],
      canVote: true,
      canCollectEvidence: false,
      canChat: false,
    },
    [GamePhase.ENDING]: {
      allowedActions: [MurderMysteryActions.TALK_TO_NPC],
      canVote: false,
      canCollectEvidence: false,
      canChat: true,
    },
  };

  private constructor(private readonly gameManager: IPhaseGameManager) {
    this.currentPhase = GamePhase.PREPARATION;
    this.phaseStartTime = system.currentTick;
    this.timerManager = TimerManager.getInstance();
  }

  /**
   * インスタンスの作成
   */
  public static create(gameManager: IPhaseGameManager): PhaseManager {
    if (!PhaseManager.instance) {
      PhaseManager.instance = new PhaseManager(gameManager);
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
  public startPhase(phase: GamePhase, duration: number): void {
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

      // フェーズ開始イベントをログに記録
      this.gameManager.logSystemAction(MurderMysteryActions.PHASE_CHANGE, {
        oldPhase,
        newPhase: phase,
        startTime: this.phaseStartTime,
        duration,
        transitionNumber: VALID_PHASE_TRANSITIONS[oldPhase].length,
        totalPhases: Object.keys(VALID_PHASE_TRANSITIONS).length - 1,
      });

      // タイマーの開始（遷移後に実行）
      this.timerManager.startTimer(phase, duration);

      // フェーズ変更通知
      this.notifyPhaseChange(oldPhase, phase);

      // フェーズ開始メッセージの送信
      const currentPhaseNumber = VALID_PHASE_TRANSITIONS[oldPhase].length;
      const totalPhases = Object.keys(VALID_PHASE_TRANSITIONS).length - 1;
      world.sendMessage(
        `§e${currentPhaseNumber}/${totalPhases}フェーズ目: ${PHASE_NAMES[phase]}フェーズが開始されました（制限時間: ${duration}秒）`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました";
      world.sendMessage(`§cエラー: ${message}`);
      this.gameManager.logSystemAction("ERROR", { error: message });
      throw error;
    }
  }

  /**
   * フェーズタイムアウト時の処理
   */
  private onPhaseTimeout(): void {
    try {
      const currentPhase = this.currentPhase;
      const nextPhases = VALID_PHASE_TRANSITIONS[currentPhase];

      // タイムアウト時のクリーンアップを確実に実行
      this.cleanupPhaseResources();

      const event = {
        type: "phase_timeout",
        phase: currentPhase,
        endTime: system.currentTick,
        nextPhase: nextPhases.length > 0 ? nextPhases[0] : null,
        elapsedTime: this.getElapsedTime(),
      };

      this.gameManager.logSystemAction("PHASE_TIMEOUT", event);
      world.sendMessage(`§e${PHASE_NAMES[currentPhase]}フェーズが終了しました`);

      // 次のフェーズが存在する場合は自動遷移（遅延付き）
      if (nextPhases.length > 0) {
        system.runTimeout(() => {
          try {
            this.startPhase(
              nextPhases[0],
              this.getDefaultDuration(nextPhases[0]),
            );
          } catch (error) {
            console.error("次フェーズへの遷移中にエラーが発生しました:", error);
            this.gameManager.logSystemAction("ERROR", {
              error:
                error instanceof Error
                  ? error.message
                  : "不明なエラーが発生しました",
              phase: currentPhase,
              nextPhase: nextPhases[0],
            });
          }
        }, 20); // 1秒の遅延を設定
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "タイムアウト処理中にエラーが発生しました";
      world.sendMessage(`§cエラー: ${message}`);
      this.gameManager.logSystemAction("ERROR", { error: message });
    }
  }

  /**
   * アクションが現在のフェーズで許可されているかチェック
   */
  public isActionAllowed(action: ExtendedActionType): boolean {
    const restrictions = this.phaseRestrictions[this.currentPhase];
    return restrictions.allowedActions.includes(action);
  }

  /**
   * 投票が許可されているかチェック
   */
  public canVote(): boolean {
    return this.phaseRestrictions[this.currentPhase].canVote;
  }

  /**
   * 証拠収集が許可されているかチェック
   */
  public canCollectEvidence(): boolean {
    return this.phaseRestrictions[this.currentPhase].canCollectEvidence;
  }

  /**
   * チャットが許可されているかチェック
   */
  public canChat(): boolean {
    return this.phaseRestrictions[this.currentPhase].canChat;
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
  public dispose(): void {
    try {
      this.cleanupPhaseResources();
      this.timerManager.dispose();
      PhaseManager.instance = null;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "リソース解放中にエラーが発生しました";
      this.gameManager.logSystemAction("ERROR", { error: message });
    }
  }

  /**
   * フェーズ遷移の検証
   */
  private validatePhaseTransition(newPhase: GamePhase): boolean {
    if (this.currentPhase === newPhase) return false;
    const validNextPhases = VALID_PHASE_TRANSITIONS[this.currentPhase];
    return validNextPhases.includes(newPhase);
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
   * フェーズ変更の通知
   */
  private notifyPhaseChange(oldPhase: GamePhase, newPhase: GamePhase): void {
    const event = {
      type: "phase_change",
      oldPhase,
      newPhase,
      timestamp: system.currentTick,
    };
    this.gameManager.logSystemAction("PHASE_NOTIFICATION", event);
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
