import { OccupationType } from "../types/OccupationTypes";
import { RoleType } from "../types/AdvancedFeatureTypes";
import type { PlayerState } from "../types/GameTypes";
import type { IGameManager } from "./interfaces/IGameManager";
import type {
  IOccupationManager,
  OccupationAssignmentResult,
} from "./interfaces/IOccupationManager";
import type {
  OccupationRules,
  OccupationBalanceRules,
} from "../types/GameTypes";

export class OccupationManager implements IOccupationManager {
  private static instance: OccupationManager | null = null;
  private gameManager: IGameManager;

  private constructor(gameManager: IGameManager) {
    this.gameManager = gameManager;
  }

  public static getInstance(gameManager: IGameManager): OccupationManager {
    if (!OccupationManager.instance) {
      OccupationManager.instance = new OccupationManager(gameManager);
    }
    return OccupationManager.instance;
  }

  /**
   * 複数のプレイヤーに職業を一括で割り当てるのだ
   */
  public async assignOccupations(
    players: PlayerState[],
    rules: OccupationRules,
    balanceRules: OccupationBalanceRules,
  ): Promise<OccupationAssignmentResult> {
    try {
      const assignments = new Map<string, OccupationType>();

      for (const player of players) {
        // 役割に基づいて職業を割り当て
        const result = await this.assignOccupation(player);

        assignments.set(player.playerId, result);
      }

      // バランスチェック
      const isValid = await this.validateOccupationAssignment(
        new Map(players.map((p) => [p.playerId, p.role])),
        assignments,
      );

      if (!isValid) {
        return {
          success: false,
          assignments: new Map(),
          error: "職業の割り当てがバランスルールに違反しているのだ",
        };
      }

      return { success: true, assignments };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "職業の割り当て中に不明なエラーが発生したのだ";
      return { success: false, assignments: new Map(), error: message };
    }
  }

  /**
   * プレイヤーに職業を割り当てるのだ
   */
  public assignOccupation(player: PlayerState): OccupationType {
    // プレイヤーの役割に基づいて利用可能な職業を取得
    const availableOccupations = this.getAvailableOccupations(player.role);
    if (availableOccupations.length === 0) {
      console.error(`役割 ${player.role} に対して割り当て可能な職業がないのだ`);
    }

    // ランダムに職業を選択
    const randomIndex = Math.floor(Math.random() * availableOccupations.length);
    const selectedOccupation = availableOccupations[randomIndex];

    return selectedOccupation;
  }

  /**
   * 職業の割り当てを検証するのだ
   */
  public async validateOccupationAssignment(
    roleAssignments: Map<string, RoleType>,
    occupationAssignments: Map<string, OccupationType>,
  ): Promise<boolean> {
    // すべてのプレイヤーについて、役割と職業の組み合わせが有効か確認
    for (const [playerId, role] of roleAssignments) {
      const occupation = occupationAssignments.get(playerId);
      if (!occupation) {
        return false;
      }
      if (!this.checkOccupationConstraints(role, occupation)) {
        return false;
      }
    }
    return true;
  }

  /**
   * プレイヤーの職業を取得するのだ
   */
  public async getPlayerOccupation(
    playerId: string,
  ): Promise<OccupationType | null> {
    const gameState = this.gameManager.getGameState();
    return gameState.occupations.get(playerId) || null;
  }

  /**
   * 職業に基づく相互作用が可能か確認するのだ
   */
  public async canInteract(
    sourcePlayerId: string,
    targetPlayerId: string,
  ): Promise<boolean> {
    const gameState = this.gameManager.getGameState();
    const sourceOccupation = gameState.occupations.get(sourcePlayerId);
    const targetOccupation = gameState.occupations.get(targetPlayerId);

    if (!sourceOccupation || !targetOccupation) {
      return false;
    }

    // TODO: 職業間の相互作用ルールを実装するのだ
    return true;
  }

  /**
   * 職業の変更を記録するのだ
   */
  public async logOccupationChange(
    playerId: string,
    oldOccupation: OccupationType | null,
    newOccupation: OccupationType,
  ): Promise<void> {
    console.log(
      `プレイヤー ${playerId} の職業が ${oldOccupation || "なし"} から ${newOccupation} に変更されたのだ`,
    );
    // TODO: ActionLogger を使用してログを記録するのだ
  }

  /**
   * 職業の能力使用を記録するのだ
   */
  public async logAbilityUse(
    playerId: string,
    abilityId: string,
    success: boolean,
  ): Promise<void> {
    console.log(
      `プレイヤー ${playerId} が能力 ${abilityId} を使用したのだ (成功: ${success})`,
    );
    // TODO: ActionLogger を使用してログを記録するのだ
  }

  /**
   * 特定の職業の割り当て数を取得するのだ
   */
  public async getOccupationCount(occupation: OccupationType): Promise<number> {
    const gameState = this.gameManager.getGameState();
    return Array.from(gameState.occupations.values()).filter(
      (o) => o === occupation,
    ).length;
  }
  /**
   * 役割と職業の組み合わせが許可されているかチェックするのだ
   */
  private checkOccupationConstraints(
    role: RoleType,
    occupation: OccupationType,
  ): boolean {
    // 探偵はすべての職業を選択可能
    if (role === RoleType.DETECTIVE) {
      return true;
    }

    // 殺人者は神父以外を選択可能
    if (role === RoleType.KILLER) {
      return occupation !== OccupationType.PRIEST;
    }

    // 共犯者は商人と罪人のみ選択可能
    if (role === RoleType.ACCOMPLICE) {
      return (
        occupation === OccupationType.MERCHANT ||
        occupation === OccupationType.PRISONER
      );
    }

    // 市民はすべての職業を選択可能
    if (role === RoleType.CITIZEN) {
      return true;
    }

    return false;
  }

  /**
   * 指定された役割で選択可能な職業のリストを取得するのだ
   */
  private getAvailableOccupations(role: RoleType): OccupationType[] {
    return Object.values(OccupationType).filter((occupation) =>
      this.checkOccupationConstraints(role, occupation),
    );
  }
}
