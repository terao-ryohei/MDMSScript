import { ActionLoggerModule } from "../../submodules/mc-action-logger/src/ActionLoggerModule";
import { PlayerActionLogManger } from "../../submodules/mc-action-logger/src/managers/PlayerActionLogManager";
import type { ActionType } from "../../submodules/mc-action-logger/src/types/types";
import type { RoleType } from "../types/AdvancedFeatureTypes";
import { MurderMysteryActions } from "../types/ActionTypes";
import type {
  GameState,
  GameStartupConfig,
  StartupResult,
} from "../types/GameTypes";
import { EvidenceManager } from "./EvidenceManager";
import { system, world } from "@minecraft/server";
import type { IPhaseGameManager } from "./interfaces/IPhaseManager";
import type { ILoggerManager } from "./interfaces/ILoggerManager";
import { MainManager as ActionLoggerGameManager } from "../../submodules/mc-action-logger/src/managers/MainManager";
import { TimerManager } from "./TimerManager";
import { PhaseManager } from "./PhaseManager";
import { GamePhase } from "src/constants/main";

const GAME_TIME_SCALE = 72; // ゲーム内時間のスケール（1分の実時間 = 72分のゲーム内時間）

/**
 * ゲームマネージャークラス
 * ゲーム全体の状態を管理し、各種マネージャーを統括します
 */
export class GameManager implements IPhaseGameManager, ILoggerManager {
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
  private gameState: GameState;
  private actionLogger: ActionLoggerModule;
  private logManager: PlayerActionLogManger;
  private evidenceManager: EvidenceManager;
  private tickCallback: number | undefined;
  private phaseManager: PhaseManager;
  private timerManager: TimerManager;

  private constructor() {
    this.gameState = this.createInitialGameState();
    this.actionLogger = ActionLoggerModule.getInstance();
    this.logManager = new PlayerActionLogManger(
      ActionLoggerGameManager.getInstance(),
    );
    this.evidenceManager = EvidenceManager.create(this);
    this.timerManager = TimerManager.getInstance();
    this.phaseManager = PhaseManager.create(this);
    this.initializeActionLogger();
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  /**
   * ゲームを開始する
   * @param config ゲーム開始設定
   * @returns ゲーム開始結果
   */
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

      world.sendMessage("§a PHASES_INITIALIZED");

      // ゲーム状態の更新
      this.gameState = {
        ...this.createInitialGameState(),
        startTime: system.currentTick,
        isActive: true,
      };

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

  private createInitialGameState(): GameState {
    return {
      gameId: `ts-${Date.now()}-${system.currentTick}`,
      phase: GamePhase.PREPARATION,
      isActive: false,
      startTime: 0,
      currentDay: 1,
      players: new Map(),
      roles: new Map(),
      evidenceList: [],
      collectedEvidence: new Map(),
      votes: new Map(),
      murderCommitted: false,
      investigationComplete: false,
    };
  }

  private initializeActionLogger(): void {
    this.actionLogger.initialize({
      gameTime: {
        initialTime: 0,
        timeScale: GAME_TIME_SCALE,
        dayLength: 1200000,
      },
      filters: {
        minLogLevel: 1,
        includedActionTypes: Object.values(MurderMysteryActions).map(
          (action) => action as unknown as ActionType,
        ),
      },
    });
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public logAction(data: {
    type: string;
    playerId: string;
    details: unknown;
  }): void {
    if (this.logManager) {
      this.logManager.logSystemAction(data.type as ActionType, {
        playerId: data.playerId,
        details: data.details,
      });
    }
  }

  public logSystemAction(type: string, details: unknown): void {
    if (this.logManager) {
      this.logManager.logSystemAction(type as ActionType, details);
    }
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

  /**
   * プレイヤーのロールを取得します
   * @param playerId プレイヤーID
   * @returns プレイヤーのロール、未設定の場合はundefined
   */
  public getPlayerRole(playerId: string): RoleType | undefined {
    return this.gameState.roles.get(playerId);
  }
}
