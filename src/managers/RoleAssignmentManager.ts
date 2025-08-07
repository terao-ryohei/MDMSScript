import { Player, world } from "@minecraft/server";
import { ScoreboardManager } from "./ScoreboardManager";
import { RoleType, type RoleAssignmentResult, type RoleComposition } from "../types/RoleTypes";
import { getRoleComposition, validateRoleComposition } from "../constants/RoleConfigs";

/**
 * プレイヤーロール割り当てマネージャー
 * マダミス役職（犯人・共犯者・一般人）の割り当てを管理
 */
export class RoleAssignmentManager {
  private static instance: RoleAssignmentManager;
  private scoreboardManager: ScoreboardManager;

  private constructor() {
    this.scoreboardManager = ScoreboardManager.getInstance();
  }

  public static getInstance(): RoleAssignmentManager {
    if (!RoleAssignmentManager.instance) {
      RoleAssignmentManager.instance = new RoleAssignmentManager();
    }
    return RoleAssignmentManager.instance;
  }

  /**
   * 全プレイヤーにロールを割り当て
   */
  public assignRolesToAllPlayers(): RoleAssignmentResult {
    try {
      const players = world.getAllPlayers();
      const playerCount = players.length;

      // プレイヤー数チェック（テスト用に1人から可能に変更）
      if (playerCount < 1) {
        return {
          success: false,
          assignments: new Map(),
          composition: { murderers: 0, accomplices: 0, citizens: 0 },
          error: "最低1人のプレイヤーが必要です"
        };
      }

      if (playerCount > 20) {
        return {
          success: false,
          assignments: new Map(),
          composition: { murderers: 0, accomplices: 0, citizens: 0 },
          error: "プレイヤー数が多すぎます（最大20人）"
        };
      }

      // ロール構成を取得
      const composition = getRoleComposition(playerCount);
      
      // 構成の妥当性チェック
      if (!validateRoleComposition(composition, playerCount)) {
        return {
          success: false,
          assignments: new Map(),
          composition,
          error: "ロール構成が無効です"
        };
      }

      // ロール配列を生成
      const roles: RoleType[] = [];
      
      // 犯人を追加
      for (let i = 0; i < composition.murderers; i++) {
        roles.push(RoleType.MURDERER);
      }
      
      // 共犯者を追加
      for (let i = 0; i < composition.accomplices; i++) {
        roles.push(RoleType.ACCOMPLICE);
      }
      
      // 一般人を追加
      for (let i = 0; i < composition.citizens; i++) {
        roles.push(RoleType.CITIZEN);
      }

      // ロールをシャッフル
      this.shuffleArray(roles);

      // プレイヤーにロールを割り当て
      const assignments = new Map<string, RoleType>();
      
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const role = roles[i];
        
        // Scoreboardに設定
        this.scoreboardManager.setPlayerRole(player, this.convertRoleToId(role));
        assignments.set(player.id, role);
        
        console.log(`Assigned role ${role} to player ${player.name} (${player.id})`);
      }

      // 成功結果を返す
      return {
        success: true,
        assignments,
        composition
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "不明なエラー";
      console.error("Role assignment failed:", error);
      
      return {
        success: false,
        assignments: new Map(),
        composition: { murderers: 0, accomplices: 0, citizens: 0 },
        error: errorMessage
      };
    }
  }

  /**
   * 特定プレイヤーのロールを取得
   */
  public getPlayerRole(player: Player): RoleType | null {
    try {
      const roleId = this.scoreboardManager.getPlayerRole(player);
      return this.convertIdToRole(roleId);
    } catch (error) {
      console.error(`Failed to get role for player ${player.name}:`, error);
      return null;
    }
  }

  /**
   * ロールタイプに該当する全プレイヤーを取得
   */
  public getPlayersByRole(roleType: RoleType): Player[] {
    try {
      const players = world.getAllPlayers();
      return players.filter(player => {
        const role = this.getPlayerRole(player);
        return role === roleType;
      });
    } catch (error) {
      console.error(`Failed to get players by role ${roleType}:`, error);
      return [];
    }
  }

  /**
   * 犯人プレイヤーリストを取得
   */
  public getMurderers(): Player[] {
    return this.getPlayersByRole(RoleType.MURDERER);
  }

  /**
   * 共犯者プレイヤーリストを取得
   */
  public getAccomplices(): Player[] {
    return this.getPlayersByRole(RoleType.ACCOMPLICE);
  }

  /**
   * 一般人プレイヤーリストを取得
   */
  public getCitizens(): Player[] {
    return this.getPlayersByRole(RoleType.CITIZEN);
  }

  /**
   * 現在のロール構成を取得
   */
  public getCurrentRoleComposition(): RoleComposition {
    const murderers = this.getMurderers().length;
    const accomplices = this.getAccomplices().length;
    const citizens = this.getCitizens().length;
    
    return { murderers, accomplices, citizens };
  }

  /**
   * プレイヤーにロール情報を通知
   */
  public notifyPlayerRole(player: Player): boolean {
    try {
      const role = this.getPlayerRole(player);
      if (!role) {
        player.sendMessage("§cロールが設定されていません");
        return false;
      }

      const roleString = this.scoreboardManager.getRoleString(this.convertRoleToId(role));
      
      player.sendMessage("§a=== あなたのロール ===");
      player.sendMessage(`§e${roleString}`);
      
      // ロール別の追加情報
      switch (role) {
        case RoleType.MURDERER:
          player.sendMessage("§c目標: 投票で最多票を避けて逃げ切る");
          player.sendMessage("§7生活フェーズ中に事件を起こしてください");
          break;
          
        case RoleType.ACCOMPLICE:
          player.sendMessage("§6目標: 犯人の勝利をサポートする");
          player.sendMessage("§7犯人の情報を一部知ることができます");
          break;
          
        case RoleType.CITIZEN:
          player.sendMessage("§b目標: 真犯人を特定する");
          player.sendMessage("§7証拠を集めて推理してください");
          break;
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to notify role to player ${player.name}:`, error);
      player.sendMessage("§cロール通知エラーが発生しました");
      return false;
    }
  }

  /**
   * 全プレイヤーにロール情報を通知
   */
  public notifyAllPlayersRoles(): void {
    try {
      const players = world.getAllPlayers();
      for (const player of players) {
        this.notifyPlayerRole(player);
      }
    } catch (error) {
      console.error("Failed to notify all players roles:", error);
    }
  }

  /**
   * ロールタイプをIDに変換
   */
  private convertRoleToId(role: RoleType): number {
    switch (role) {
      case RoleType.CITIZEN:
        return 0;
      case RoleType.MURDERER:
        return 1;
      case RoleType.ACCOMPLICE:
        return 2;
      default:
        return 0; // デフォルトは市民
    }
  }

  /**
   * IDをロールタイプに変換
   */
  private convertIdToRole(id: number): RoleType | null {
    switch (id) {
      case 0:
        return RoleType.CITIZEN;
      case 1:
        return RoleType.MURDERER;
      case 2:
        return RoleType.ACCOMPLICE;
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
   * デバッグ用：ロール割り当て状況を出力
   */
  public debugRoleAssignments(): void {
    try {
      console.log("=== Role Assignment Debug ===");
      
      const composition = this.getCurrentRoleComposition();
      console.log(`Total composition: ${JSON.stringify(composition)}`);
      
      const players = world.getAllPlayers();
      for (const player of players) {
        const role = this.getPlayerRole(player);
        const roleString = role ? this.scoreboardManager.getRoleString(this.convertRoleToId(role)) : "未設定";
        console.log(`Player ${player.name} (${player.id}): ${roleString}`);
      }
      
      console.log("=== End Role Assignment Debug ===");
    } catch (error) {
      console.error("Failed to debug role assignments:", error);
    }
  }
}