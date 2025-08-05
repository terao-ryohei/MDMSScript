import { Player, world } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { AbilityManager } from "./AbilityManager";
import { ScoreboardManager } from "./ScoreboardManager";
import { RoleAssignmentManager } from "./RoleAssignmentManager";
import { JobAssignmentManager } from "./JobAssignmentManager";
import {
  AbilityStatus,
  AbilityTargetType,
  type AbilityDefinition,
  type AbilityInstanceState,
  DEFAULT_ABILITIES
} from "../types/AbilityTypes";

/**
 * 能力システムUI管理マネージャー
 */
export class AbilityUIManager {
  private static instance: AbilityUIManager;
  private abilityManager: AbilityManager;
  private scoreboardManager: ScoreboardManager;
  private roleAssignmentManager: RoleAssignmentManager;
  private jobAssignmentManager: JobAssignmentManager;

  private constructor() {
    this.abilityManager = AbilityManager.getInstance();
    this.scoreboardManager = ScoreboardManager.getInstance();
    this.roleAssignmentManager = RoleAssignmentManager.getInstance();
    this.jobAssignmentManager = JobAssignmentManager.getInstance();
  }

  public static getInstance(): AbilityUIManager {
    if (!AbilityUIManager.instance) {
      AbilityUIManager.instance = new AbilityUIManager();
    }
    return AbilityUIManager.instance;
  }

  /**
   * 能力メインメニューを表示
   */
  public async showAbilityMenu(player: Player): Promise<void> {
    try {
      const form = new ActionFormData()
        .title("§l§d特殊能力システム")
        .body("§7能力を使用するメニューを選択してください");

      const playerAbilities = this.abilityManager.getPlayerAbilities(player.id);
      
      if (playerAbilities.size === 0) {
        form.body("§c利用可能な特殊能力がありません");
        form.button("§7閉じる", "textures/ui/cancel");
      } else {
        form.button("§a能力を使用", "textures/ui/gear");
        form.button("§e能力一覧", "textures/ui/book_edit_default");
        form.button("§b使用履歴", "textures/ui/creative_icon");
        form.button("§6能力説明", "textures/ui/magnifyingGlass");
        form.button("§7閉じる", "textures/ui/cancel");
      }

      const response = await form.show(player);
      
      if (response.canceled) return;

      if (playerAbilities.size === 0) {
        return; // 能力がない場合は閉じるのみ
      }

      switch (response.selection) {
        case 0: // 能力を使用
          await this.showAbilitySelection(player);
          break;
        case 1: // 能力一覧
          await this.showAbilityList(player);
          break;
        case 2: // 使用履歴
          await this.showAbilityHistory(player);
          break;
        case 3: // 能力説明
          await this.showAbilityHelp(player);
          break;
      }

    } catch (error) {
      console.error(`Failed to show ability menu for ${player.name}:`, error);
      player.sendMessage("§c能力メニューの表示に失敗しました");
    }
  }

  /**
   * 能力選択画面を表示
   */
  public async showAbilitySelection(player: Player): Promise<void> {
    try {
      const playerAbilities = this.abilityManager.getPlayerAbilities(player.id);
      const availableAbilities = Array.from(playerAbilities.entries())
        .filter(([_, state]) => state.status === AbilityStatus.AVAILABLE);

      if (availableAbilities.length === 0) {
        const form = new MessageFormData()
          .title("§l§c能力使用")
          .body("§7現在使用可能な能力がありません\n\n§cクールダウン中か使用回数を消費済みです")
          .button1("§a了解")
          .button2("§7閉じる");

        await form.show(player);
        return;
      }

      const form = new ActionFormData()
        .title("§l§a能力使用")
        .body("§7使用する能力を選択してください");

      for (const [abilityId, state] of availableAbilities) {
        const definition = DEFAULT_ABILITIES[abilityId];
        if (definition) {
          const statusIcon = this.getAbilityStatusIcon(state);
          const usesText = `(${state.usesRemaining}/${definition.usesPerGame})`;
          form.button(`${statusIcon} §f${definition.name} ${usesText}`, "textures/ui/gear");
        }
      }

      form.button("§7戻る", "textures/ui/cancel");

      const response = await form.show(player);
      
      if (response.canceled || response.selection === availableAbilities.length) {
        await this.showAbilityMenu(player);
        return;
      }

      const [selectedAbilityId] = availableAbilities[response.selection!];
      await this.showAbilityConfirmation(player, selectedAbilityId);

    } catch (error) {
      console.error(`Failed to show ability selection for ${player.name}:`, error);
      player.sendMessage("§c能力選択の表示に失敗しました");
    }
  }

  /**
   * 能力使用確認画面を表示
   */
  private async showAbilityConfirmation(player: Player, abilityId: string): Promise<void> {
    try {
      const definition = DEFAULT_ABILITIES[abilityId];
      if (!definition) {
        player.sendMessage("§c能力定義が見つかりません");
        return;
      }

      // 使用可能チェック
      const canUse = this.abilityManager.canUseAbility(player, abilityId);
      if (!canUse.success) {
        player.sendMessage(`§c${canUse.message}`);
        return;
      }

      const playerState = this.abilityManager.getPlayerAbilities(player.id);
      const abilityState = playerState.get(abilityId);
      
      if (!abilityState) {
        player.sendMessage("§c能力状態が見つかりません");
        return;
      }

      let confirmationText = 
        `§6能力名: §f${definition.name}\n` +
        `§6説明: §7${definition.description}\n` +
        `§6残り回数: §f${abilityState.usesRemaining}/${definition.usesPerGame}\n` +
        `§6クールダウン: §f${Math.floor(definition.cooldownTime / 60)}分\n`;

      if (definition.requiresTarget) {
        // 対象選択が必要な場合
        await this.showTargetSelection(player, abilityId, definition);
        return;
      } else {
        confirmationText += "\n§7この能力を使用しますか？";
      }

      const form = new MessageFormData()
        .title("§l§e能力使用確認")
        .body(confirmationText)
        .button1("§a使用する")
        .button2("§cキャンセル");

      const response = await form.show(player);
      
      if (response.canceled || response.selection === 1) {
        await this.showAbilitySelection(player);
        return;
      }

      // 能力使用実行
      const result = await this.abilityManager.useAbility(player, abilityId);
      
      if (result.success) {
        player.sendMessage(`§a${result.message}`);
      } else {
        player.sendMessage(`§c${result.message}`);
      }

    } catch (error) {
      console.error(`Failed to show ability confirmation for ${player.name}:`, error);
      player.sendMessage("§c能力確認の表示に失敗しました");
    }
  }

  /**
   * 対象選択画面を表示
   */
  private async showTargetSelection(player: Player, abilityId: string, definition: AbilityDefinition): Promise<void> {
    try {
      if (definition.targetType === AbilityTargetType.PLAYER) {
        const alivePlayers = world.getAllPlayers()
          .filter(p => this.scoreboardManager.isPlayerAlive(p) && p.id !== player.id);

        if (alivePlayers.length === 0) {
          player.sendMessage("§c対象となるプレイヤーがいません");
          return;
        }

        const form = new ActionFormData()
          .title(`§l§6対象選択 - ${definition.name}`)
          .body("§7能力の対象を選択してください");

        for (const target of alivePlayers) {
          const distance = this.calculateDistance(player.location, target.location);
          const inRange = distance <= definition.range;
          const statusIcon = inRange ? "§a●" : "§c●";
          const distanceText = `(${Math.round(distance)}m)`;
          
          form.button(`${statusIcon} §f${target.name} ${distanceText}`, "textures/ui/friend_glyph");
        }

        form.button("§7キャンセル", "textures/ui/cancel");

        const response = await form.show(player);
        
        if (response.canceled || response.selection === alivePlayers.length) {
          await this.showAbilitySelection(player);
          return;
        }

        const selectedTarget = alivePlayers[response.selection!];
        
        // 最終確認
        await this.showTargetConfirmation(player, abilityId, definition, selectedTarget);

      } else {
        // その他の対象タイプ（エリア等）は直接実行
        const result = await this.abilityManager.useAbility(player, abilityId);
        
        if (result.success) {
          player.sendMessage(`§a${result.message}`);
        } else {
          player.sendMessage(`§c${result.message}`);
        }
      }

    } catch (error) {
      console.error(`Failed to show target selection for ${player.name}:`, error);
      player.sendMessage("§c対象選択の表示に失敗しました");
    }
  }

  /**
   * 対象確認画面を表示
   */
  private async showTargetConfirmation(
    player: Player, 
    abilityId: string, 
    definition: AbilityDefinition, 
    target: Player
  ): Promise<void> {
    try {
      const distance = Math.round(this.calculateDistance(player.location, target.location));
      const inRange = distance <= definition.range;

      if (!inRange) {
        player.sendMessage(`§c対象が範囲外です（${distance}m > ${definition.range}m）`);
        return;
      }

      const form = new MessageFormData()
        .title("§l§e能力使用確認")
        .body(
          `§6能力: §f${definition.name}\n` +
          `§6対象: §f${target.name}\n` +
          `§6距離: §f${distance}m / ${definition.range}m\n\n` +
          `§7${definition.description}\n\n` +
          "§7この対象に能力を使用しますか？"
        )
        .button1("§a使用する")
        .button2("§cキャンセル");

      const response = await form.show(player);
      
      if (response.canceled || response.selection === 1) {
        await this.showTargetSelection(player, abilityId, definition);
        return;
      }

      // 能力使用実行
      const result = await this.abilityManager.useAbility(player, abilityId, target.id);
      
      if (result.success) {
        player.sendMessage(`§a${result.message}`);
      } else {
        player.sendMessage(`§c${result.message}`);
      }

    } catch (error) {
      console.error(`Failed to show target confirmation for ${player.name}:`, error);
      player.sendMessage("§c対象確認の表示に失敗しました");
    }
  }

  /**
   * 能力一覧を表示
   */
  public async showAbilityList(player: Player): Promise<void> {
    try {
      const playerAbilities = this.abilityManager.getPlayerAbilities(player.id);
      
      if (playerAbilities.size === 0) {
        const form = new MessageFormData()
          .title("§l§e能力一覧")
          .body("§7利用可能な特殊能力がありません")
          .button1("§a了解")
          .button2("§7閉じる");

        await form.show(player);
        return;
      }

      let listText = "§6=== 所持能力一覧 ===\n\n";
      
      for (const [abilityId, state] of playerAbilities.entries()) {
        const definition = DEFAULT_ABILITIES[abilityId];
        if (definition) {
          const statusIcon = this.getAbilityStatusIcon(state);
          const statusText = this.getAbilityStatusText(state);
          
          listText += `${statusIcon} §f${definition.name}\n`;
          listText += `§7${definition.description}\n`;
          listText += `§7状態: ${statusText}\n`;
          listText += `§7使用回数: §f${state.usesRemaining}/${definition.usesPerGame}\n`;
          
          if (state.status === AbilityStatus.COOLDOWN) {
            const remaining = Math.ceil((state.cooldownEnd - Date.now()) / 1000);
            listText += `§7クールダウン: §f${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}\n`;
          }
          
          listText += "\n";
        }
      }

      const form = new MessageFormData()
        .title("§l§e能力一覧")
        .body(listText)
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);

    } catch (error) {
      console.error(`Failed to show ability list for ${player.name}:`, error);
      player.sendMessage("§c能力一覧の表示に失敗しました");
    }
  }

  /**
   * 能力使用履歴を表示
   */
  public async showAbilityHistory(player: Player): Promise<void> {
    try {
      const stats = this.abilityManager.getAbilityStatistics();
      const playerUsages = stats.usagesByPlayer.get(player.id) || 0;

      if (playerUsages === 0) {
        const form = new MessageFormData()
          .title("§l§b使用履歴")
          .body("§7まだ能力を使用していません")
          .button1("§a了解")
          .button2("§7閉じる");

        await form.show(player);
        return;
      }

      let historyText = `§6=== 能力使用履歴 ===\n\n`;
      historyText += `§7総使用回数: §f${playerUsages}回\n`;
      historyText += `§7システム全体成功率: §f${Math.round(stats.successRate)}%\n\n`;

      // 簡易的な使用履歴表示（実際の履歴データは実装を拡張する必要があります）
      historyText += "§7最近の使用能力:\n";
      
      const playerAbilities = this.abilityManager.getPlayerAbilities(player.id);
      for (const [abilityId, state] of playerAbilities.entries()) {
        const definition = DEFAULT_ABILITIES[abilityId];
        if (definition) {
          const usedCount = definition.usesPerGame - state.usesRemaining;
          if (usedCount > 0) {
            historyText += `§f- ${definition.name}: ${usedCount}回使用\n`;
          }
        }
      }

      const form = new MessageFormData()
        .title("§l§b使用履歴")
        .body(historyText)
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);

    } catch (error) {
      console.error(`Failed to show ability history for ${player.name}:`, error);
      player.sendMessage("§c使用履歴の表示に失敗しました");
    }
  }

  /**
   * 能力説明を表示
   */
  public async showAbilityHelp(player: Player): Promise<void> {
    try {
      const role = this.scoreboardManager.getRoleString(this.scoreboardManager.getPlayerRole(player));
      const job = this.scoreboardManager.getJobString(this.scoreboardManager.getPlayerJob(player));

      let helpText = `§6=== 特殊能力システム ===\n\n`;
      helpText += `§7あなたの役職: §f${role}\n`;
      helpText += `§7あなたの職業: §f${job}\n\n`;

      helpText += "§6能力について:\n";
      helpText += "§7• 役職と職業に応じて特殊能力が付与されます\n";
      helpText += "§7• 各能力には使用回数制限があります\n";
      helpText += "§7• クールダウン時間が設定されています\n";
      helpText += "§7• フェーズによって使用可能な能力が制限されます\n\n";

      helpText += "§6能力の効果:\n";
      helpText += "§a探偵: §7調査・証拠捜索能力\n";
      helpText += "§b医者: §7治療・検死能力\n";
      helpText += "§e警備員: §7護衛・巡回能力\n";
      helpText += "§d記者: §7インタビュー・放送能力\n";
      helpText += "§c犯人: §7殺人・妨害能力\n";
      helpText += "§6共犯者: §7協力・注意逸らし能力\n\n";

      helpText += "§7※ 詳細は能力一覧で確認できます";

      const form = new MessageFormData()
        .title("§l§6能力説明")
        .body(helpText)
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);

    } catch (error) {
      console.error(`Failed to show ability help for ${player.name}:`, error);
      player.sendMessage("§c能力説明の表示に失敗しました");
    }
  }

  /**
   * 能力状態アイコン取得
   */
  private getAbilityStatusIcon(state: AbilityInstanceState): string {
    switch (state.status) {
      case AbilityStatus.AVAILABLE:
        return "§a✓";
      case AbilityStatus.COOLDOWN:
        return "§e⏱";
      case AbilityStatus.DISABLED:
        return "§c✗";
      case AbilityStatus.USED:
        return "§7●";
      default:
        return "§7?";
    }
  }

  /**
   * 能力状態テキスト取得
   */
  private getAbilityStatusText(state: AbilityInstanceState): string {
    switch (state.status) {
      case AbilityStatus.AVAILABLE:
        return "§a使用可能";
      case AbilityStatus.COOLDOWN:
        return "§eクールダウン中";
      case AbilityStatus.DISABLED:
        return "§c使用不可";
      case AbilityStatus.USED:
        return "§7使用済み";
      default:
        return "§7不明";
    }
  }

  /**
   * 距離計算
   */
  private calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}