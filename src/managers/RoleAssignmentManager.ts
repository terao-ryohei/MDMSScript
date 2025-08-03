import type { GameManager } from "./GameManager";
import { world, type Player } from "@minecraft/server";
import type { GameState } from "../types/GameTypes";
import { type Role, RoleName } from "../types/RoleTypes";
import { getScore, setScore } from "src/utils/score";
import { handleError } from "src/utils/errorHandle";
import type { IRoleAssignmentManager } from "./interfaces/IRoleAssignmentManager";
import {
  ROLES,
  ROLE_DISTRIBUTION_RULES,
} from "src/constants/abilities/RoleAbilities";

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
export class RoleAssignmentManager implements IRoleAssignmentManager {
  private static instance: RoleAssignmentManager | null = null;

  private constructor(private readonly gameManager: GameManager) {}

  public static getInstance(gameManager: GameManager): RoleAssignmentManager {
    if (!RoleAssignmentManager.instance) {
      RoleAssignmentManager.instance = new RoleAssignmentManager(gameManager);
    }
    return RoleAssignmentManager.instance;
  }

  /**
   * プレイヤーに役職を割り当てる
   */
  public async assignRoles() {
    try {
      const distribution = this.calculateRoleDistribution();

      const shuffledPlayers = this.shufflePlayers();
      let playerIndex = 0;

      // 役職を割り当てる
      for (const [count, role] of distribution.entries()) {
        for (let i = 0; i < count; i++) {
          if (playerIndex >= shuffledPlayers.length) break;
          const player = shuffledPlayers[playerIndex++];
          setScore("role", player, role.id);
        }
      }

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof RoleAssignmentError) {
        await handleError(error);
        return {
          success: false,
          error: error.message,
        };
      }
      throw error;
    }
  }

  /**
   * プレイヤーの役職を取得する
   */
  public async getPlayerRole(player: Player) {
    const roleId = getScore("role", player);
    const role = Object.values(ROLES).find((r) => r.id === roleId);
    return role ?? null;
  }

  /**
   * プレイヤー数に基づいて役職の分配を計算し、バランスルールに従って調整する
   */
  private calculateRoleDistribution(): Role[] {
    const playerCount = world.getAllPlayers().length;
    console.log(playerCount);
    const rule = ROLE_DISTRIBUTION_RULES.find(
      (r) => playerCount >= r.playerRange[0] && playerCount <= r.playerRange[1],
    );

    if (!rule) {
      throw new RoleAssignmentError(
        `No distribution role rule found for ${playerCount} players`,
        "INVALID_PLAYER_COUNT",
        this.gameManager.getGameState(),
      );
    }

    const distribution: Role[] = [];

    // 探偵と殺人者チームを最初に割り当てる
    const coreRoles = [
      RoleName.DETECTIVE,
      RoleName.KILLER,
      RoleName.ACCOMPLICE,
    ];

    for (const role of coreRoles) {
      const count = rule.distribution[role] || 0;
      if (count > 0) {
        distribution.push(ROLES[role]);
      }
    }

    // 最後に残りのプレイヤーを市民に割り当てる
    distribution.push(ROLES[RoleName.CITIZEN]);

    return distribution;
  }

  /**
   * プレイヤーリストをランダムにシャッフルする
   */
  private shufflePlayers(): Player[] {
    // Fisher-Yatesアルゴリズムをreduceで実装
    return world.getAllPlayers().reduce<Player[]>(
      (shuffled, _, i, arr) => {
        // i番目以降の未使用インデックスからランダムに選択
        const j = Math.floor(Math.random() * (i + 1));
        // 要素をスワップ
        [shuffled[i], shuffled[j]] = [arr[j], arr[i]];
        return shuffled;
      },
      [...world.getAllPlayers()],
    );
  }

  /**
   * インスタンスの破棄
   */
  public dispose(): void {
    RoleAssignmentManager.instance = null;
  }
}
