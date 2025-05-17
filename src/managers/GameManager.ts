import { ActionLoggerModule } from "../../submodules/mc-action-logger/src/ActionLoggerModule";
import { PlayerActionLogManger } from "../../submodules/mc-action-logger/src/managers/PlayerActionLogManager";
import type { ActionType as LoggerActionType } from "../../submodules/mc-action-logger/src/types/types"; // Renamed to avoid conflict
import { RoleType } from "../types/AdvancedFeatureTypes";
import type {
  GameState,
  GameStartupConfig,
  StartupResult,
  OccupationBalanceRules, // Added for occupationBalance initialization
  PlayerState, // Added for getPlayerState
} from "../types/GameTypes";
import { EvidenceManager } from "./EvidenceManager";
import { system, world } from "@minecraft/server";
import type { IPhaseGameManager } from "./interfaces/IPhaseManager";
import type { ILoggerManager } from "./interfaces/ILoggerManager";
import { MainManager as ActionLoggerGameManager } from "../../submodules/mc-action-logger/src/managers/MainManager";
import { TimerManager } from "./TimerManager";
import { PhaseManager } from "./PhaseManager";
import { GamePhase } from "src/constants/main";
import { RoleAssignmentManager } from "./RoleAssignmentManager";
import type { IRoleUIManager } from "./interfaces/IRoleUIManager"; // Added
import { RoleUIManager } from "./RoleUIManager"; // Added
import type { IOccupationUIManager } from "./interfaces/IOccupationUIManager"; // Added
import { OccupationUIManager } from "./OccupationUIManager"; // Added
import type { IOccupationManager } from "./interfaces/IOccupationManager"; // Added
import { OccupationManager } from "./OccupationManager"; // Added
import type { IUICoordinator } from "../ui/interfaces/IUICoordinator"; // Added
import { UICoordinator } from "../ui/UICoordinator"; // Added
import { CommunicationManager } from "./CommunicationManager"; // Assuming this exists or will be added
import { AdvancedFeaturesManager } from "./AdvancedFeaturesManager"; // Assuming this exists or will be added

const GAME_TIME_SCALE = 72; // ゲーム内時間のスケール（1分の実時間 = 72分のゲーム内時間）

type PhaseChangeHandler = (phase: GamePhase) => void;
type PlayerHandler = (playerId: string) => void;

/**
 * ゲームマネージャークラス
 * ゲーム全体の状態を管理し、各種マネージャーを統括します
 */
export class GameManager implements IPhaseGameManager, ILoggerManager {
  private phaseChangeHandlers: Set<PhaseChangeHandler> = new Set();
  private playerJoinHandlers: Set<PlayerHandler> = new Set();
  private playerLeaveHandlers: Set<PlayerHandler> = new Set();

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
  private roleUIManager: IRoleUIManager; // Changed type
  private occupationUIManager: IOccupationUIManager; // Added
  private occupationManager: IOccupationManager; // Added
  private uiCoordinator: IUICoordinator; // Added
  // private communicationManager: CommunicationManager; // Assuming this exists or will be added
  // private advancedFeaturesManager: AdvancedFeaturesManager; // Assuming this exists or will be added

  private constructor() {
    console.log("GameManager initialized");
    this.gameState = this.createInitialGameState();
    this.actionLogger = ActionLoggerModule.getInstance();
    this.logManager = new PlayerActionLogManger(
      ActionLoggerGameManager.getInstance(),
    );
    this.evidenceManager = EvidenceManager.getInstance(this.gameState);
    this.timerManager = TimerManager.getInstance();
    this.phaseManager = PhaseManager.create(this);
    this.roleAssignmentManager = RoleAssignmentManager.getInstance(this);
    this.roleUIManager = RoleUIManager.getInstance(this); // Initialize RoleUIManager
    this.occupationManager = OccupationManager.getInstance(this); // Initialize OccupationManager
    this.occupationUIManager = OccupationUIManager.getInstance(this); // Initialize OccupationUIManager
    this.uiCoordinator = UICoordinator.getInstance(
      this,
      this.roleUIManager,
      this.occupationUIManager,
    ); // Initialize UICoordinator
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
      world.sendMessage("§l§6=== マーダーミステリー チュートリアル ===§r");

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
      this.logSystemAction("TUTORIAL_ERROR", { error: message });
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

      this.actionLogger.start();
      world.sendMessage("§a ACTION_LOGGER_STARTED");

      // タイマーの初期化
      this.timerManager.startTimer(
        GamePhase.PREPARATION,
        config.timeSettings.preparation,
      );
      world.sendMessage("§a TIMER_INITIALIZED");

      // フェーズの初期化
      this.phaseManager.startPhase(
        GamePhase.PREPARATION,
        config.timeSettings.preparation,
      );

      await this.roleAssignmentManager.assignRoles();
      world.sendMessage("§a ROLES_ASSIGNED");

      // 職業の割り当て
      const occupationAssignmentsResult =
        await this.occupationManager.assignOccupations(
          this.gameState.players,
          config.occupationRules,
          config.occupationBalance,
        );

      if (!occupationAssignmentsResult.success) {
        const errorMessage = `職業割り当て失敗: ${occupationAssignmentsResult.error}`;
        this.logSystemAction("ERROR", { error: errorMessage });
        return {
          success: false,
          gameId: this.gameState.gameId,
          startTime: 0,
          initialPhase: GamePhase.PREPARATION,
          error: errorMessage,
        };
      }
      world.sendMessage("§a OCCUPATIONS_ASSIGNED");

      // GameStateの更新 (職業割り当て結果を反映)
      this.gameState = {
        ...this.createInitialGameState(), // 基本的な初期化
        startTime: system.currentTick,
        isActive: true,
        occupationRules: new Map(
          Object.entries(config.occupationRules).map(([role, rules]) => [
            role as RoleType,
            {
              allowedOccupations: rules.allowedOccupations,
              forbiddenOccupations: rules.forbiddenOccupations,
            },
          ]),
        ), // occupationRulesを保存
        occupationBalance: config.occupationBalance, // occupationBalanceを保存
      };

      // プレイヤー状態に職業を反映
      occupationAssignmentsResult.assignments.forEach(
        (occupation, playerId) => {
          const playerState = this.gameState.players.find(
            (p) => p.playerId === playerId,
          );
          if (playerState) {
            playerState.occupation = occupation;
          }
          this.gameState.occupations.set(playerId, occupation); // occupationsマップも更新
        },
      );

      // UIの初期化
      for (const player of this.gameState.players) {
        await this.uiCoordinator.setupInitialUI(player.playerId);
      }
      world.sendMessage("§a UI_INITIALIZED");

      // ゲームログの記録開始
      this.logSystemAction("GAME_START", { config });

      return {
        success: true,
        gameId: this.gameState.gameId,
        startTime: this.gameState.startTime,
        initialPhase: GamePhase.PREPARATION,
      };
    } catch (error) {
      this.actionLogger.stop();
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました";
      this.logSystemAction("ERROR", { error: message });
      return {
        success: false,
        gameId: this.gameState.gameId,
        startTime: 0,
        initialPhase: GamePhase.PREPARATION,
        error: message,
      };
    }
  }

  public logAction(data: {
    type: string;
    playerId: string;
    details: unknown;
  }): void {
    if (this.logManager) {
      this.logManager.logSystemAction(data.type as LoggerActionType, {
        // Changed to LoggerActionType
        playerId: data.playerId,
        details: data.details,
      });
    }
  }

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
        playerId: player.id,
        inventory: [],
        collectedEvidence: [],
        isAlive: true,
        hasVoted: false,
        actionLog: [],
        role: RoleType.CITIZEN, // 初期状態では全員が市民
        abilities: new Map(),
      })),
      evidenceList: [],
      collectedEvidence: new Map(),
      votes: new Map(),
      murderCommitted: false,
      investigationComplete: false,
      // 職業関連の状態を初期化
      occupations: new Map(),
      occupationRules: new Map(),
      occupationBalance: {
        minOccupationDiversity: 1, // Default value, can be overridden by config
        maxSameOccupation: 2, // Default value, can be overridden by config
      } as OccupationBalanceRules,
      occupationAbilities: new Map(),
      occupationInteractions: new Map(),
    };
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  /**
   * 指定したプレイヤーの状態を取得するのだ
   * @param playerId プレイヤーID
   * @returns プレイヤーの状態、見つからない場合はundefined
   */
  public getPlayerState(playerId: string): PlayerState | undefined {
    return this.gameState.players.find((p) => p.playerId === playerId);
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
