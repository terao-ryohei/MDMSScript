import { RoleType } from "../types/AdvancedFeatureTypes";
import type { GameManager } from "./GameManager";
import { MainManager } from "../../submodules/mc-action-logger/src/managers/MainManager";
import { system, world } from "@minecraft/server";
import type { GameState } from "../types/GameTypes";
import { ActionType } from "../types/ActionTypes";
import type { ActionType as BaseActionType } from "../../submodules/mc-action-logger/src/types/types";
import type { PlayerActionLogManger } from "../../submodules/mc-action-logger/src/managers/PlayerActionLogManager";
import { RoleUIManager } from "./RoleUIManager";

/**
 * 役職割り当ての設定インターフェース
 */
export interface RoleAssignmentConfig {
  roleDistribution: {
    [key in RoleType]?: number;
  };
  minPlayers: number;
  maxPlayers: number;
}

/**
 * 役職割り当ての結果インターフェース
 */
export interface RoleAssignmentResult {
  success: boolean;
  assignments: Map<string, RoleType>;
  error?: string;
}

/**
 * 役職の分配ルールインターフェース
 */
interface RoleDistributionRule {
  playerRange: [number, number];
  distribution: {
    [key: string]: number;
  };
}

/**
 * 役職割り当てエラークラス
 */
export class RoleAssignmentError extends Error {
  constructor(
    message: string,
    public code:
      | "INVALID_PLAYER_COUNT"
      | "INVALID_DISTRIBUTION"
      | "ASSIGNMENT_FAILED",
    public gameState: GameState,
  ) {
    super(message);
    this.name = "RoleAssignmentError";
  }
}

/**
 * プレイヤーへの役職割り当てを管理するクラス
 */
export class RoleAssignmentManager {
  private static instance: RoleAssignmentManager | null = null;
  private readonly ROLE_DISTRIBUTION_RULES: RoleDistributionRule[] = [
    {
      playerRange: [1, 3],
      distribution: {
        [RoleType.DETECTIVE]: 1,
        [RoleType.KILLER]: 1,
        [RoleType.ACCOMPLICE]: 0,
        [RoleType.CITIZEN]: -1, // 残りのプレイヤー
      },
    },
    {
      playerRange: [4, 6],
      distribution: {
        [RoleType.DETECTIVE]: 1,
        [RoleType.KILLER]: 1,
        [RoleType.ACCOMPLICE]: 0,
        [RoleType.CITIZEN]: -1, // 残りのプレイヤー
      },
    },
    {
      playerRange: [7, 9],
      distribution: {
        [RoleType.DETECTIVE]: 1,
        [RoleType.KILLER]: 1,
        [RoleType.ACCOMPLICE]: 1,
        [RoleType.CITIZEN]: -1,
      },
    },
  ];

  private playerActionLogManager: PlayerActionLogManger;
  private roleUIManager: RoleUIManager;

  private constructor(
    private readonly gameManager: GameManager,
    private readonly config: RoleAssignmentConfig = {
      roleDistribution: {},
      minPlayers: 4,
      maxPlayers: 9,
    },
  ) {
    const mainManager = MainManager.getInstance();
    this.playerActionLogManager = mainManager.getPlayerActionLogManger();
    this.roleUIManager = RoleUIManager.getInstance(this.gameManager);
  }

  public static getInstance(gameManager: GameManager): RoleAssignmentManager {
    if (!RoleAssignmentManager.instance) {
      RoleAssignmentManager.instance = new RoleAssignmentManager(gameManager);
    }
    return RoleAssignmentManager.instance;
  }

  /**
   * プレイヤーに役職を割り当てる
   */
  public async assignRoles(): Promise<RoleAssignmentResult> {
    try {
      const players = world.getAllPlayers().map((player) => player.id);
      const playerCount = players.length;

      world.sendMessage(`Player count: ${playerCount}`);

      const distribution = this.calculateRoleDistribution(playerCount);

      world.sendMessage(`Role distribution:${distribution}`);

      const shuffledPlayers = this.shufflePlayers(players);

      world.sendMessage(`Shuffled players: ${shuffledPlayers}`);

      const assignments = new Map<string, RoleType>();
      let playerIndex = 0;

      // 役職を割り当てる
      for (const [role, count] of distribution.entries()) {
        for (let i = 0; i < count; i++) {
          world.sendMessage(
            `Assigning ${role} to player ${shuffledPlayers[playerIndex]}`,
          );
          if (playerIndex >= shuffledPlayers.length) break;
          const playerId = shuffledPlayers[playerIndex++];
          assignments.set(playerId, role as RoleType);
          this.logRoleAssignment(playerId, role as RoleType);
          await this.roleUIManager.onRoleAssignment(playerId, role as RoleType);
        }
      }

      return {
        success: true,
        assignments,
      };
    } catch (error) {
      if (error instanceof RoleAssignmentError) {
        this.handleError(error);
        return {
          success: false,
          assignments: new Map(),
          error: error.message,
        };
      }
      throw error;
    }
  }

  /**
   * プレイヤー数に基づいて役職の分配を計算する
   */
  private calculateRoleDistribution(playerCount: number): Map<string, number> {
    const rule = this.ROLE_DISTRIBUTION_RULES.find(
      (r) => playerCount >= r.playerRange[0] && playerCount <= r.playerRange[1],
    );

    if (!rule) {
      throw new RoleAssignmentError(
        `No distribution rule found for ${playerCount} players`,
        "INVALID_PLAYER_COUNT",
        this.gameManager.getGameState(),
      );
    }

    const distribution = new Map<string, number>();
    let remainingPlayers = playerCount;

    // 固定役職を割り当てる
    for (const [role, count] of Object.entries(rule.distribution)) {
      if (count > 0) {
        distribution.set(role, count);
        remainingPlayers -= count;
      }
    }

    // 残りのプレイヤーを市民に割り当てる
    distribution.set(RoleType.CITIZEN, remainingPlayers);

    return distribution;
  }

  /**
   * プレイヤーリストをランダムにシャッフルする
   */
  private shufflePlayers(players: string[]): string[] {
    const shuffled = [...players];
    world.sendMessage(`Shuffling players: ${shuffled}`);
    for (let i = shuffled.length - 1; i > 0; i--) {
      world.sendMessage(`Shuffling index: ${i}`);
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 役職割り当てをログに記録する
   */
  private logRoleAssignment(playerId: string, role: RoleType): void {
    this.playerActionLogManager.logSystemAction(
      ActionType.ROLE_ASSIGNED as unknown as BaseActionType,
      {
        playerId,
        role,
        timestamp: system.currentTick,
        gameState: { ...this.gameManager.getGameState() },
      },
    );
  }

  /**
   * エラーハンドリング
   */
  private async handleError(error: Error): Promise<void> {
    const errorDetails = {
      message: error.message,
      code: error instanceof RoleAssignmentError ? error.code : "UNKNOWN_ERROR",
      timestamp: system.currentTick,
      gameState:
        error instanceof RoleAssignmentError
          ? { ...error.gameState }
          : { ...this.gameManager.getGameState() },
    };

    world.sendMessage(
      `§cエラー: ${errorDetails.message} (コード: ${errorDetails.code})`,
    );

    this.playerActionLogManager.logSystemAction(
      ActionType.ROLE_ERROR as unknown as BaseActionType,
      errorDetails,
    );

    // UI通知を送信
    if (error instanceof RoleAssignmentError) {
      const affectedPlayers = Array.from(error.gameState.players.keys());
      for (const playerId of affectedPlayers) {
        const message = `${playerId}: 役職の割り当てに失敗しました`;
        world.sendMessage(`§cエラー: ${message}`);
        this.gameManager.logSystemAction("ERROR", { error: message });
      }
    }
  }
}
