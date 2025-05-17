import { RoleType } from "../types/AdvancedFeatureTypes";
import type { GameManager } from "./GameManager";
import { MainManager } from "../../submodules/mc-action-logger/src/managers/MainManager";
import { system, world } from "@minecraft/server";
import type { GameState } from "../types/GameTypes";
import { ActionType } from "../types/ActionTypes";
import type { ActionType as BaseActionType } from "../../submodules/mc-action-logger/src/types/types";
import type { PlayerActionLogManger } from "../../submodules/mc-action-logger/src/managers/PlayerActionLogManager";
import { RoleUIManager } from "./RoleUIManager";
import {
  ROLE_DISTRIBUTION_RULES,
  type RoleAssignmentConfig,
  type RoleAssignmentResult,
  type RoleDistributionConfig,
} from "../types/RoleTypes";

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

  /**
   * 役職バランスのルール
   */
  private readonly DEFAULT_BALANCE_RULES: RoleDistributionConfig = {
    specialRoleRatio: 0.2,
    minDetectiveRatio: 0.15,
    maxKillerRatio: 0.3,
    balancePreference: "balanced",
  };

  private playerActionLogManager: PlayerActionLogManger;
  private roleUIManager: RoleUIManager;

  private constructor(
    private readonly gameManager: GameManager,
    private readonly config: RoleAssignmentConfig = {
      roleDistribution: {},
      minPlayers: 4,
      maxPlayers: 20,
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

      // プレイヤー数のログ（重要な情報なので残す）
      this.playerActionLogManager.logSystemAction(
        ActionType.GAME_INFO as unknown as BaseActionType,
        {
          message: `プレイヤー数: ${playerCount}`,
          timestamp: system.currentTick,
          level: "info",
        },
      );

      const distribution = this.calculateRoleDistribution(
        playerCount,
        this.config.distribution || this.DEFAULT_BALANCE_RULES,
      );

      // 役職分配のログ（重要な情報なので残す）
      this.playerActionLogManager.logSystemAction(
        ActionType.GAME_INFO as unknown as BaseActionType,
        {
          message: `役職分配: ${JSON.stringify(Object.fromEntries(distribution))}`,
          timestamp: system.currentTick,
          level: "info",
        },
      );

      const shuffledPlayers = this.shufflePlayers(players);
      const assignments = new Map<string, RoleType>();
      let playerIndex = 0;

      // 役職を割り当てる
      for (const [role, count] of distribution.entries()) {
        for (let i = 0; i < count; i++) {
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
  /**
   * プレイヤー数に基づいて役職の分配を計算し、バランスルールに従って調整する
   */
  private calculateRoleDistribution(
    playerCount: number,
    config: RoleDistributionConfig = this.DEFAULT_BALANCE_RULES,
  ): Map<string, number> {
    const rule = ROLE_DISTRIBUTION_RULES.find(
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

    // 探偵と殺人者チームを最初に割り当てる
    const coreRoles = [
      RoleType.DETECTIVE,
      RoleType.KILLER,
      RoleType.ACCOMPLICE,
    ];
    for (const role of coreRoles) {
      const count = rule.distribution[role] || 0;
      if (count > 0) {
        distribution.set(role, count);
        remainingPlayers -= count;
      }
    }

    // 市民を割り当てる

    // 最後に残りのプレイヤーを市民に割り当てる
    distribution.set(RoleType.CITIZEN, remainingPlayers);

    // バランスルールのチェックと調整
    this.adjustDistributionForBalance(distribution, playerCount, config);

    return distribution;
  }

  /**
   * 役職分配をバランスルールに従って調整する
   */
  private adjustDistributionForBalance(
    distribution: Map<string, number>,
    playerCount: number,
    config: RoleDistributionConfig = this.DEFAULT_BALANCE_RULES,
  ): void {
    // 探偵チームのカウント（探偵のみ）
    const detectiveTeamCount = distribution.get(RoleType.DETECTIVE) || 0;

    // 殺人者チームのカウント（殺人者と共犯）
    const killerTeamCount =
      (distribution.get(RoleType.KILLER) || 0) +
      (distribution.get(RoleType.ACCOMPLICE) || 0);

    let citizenCount = distribution.get(RoleType.CITIZEN) || 0;

    // 探偵チームの最小割合を確保
    if (
      detectiveTeamCount / playerCount < config.minDetectiveRatio ||
      config.balancePreference === "detective-favored"
    ) {
      const additionalDetectives = Math.ceil(
        playerCount * config.minDetectiveRatio - detectiveTeamCount,
      );

      // 探偵の追加
      const currentDetectives = distribution.get(RoleType.DETECTIVE) || 0;
      distribution.set(
        RoleType.DETECTIVE,
        currentDetectives + additionalDetectives,
      );
      citizenCount -= additionalDetectives;
    }

    // 殺人者チームの最大割合を制限
    if (
      killerTeamCount / playerCount > config.maxKillerRatio &&
      config.balancePreference !== "killer-favored"
    ) {
      const excessKillers = Math.floor(
        killerTeamCount - playerCount * config.maxKillerRatio,
      );

      // 共犯者から優先的に削減
      const currentAccomplices = distribution.get(RoleType.ACCOMPLICE) || 0;
      if (currentAccomplices > 0) {
        const reduceAccomplices = Math.min(currentAccomplices, excessKillers);
        distribution.set(
          RoleType.ACCOMPLICE,
          currentAccomplices - reduceAccomplices,
        );
        citizenCount += reduceAccomplices;

        // 共犯者の削減だけでは不十分な場合
        const remainingExcess = excessKillers - reduceAccomplices;
        if (remainingExcess > 0) {
          const currentKillers = distribution.get(RoleType.KILLER) || 0;
          distribution.set(RoleType.KILLER, currentKillers - remainingExcess);
          citizenCount += remainingExcess;
        }
      } else {
        // 共犯者がいない場合は殺人者を削減
        const currentKillers = distribution.get(RoleType.KILLER) || 0;
        distribution.set(RoleType.KILLER, currentKillers - excessKillers);
        citizenCount += excessKillers;
      }
    }

    // 市民の数を更新
    distribution.set(RoleType.CITIZEN, Math.max(0, citizenCount));
  }

  /**
   * プレイヤーリストをランダムにシャッフルする
   */
  private shufflePlayers(players: string[]): string[] {
    const startTime = system.currentTick;
    const shuffled = new Array(players.length);
    const used = new Set<number>();

    // Fisher-Yates アルゴリズムの最適化実装
    for (let i = players.length - 1; i >= 0; i--) {
      // 未使用のインデックスからランダムに選択
      let j: number;
      do {
        j = Math.floor(Math.random() * (i + 1));
      } while (used.has(j));

      // 選択したインデックスを記録
      used.add(j);
      shuffled[i] = players[j];
    }

    const endTime = system.currentTick;

    // パフォーマンス計測用のログ
    this.playerActionLogManager.logSystemAction(
      ActionType.GAME_DEBUG as unknown as BaseActionType,
      {
        message: "プレイヤーリストのシャッフル性能",
        performance: {
          startTick: startTime,
          endTick: endTime,
          duration: endTime - startTime,
          playerCount: players.length,
        },
        result: {
          original: players,
          shuffled: shuffled,
        },
        timestamp: system.currentTick,
        level: "debug",
      },
    );

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
      level: "error",
    };

    // エラーログを記録
    this.playerActionLogManager.logSystemAction(
      ActionType.ROLE_ERROR as unknown as BaseActionType,
      errorDetails,
    );

    // 重要なエラーメッセージのみを表示
    const errorMessage = `§c役職割り当てエラー: ${errorDetails.message} (コード: ${errorDetails.code})`;
    world.sendMessage(errorMessage);

    // 影響を受けたプレイヤーへの通知
    if (error instanceof RoleAssignmentError) {
      const affectedPlayers = Array.from(error.gameState.players.keys());
      for (const playerId of affectedPlayers) {
        // エラーの詳細をログに記録
        this.playerActionLogManager.logSystemAction(
          ActionType.ROLE_ERROR as unknown as BaseActionType,
          {
            playerId,
            message: "役職の割り当てに失敗しました",
            timestamp: system.currentTick,
            details: errorDetails,
            level: "error",
          },
        );
      }
    }
  }
}
