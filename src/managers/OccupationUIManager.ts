import type { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import type { OccupationUIState } from "../types/OccupationTypes";
import type { GameManager } from "./GameManager";
import type { IOccupationUIManager } from "./interfaces/IOccupationUIManager";
import type { OccupationAssignmentManager } from "./OccupationAssignmentManager";

/**
 * 職業UI管理クラス
 */
export class OccupationUIManager implements IOccupationUIManager {
  private static instance: OccupationUIManager | null = null;
  private uiStates: Map<string, OccupationUIState> = new Map();

  private constructor(
    private readonly gameManager: GameManager,
    private readonly occupationAssignmentManager: OccupationAssignmentManager,
  ) {
    this.initializeUIStates();
  }

  private initializeUIStates(): void {
    const gameState = this.gameManager.getGameState();
    for (const player of gameState.players) {
      this.uiStates.set(player.player.id, {
        selectedAbilityId: null,
        targetPlayerId: null,
        showDetails: false,
        activeAbility: null,
        notifications: [],
      });
    }
  }

  public static getInstance(
    gameManager: GameManager,
    occupationAssignmentManager: OccupationAssignmentManager,
  ): OccupationUIManager {
    if (!OccupationUIManager.instance) {
      OccupationUIManager.instance = new OccupationUIManager(
        gameManager,
        occupationAssignmentManager,
      );
    }
    return OccupationUIManager.instance;
  }

  public async showOccupation(player: Player): Promise<void> {
    const occupation =
      await this.occupationAssignmentManager.getPlayerOccupation(player);
    if (!occupation) {
      return;
    }

    const form = new ActionFormData()
      .title(`${occupation.name}の情報`)
      .body(`説明: ${occupation.description}\n\n`)
      .body(
        occupation.abilities
          .map(
            (ability) =>
              `${ability.name}\n残り使用回数: ${ability.remainingUses}`,
          )
          .join("\n"),
      );

    const response = await form.show(player);
    if (response.canceled || response.selection === undefined) return;
  }

  public dispose(): void {
    this.uiStates.clear();
    OccupationUIManager.instance = null;
  }
}
