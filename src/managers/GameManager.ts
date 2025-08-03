import type { Player } from "@minecraft/server";
import { system, world } from "@minecraft/server";
// Removed mc-action-logger imports - using mock implementations
import type {
  GameStartupConfig,
  GameState,
  PlayerState,
  StartupResult,
} from "../types/GameTypes";
import { EvidenceManager } from "./EvidenceManager";
import type { ILoggerManager } from "./interfaces/ILoggerManager";
import { OccupationAssignmentManager } from "./OccupationAssignmentManager";
import { OccupationUIManager } from "./OccupationUIManager";
import { PhaseManager } from "./PhaseManager";
import { RoleAssignmentManager } from "./RoleAssignmentManager";
import { RoleUIManager } from "./RoleUIManager";
import { TimerManager } from "./TimerManager";
import type { IGameManager } from "./interfaces/IGameManager";
import { GAME_TIME_SCALE } from "src/constants/gameManager";
import { ROLES } from "src/constants/abilities/RoleAbilities";
import { GamePhase } from "src/types/PhaseType";
import { PHASES } from "src/constants/phaseManger";
import { CommunicationManager } from "./CommunicationManager";
import { EvidenceAnalyzer } from "./EvidenceAnalyzer";

/**
 * ゲームマネージャークラス
 * ゲーム全体の状態を管理し、各種マネージャーを統括します
 */
export class GameManager implements IGameManager, ILoggerManager {
  // チュートリアルの進行状態を管理
  private tutorialState: {
    shown: boolean;
    currentPage: number;
    totalPages: number;
  } = {
    shown: false,
    currentPage: 1,
    totalPages: 3,
  };

  private static instance: GameManager | null = null;
  public gameState: GameState;

  // Mock action logger and log manager
  private actionLogger: any;
  private logManager: any;
  private evidenceManager: EvidenceManager;
  private evidenceAnalyzer: EvidenceAnalyzer;
  private tickCallback: number | undefined;
  private phaseManager: PhaseManager;
  // private timerManager: TimerManager;
  private roleAssignmentManager: RoleAssignmentManager;
  private roleUIManager: RoleUIManager;
  private occupationUIManager: OccupationUIManager;
  private occupationAssignmentManager: OccupationAssignmentManager;
  private communicationManager: CommunicationManager; // Assuming this exists or will be added
  // private advancedFeaturesManager: AdvancedFeaturesManager; // Assuming this exists or will be added

  private constructor() {
    console.log("GameManager initialized");
    this.gameState = this.createInitialGameState();
    // Mock implementations for action logger
    this.actionLogger = {
      initialize: () => {},
      start: () => {},
      stop: () => {},
      dispose: () => {}
    };
    this.logManager = {
      logSystemAction: () => {},
      dispose: () => {}
    };
    this.communicationManager = CommunicationManager.getInstance(
      this.logAction,
      this.gameState,
    );
    this.evidenceAnalyzer = EvidenceAnalyzer.getInstance(this.gameState);
    this.evidenceManager = EvidenceManager.getInstance(this.evidenceAnalyzer);
    // this.timerManager = TimerManager.getInstance();
    this.phaseManager = PhaseManager.getInstance(this.actionLogger);
    this.roleAssignmentManager = RoleAssignmentManager.getInstance(this);
    this.roleUIManager = RoleUIManager.getInstance(
      this,
      this.roleAssignmentManager,
    );
    this.occupationAssignmentManager =
      OccupationAssignmentManager.getInstance(this);
    this.occupationUIManager = OccupationUIManager.getInstance(
      this,
      this.occupationAssignmentManager,
    );
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  /**
   * チュートリアルを表示する
   * @returns チュートリアルが完了したかどうか
   */
  public async showTutorial(): Promise<boolean> {
    try {
      if (this.tutorialState.shown) {
        return true;
      }

      // タイトルの表示
      world.sendMessage("§l§6=== マイクラマーダーミステリー 説明 ===§r");

      // ページごとのコンテンツを表示
      const pages = [
        {
          title: "§l【基本ルール】§r",
          content: [
            "§7このゲームは探偵・市民チームと殺人者チームに分かれて推理を行うゲームです。",
            "§7・探偵・市民チーム：真犯人を特定することが目標です",
            "§7・殺人者チーム：罪を逃れることが目標です",
            "§7プレイヤー数：4-20人、ゲーム時間：約75分",
          ],
        },
        {
          title: "§l【ゲームの流れ】§r",
          content: [
            "§7① 準備フェーズ：役職の確認と初期位置への移動",
            "§7② 日常生活：タスクの実行と情報収集",
            "§7③ 調査：証拠の収集と分析",
            "§7④ 会議：情報共有と議論",
            "§7⑤ 投票：犯人だと思うプレイヤーへの投票",
          ],
        },
      ];

      // 各ページを表示
      for (const page of pages) {
        world.sendMessage(`\n${page.title}`);
        for (const line of page.content) {
          world.sendMessage(line);
        }
      }

      this.tutorialState.shown = true;
      world.sendMessage("§l§6=== チュートリアル完了 ===§r");
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "チュートリアル表示中にエラーが発生しました";
      console.error(message, "チュートリアルの表示に失敗しました");
      return false;
    }
  }

  public async startGame(config: GameStartupConfig): Promise<StartupResult> {
    try {
      // チュートリアルの表示
      await this.showTutorial();

      // プレイヤー数の検証
      // if (
      //   config.playerCount < this.config.minPlayers ||
      //   config.playerCount > this.config.maxPlayers
      // ) {
      //   return {
      //     success: false,
      //     gameId: "",
      //     startTime: 0,
      //     initialPhase: GamePhase.PREPARATION,
      //     error: `プレイヤー数が不正です（${this.config.minPlayers}～${this.config.maxPlayers}人）`,
      //   };
      // }

      const initialPhase = PHASES.preparation;

      // フェーズの初期化
      this.phaseManager.startPhase(initialPhase);
      world.sendMessage(
        `§eゲームが開始されました（フェーズ: ${initialPhase.name}）`,
      );

      // 役職の割り当て
      await this.roleAssignmentManager.assignRoles();
      world.sendMessage("§a ROLES_ASSIGNED");

      // 職業の割り当て
      await this.occupationAssignmentManager.assignOccupations();
      world.sendMessage("§a OCCUPATIONS_ASSIGNED");

      return {
        success: true,
        gameId: this.gameState.gameId,
        startTime: system.currentTick,
        initialPhase,
      };
    } catch (error) {
      this.actionLogger.stop();
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました";
      return {
        success: false,
        gameId: this.gameState.gameId,
        startTime: 0,
        initialPhase: PHASES.preparation,
        error: message,
      };
    }
  }

  /**
   * ゲームの状態を更新する
   * @param newState 新しいゲーム状態
   */
  public logAction(data: {
    type: string;
    player: Player;
    details: unknown;
  }): void {
    if (this.logManager) {
      this.logManager.logSystemAction(data.type, {
        // Changed to LoggerActionType
        player: data.player,
        details: data.details,
      });
    }
  }

  /**
   * システムアクションをログに記録する
   * @param type アクションの種類
   * @param details アクションの詳細
   */
  public logSystemAction(type: string, details: unknown): void {
    if (this.logManager) {
      this.logManager.logSystemAction(type, details);
    }
  }

  public async showUI(
    player: Player,
    type: "role" | "occupation",
  ): Promise<void> {
    switch (type) {
      case "role":
        await this.roleUIManager.showRoleDetails(player);
        break;
      case "occupation":
        await this.occupationUIManager.showOccupation(player);
        break;
      default:
        throw new Error(`Unknown UI type: ${type}`);
    }
  }

  private createInitialGameState(): GameState {
    return {
      gameId: `ts-${Date.now()}-${system.currentTick}`,
      phase: GamePhase.PREPARATION,
      isActive: false,
      startTime: 0,
      currentDay: 1,
      players: world.getAllPlayers().map((player) => ({
        player: player,
        inventory: [],
        collectedEvidence: [],
        isAlive: true,
        hasVoted: false,
        actionLog: [],
        role: ROLES.citizen,
        abilities: new Map(),
      })),
      evidenceList: [],
      collectedEvidence: new Map(),
      votes: new Map(),
      murderCommitted: false,
      investigationComplete: false,
    };
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  /**
   * 指定したプレイヤーの状態を取得するのだ
   * @param player プレイヤーID
   * @returns プレイヤーの状態、見つからない場合はundefined
   */
  public getPlayerState(player: Player): PlayerState | undefined {
    return this.gameState.players.find((p) => p.player === player);
  }

  public dispose(): void {
    if (this.tickCallback !== undefined) {
      system.clearRun(this.tickCallback);
    }
    if (this.actionLogger) {
      this.actionLogger.dispose();
    }
    if (this.logManager) {
      this.logManager.dispose();
    }
    if (this.communicationManager) {
      this.communicationManager.dispose();
    }
    if (this.evidenceAnalyzer) {
      this.evidenceAnalyzer.dispose();
    }
    if (this.evidenceManager) {
      this.evidenceManager.dispose();
    }
    if (this.occupationAssignmentManager) {
      this.occupationAssignmentManager.dispose();
    }
    if (this.occupationUIManager) {
      this.occupationUIManager.dispose();
    }
    if (this.phaseManager) {
      this.phaseManager.dispose();
    }
    if (this.roleAssignmentManager) {
      this.roleAssignmentManager.dispose();
    }
    if (this.roleUIManager) {
      this.roleUIManager.dispose();
    }
    // if (this.timerManager) {
    //   this.timerManager.dispose();
    // }
    GameManager.instance = null;
  }
}
