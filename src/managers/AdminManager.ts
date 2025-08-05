import { Player, world, system } from "@minecraft/server";
import { ScoreboardManager } from "./ScoreboardManager";
import { PhaseManager } from "./PhaseManager";
import { RoleAssignmentManager } from "./RoleAssignmentManager";
import { JobAssignmentManager } from "./JobAssignmentManager";
import { ActionTrackingManager } from "./ActionTrackingManager";
import { VotingManager } from "./VotingManager";
import { ScoringManager } from "./ScoringManager";
import { AbilityManager } from "./AbilityManager";
import { GamePhase } from "../types/PhaseTypes";

/**
 * 管理者権限
 */
export enum AdminPermission {
  GAME_CONTROL = "game_control",           // ゲーム制御
  PLAYER_MANAGEMENT = "player_management", // プレイヤー管理
  DEBUG_ACCESS = "debug_access",           // デバッグアクセス
  SYSTEM_MONITOR = "system_monitor",       // システム監視
  DATA_EXPORT = "data_export"              // データエクスポート
}

/**
 * 管理者アクション
 */
export enum AdminAction {
  // ゲーム制御
  START_GAME = "start_game",
  END_GAME = "end_game",
  RESET_GAME = "reset_game",
  FORCE_PHASE = "force_phase",
  
  // プレイヤー管理
  SET_ROLE = "set_role",
  SET_JOB = "set_job",
  KILL_PLAYER = "kill_player",
  REVIVE_PLAYER = "revive_player",
  TELEPORT_PLAYER = "teleport_player",
  
  // システム制御
  CLEAR_DATA = "clear_data",
  BACKUP_DATA = "backup_data",
  RESTORE_DATA = "restore_data",
  
  // デバッグ
  SHOW_DEBUG = "show_debug",
  TOGGLE_TRACKING = "toggle_tracking",
  INJECT_EVENT = "inject_event"
}

/**
 * 管理者システム結果
 */
export interface AdminResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * システム統計
 */
export interface SystemStatistics {
  gameInfo: {
    currentPhase: GamePhase;
    playerCount: number;
    aliveCount: number;
    gameStartTime: number;
    uptime: number;
  };
  performance: {
    totalActions: number;
    totalVotes: number;
    totalAbilityUsages: number;
    systemLoad: number;
    memoryUsage: string;
  };
  health: {
    systemStatus: "healthy" | "warning" | "error";
    activeManagers: number;
    errorCount: number;
    lastError?: string;
  };
}

/**
 * 管理者権限管理マネージャー
 */
export class AdminManager {
  private static instance: AdminManager;
  private scoreboardManager: ScoreboardManager;
  private phaseManager: PhaseManager;
  private roleAssignmentManager: RoleAssignmentManager;
  private jobAssignmentManager: JobAssignmentManager;
  private actionTrackingManager: ActionTrackingManager;
  private votingManager: VotingManager;
  private scoringManager: ScoringManager;
  private abilityManager: AbilityManager;

  private admins: Set<string> = new Set(); // 管理者のプレイヤーID
  private adminPermissions: Map<string, Set<AdminPermission>> = new Map();
  private systemStartTime: number;
  private errorCount: number = 0;
  private lastError: string = "";

  private constructor() {
    this.scoreboardManager = ScoreboardManager.getInstance();
    this.phaseManager = PhaseManager.getInstance();
    this.roleAssignmentManager = RoleAssignmentManager.getInstance();
    this.jobAssignmentManager = JobAssignmentManager.getInstance();
    this.actionTrackingManager = ActionTrackingManager.getInstance();
    this.votingManager = VotingManager.getInstance();
    this.scoringManager = ScoringManager.getInstance();
    this.abilityManager = AbilityManager.getInstance();
    this.systemStartTime = Date.now();
  }

  public static getInstance(): AdminManager {
    if (!AdminManager.instance) {
      AdminManager.instance = new AdminManager();
    }
    return AdminManager.instance;
  }

  /**
   * 管理者権限を付与
   */
  public addAdmin(playerId: string, permissions?: AdminPermission[]): AdminResult {
    try {
      this.admins.add(playerId);
      
      const playerPermissions = new Set<AdminPermission>();
      if (permissions) {
        permissions.forEach(perm => playerPermissions.add(perm));
      } else {
        // デフォルトで全権限を付与
        Object.values(AdminPermission).forEach(perm => playerPermissions.add(perm));
      }
      
      this.adminPermissions.set(playerId, playerPermissions);

      const player = world.getAllPlayers().find(p => p.id === playerId);
      if (player) {
        player.sendMessage("§a管理者権限が付与されました");
      }

      console.log(`Admin privileges granted to player ${playerId}`);
      return {
        success: true,
        message: "管理者権限を付与しました"
      };

    } catch (error) {
      console.error(`Failed to add admin ${playerId}:`, error);
      return {
        success: false,
        message: "管理者権限の付与に失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * 管理者権限を削除
   */
  public removeAdmin(playerId: string): AdminResult {
    try {
      this.admins.delete(playerId);
      this.adminPermissions.delete(playerId);

      const player = world.getAllPlayers().find(p => p.id === playerId);
      if (player) {
        player.sendMessage("§c管理者権限が削除されました");
      }

      console.log(`Admin privileges removed from player ${playerId}`);
      return {
        success: true,
        message: "管理者権限を削除しました"
      };

    } catch (error) {
      console.error(`Failed to remove admin ${playerId}:`, error);
      return {
        success: false,
        message: "管理者権限の削除に失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * 管理者権限チェック
   */
  public hasPermission(playerId: string, permission: AdminPermission): boolean {
    if (!this.admins.has(playerId)) return false;
    
    const permissions = this.adminPermissions.get(playerId);
    return permissions ? permissions.has(permission) : false;
  }

  /**
   * 管理者アクション実行
   */
  public async executeAdminAction(
    playerId: string, 
    action: AdminAction, 
    parameters?: any
  ): Promise<AdminResult> {
    try {
      // 権限チェック
      const requiredPermission = this.getRequiredPermission(action);
      if (!this.hasPermission(playerId, requiredPermission)) {
        return {
          success: false,
          message: "この操作に必要な権限がありません",
          error: "Insufficient permissions"
        };
      }

      // アクション実行
      switch (action) {
        case AdminAction.START_GAME:
          return this.executeStartGame();
        
        case AdminAction.END_GAME:
          return await this.executeEndGame();
        
        case AdminAction.RESET_GAME:
          return this.executeResetGame();
        
        case AdminAction.FORCE_PHASE:
          return await this.executeForcePhase(parameters?.phase);
        
        case AdminAction.SET_ROLE:
          return this.executeSetRole(parameters?.targetId, parameters?.role);
        
        case AdminAction.SET_JOB:
          return this.executeSetJob(parameters?.targetId, parameters?.job);
        
        case AdminAction.KILL_PLAYER:
          return this.executeKillPlayer(parameters?.targetId);
        
        case AdminAction.REVIVE_PLAYER:
          return this.executeRevivePlayer(parameters?.targetId);
        
        case AdminAction.CLEAR_DATA:
          return this.executeClearData(parameters?.dataType);
        
        case AdminAction.SHOW_DEBUG:
          return this.executeShowDebug();
        
        case AdminAction.TOGGLE_TRACKING:
          return this.executeToggleTracking();
        
        default:
          return {
            success: false,
            message: "未知のアクションです",
            error: "Unknown action"
          };
      }

    } catch (error) {
      this.errorCount++;
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      
      console.error(`Failed to execute admin action ${action}:`, error);
      return {
        success: false,
        message: "管理者アクションの実行に失敗しました",
        error: this.lastError
      };
    }
  }

  /**
   * ゲーム開始
   */
  private executeStartGame(): AdminResult {
    try {
      // ゲーム開始処理を呼び出し
      system.run(() => {
        world.getDimension("overworld").runCommand("scriptevent mdms:admin_start_game");
      });

      return {
        success: true,
        message: "ゲームを開始しました"
      };
    } catch (error) {
      return {
        success: false,
        message: "ゲーム開始に失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * ゲーム終了
   */
  private async executeEndGame(): Promise<AdminResult> {
    try {
      // 強制的にゲーム終了フェーズに移行
      const result = await this.phaseManager.forcePhaseChange(GamePhase.ENDING);
      
      if (result.success) {
        // 最終結果を生成
        const gameResult = this.scoringManager.generateGameResult();
        world.sendMessage("§c管理者によってゲームが終了されました");
        
        return {
          success: true,
          message: "ゲームを終了しました",
          data: gameResult
        };
      } else {
        return {
          success: false,
          message: "ゲーム終了に失敗しました",
          error: result.error
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "ゲーム終了に失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * ゲームリセット
   */
  private executeResetGame(): AdminResult {
    try {
      system.run(() => {
        world.getDimension("overworld").runCommand("scriptevent mdms:reset");
      });

      return {
        success: true,
        message: "ゲームをリセットしました"
      };
    } catch (error) {
      return {
        success: false,
        message: "ゲームリセットに失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * 強制フェーズ変更
   */
  private async executeForcePhase(phase: GamePhase): Promise<AdminResult> {
    try {
      if (!phase) {
        return {
          success: false,
          message: "フェーズが指定されていません",
          error: "No phase specified"
        };
      }

      const result = await this.phaseManager.forcePhaseChange(phase);
      
      if (result.success) {
        world.sendMessage(`§e管理者によってフェーズが ${phase} に変更されました`);
        return {
          success: true,
          message: `フェーズを ${phase} に変更しました`
        };
      } else {
        return {
          success: false,
          message: "フェーズ変更に失敗しました",
          error: result.error
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "フェーズ変更に失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * 役職設定
   */
  private executeSetRole(targetId: string, role: number): AdminResult {
    try {
      if (!targetId || role === undefined) {
        return {
          success: false,
          message: "対象プレイヤーまたは役職が指定されていません",
          error: "Missing parameters"
        };
      }

      const target = world.getAllPlayers().find(p => p.id === targetId);
      if (!target) {
        return {
          success: false,
          message: "対象プレイヤーが見つかりません",
          error: "Target player not found"
        };
      }

      this.scoreboardManager.setPlayerRole(target, role);
      
      const roleString = this.scoreboardManager.getRoleString(role);
      target.sendMessage(`§e管理者によって役職が ${roleString} に設定されました`);

      return {
        success: true,
        message: `${target.name}の役職を ${roleString} に設定しました`
      };
    } catch (error) {
      return {
        success: false,
        message: "役職設定に失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * 職業設定
   */
  private executeSetJob(targetId: string, job: number): AdminResult {
    try {
      if (!targetId || job === undefined) {
        return {
          success: false,
          message: "対象プレイヤーまたは職業が指定されていません",
          error: "Missing parameters"
        };
      }

      const target = world.getAllPlayers().find(p => p.id === targetId);
      if (!target) {
        return {
          success: false,
          message: "対象プレイヤーが見つかりません",
          error: "Target player not found"
        };
      }

      this.scoreboardManager.setPlayerJob(target, job);
      
      const jobString = this.scoreboardManager.getJobString(job);
      target.sendMessage(`§e管理者によって職業が ${jobString} に設定されました`);

      return {
        success: true,
        message: `${target.name}の職業を ${jobString} に設定しました`
      };
    } catch (error) {
      return {
        success: false,
        message: "職業設定に失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * プレイヤー殺害
   */
  private executeKillPlayer(targetId: string): AdminResult {
    try {
      if (!targetId) {
        return {
          success: false,
          message: "対象プレイヤーが指定されていません",
          error: "No target specified"
        };
      }

      const target = world.getAllPlayers().find(p => p.id === targetId);
      if (!target) {
        return {
          success: false,
          message: "対象プレイヤーが見つかりません",
          error: "Target player not found"
        };
      }

      this.scoreboardManager.setPlayerAlive(target, false);
      target.sendMessage("§c管理者によって殺害されました");
      world.sendMessage(`§c${target.name}が管理者によって殺害されました`);

      return {
        success: true,
        message: `${target.name}を殺害しました`
      };
    } catch (error) {
      return {
        success: false,
        message: "プレイヤー殺害に失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * プレイヤー蘇生
   */
  private executeRevivePlayer(targetId: string): AdminResult {
    try {
      if (!targetId) {
        return {
          success: false,
          message: "対象プレイヤーが指定されていません",
          error: "No target specified"
        };
      }

      const target = world.getAllPlayers().find(p => p.id === targetId);
      if (!target) {
        return {
          success: false,
          message: "対象プレイヤーが見つかりません",
          error: "Target player not found"
        };
      }

      this.scoreboardManager.setPlayerAlive(target, true);
      target.sendMessage("§a管理者によって蘇生されました");
      world.sendMessage(`§a${target.name}が管理者によって蘇生されました`);

      return {
        success: true,
        message: `${target.name}を蘇生しました`
      };
    } catch (error) {
      return {
        success: false,
        message: "プレイヤー蘇生に失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * データクリア
   */
  private executeClearData(dataType: string): AdminResult {
    try {
      switch (dataType) {
        case "actions":
          this.actionTrackingManager.clearAllRecords();
          break;
        case "votes":
          this.votingManager.clearAllVotes();
          break;
        case "abilities":
          this.abilityManager.clearAllData();
          break;
        case "all":
          this.actionTrackingManager.clearAllRecords();
          this.votingManager.clearAllVotes();
          this.abilityManager.clearAllData();
          break;
        default:
          return {
            success: false,
            message: "不明なデータタイプです",
            error: "Unknown data type"
          };
      }

      return {
        success: true,
        message: `${dataType}データをクリアしました`
      };
    } catch (error) {
      return {
        success: false,
        message: "データクリアに失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * デバッグ表示
   */
  private executeShowDebug(): AdminResult {
    try {
      // 全システムのデバッグ情報を出力
      this.scoreboardManager.debugGameState();
      this.scoreboardManager.debugPlayerStates();
      this.roleAssignmentManager.debugRoleAssignments();
      this.jobAssignmentManager.debugJobAssignments();
      this.actionTrackingManager.debugActionRecords();
      this.votingManager.debugVotingStatus();
      this.scoringManager.debugScoring();
      this.abilityManager.debugAbilitySystem();

      return {
        success: true,
        message: "デバッグ情報をコンソールに出力しました"
      };
    } catch (error) {
      return {
        success: false,
        message: "デバッグ表示に失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * 追跡切り替え
   */
  private executeToggleTracking(): AdminResult {
    try {
      // 現在の追跡状態を取得（実装を拡張する必要があります）
      // 簡易的な実装
      this.actionTrackingManager.stopTracking();
      this.actionTrackingManager.startTracking();

      return {
        success: true,
        message: "行動追跡を再開しました"
      };
    } catch (error) {
      return {
        success: false,
        message: "追跡切り替えに失敗しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * システム統計取得
   */
  public getSystemStatistics(): SystemStatistics {
    try {
      const playerCount = world.getAllPlayers().length;
      const aliveCount = world.getAllPlayers().filter(p => this.scoreboardManager.isPlayerAlive(p)).length;
      const currentPhase = this.phaseManager.getCurrentPhase();
      
      const actionStats = this.actionTrackingManager.getActionStatistics();
      const votingStats = this.votingManager.getVotingStatistics();
      const abilityStats = this.abilityManager.getAbilityStatistics();

      const uptime = Date.now() - this.systemStartTime;

      return {
        gameInfo: {
          currentPhase,
          playerCount,
          aliveCount,
          gameStartTime: this.systemStartTime,
          uptime
        },
        performance: {
          totalActions: actionStats.totalActions,
          totalVotes: votingStats.totalVotes,
          totalAbilityUsages: abilityStats.totalUsages,
          systemLoad: this.calculateSystemLoad(),
          memoryUsage: this.getMemoryUsage()
        },
        health: {
          systemStatus: this.getSystemStatus(),
          activeManagers: 8, // 固定値
          errorCount: this.errorCount,
          lastError: this.lastError || undefined
        }
      };
    } catch (error) {
      this.errorCount++;
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      
      // エラー時のデフォルト統計
      return {
        gameInfo: {
          currentPhase: GamePhase.PREPARATION,
          playerCount: 0,
          aliveCount: 0,
          gameStartTime: this.systemStartTime,
          uptime: Date.now() - this.systemStartTime
        },
        performance: {
          totalActions: 0,
          totalVotes: 0,
          totalAbilityUsages: 0,
          systemLoad: 0,
          memoryUsage: "N/A"
        },
        health: {
          systemStatus: "error",
          activeManagers: 0,
          errorCount: this.errorCount,
          lastError: this.lastError
        }
      };
    }
  }

  /**
   * 必要権限取得
   */
  private getRequiredPermission(action: AdminAction): AdminPermission {
    switch (action) {
      case AdminAction.START_GAME:
      case AdminAction.END_GAME:
      case AdminAction.RESET_GAME:
      case AdminAction.FORCE_PHASE:
        return AdminPermission.GAME_CONTROL;
      
      case AdminAction.SET_ROLE:
      case AdminAction.SET_JOB:
      case AdminAction.KILL_PLAYER:
      case AdminAction.REVIVE_PLAYER:
      case AdminAction.TELEPORT_PLAYER:
        return AdminPermission.PLAYER_MANAGEMENT;
      
      case AdminAction.SHOW_DEBUG:
      case AdminAction.TOGGLE_TRACKING:
      case AdminAction.INJECT_EVENT:
        return AdminPermission.DEBUG_ACCESS;
      
      case AdminAction.CLEAR_DATA:
      case AdminAction.BACKUP_DATA:
      case AdminAction.RESTORE_DATA:
        return AdminPermission.DATA_EXPORT;
      
      default:
        return AdminPermission.SYSTEM_MONITOR;
    }
  }

  /**
   * システム負荷計算
   */
  private calculateSystemLoad(): number {
    // 簡易的な負荷計算
    const actionCount = this.actionTrackingManager.getActionStatistics().totalActions;
    const voteCount = this.votingManager.getVotingStatistics().totalVotes;
    const abilityCount = this.abilityManager.getAbilityStatistics().totalUsages;
    
    const totalOperations = actionCount + voteCount + abilityCount;
    const uptimeHours = (Date.now() - this.systemStartTime) / (1000 * 60 * 60);
    
    return uptimeHours > 0 ? Math.round(totalOperations / uptimeHours) : 0;
  }

  /**
   * メモリ使用量取得
   */
  private getMemoryUsage(): string {
    // Minecraft ScriptAPIではメモリ情報を直接取得できないため、推定値
    const actionCount = this.actionTrackingManager.getActionStatistics().totalActions;
    const estimatedMB = Math.round(actionCount * 0.001); // 1アクション約1KB想定
    return `${estimatedMB}MB (推定)`;
  }

  /**
   * システム状態取得
   */
  private getSystemStatus(): "healthy" | "warning" | "error" {
    if (this.errorCount > 10) return "error";
    if (this.errorCount > 5) return "warning";
    return "healthy";
  }

  /**
   * 管理者一覧取得
   */
  public getAdminList(): string[] {
    return Array.from(this.admins);
  }

  /**
   * デバッグ用：管理者システム状況出力
   */
  public debugAdminSystem(): void {
    console.log("=== Admin System Debug ===");
    console.log(`Total admins: ${this.admins.size}`);
    console.log(`System uptime: ${Math.round((Date.now() - this.systemStartTime) / 1000 / 60)} minutes`);
    console.log(`Error count: ${this.errorCount}`);
    console.log(`Last error: ${this.lastError || "None"}`);
    
    const stats = this.getSystemStatistics();
    console.log(`System status: ${stats.health.systemStatus}`);
    console.log(`System load: ${stats.performance.systemLoad} ops/hour`);
    
    console.log("=== End Admin System Debug ===");
  }
}