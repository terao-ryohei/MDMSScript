import type { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import type { RoleUIState } from "../types/RoleTypes";
import type { GameManager } from "./GameManager";
import type { IRoleUIManager } from "./interfaces/IRoleUIManager";
import type { RoleAssignmentManager } from "./RoleAssignmentManager";

/**
 * 役職UI管理クラス
 */
export class RoleUIManager implements IRoleUIManager {
  private static instance: RoleUIManager | null = null;
  private uiStates: Map<string, RoleUIState> = new Map();

  private constructor(
    private readonly gameManager: GameManager,
    private readonly roleAssignmentManager: RoleAssignmentManager,
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
    roleAssignmentManager: RoleAssignmentManager,
  ): RoleUIManager {
    if (!RoleUIManager.instance) {
      RoleUIManager.instance = new RoleUIManager(
        gameManager,
        roleAssignmentManager,
      );
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

  public dispose(): void {
    this.uiStates.clear();
    RoleUIManager.instance = null;
  }
}
