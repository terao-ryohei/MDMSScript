import type { Player } from "@minecraft/server";
import { system, world } from "@minecraft/server";
import { ActionLoggerModule } from "../../submodules/mc-action-logger/src/ActionLoggerModule";
import { MainManager as ActionLoggerGameManager } from "../../submodules/mc-action-logger/src/managers/MainManager";
import { PlayerActionLogManger } from "../../submodules/mc-action-logger/src/managers/PlayerActionLogManager";
import type { ActionType as LoggerActionType } from "../../submodules/mc-action-logger/src/types/types"; // Renamed to avoid conflict
import type {
  GameStartupConfig,
  GameState,
  PlayerState,
  StartupResult,
} from "../types/GameTypes";
import { EvidenceManager } from "./EvidenceManager";
import type { ILoggerManager } from "./interfaces/ILoggerManager";
import type { IOccupationUIManager } from "./interfaces/IOccupationUIManager";
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
  private actionLogger: ActionLoggerModule;
  private logManager: PlayerActionLogManger;
  private evidenceManager: EvidenceManager;
  private tickCallback: number | undefined;
  private phaseManager: PhaseManager;
  private timerManager: TimerManager;
  private roleAssignmentManager: RoleAssignmentManager;
  private roleUIManager: RoleUIManager;
  private occupationUIManager: IOccupationUIManager;
  private occupationManager: OccupationAssignmentManager;
  // private communicationManager: CommunicationManager; // Assuming this exists or will be added
  // private advancedFeaturesManager: AdvancedFeaturesManager; // Assuming this exists or will be added

  private constructor() {
    console.log("GameManager initialized");
    const players = world.getAllPlayers();
    this.gameState = this.createInitialGameState();
    this.actionLogger = ActionLoggerModule.getInstance();
    this.logManager = new PlayerActionLogManger(
      ActionLoggerGameManager.getInstance(),
    );
    this.evidenceManager = EvidenceManager.getInstance(this.gameState);
    this.timerManager = TimerManager.getInstance();
    this.phaseManager = PhaseManager.getInstance();
    this.roleAssignmentManager = RoleAssignmentManager.getInstance(
      this,
      players,
    );
    this.roleUIManager = RoleUIManager.getInstance(this, players);
    this.occupationManager = OccupationAssignmentManager.getInstance(
      this,
      players,
    );
    this.occupationUIManager = OccupationUIManager.getInstance(this, players);
    this.actionLogger.initialize({
      gameTime: {
        initialTime: 0,
        timeScale: GAME_TIME_SCALE,
        dayLength: 1200000,
      },
      filters: {
        minLogLevel: 1,
      },
      startItems: [],
    });
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

      // タイマーの初期化
      this.timerManager.startTimer(initialPhase);
      world.sendMessage("§a TIMER_INITIALIZED");

      // フェーズの初期化
      this.phaseManager.startPhase(initialPhase);

      // 役職の割り当て
      await this.roleAssignmentManager.assignRoles();
      world.sendMessage("§a ROLES_ASSIGNED");

      // 職業の割り当て
      await this.occupationManager.assignOccupations();
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
      this.logManager.logSystemAction(data.type as LoggerActionType, {
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
      this.logManager.logSystemAction(type as LoggerActionType, details); // Changed to LoggerActionType
    }
  }

  private createInitialGameState(): GameState {
    return {
      gameId: `ts-${Date.now()}-${system.currentTick}`,
      phase: GamePhase.PREPARATION,
      isActive: false,
      startTime: 0,
      currentDay: 1,
      players: world.getPlayers().map((player) => ({
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
    this.actionLogger.dispose();
    if (this.tickCallback !== undefined) {
      system.clearRun(this.tickCallback);
    }
    if (this.logManager) {
      this.logManager.dispose();
    }
    if (this.evidenceManager) {
      this.evidenceManager.dispose();
    }
    if (this.timerManager) {
      this.timerManager.dispose();
    }
    if (this.phaseManager) {
      this.phaseManager.dispose();
    }
    GameManager.instance = null;
  }
}
