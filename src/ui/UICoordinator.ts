import { system } from "@minecraft/server";
import type { IRoleUIManager } from "../managers/interfaces/IRoleUIManager";
import type { IOccupationUIManager } from "../managers/interfaces/IOccupationUIManager";
import type { AbilityTarget } from "../types/AdvancedFeatureTypes";
import type { GameManager } from "../managers/GameManager";
import type { IUICoordinator } from "./interfaces/IUICoordinator";
import { MurderMysteryActions } from "../types/ActionTypes";
import type { ActionType } from "../types/ActionTypes";

/**
 * UI関連のエラー
 */
export class UIError extends Error {
  constructor(
    message: string,
    public code: "UI_SYNC_ERROR" | "ABILITY_ERROR" | "DISPLAY_ERROR",
    public context: "role" | "occupation" | "general",
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "UIError";
  }
}

/**
 * 役割と職業のUI管理を統合するクラス
 */
export class UICoordinator implements IUICoordinator {
  private static instance: UICoordinator | null = null;

  private constructor(
    private readonly gameManager: GameManager,
    private readonly roleUIManager: IRoleUIManager,
    private readonly occupationUIManager: IOccupationUIManager,
  ) {}

  public static getInstance(
    gameManager: GameManager,
    roleUIManager: IRoleUIManager,
    occupationUIManager: IOccupationUIManager,
  ): UICoordinator {
    if (!UICoordinator.instance) {
      UICoordinator.instance = new UICoordinator(
        gameManager,
        roleUIManager,
        occupationUIManager,
      );
    }
    return UICoordinator.instance;
  }

  public async showPlayerInfo(playerId: string): Promise<void> {
    try {
      const gameState = this.gameManager.getGameState();
      const playerState = gameState.players.find(
        (p) => p.playerId === playerId,
      );
      if (!playerState) {
        throw new UIError(
          "Player state not found",
          "DISPLAY_ERROR",
          "general",
          { playerId },
        );
      }

      await Promise.all([
        this.roleUIManager.showRoleDetails(playerId),
        playerState.occupation
          ? this.occupationUIManager.showOccupationDetails(playerId)
          : Promise.resolve(),
      ]);

      this.gameManager.logAction({
        type: MurderMysteryActions.UI_UPDATE as unknown as ActionType,
        playerId,
        details: {
          action: "show_info",
          timestamp: system.currentTick,
        },
      });
    } catch (error) {
      await this.handleError(
        playerId,
        error instanceof Error ? error : new Error(String(error)),
        "general",
      );
    }
  }

  public async updateAbilityUI(playerId: string): Promise<void> {
    try {
      const updates = [];

      // 職業の能力UI更新
      const occupation =
        await this.occupationUIManager.getPlayerOccupation(playerId);
      if (occupation) {
        const occupationDetails =
          await this.occupationUIManager.getOccupationDetails(playerId);
        if (occupationDetails) {
          updates.push(
            ...occupationDetails.abilities.map(async (ability) => {
              const coolDown = await this.occupationUIManager.getCoolDown(
                playerId,
                ability.id,
              );
              const remainingUses =
                await this.occupationUIManager.getRemainingUses(
                  playerId,
                  ability.id,
                );
              return { ability, coolDown, remainingUses, source: "occupation" };
            }),
          );
        }
      }

      // 役割の能力UI更新
      const roleDetails = await this.roleUIManager.getRoleDetails(playerId);
      updates.push(
        ...roleDetails.abilities.map(async (ability) => {
          const coolDown = await this.roleUIManager.getCoolDown(
            playerId,
            ability.id,
          );
          const remainingUses = await this.roleUIManager.getRemainingUses(
            playerId,
            ability.id,
          );
          return { ability, coolDown, remainingUses, source: "role" };
        }),
      );

      // 全ての更新を並行処理
      const results = await Promise.all(updates);

      // 更新をログに記録
      this.gameManager.logAction({
        type: MurderMysteryActions.UI_UPDATE as unknown as ActionType,
        playerId,
        details: {
          action: "update_abilities",
          updates: results,
          timestamp: system.currentTick,
        },
      });
    } catch (error) {
      await this.handleError(
        playerId,
        error instanceof Error ? error : new Error(String(error)),
        "general",
      );
    }
  }

  public async handleAbilityUse(
    playerId: string,
    abilityId: string,
    source: "role" | "occupation",
    target: AbilityTarget,
  ): Promise<boolean> {
    try {
      let success = false;

      if (source === "role") {
        success = await this.roleUIManager.useAbility(
          playerId,
          abilityId,
          target,
        );
        if (success) {
          await this.roleUIManager.onAbilityUse(playerId, abilityId, true);
        }
      } else {
        success = await this.occupationUIManager.useAbility(
          playerId,
          abilityId,
          target,
        );
        await this.occupationUIManager.onAbilityUse(
          playerId,
          abilityId,
          success,
        );
      }

      // 能力使用をログに記録
      this.gameManager.logAction({
        type: MurderMysteryActions.ABILITY_USE as unknown as ActionType,
        playerId,
        details: {
          abilityId,
          source,
          success,
          target,
          timestamp: system.currentTick,
        },
      });

      await this.updateAbilityUI(playerId);
      return success;
    } catch (error) {
      await this.handleError(
        playerId,
        error instanceof Error ? error : new Error(String(error)),
        source,
      );
      return false;
    }
  }

  public async hideAllDetails(playerId: string): Promise<void> {
    try {
      await Promise.all([
        this.roleUIManager.hideRoleDetails(playerId),
        this.occupationUIManager.hideOccupationDetails(playerId),
      ]);

      this.gameManager.logAction({
        type: MurderMysteryActions.UI_UPDATE as unknown as ActionType,
        playerId,
        details: {
          action: "hide_details",
          timestamp: system.currentTick,
        },
      });
    } catch (error) {
      await this.handleError(
        playerId,
        error instanceof Error ? error : new Error(String(error)),
        "general",
      );
    }
  }

  public async showNotification(
    playerId: string,
    message: string,
    type: "info" | "warning" | "error" | "success",
    _duration = 3000,
  ): Promise<void> {
    const prefix =
      type === "error" ? "エラー" : type === "warning" ? "警告" : "情報";
    console.error(`${prefix} (${playerId}): ${message}`);

    this.gameManager.logAction({
      type: MurderMysteryActions.UI_NOTIFICATION as unknown as ActionType,
      playerId,
      details: {
        message,
        type,
        timestamp: system.currentTick,
      },
    });
  }

  public async setupInitialUI(playerId: string): Promise<void> {
    try {
      await this.syncUIState(playerId);
      console.error(`UI初期化完了 (${playerId})`);
    } catch (error) {
      await this.handleError(
        playerId,
        error instanceof Error ? error : new Error(String(error)),
        "general",
      );
    }
  }

  public async syncUIState(playerId: string): Promise<void> {
    try {
      const gameState = this.gameManager.getGameState();
      const playerState = gameState.players.find(
        (p) => p.playerId === playerId,
      );
      if (!playerState) return;

      // 役割と職業の状態を同期
      await Promise.all([
        this.roleUIManager.getRoleUIState(playerId),
        this.occupationUIManager.getOccupationUIState(playerId),
      ]);

      await this.updateAbilityUI(playerId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`UI同期エラー: ${errorMessage}`);
      throw new UIError("UIの同期に失敗しました", "UI_SYNC_ERROR", "general");
    }
  }

  public async handleUIEvent(
    playerId: string,
    eventType: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      this.gameManager.logAction({
        type: MurderMysteryActions.UI_EVENT as unknown as ActionType,
        playerId,
        details: {
          eventType,
          data,
          timestamp: system.currentTick,
        },
      });

      switch (eventType) {
        case "refresh":
          await this.syncUIState(playerId);
          break;
        case "reset":
          await this.setupInitialUI(playerId);
          break;
        default:
          console.warn(`Unknown UI event type: ${eventType}`);
      }
    } catch (error) {
      await this.handleError(
        playerId,
        error instanceof Error ? error : new Error(String(error)),
        "general",
      );
    }
  }

  public async handleError(
    playerId: string,
    error: Error,
    context: "role" | "occupation" | "general",
  ): Promise<void> {
    console.error(
      `UI ${context}エラー (${playerId}): ${error instanceof Error ? error.message : String(error)}`,
    );
    this.gameManager.logAction({
      type: MurderMysteryActions.UI_ERROR as unknown as ActionType,
      playerId,
      details: {
        error: error instanceof UIError ? error : { message: error.message },
        context,
        timestamp: system.currentTick,
      },
    });
  }

  public dispose(): void {
    UICoordinator.instance = null;
  }
}
