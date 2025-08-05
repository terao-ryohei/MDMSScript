import { Player, world } from "@minecraft/server";
import { ModalFormData, ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { ScoreboardManager } from "./ScoreboardManager";
import { PhaseManager } from "./PhaseManager";
import { RoleAssignmentManager } from "./RoleAssignmentManager";
import { JobAssignmentManager } from "./JobAssignmentManager";
import { IUIManager, type UIResult } from "./interfaces/IUIManager";
import { GamePhase } from "../types/PhaseTypes";
import { RoleType } from "../types/RoleTypes";
import { SocialStatus } from "../types/JobTypes";
import { PHASE_CONFIGS } from "../constants/PhaseConfigs";

/**
 * UI管理マネージャー
 * Minecraft Server UIを使用したプレイヤー向けインターフェース
 */
export class UIManager implements IUIManager {
  private static instance: UIManager;
  private scoreboardManager: ScoreboardManager;
  private phaseManager: PhaseManager;
  private roleAssignmentManager: RoleAssignmentManager;
  private jobAssignmentManager: JobAssignmentManager;

  private constructor() {
    this.scoreboardManager = ScoreboardManager.getInstance();
    this.phaseManager = PhaseManager.getInstance();
    this.roleAssignmentManager = RoleAssignmentManager.getInstance();
    this.jobAssignmentManager = JobAssignmentManager.getInstance();
  }

  public static getInstance(): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager();
    }
    return UIManager.instance;
  }

  /**
   * プレイヤー情報UIを表示
   */
  public async showPlayerInfo(player: Player): Promise<void> {
    try {
      const role = this.roleAssignmentManager.getPlayerRole(player);
      const job = this.jobAssignmentManager.getPlayerJob(player);
      const socialStatus = this.jobAssignmentManager.getPlayerSocialStatus(player);
      const alive = this.scoreboardManager.isPlayerAlive(player);
      const score = this.scoreboardManager.getPlayerScore(player);
      const evidenceCount = this.scoreboardManager.getEvidenceCount(player);

      const form = new MessageFormData()
        .title("§l§6プレイヤー情報")
        .body(
          `§6プレイヤー名: §f${player.name}\n\n` +
          `§6ロール: §f${role ? this.getRoleDisplayName(role) : "未設定"}\n\n` +
          `§6ジョブ: §f${job ? job.toString() : "未設定"}\n\n` +
          `§6社会階級: §f${socialStatus ? this.getSocialStatusDisplayName(socialStatus) : "未設定"}\n\n` +
          `§6生存状態: §f${alive ? "生存" : "死亡"}\n\n` +
          `§6スコア: §f${score}pt\n\n` +
          `§6証拠数: §f${evidenceCount}個`
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);
    } catch (error) {
      console.error(`Failed to show player info for ${player.name}:`, error);
      player.sendMessage("§cプレイヤー情報の表示に失敗しました");
    }
  }

  /**
   * ゲーム状態UIを表示
   */
  public async showGameState(player: Player): Promise<void> {
    try {
      const currentPhase = this.phaseManager.getCurrentPhase();
      const phaseTimer = this.scoreboardManager.getPhaseTimer();
      const murderOccurred = this.scoreboardManager.getMurderOccurred();
      const playerCount = world.getAllPlayers().length;
      const aliveCount = world.getAllPlayers().filter(p => this.scoreboardManager.isPlayerAlive(p)).length;

      const form = new MessageFormData()
        .title("§l§aゲーム状態")
        .body(
          `§6現在フェーズ: §f${this.getPhaseDisplayName(currentPhase)}\n\n` +
          `§6残り時間: §f${this.formatTime(phaseTimer)}\n\n` +
          `§6事件発生: §f${murderOccurred ? "発生済み" : "未発生"}\n\n` +
          `§6総プレイヤー数: §f${playerCount}人\n\n` +
          `§6生存者数: §f${aliveCount}人`
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);
    } catch (error) {
      console.error(`Failed to show game state for ${player.name}:`, error);
      player.sendMessage("§cゲーム状態の表示に失敗しました");
    }
  }

  /**
   * フェーズ情報UIを表示
   */
  public async showPhaseInfo(player: Player): Promise<void> {
    try {
      const currentPhase = this.phaseManager.getCurrentPhase();
      const phaseConfig = PHASE_CONFIGS[currentPhase];
      
      if (!phaseConfig) {
        player.sendMessage("§cフェーズ情報を取得できませんでした");
        return;
      }

      const form = new MessageFormData()
        .title(`§l§e${this.getPhaseDisplayName(currentPhase)}`)
        .body(
          `§6フェーズ名: §f${this.getPhaseDisplayName(currentPhase)}\n\n` +
          `§6説明: §f${phaseConfig.description}\n\n` +
          `§6制限時間: §f${this.formatTime(phaseConfig.duration)}\n\n` +
          `§6許可された行動:\n` +
          phaseConfig.allowedActions.map((action: string) => `§f- ${action}`).join('\n')
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);
    } catch (error) {
      console.error(`Failed to show phase info for ${player.name}:`, error);
      player.sendMessage("§cフェーズ情報の表示に失敗しました");
    }
  }

  /**
   * 管理者向けデバッグUIを表示
   */
  public async showAdminMenu(player: Player): Promise<void> {
    try {
      const form = new ActionFormData()
        .title("§l§c管理者メニュー")
        .body("§7管理者向けのデバッグ機能です")
        .button("§aゲーム状態表示", "textures/ui/book_edit_default")
        .button("§eプレイヤー一覧", "textures/ui/friend_glyph")
        .button("§bフェーズ強制変更", "textures/ui/clock")
        .button("§6デバッグ情報出力", "textures/ui/debug_glyph")
        .button("§cゲームリセット", "textures/ui/redX1")
        .button("§7閉じる", "textures/ui/cancel");

      const response = await form.show(player);
      
      if (response.canceled) return;

      switch (response.selection) {
        case 0: // ゲーム状態表示
          await this.showGameState(player);
          break;
        case 1: // プレイヤー一覧
          await this.showPlayerList(player);
          break;
        case 2: // フェーズ強制変更
          await this.showPhaseChangeMenu(player);
          break;
        case 3: // デバッグ情報出力
          this.outputDebugInfo();
          player.sendMessage("§aデバッグ情報をコンソールに出力しました");
          break;
        case 4: // ゲームリセット
          await this.showResetConfirmation(player);
          break;
      }
    } catch (error) {
      console.error(`Failed to show admin menu for ${player.name}:`, error);
      player.sendMessage("§c管理者メニューの表示に失敗しました");
    }
  }

  /**
   * 証拠一覧UIを表示
   */
  public async showEvidenceList(player: Player): Promise<void> {
    try {
      const evidenceCount = this.scoreboardManager.getEvidenceCount(player);
      
      const form = new MessageFormData()
        .title("§l§b証拠一覧")
        .body(
          `§6収集済み証拠数: §f${evidenceCount}\n\n` +
          `§7※証拠詳細表示機能は今後実装予定です\n` +
          `§7※現在は証拠数のみ表示されます`
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);
    } catch (error) {
      console.error(`Failed to show evidence list for ${player.name}:`, error);
      player.sendMessage("§c証拠一覧の表示に失敗しました");
    }
  }

  /**
   * プレイヤー一覧UIを表示
   */
  public async showPlayerList(player: Player): Promise<void> {
    try {
      const players = world.getAllPlayers();
      const playerInfo = players.map(p => {
        const role = this.roleAssignmentManager.getPlayerRole(p);
        const job = this.jobAssignmentManager.getPlayerJob(p);
        const alive = this.scoreboardManager.isPlayerAlive(p);
        const score = this.scoreboardManager.getPlayerScore(p);
        
        return `§f${p.name} §7(${alive ? "生存" : "死亡"}) §6${score}pt`;
      });

      const form = new MessageFormData()
        .title("§l§eプレイヤー一覧")
        .body(
          `§6総プレイヤー数: §f${players.length}\n\n` +
          playerInfo.join('\n')
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);
    } catch (error) {
      console.error(`Failed to show player list for ${player.name}:`, error);
      player.sendMessage("§cプレイヤー一覧の表示に失敗しました");
    }
  }

  /**
   * フェーズ変更メニューを表示
   */
  private async showPhaseChangeMenu(player: Player): Promise<void> {
    try {
      const form = new ActionFormData()
        .title("§l§bフェーズ変更")
        .body("§7変更したいフェーズを選択してください")
        .button("§a準備フェーズ", "textures/ui/gear")
        .button("§e生活フェーズ", "textures/ui/heart")
        .button("§6調査フェーズ", "textures/ui/magnifyingGlass")
        .button("§c会議フェーズ", "textures/ui/chat")
        .button("§d再調査フェーズ", "textures/ui/magnifyingGlass")
        .button("§b推理フェーズ", "textures/ui/book_edit_default")
        .button("§4投票フェーズ", "textures/ui/vote")
        .button("§8エンディング", "textures/ui/check");

      const response = await form.show(player);
      
      if (response.canceled) return;

      const phases = [
        GamePhase.PREPARATION,
        GamePhase.DAILY_LIFE,
        GamePhase.INVESTIGATION,
        GamePhase.DISCUSSION,
        GamePhase.REINVESTIGATION,
        GamePhase.DEDUCTION,
        GamePhase.VOTING,
        GamePhase.ENDING
      ];

      const selectedPhase = phases[response.selection!];
      const result = await this.phaseManager.forcePhaseChange(selectedPhase);
      
      if (result.success) {
        player.sendMessage(`§aフェーズを ${this.getPhaseDisplayName(selectedPhase)} に変更しました`);
      } else {
        player.sendMessage(`§cフェーズ変更エラー: ${result.error}`);
      }
    } catch (error) {
      console.error(`Failed to show phase change menu for ${player.name}:`, error);
      player.sendMessage("§cフェーズ変更メニューの表示に失敗しました");
    }
  }

  /**
   * リセット確認UIを表示
   */
  private async showResetConfirmation(player: Player): Promise<void> {
    try {
      const form = new MessageFormData()
        .title("§l§cゲームリセット確認")
        .body(
          "§cゲームをリセットしますか？\n\n" +
          "§7この操作により以下がリセットされます:\n" +
          "§7- 全プレイヤーの役職・職業\n" +
          "§7- ゲームフェーズ\n" +
          "§7- 証拠・スコア\n" +
          "§7- その他全てのゲーム状態"
        )
        .button1("§cリセット実行")
        .button2("§aキャンセル");

      const response = await form.show(player);
      
      if (response.canceled || response.selection === 1) {
        player.sendMessage("§aリセットをキャンセルしました");
        return;
      }

      // リセット実行
      this.phaseManager.dispose();
      this.scoreboardManager.initializeObjectives();
      world.sendMessage(`§c${player.name} によってゲームがリセットされました`);
      
    } catch (error) {
      console.error(`Failed to show reset confirmation for ${player.name}:`, error);
      player.sendMessage("§cリセット確認の表示に失敗しました");
    }
  }

  /**
   * デバッグ情報をコンソールに出力
   */
  private outputDebugInfo(): void {
    this.scoreboardManager.debugGameState();
    this.scoreboardManager.debugPlayerStates();
    this.roleAssignmentManager.debugRoleAssignments();
    this.jobAssignmentManager.debugJobAssignments();
  }

  /**
   * ロール表示名を取得
   */
  private getRoleDisplayName(role: RoleType): string {
    switch (role) {
      case RoleType.CITIZEN:
        return "一般人";
      case RoleType.MURDERER:
        return "犯人";
      case RoleType.ACCOMPLICE:
        return "共犯者";
      default:
        return "不明";
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

  /**
   * フェーズ表示名を取得
   */
  private getPhaseDisplayName(phase: GamePhase): string {
    switch (phase) {
      case GamePhase.PREPARATION:
        return "準備フェーズ";
      case GamePhase.DAILY_LIFE:
        return "生活フェーズ";
      case GamePhase.INVESTIGATION:
        return "調査フェーズ";
      case GamePhase.DISCUSSION:
        return "会議フェーズ";
      case GamePhase.REINVESTIGATION:
        return "再調査フェーズ";
      case GamePhase.DEDUCTION:
        return "推理フェーズ";
      case GamePhase.VOTING:
        return "投票フェーズ";
      case GamePhase.ENDING:
        return "エンディング";
      default:
        return "不明フェーズ";
    }
  }

  /**
   * 時間をフォーマット
   */
  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}