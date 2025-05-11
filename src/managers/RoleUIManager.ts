import { system, world } from "@minecraft/server";
import {
  ActionFormData,
  MessageFormData,
  ModalFormData,
} from "@minecraft/server-ui";
import { RoleType } from "../types/AdvancedFeatureTypes";
import type { AbilityTarget } from "../types/AdvancedFeatureTypes";
import type {
  RoleDetails,
  RoleUIState,
  RoleNotification,
  RoleAbility,
} from "../types/RoleTypes";
import { ROLE_DETAILS } from "../types/RoleTypes";
import type { GameManager } from "./GameManager";
import type { IRoleUIManager } from "./interfaces/IRoleUIManager";

/**
 * 役職UI管理クラス
 */
export class RoleUIManager implements IRoleUIManager {
  private static instance: RoleUIManager | null = null;
  private uiStates: Map<string, RoleUIState> = new Map();

  private constructor(private readonly gameManager: GameManager) {
    this.initializeUIStates();
  }

  public static getInstance(gameManager: GameManager): RoleUIManager {
    if (!RoleUIManager.instance) {
      RoleUIManager.instance = new RoleUIManager(gameManager);
    }
    return RoleUIManager.instance;
  }

  private initializeUIStates(): void {
    const gameState = this.gameManager.getGameState();
    for (const player of gameState.players) {
      this.uiStates.set(player.playerId, {
        showDetails: false,
        activeAbility: null,
        coolDowns: new Map(),
        notifications: [],
      });
    }
  }

  public async showRoleDetails(playerId: string): Promise<void> {
    const player = world.getAllPlayers().find((p) => p.id === playerId);
    if (!player) return;

    const roleDetails = await this.getRoleDetails(playerId);
    const form = new ActionFormData()
      .title(`${roleDetails.name}の情報`)
      .body(
        `説明: ${roleDetails.description}\n\n` +
          `目的: ${roleDetails.objective}\n\n` +
          `勝利条件: ${roleDetails.winCondition}`,
      );

    // 各特殊能力をボタンとして追加
    for (const ability of roleDetails.abilities) {
      const coolDown = await this.getCoolDown(playerId, ability.id);
      const remainingUses = await this.getRemainingUses(playerId, ability.id);
      const buttonText = `${ability.name}\n残り使用回数: ${remainingUses}\nクールダウン: ${
        coolDown > 0 ? `${Math.ceil(coolDown / 20)}秒` : "使用可能"
      }`;
      form.button(buttonText);
    }

    const response = await form.show(player);
    if (response.canceled || response.selection === undefined) return;

    // 選択された能力を使用するためのUIを表示
    const selectedAbility = roleDetails.abilities[response.selection];
    if (selectedAbility) {
      await this.showAbilityUseForm(playerId, selectedAbility);
    }
  }

  private async showAbilityUseForm(
    playerId: string,
    ability: RoleAbility,
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

    // 能力使用のためのフォームを表示
    const form = new ModalFormData().title(`${ability.name}を使用`);

    let selectedTarget: AbilityTarget | null = null;

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
        // 証拠リストの取得と選択UIの実装
        form.dropdown("証拠を選択", ["証拠1", "証拠2", "証拠3"]); // 実際の証拠リストに置き換える
        break;
      }
    }

    const response = await form.show(player);
    if (response.canceled || !response.formValues) return;

    // ターゲットの設定
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
      .button2("役職情報に戻る");

    const response = await form.show(player);
    if (!response.canceled && response.selection === 1) {
      await this.showRoleDetails(playerId);
    }
  }

  public async hideRoleDetails(playerId: string): Promise<void> {
    const uiState = this.uiStates.get(playerId);
    if (!uiState) return;

    this.updateUIState(playerId, {
      ...uiState,
      showDetails: false,
    });
  }

  public async getRoleDetails(playerId: string): Promise<RoleDetails> {
    const playerState = this.gameManager
      .getGameState()
      .players.find((p) => p.playerId === playerId);
    if (!playerState) {
      throw new Error("Player not found");
    }
    return ROLE_DETAILS[playerState.role];
  }

  public async getRoleUIState(playerId: string): Promise<RoleUIState> {
    const uiState = this.uiStates.get(playerId);
    if (!uiState) {
      throw new Error("UI state not found");
    }
    return uiState;
  }

  public async activateAbility(
    playerId: string,
    abilityId: string,
  ): Promise<boolean> {
    const uiState = this.uiStates.get(playerId);
    if (!uiState) return false;

    uiState.activeAbility = abilityId;
    this.updateUIState(playerId, uiState);
    return true;
  }

  public async deactivateAbility(
    playerId: string,
    abilityId: string,
  ): Promise<void> {
    const uiState = this.uiStates.get(playerId);
    if (!uiState) return;

    if (uiState.activeAbility === abilityId) {
      uiState.activeAbility = null;
      this.updateUIState(playerId, uiState);
    }
  }

  public async useAbility(
    playerId: string,
    abilityId: string,
    target: AbilityTarget,
  ): Promise<boolean> {
    const playerState = this.gameManager
      .getGameState()
      .players.find((p) => p.playerId === playerId);
    if (!playerState) return false;

    const roleDetails = ROLE_DETAILS[playerState.role];
    const ability = roleDetails.abilities.find((a) => a.id === abilityId);
    if (!ability) return false;

    const uiState = this.uiStates.get(playerId);
    if (!uiState) return false;

    // クールダウンチェック
    const coolDown = uiState.coolDowns.get(abilityId);
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
      uiState.coolDowns.set(abilityId, system.currentTick + ability.coolDown);
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

    const coolDown = uiState.coolDowns.get(abilityId);
    if (!coolDown || coolDown <= system.currentTick) return 0;
    return coolDown - system.currentTick;
  }

  public async getRemainingUses(
    playerId: string,
    abilityId: string,
  ): Promise<number> {
    const playerState = this.gameManager
      .getGameState()
      .players.find((p) => p.playerId === playerId);
    if (!playerState) return 0;

    const roleDetails = ROLE_DETAILS[playerState.role];
    const ability = roleDetails.abilities.find((a) => a.id === abilityId);
    return ability?.remainingUses ?? 0;
  }

  private async addNotification(
    playerId: string,
    notification: Omit<RoleNotification, "id" | "timestamp">,
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

  private getNotificationTitle(type: RoleNotification["type"]): string {
    switch (type) {
      case "info":
        return "情報";
      case "warning":
        return "警告";
      case "error":
        return "エラー";
      case "success":
        return "成功";
    }
  }

  public async onPhaseChange(phase: string): Promise<void> {
    const gameState = this.gameManager.getGameState();
    for (const player of gameState.players) {
      if (phase === "night" && player.role === RoleType.KILLER) {
        await this.addNotification(player.playerId, {
          type: "info",
          message: "夜間フェーズが始まりました。殺害能力が使用可能です。",
          duration: 5000,
          priority: "high",
        });
      }
    }
  }

  public async onRoleAssignment(
    playerId: string,
    role: RoleType,
  ): Promise<void> {
    const roleDetails = ROLE_DETAILS[role];
    await this.addNotification(playerId, {
      type: "info",
      message: `あなたは${roleDetails.name}になりました`,
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

  private updateUIState(playerId: string, newState: RoleUIState): void {
    this.uiStates.set(playerId, newState);
  }
}
