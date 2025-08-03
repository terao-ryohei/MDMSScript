import { world, type Player } from "@minecraft/server";
import type { Occupation } from "src/types/OccupationTypes";
import { handleError } from "src/utils/errorHandle";
import { getScore, setScore } from "src/utils/score";
import type { GameState } from "../types/GameTypes";
import { OccupationName } from "../types/OccupationTypes";
import type { GameManager } from "./GameManager";
import type { IOccupationAssignmentManager } from "./interfaces/IOccupationAssignmentManager";
import {
  OCCUPATIONS,
  OCCUPATIONS_DISTRIBUTION_RULES,
} from "src/constants/abilities/OccupationAbilities";

/**
 * 役職割り当てエラークラス
 */
export class OccupationAssignmentError extends Error {
  constructor(
    message: string,
    public code:
      | "INVALID_PLAYER_COUNT"
      | "INVALID_DISTRIBUTION"
      | "ASSIGNMENT_FAILED",
    public gameState: GameState,
  ) {
    super(message);
    this.name = "OccupationAssignmentError";
  }
}

export class OccupationAssignmentManager
  implements IOccupationAssignmentManager
{
  private static instance: OccupationAssignmentManager | null = null;

  private constructor(private readonly gameManager: GameManager) {}

  public static getInstance(
    gameManager: GameManager,
  ): OccupationAssignmentManager {
    if (!OccupationAssignmentManager.instance) {
      OccupationAssignmentManager.instance = new OccupationAssignmentManager(
        gameManager,
      );
    }
    return OccupationAssignmentManager.instance;
  }

  /**
   * 複数のプレイヤーに職業を一括で割り当てるのだ
   */
  public async assignOccupations() {
    try {
      const distribution = this.calculateOccupationDistribution();

      const shuffledPlayers = this.shufflePlayers();
      let playerIndex = 0;

      // 役職を割り当てる
      for (const [count, occupation] of distribution.entries()) {
        for (let i = 0; i < count; i++) {
          if (playerIndex >= shuffledPlayers.length) break;
          const player = shuffledPlayers[playerIndex++];
          setScore("occupation", player, occupation.id);
        }
      }

      return { success: true };
    } catch (error) {
      if (error instanceof OccupationAssignmentError) {
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
   * プレイヤーの職業を取得するのだ
   */
  public async getPlayerOccupation(player: Player): Promise<Occupation | null> {
    const occupationId = getScore("occupation", player);
    const occupation = Object.values(OCCUPATIONS).find(
      (r) => r.id === occupationId,
    );
    return occupation ?? null;
  }

  /**
   * プレイヤー数に基づいて役職の分配を計算し、バランスルールに従って調整する
   */
  private calculateOccupationDistribution(): Occupation[] {
    const playerCount = world.getAllPlayers().length;
    const rule = OCCUPATIONS_DISTRIBUTION_RULES.find(
      (r) => playerCount >= r.playerRange[0] && playerCount <= r.playerRange[1],
    );

    if (!rule) {
      throw new OccupationAssignmentError(
        `No distribution occupation rule found for ${playerCount} players`,
        "INVALID_PLAYER_COUNT",
        this.gameManager.getGameState(),
      );
    }

    const distribution: Occupation[] = [];

    // 職業を最初に割り当てる
    const coreOccupations = [
      OccupationName.GUARD,
      OccupationName.PRIEST,
      OccupationName.MERCHANT,
      OccupationName.PRISONER,
    ];
    for (const occupation of coreOccupations) {
      const count = rule.distribution[occupation] || 0;
      if (count > 0) {
        distribution.push(OCCUPATIONS[occupation]);
      }
    }
    // 残りの職業をランダムに割り当てる
    const remainingOccupations = Object.keys(rule.distribution).filter(
      (occupation) => !coreOccupations.includes(occupation as OccupationName),
    );
    const remainingCount = playerCount - distribution.length;
    for (let i = 0; i < remainingCount; i++) {
      const randomOccupation =
        remainingOccupations[
          Math.floor(Math.random() * remainingOccupations.length)
        ];
      distribution.push(OCCUPATIONS[randomOccupation as OccupationName]);
      // 割り当てた職業を残りの職業リストから削除
      remainingOccupations.splice(
        remainingOccupations.indexOf(randomOccupation),
        1,
      );
    }

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
  public dispose() {
    OccupationAssignmentManager.instance = null;
  }
}
