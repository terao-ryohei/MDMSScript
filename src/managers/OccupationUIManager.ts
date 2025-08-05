import { Player, world } from "@minecraft/server";
import { ModalFormData, ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { JobAssignmentManager } from "./JobAssignmentManager";
import { ScoreboardManager } from "./ScoreboardManager";
import { JobType, SocialStatus } from "../types/JobTypes";
import { JOBS } from "../constants/JobConfigs";

/**
 * 職業専用UI管理マネージャー
 */
export class OccupationUIManager {
  private static instance: OccupationUIManager;
  private jobAssignmentManager: JobAssignmentManager;
  private scoreboardManager: ScoreboardManager;

  private constructor() {
    this.jobAssignmentManager = JobAssignmentManager.getInstance();
    this.scoreboardManager = ScoreboardManager.getInstance();
  }

  public static getInstance(): OccupationUIManager {
    if (!OccupationUIManager.instance) {
      OccupationUIManager.instance = new OccupationUIManager();
    }
    return OccupationUIManager.instance;
  }

  /**
   * プレイヤーの職業詳細情報を表示
   */
  public async showJobDetails(player: Player): Promise<void> {
    try {
      const job = this.jobAssignmentManager.getPlayerJob(player);
      
      if (!job) {
        player.sendMessage("§c職業が設定されていません");
        return;
      }

      const jobConfig = JOBS[job];
      
      const form = new MessageFormData()
        .title(`§l§6あなたの職業: ${jobConfig.name}`)
        .body(
          `§e${jobConfig.name}\n\n` +
          `§6説明: §f${jobConfig.description}\n\n` +
          `§6社会階級: §f${this.getSocialStatusDisplayName(jobConfig.socialStatus)}\n\n` +
          `§6開始エリア: §f${jobConfig.startingArea}\n\n` +
          `§6日常タスク:\n` +
          jobConfig.dailyTasks.map(task => `§f- ${task}`).join('\n') + '\n\n' +
          `§6アクセス可能エリア:\n§f${jobConfig.accessibleAreas.join(", ")}\n\n` +
          `§6能力ID: §f${jobConfig.abilityId}\n` +
          `§6目的ID: §f${jobConfig.objectiveId}`
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);
    } catch (error) {
      console.error(`Failed to show job details for ${player.name}:`, error);
      player.sendMessage("§c職業詳細の表示に失敗しました");
    }
  }

  /**
   * 職業統計情報を表示
   */
  public async showJobStatistics(player: Player): Promise<void> {
    try {
      const distribution = this.jobAssignmentManager.getCurrentStatusDistribution();
      const nobleCount = distribution.get(SocialStatus.NOBLE) || 0;
      const citizenCount = distribution.get(SocialStatus.CITIZEN) || 0;
      const servantCount = distribution.get(SocialStatus.SERVANT) || 0;

      const form = new MessageFormData()
        .title("§l§e職業統計")
        .body(
          `§6現在の社会階級分布:\n\n` +
          `§e王族・貴族: §f${nobleCount}人\n` +
          `§b市民・商人: §f${citizenCount}人\n` +
          `§7使用人・労働者: §f${servantCount}人\n\n` +
          `§7※詳細な職業情報は管理者のみ表示されます`
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);
    } catch (error) {
      console.error(`Failed to show job statistics for ${player.name}:`, error);
      player.sendMessage("§c職業統計の表示に失敗しました");
    }
  }

  /**
   * 職業能力説明を表示
   */
  public async showJobAbilities(player: Player): Promise<void> {
    try {
      const job = this.jobAssignmentManager.getPlayerJob(player);
      
      if (!job) {
        player.sendMessage("§c職業が設定されていません");
        return;
      }

      const jobConfig = JOBS[job];
      let abilityDescription = this.getJobAbilityDescription(job);

      const form = new MessageFormData()
        .title("§l§a職業能力")
        .body(
          `§6${jobConfig.name}の能力:\n\n` +
          abilityDescription + '\n\n' +
          `§6日常タスク:\n` +
          jobConfig.dailyTasks.map(task => `§f- ${task}`).join('\n')
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);
    } catch (error) {
      console.error(`Failed to show job abilities for ${player.name}:`, error);
      player.sendMessage("§c職業能力の表示に失敗しました");
    }
  }

  /**
   * エリアアクセス情報を表示
   */
  public async showAreaAccess(player: Player): Promise<void> {
    try {
      const job = this.jobAssignmentManager.getPlayerJob(player);
      
      if (!job) {
        player.sendMessage("§c職業が設定されていません");
        return;
      }

      const jobConfig = JOBS[job];
      
      const form = new MessageFormData()
        .title("§l§bエリアアクセス情報")
        .body(
          `§6あなたの職業: §f${jobConfig.name}\n\n` +
          `§6開始エリア: §f${jobConfig.startingArea}\n\n` +
          `§6アクセス可能エリア:\n` +
          jobConfig.accessibleAreas.map(area => `§a✓ §f${area}`).join('\n') + '\n\n' +
          `§7※職業によってアクセスできるエリアが制限されています`
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);
    } catch (error) {
      console.error(`Failed to show area access for ${player.name}:`, error);
      player.sendMessage("§cエリアアクセス情報の表示に失敗しました");
    }
  }

  /**
   * 職業ヘルプメニューを表示
   */
  public async showJobHelpMenu(player: Player): Promise<void> {
    try {
      const form = new ActionFormData()
        .title("§l§6職業ヘルプ")
        .body("§7職業に関する情報を表示します")
        .button("§eあなたの職業詳細", "textures/ui/hammer")
        .button("§a職業能力説明", "textures/ui/strength_effect")
        .button("§bエリアアクセス", "textures/ui/world_glyph")
        .button("§d職業統計", "textures/ui/friend_glyph")
        .button("§7閉じる", "textures/ui/cancel");

      const response = await form.show(player);
      
      if (response.canceled) return;

      switch (response.selection) {
        case 0: // 職業詳細
          await this.showJobDetails(player);
          break;
        case 1: // 職業能力
          await this.showJobAbilities(player);
          break;
        case 2: // エリアアクセス
          await this.showAreaAccess(player);
          break;
        case 3: // 職業統計
          await this.showJobStatistics(player);
          break;
      }
    } catch (error) {
      console.error(`Failed to show job help menu for ${player.name}:`, error);
      player.sendMessage("§c職業ヘルプメニューの表示に失敗しました");
    }
  }

  /**
   * 管理者向け職業管理メニュー
   */
  public async showAdminJobMenu(player: Player): Promise<void> {
    try {
      const form = new ActionFormData()
        .title("§l§c職業管理")
        .body("§7管理者向けの職業管理機能です")
        .button("§a職業再割り当て", "textures/ui/refresh")
        .button("§e職業構成確認", "textures/ui/book_edit_default")
        .button("§b社会階級分布", "textures/ui/friend_glyph")
        .button("§6デバッグ情報", "textures/ui/debug_glyph")
        .button("§7閉じる", "textures/ui/cancel");

      const response = await form.show(player);
      
      if (response.canceled) return;

      switch (response.selection) {
        case 0: // 職業再割り当て
          await this.confirmJobReassignment(player);
          break;
        case 1: // 職業構成確認
          await this.showDetailedJobComposition(player);
          break;
        case 2: // 社会階級分布
          await this.showDetailedStatusDistribution(player);
          break;
        case 3: // デバッグ情報
          this.jobAssignmentManager.debugJobAssignments();
          player.sendMessage("§a職業デバッグ情報をコンソールに出力しました");
          break;
      }
    } catch (error) {
      console.error(`Failed to show admin job menu for ${player.name}:`, error);
      player.sendMessage("§c職業管理メニューの表示に失敗しました");
    }
  }

  /**
   * 職業再割り当て確認
   */
  private async confirmJobReassignment(player: Player): Promise<void> {
    try {
      const form = new MessageFormData()
        .title("§l§c職業再割り当て確認")
        .body(
          "§c職業を再割り当てしますか？\n\n" +
          "§7この操作により全プレイヤーの職業が\n" +
          "§7ランダムに再設定されます。"
        )
        .button1("§c実行")
        .button2("§aキャンセル");

      const response = await form.show(player);
      
      if (response.canceled || response.selection === 1) {
        player.sendMessage("§a職業再割り当てをキャンセルしました");
        return;
      }

      // 職業再割り当て実行
      const result = this.jobAssignmentManager.assignJobsToAllPlayers();
      if (result.success) {
        player.sendMessage("§a職業の再割り当てが完了しました");
        this.jobAssignmentManager.notifyAllPlayersJobs();
      } else {
        player.sendMessage(`§c職業再割り当てエラー: ${result.error}`);
      }
      
    } catch (error) {
      console.error(`Failed to confirm job reassignment for ${player.name}:`, error);
      player.sendMessage("§c職業再割り当て確認の表示に失敗しました");
    }
  }

  /**
   * 詳細な職業構成を表示（管理者向け）
   */
  private async showDetailedJobComposition(player: Player): Promise<void> {
    try {
      const players = world.getAllPlayers();
      const jobInfo = players.map(p => {
        const job = this.jobAssignmentManager.getPlayerJob(p);
        const status = this.jobAssignmentManager.getPlayerSocialStatus(p);
        const jobName = job ? JOBS[job].name : "未設定";
        const statusName = status ? this.getSocialStatusDisplayName(status) : "不明";
        return `§f${p.name}: §e${jobName} §7(${statusName})`;
      });

      const form = new MessageFormData()
        .title("§l§c詳細職業構成")
        .body(jobInfo.join('\n'))
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);
    } catch (error) {
      console.error(`Failed to show detailed job composition for ${player.name}:`, error);
      player.sendMessage("§c詳細職業構成の表示に失敗しました");
    }
  }

  /**
   * 詳細な社会階級分布を表示
   */
  private async showDetailedStatusDistribution(player: Player): Promise<void> {
    try {
      const nobleJobs = this.jobAssignmentManager.getPlayersBySocialStatus(SocialStatus.NOBLE);
      const citizenJobs = this.jobAssignmentManager.getPlayersBySocialStatus(SocialStatus.CITIZEN);
      const servantJobs = this.jobAssignmentManager.getPlayersBySocialStatus(SocialStatus.SERVANT);

      const nobleNames = nobleJobs.map(p => p.name).join(", ") || "なし";
      const citizenNames = citizenJobs.map(p => p.name).join(", ") || "なし";
      const servantNames = servantJobs.map(p => p.name).join(", ") || "なし";

      const form = new MessageFormData()
        .title("§l§c詳細社会階級分布")
        .body(
          `§e王族・貴族 (${nobleJobs.length}人):\n§f${nobleNames}\n\n` +
          `§b市民・商人 (${citizenJobs.length}人):\n§f${citizenNames}\n\n` +
          `§7使用人・労働者 (${servantJobs.length}人):\n§f${servantNames}`
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);
    } catch (error) {
      console.error(`Failed to show detailed status distribution for ${player.name}:`, error);
      player.sendMessage("§c詳細社会階級分布の表示に失敗しました");
    }
  }

  /**
   * 職業能力の説明を取得
   */
  private getJobAbilityDescription(job: JobType): string {
    switch (job) {
      case JobType.KING:
        return "§e【王の召喚】§f - 任意のプレイヤーを王座の間に召喚できます";
      case JobType.CAPTAIN:
        return "§a【護衛】§f - 他のプレイヤーを攻撃から守ることができます";
      case JobType.WIZARD:
        return "§d【占い】§f - プレイヤーの過去の行動を占うことができます";
      case JobType.MERCHANT:
        return "§6【交渉】§f - 他のプレイヤーと情報交換を有利に進められます";
      case JobType.GUILD_RECEPTIONIST:
        return "§b【情報網】§f - プレイヤーの行動履歴を一部確認できます";
      case JobType.BLACKSMITH:
        return "§7【鑑定】§f - アイテムや証拠の真偽を見抜くことができます";
      case JobType.TAVERN_OWNER:
        return "§c【盗み聞き】§f - 他のプレイヤーの会話を盗み聞きできます";
      case JobType.GARDENER:
        return "§2【隠蔽】§f - 庭園内で身を隠すことができます";
      case JobType.MAID:
        return "§f【監視】§f - 清掃中に他のプレイヤーの行動を監視できます";
      case JobType.ALCHEMIST:
        return "§5【瞬間移動】§f - 錬金術により短距離瞬間移動ができます";
      default:
        return "§7不明な能力";
    }
  }

  /**
   * 社会階級表示名を取得
   */
  private getSocialStatusDisplayName(status: SocialStatus): string {
    switch (status) {
      case SocialStatus.NOBLE:
        return "王族・貴族";
      case SocialStatus.CITIZEN:
        return "市民・商人";
      case SocialStatus.SERVANT:
        return "使用人・労働者";
      default:
        return "不明";
    }
  }
}