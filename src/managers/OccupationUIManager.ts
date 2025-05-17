import { system, world } from "@minecraft/server";
import {
  ActionFormData,
  MessageFormData,
  ModalFormData,
} from "@minecraft/server-ui";
import type { OccupationType } from "../types/OccupationTypes";
import type { IOccupationUIManager } from "./interfaces/IOccupationUIManager";
import type { GameManager } from "./GameManager";
import type {
  AbilityTarget,
  AbilityTargetType,
} from "../types/AdvancedFeatureTypes";
import type { PlayerState } from "../types/GameTypes";
import type {
  OccupationDetails,
  OccupationUIState,
  OccupationNotification,
  OccupationAbility,
} from "../types/OccupationTypes";
import { OCCUPATION_DETAILS } from "../types/OccupationDetailsConfig";

/**
 * 職業UI管理クラス
 */
export class OccupationUIManager implements IOccupationUIManager {
  private static instance: OccupationUIManager | null = null;
  private uiStates: Map<string, OccupationUIState> = new Map();

  private constructor(private readonly gameManager: GameManager) {
    this.initializeUIStates();
  }

  public static getInstance(gameManager: GameManager): OccupationUIManager {
    if (!OccupationUIManager.instance) {
      OccupationUIManager.instance = new OccupationUIManager(gameManager);
    }
    return OccupationUIManager.instance;
  }

  private initializeUIStates(): void {
    const gameState = this.gameManager.getGameState();
    for (const player of gameState.players) {
      this.uiStates.set(player.playerId, {
        selectedAbilityId: null,
        targetPlayerId: null,
        showDetails: false,
        activeAbility: null,
        cooldowns: new Map(),
        notifications: [],
      });
    }
  }

  public async showOccupationDetails(playerId: string): Promise<void> {
    const player = world.getAllPlayers().find((p) => p.id === playerId);
    if (!player) return;

    const occupationDetails = await this.getOccupationDetails(playerId);
    if (!occupationDetails) {
      await this.addNotification(playerId, {
        type: "error",
        message: "職業情報が見つかりません",
        duration: 3000,
        priority: "high",
      });
      return;
    }

    const form = new ActionFormData()
      .title(`${occupationDetails.name}の情報`)
      .body(`説明: ${occupationDetails.description}\n`);

    for (const ability of occupationDetails.abilities) {
      const coolDown = await this.getCoolDown(playerId, ability.id);
      const remainingUses = await this.getRemainingUses(playerId, ability.id);
      const buttonText = `${ability.name}\n残り使用回数: ${remainingUses}\nクールダウン: ${
        coolDown > 0 ? `${Math.ceil(coolDown / 20)}秒` : "使用可能"
      }`;
      form.button(buttonText);
    }

    const response = await form.show(player);
    if (response.canceled || response.selection === undefined) return;

    const selectedAbility = occupationDetails.abilities[response.selection];
    if (selectedAbility) {
      await this.showAbilityUseForm(playerId, selectedAbility);
    }
  }

  public async hideOccupationDetails(playerId: string): Promise<void> {
    const uiState = this.uiStates.get(playerId);
    if (!uiState) return;

    this.updateUIState(playerId, {
      ...uiState,
      showDetails: false,
    });
  }

  public async getOccupationUIState(
    playerId: string,
  ): Promise<OccupationUIState> {
    const uiState = this.uiStates.get(playerId);
    if (!uiState) {
      throw new Error("UI state not found");
    }
    return uiState;
  }

  public async getPlayerOccupation(
    playerId: string,
  ): Promise<OccupationType | null> {
    const playerState = this.getPlayerState(playerId);
    return playerState?.occupation ?? null;
  }

  public async getOccupationDetails(
    playerId: string,
  ): Promise<OccupationDetails | null> {
    const playerState = this.getPlayerState(playerId);
    if (!playerState?.occupation) return null;
    const details = OCCUPATION_DETAILS.get(playerState.occupation);
    return details ?? null;
  }

  private getPlayerState(playerId: string): PlayerState | undefined {
    return this.gameManager
      .getGameState()
      .players.find((p) => p.playerId === playerId);
  }

  /**
   * 特殊能力を有効化するのだ
   */
  public async activateAbility(
    playerId: string,
    abilityId: string,
  ): Promise<boolean> {
    const uiState = this.uiStates.get(playerId);
    if (!uiState) return false;

    // クールダウンチェック
    const coolDown = await this.getCoolDown(playerId, abilityId);
    if (coolDown > 0) {
      await this.addNotification(playerId, {
        type: "warning",
        message: `この能力はまだ使用できません。残り: ${Math.ceil(coolDown / 20)}秒`,
        duration: 3000,
        priority: "medium",
      });
      return false;
    }

    // 能力の残り使用回数チェック
    const remainingUses = await this.getRemainingUses(playerId, abilityId);
    if (remainingUses === 0) {
      await this.addNotification(playerId, {
        type: "warning",
        message: "この能力は使用できません。",
        duration: 3000,
        priority: "medium",
      });
      return false;
    }

    uiState.activeAbility = abilityId;
    this.updateUIState(playerId, uiState);

    await this.addNotification(playerId, {
      type: "ability_ready",
      message: "能力が有効化されました。対象を選択してください。",
      duration: 5000,
      priority: "high",
    });

    return true;
  }

  /**
   * 特殊能力を無効化するのだ
   */
  public async deactivateAbility(
    playerId: string,
    abilityId: string,
  ): Promise<void> {
    const uiState = this.uiStates.get(playerId);
    if (!uiState) return;

    if (uiState.activeAbility === abilityId) {
      uiState.activeAbility = null;
      this.updateUIState(playerId, uiState);

      await this.addNotification(playerId, {
        type: "info",
        message: "能力が無効化されました。",
        duration: 3000,
        priority: "medium",
      });
    }
  }

  private async showAbilityUseForm(
    playerId: string,
    ability: OccupationAbility,
  ): Promise<void> {
    const player = world.getAllPlayers().find((p) => p.id === playerId);
    if (!player) return;

    const coolDown = await this.getCoolDown(playerId, ability.id);
    if (coolDown > 0) {
      const form = new MessageFormData()
        .title("能力使用不可")
        .body(
          `この能力はまだ使用できません。\n残りクールダウン: ${Math.ceil(
            coolDown / 20,
          )}秒`,
        )
        .button1("閉じる")
        .button2("詳細を見る");
      await form.show(player);
      return;
    }

    const form = new ModalFormData().title(`${ability.name}を使用`);
    let selectedTarget: AbilityTarget | null = null;

    // 能力のターゲットタイプに応じたUIを表示
    switch (ability.targetType) {
      case "player": {
        const players = world
          .getAllPlayers()
          .filter((p) => p.id !== playerId)
          .map((p) => p.name);
        form.dropdown("対象プレイヤーを選択", players);
        break;
      }
      case "location": {
        form
          .slider("X座標", -100, 100, 1, 0)
          .slider("Y座標", -50, 50, 1, 0)
          .slider("Z座標", -100, 100, 1, 0);
        break;
      }
      case "evidence": {
        form.dropdown("証拠を選択", ["証拠1", "証拠2", "証拠3"]);
        break;
      }
    }

    const response = await form.show(player);
    if (response.canceled || !response.formValues) return;

    // 能力のターゲットタイプに応じてターゲット情報を設定
    switch (ability.targetType) {
      case "player": {
        const targetPlayers = world
          .getAllPlayers()
          .filter((p) => p.id !== playerId);
        const selectedIndex = response.formValues[0] as number;
        if (selectedIndex >= 0 && selectedIndex < targetPlayers.length) {
          const targetPlayer = targetPlayers[selectedIndex];
          selectedTarget = {
            targetType: "player",
            targetId: targetPlayer.id,
          };
        }
        break;
      }
      case "location": {
        const [x, y, z] = response.formValues as number[];
        selectedTarget = {
          targetType: "location",
          targetId: `${x},${y},${z}`,
          additionalData: { x, y, z },
        };
        break;
      }
      case "evidence": {
        const evidenceIndex = response.formValues[0] as number;
        selectedTarget = {
          targetType: "evidence",
          targetId: `evidence_${evidenceIndex}`,
        };
        break;
      }
    }

    if (selectedTarget) {
      const success = await this.useAbility(
        playerId,
        ability.id,
        selectedTarget,
      );
      await this.showAbilityResultForm(playerId, success);
    }
  }

  private async showAbilityResultForm(
    playerId: string,
    success: boolean,
  ): Promise<void> {
    const player = world.getAllPlayers().find((p) => p.id === playerId);
    if (!player) return;

    const form = new MessageFormData()
      .title(success ? "能力使用成功" : "能力使用失敗")
      .body(
        success
          ? "能力を正常に使用しました"
          : "能力の使用に失敗しました。もう一度お試しください。",
      )
      .button1("閉じる")
      .button2("職業情報に戻る");

    const response = await form.show(player);
    if (!response.canceled && response.selection === 1) {
      await this.showOccupationDetails(playerId);
    }
  }

  public async useAbility(
    playerId: string,
    abilityId: string,
    target: AbilityTarget,
  ): Promise<boolean> {
    const playerState = this.getPlayerState(playerId);
    if (!playerState?.occupation) return false;

    const occupationDetails = OCCUPATION_DETAILS.get(playerState.occupation);
    if (!occupationDetails) return false;

    const ability = occupationDetails.abilities.find(
      (a: OccupationAbility) => a.id === abilityId,
    );
    if (!ability) return false;

    const uiState = this.uiStates.get(playerId);
    if (!uiState) return false;

    // クールダウンチェック
    const coolDown = uiState.cooldowns.get(abilityId);
    if (coolDown && coolDown > system.currentTick) {
      await this.addNotification(playerId, {
        type: "warning",
        message: "この能力はまだ使用できません",
        duration: 3000,
        priority: "medium",
      });
      return false;
    }

    // 能力の使用
    const success = await ability.useAbility(target);
    if (success) {
      // クールダウンの設定
      uiState.cooldowns.set(abilityId, system.currentTick + ability.coolDown);
      this.updateUIState(playerId, uiState);
    }

    return success;
  }

  public async getCoolDown(
    playerId: string,
    abilityId: string,
  ): Promise<number> {
    const uiState = this.uiStates.get(playerId);
    if (!uiState) return 0;

    const coolDown = uiState.cooldowns.get(abilityId);
    if (!coolDown || coolDown <= system.currentTick) return 0;
    return coolDown - system.currentTick;
  }

  public async getRemainingUses(
    playerId: string,
    abilityId: string,
  ): Promise<number> {
    const playerState = this.getPlayerState(playerId);
    if (!playerState?.occupation) return 0;

    const occupationDetails = OCCUPATION_DETAILS.get(playerState.occupation);
    if (!occupationDetails) return 0;

    const ability = occupationDetails.abilities.find(
      (a: OccupationAbility) => a.id === abilityId,
    );
    return ability?.remainingUses ?? 0;
  }

  private async addNotification(
    playerId: string,
    notification: Omit<OccupationNotification, "id" | "timestamp">,
  ): Promise<void> {
    const player = world.getAllPlayers().find((p) => p.id === playerId);
    if (!player) return;

    const form = new MessageFormData()
      .title(this.getNotificationTitle(notification.type))
      .body(notification.message)
      .button1("確認")
      .button2(notification.type === "error" ? "詳細" : "閉じる");

    await form.show(player);
  }

  private getNotificationTitle(type: OccupationNotification["type"]): string {
    switch (type) {
      case "info":
      case "ability_ready":
        return "情報";
      case "warning":
        return "警告";
      case "error":
      case "ability_fail":
        return "エラー";
      case "success":
      case "ability_success":
        return "成功";
      case "ability_use":
        return "能力使用";
      default:
        return "通知";
    }
  }

  public async onOccupationAssignment(
    playerId: string,
    occupation: OccupationType,
  ): Promise<void> {
    const occupationDetails = OCCUPATION_DETAILS.get(occupation);
    if (!occupationDetails) return;

    await this.addNotification(playerId, {
      type: "info",
      message: `あなたの職業は${occupationDetails.name}です`,
      duration: 0,
      priority: "high",
    });
  }

  public async onAbilityUse(
    playerId: string,
    abilityId: string,
    success: boolean,
  ): Promise<void> {
    await this.showAbilityResultForm(playerId, success);
  }

  public async showNotification(
    playerId: string,
    type: "info" | "warning" | "error" | "success",
    message: string,
    duration = 3000,
  ): Promise<void> {
    const player = world.getAllPlayers().find((p) => p.id === playerId);
    if (!player) return;

    const form = new MessageFormData()
      .title(this.getNotificationTitle(type))
      .body(message)
      .button1("確認")
      .button2(type === "error" ? "詳細" : "閉じる");

    await form.show(player);
  }

  private updateUIState(playerId: string, newState: OccupationUIState): void {
    this.uiStates.set(playerId, newState);
  }
}
