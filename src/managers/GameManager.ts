import { ActionLoggerModule } from "../../submodules/mc-action-logger/src/ActionLoggerModule";
import { LogManager } from "../../submodules/mc-action-logger/src/managers/LogManager";
import type { ActionType } from "../../submodules/mc-action-logger/src/types";
import { GamePhase, RoleType } from "../types/GameTypes";
import { MurderMysteryActions } from "../types/ActionTypes";
import type { GameState, GameConfig, PlayerState } from "../types/GameTypes";
import type { EvidenceAnalysis, EvidenceChain } from "../types/EvidenceTypes";
import { EvidenceManager } from "./EvidenceManager";
import { system, world } from "@minecraft/server";
import type { IPhaseGameManager } from "./interfaces/IPhaseManager";
import type { ILoggerManager } from "./interfaces/ILoggerManager";
import { GameManager as ActionLoggerGameManager } from "../../submodules/mc-action-logger/src/managers/GameManager";

const TICKS_PER_HOUR = 1000; // 1時間あたりのtick数
const TICKS_PER_MINUTE = TICKS_PER_HOUR / 60; // 1分あたりのtick数
const GAME_TIME_SCALE = 72; // ゲーム内時間のスケール（1分の実時間 = 72分のゲーム内時間）

/**
 * ゲームマネージャークラス
 * ゲーム全体の状態を管理し、各種マネージャーを統括します
 */
export class GameManager implements IPhaseGameManager, ILoggerManager {
  private static instance: GameManager | null = null;
  private gameState: GameState;
  private config: GameConfig;
  private actionLogger: ActionLoggerModule;
  private logManager: LogManager;
  private evidenceManager: EvidenceManager;
  private tickCallback: number | undefined;

  private constructor() {
    this.gameState = this.createInitialGameState();
    this.config = this.createDefaultConfig();
    this.actionLogger = ActionLoggerModule.getInstance();
    this.logManager = new LogManager(ActionLoggerGameManager.getInstance());
    this.evidenceManager = EvidenceManager.create(this);
    this.initializeActionLogger();
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  private createInitialGameState(): GameState {
    return {
      gameId: crypto.randomUUID(),
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

  private createDefaultConfig(): GameConfig {
    return {
      maxPlayers: 20,
      minPlayers: 4,
      phaseTimings: {
        preparation: 600,
        investigation: 1200,
        discussion: 900,
        reinvestigation: 900,
        finalDiscussion: 600,
        voting: 300,
      },
      evidenceSettings: {
        maxPhysicalEvidence: 10,
        maxTestimonies: 20,
        reliabilityThreshold: 0.7,
      },
      roleDistribution: {
        [RoleType.DETECTIVE]: 1,
        [RoleType.MURDERER]: 1,
        [RoleType.ACCOMPLICE]: 1,
      },
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

  public async logAction(data: {
    type: string;
    playerId: string;
    details: unknown;
  }): Promise<void> {
    await this.logSystemAction(data.type, {
      playerId: data.playerId,
      details: data.details,
    });
  }

  public logSystemAction(type: string, details: unknown): void {
    if (this.logManager) {
      this.logManager.logSystemAction(type as ActionType, details);
    }
  }

  public dispose(): void {
    if (this.tickCallback !== undefined) {
      system.clearRun(this.tickCallback);
    }
    if (this.logManager) {
      this.logManager.dispose();
    }
    if (this.evidenceManager) {
      this.evidenceManager.dispose();
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
