import type { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import type { RoleUIState } from "../types/RoleTypes";
import type { GameManager } from "./GameManager";
import type { IRoleUIManager } from "./interfaces/IRoleUIManager";
import { RoleAssignmentManager } from "./RoleAssignmentManager";

/**
 * 役職UI管理クラス
 */
export class RoleUIManager implements IRoleUIManager {
  private static instance: RoleUIManager | null = null;
  private uiStates: Map<string, RoleUIState> = new Map();
  private roleAssignmentManager: RoleAssignmentManager;

  private constructor(
    private readonly gameManager: GameManager,
    private players: Player[],
  ) {
    this.initializeUIStates();
    this.roleAssignmentManager = RoleAssignmentManager.getInstance(
      this.gameManager,
      this.players,
    );
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
    players: Player[],
  ): RoleUIManager {
    if (!RoleUIManager.instance) {
      RoleUIManager.instance = new RoleUIManager(gameManager, players);
    }
    return RoleUIManager.instance;
  }

  public async showRoleDetails(player: Player): Promise<void> {
    const role = await this.roleAssignmentManager.getPlayerRole(player);
    if (!role) {
      return;
    }
    const form = new ActionFormData()
      .title(`${role.name}の情報`)
      .body(
        `説明: ${role.description}\n\n` +
          `目的: ${role.objective}\n\n` +
          `勝利条件: ${role.winCondition}`,
      )
      .body(
        role.abilities
          .map(
            (ability) =>
              `${ability.name}\n残り使用回数: ${ability.remainingUses}`,
          )
          .join("\n"),
      );

    const response = await form.show(player);
    if (response.canceled || response.selection === undefined) return;
  }
}
