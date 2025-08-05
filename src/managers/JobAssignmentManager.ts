import { Player, world } from "@minecraft/server";
import { ScoreboardManager } from "./ScoreboardManager";
import { JobType, SocialStatus, type JobAssignmentResult } from "../types/JobTypes";
import { JOBS, generateBalancedJobDistribution, getJobSocialStatus } from "../constants/JobConfigs";

/**
 * プレイヤージョブ割り当てマネージャー
 * 中世ファンタジー職業の割り当てを管理
 */
export class JobAssignmentManager {
  private static instance: JobAssignmentManager;
  private scoreboardManager: ScoreboardManager;

  private constructor() {
    this.scoreboardManager = ScoreboardManager.getInstance();
  }

  public static getInstance(): JobAssignmentManager {
    if (!JobAssignmentManager.instance) {
      JobAssignmentManager.instance = new JobAssignmentManager();
    }
    return JobAssignmentManager.instance;
  }

  /**
   * 全プレイヤーにジョブを割り当て
   */
  public assignJobsToAllPlayers(): JobAssignmentResult {
    try {
      const players = world.getAllPlayers();
      const playerCount = players.length;

      // プレイヤー数チェック
      if (playerCount < 4) {
        return {
          success: false,
          assignments: new Map(),
          statusDistribution: new Map(),
          error: "最低4人のプレイヤーが必要です"
        };
      }

      if (playerCount > 20) {
        return {
          success: false,
          assignments: new Map(),
          statusDistribution: new Map(),
          error: "プレイヤー数が多すぎます（最大20人）"
        };
      }

      // バランスの取れたジョブ配布を生成
      const jobDistribution = generateBalancedJobDistribution(playerCount);
      
      if (jobDistribution.length !== playerCount) {
        return {
          success: false,
          assignments: new Map(),
          statusDistribution: new Map(),
          error: "ジョブ配布の生成に失敗しました"
        };
      }

      // ジョブをシャッフル
      this.shuffleArray(jobDistribution);

      // プレイヤーにジョブを割り当て
      const assignments = new Map<string, JobType>();
      const statusDistribution = new Map<SocialStatus, number>();
      
      // 社会階級カウンターを初期化
      for (const status of Object.values(SocialStatus)) {
        statusDistribution.set(status, 0);
      }

      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const job = jobDistribution[i];
        
        // Scoreboardに設定
        this.scoreboardManager.setPlayerJob(player, this.convertJobToId(job));
        assignments.set(player.id, job);
        
        // 社会階級カウンターを更新
        const socialStatus = getJobSocialStatus(job);
        const currentCount = statusDistribution.get(socialStatus) || 0;
        statusDistribution.set(socialStatus, currentCount + 1);
        
        console.log(`Assigned job ${job} (${socialStatus}) to player ${player.name} (${player.id})`);
      }

      // 成功結果を返す
      return {
        success: true,
        assignments,
        statusDistribution
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      console.error("Job assignment failed:", error);
      
      return {
        success: false,
        assignments: new Map(),
        statusDistribution: new Map(),
        error: errorMessage
      };
    }
  }

  /**
   * 特定プレイヤーのジョブを取得
   */
  public getPlayerJob(player: Player): JobType | null {
    try {
      const jobId = this.scoreboardManager.getPlayerJob(player);
      return this.convertIdToJob(jobId);
    } catch (error) {
      console.error(`Failed to get job for player ${player.name}:`, error);
      return null;
    }
  }

  /**
   * プレイヤーの社会階級を取得
   */
  public getPlayerSocialStatus(player: Player): SocialStatus | null {
    try {
      const job = this.getPlayerJob(player);
      if (!job) return null;
      
      return getJobSocialStatus(job);
    } catch (error) {
      console.error(`Failed to get social status for player ${player.name}:`, error);
      return null;
    }
  }

  /**
   * ジョブタイプに該当する全プレイヤーを取得
   */
  public getPlayersByJob(jobType: JobType): Player[] {
    try {
      const players = world.getAllPlayers();
      return players.filter(player => {
        const job = this.getPlayerJob(player);
        return job === jobType;
      });
    } catch (error) {
      console.error(`Failed to get players by job ${jobType}:`, error);
      return [];
    }
  }

  /**
   * 社会階級に該当する全プレイヤーを取得
   */
  public getPlayersBySocialStatus(status: SocialStatus): Player[] {
    try {
      const players = world.getAllPlayers();
      return players.filter(player => {
        const playerStatus = this.getPlayerSocialStatus(player);
        return playerStatus === status;
      });
    } catch (error) {
      console.error(`Failed to get players by social status ${status}:`, error);
      return [];
    }
  }

  /**
   * 現在の社会階級分布を取得
   */
  public getCurrentStatusDistribution(): Map<SocialStatus, number> {
    const distribution = new Map<SocialStatus, number>();
    
    // 初期化
    for (const status of Object.values(SocialStatus)) {
      distribution.set(status, 0);
    }
    
    try {
      const players = world.getAllPlayers();
      for (const player of players) {
        const status = this.getPlayerSocialStatus(player);
        if (status) {
          const currentCount = distribution.get(status) || 0;
          distribution.set(status, currentCount + 1);
        }
      }
    } catch (error) {
      console.error("Failed to get current status distribution:", error);
    }
    
    return distribution;
  }

  /**
   * プレイヤーにジョブ情報を通知
   */
  public notifyPlayerJob(player: Player): boolean {
    try {
      const job = this.getPlayerJob(player);
      if (!job) {
        player.sendMessage("§cジョブが設定されていません");
        return false;
      }

      const jobConfig = JOBS[job];
      const jobString = this.scoreboardManager.getJobString(this.convertJobToId(job));
      
      player.sendMessage("§a=== あなたのジョブ ===");
      player.sendMessage(`§e${jobString}`);
      player.sendMessage(`§7${jobConfig.description}`);
      player.sendMessage(`§7社会階級: ${this.getSocialStatusDisplayName(jobConfig.socialStatus)}`);
      player.sendMessage(`§7開始エリア: ${jobConfig.startingArea}`);
      
      // 日常タスクを表示
      if (jobConfig.dailyTasks.length > 0) {
        player.sendMessage("§6日常タスク:");
        for (const task of jobConfig.dailyTasks) {
          player.sendMessage(`§f- ${task}`);
        }
      }
      
      // アクセス可能エリアを表示
      if (jobConfig.accessibleAreas.length > 0) {
        player.sendMessage("§bアクセス可能エリア:");
        player.sendMessage(`§f${jobConfig.accessibleAreas.join(", ")}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to notify job to player ${player.name}:`, error);
      player.sendMessage("§cジョブ通知エラーが発生しました");
      return false;
    }
  }

  /**
   * 全プレイヤーにジョブ情報を通知
   */
  public notifyAllPlayersJobs(): void {
    try {
      const players = world.getAllPlayers();
      for (const player of players) {
        this.notifyPlayerJob(player);
      }
    } catch (error) {
      console.error("Failed to notify all players jobs:", error);
    }
  }

  /**
   * プレイヤーのジョブ能力を取得
   */
  public getPlayerJobAbility(player: Player): string | null {
    try {
      const job = this.getPlayerJob(player);
      if (!job) return null;
      
      return JOBS[job].abilityId;
    } catch (error) {
      console.error(`Failed to get job ability for player ${player.name}:`, error);
      return null;
    }
  }

  /**
   * プレイヤーのジョブ目的を取得
   */
  public getPlayerJobObjective(player: Player): string | null {
    try {
      const job = this.getPlayerJob(player);
      if (!job) return null;
      
      return JOBS[job].objectiveId;
    } catch (error) {
      console.error(`Failed to get job objective for player ${player.name}:`, error);
      return null;
    }
  }

  /**
   * 社会階級の表示名を取得
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

  /**
   * ジョブタイプをIDに変換
   */
  private convertJobToId(job: JobType): number {
    switch (job) {
      case JobType.KING:
        return 0;
      case JobType.CAPTAIN:
        return 1;
      case JobType.WIZARD:
        return 2;
      case JobType.MERCHANT:
        return 3;
      case JobType.GUILD_RECEPTIONIST:
        return 4;
      case JobType.BLACKSMITH:
        return 5;
      case JobType.TAVERN_OWNER:
        return 6;
      case JobType.GARDENER:
        return 7;
      case JobType.MAID:
        return 8;
      case JobType.ALCHEMIST:
        return 9;
      default:
        return 0; // デフォルトは王
    }
  }

  /**
   * IDをジョブタイプに変換
   */
  private convertIdToJob(id: number): JobType | null {
    switch (id) {
      case 0:
        return JobType.KING;
      case 1:
        return JobType.CAPTAIN;
      case 2:
        return JobType.WIZARD;
      case 3:
        return JobType.MERCHANT;
      case 4:
        return JobType.GUILD_RECEPTIONIST;
      case 5:
        return JobType.BLACKSMITH;
      case 6:
        return JobType.TAVERN_OWNER;
      case 7:
        return JobType.GARDENER;
      case 8:
        return JobType.MAID;
      case 9:
        return JobType.ALCHEMIST;
      default:
        return null;
    }
  }

  /**
   * 配列をシャッフル（Fisher-Yates shuffle）
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * デバッグ用：ジョブ割り当て状況を出力
   */
  public debugJobAssignments(): void {
    try {
      console.log("=== Job Assignment Debug ===");
      
      const statusDistribution = this.getCurrentStatusDistribution();
      console.log("Social status distribution:");
      for (const [status, count] of statusDistribution.entries()) {
        console.log(`  ${status}: ${count}`);
      }
      
      const players = world.getAllPlayers();
      for (const player of players) {
        const job = this.getPlayerJob(player);
        const status = this.getPlayerSocialStatus(player);
        const jobString = job ? this.scoreboardManager.getJobString(this.convertJobToId(job)) : "未設定";
        console.log(`Player ${player.name} (${player.id}): ${jobString} (${status})`);
      }
      
      console.log("=== End Job Assignment Debug ===");
    } catch (error) {
      console.error("Failed to debug job assignments:", error);
    }
  }
}