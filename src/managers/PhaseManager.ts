import { system, world } from "@minecraft/server";
import { MurderMysteryActions } from "../types/ActionTypes";
import type { ExtendedActionType } from "../types/ActionTypes";
import { GamePhase } from "../types/GameTypes";
import type { IPhaseGameManager } from "./interfaces/IPhaseManager";

/**
 * フェーズごとの制限事項を定義
 */
interface PhaseRestrictions {
  allowedActions: ExtendedActionType[];
  allowedAreas?: { x: number; y: number; z: number; radius: number }[];
  canVote: boolean;
  canCollectEvidence: boolean;
  canChat: boolean;
}

/**
 * フェーズマネージャークラス
 * ゲームの各フェーズを管理し、フェーズごとの制限を適用します
 */
export class PhaseManager {
  private static instance: PhaseManager | null = null;
  private currentPhase: GamePhase;
  private phaseStartTime: number;
  private phaseTimer: number | undefined;

  private readonly phaseRestrictions: Record<GamePhase, PhaseRestrictions> = {
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
    [GamePhase.REINVESTIGATION]: {
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
    [GamePhase.FINAL_DISCUSSION]: {
      allowedActions: [
        MurderMysteryActions.EVIDENCE_SHARE,
        MurderMysteryActions.TALK_TO_NPC,
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
  };

  private constructor(private readonly gameManager: IPhaseGameManager) {
    this.currentPhase = GamePhase.PREPARATION;
    this.phaseStartTime = system.currentTick;
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
    this.currentPhase = phase;
    this.phaseStartTime = system.currentTick;

    // フェーズ開始イベントをログに記録
    this.gameManager.logSystemAction(MurderMysteryActions.PHASE_CHANGE, {
      phase,
      startTime: this.phaseStartTime,
      duration,
    });

    // フェーズタイマーの設定
    if (this.phaseTimer !== undefined) {
      system.clearRun(this.phaseTimer);
    }

    this.phaseTimer = system.runTimeout(() => {
      this.onPhaseTimeout();
    }, duration * 20); // Minecraft のtickに変換（20tick = 1秒）

    // フェーズ開始メッセージの送信
    world.sendMessage(
      `${phase}フェーズが開始されました（制限時間: ${duration}秒）`,
    );
  }

  /**
   * フェーズタイムアウト時の処理
   */
  private onPhaseTimeout(): void {
    const event = {
      type: "phase_timeout",
      phase: this.currentPhase,
      endTime: system.currentTick,
    };
    world.sendMessage(`${this.currentPhase}フェーズが終了しました`);
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
    if (this.phaseTimer !== undefined) {
      system.clearRun(this.phaseTimer);
    }
    PhaseManager.instance = null;
  }
}
