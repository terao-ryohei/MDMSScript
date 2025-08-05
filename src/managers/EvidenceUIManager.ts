import { Player, world } from "@minecraft/server";
import { ModalFormData, ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { ActionTrackingManager } from "./ActionTrackingManager";
import { EvidenceAnalyzer } from "./EvidenceAnalyzer";
import { ScoreboardManager } from "./ScoreboardManager";
import { RoleAssignmentManager } from "./RoleAssignmentManager";
import { ActionType, type ActionRecord, type ActionFilter } from "../types/ActionTypes";
import { GamePhase } from "../types/PhaseTypes";

/**
 * 証拠表示UI管理マネージャー
 */
export class EvidenceUIManager {
  private static instance: EvidenceUIManager;
  private actionTrackingManager: ActionTrackingManager;
  private evidenceAnalyzer: EvidenceAnalyzer;
  private scoreboardManager: ScoreboardManager;
  private roleAssignmentManager: RoleAssignmentManager;

  private constructor() {
    this.actionTrackingManager = ActionTrackingManager.getInstance();
    this.evidenceAnalyzer = EvidenceAnalyzer.getInstance();
    this.scoreboardManager = ScoreboardManager.getInstance();
    this.roleAssignmentManager = RoleAssignmentManager.getInstance();
  }

  public static getInstance(): EvidenceUIManager {
    if (!EvidenceUIManager.instance) {
      EvidenceUIManager.instance = new EvidenceUIManager();
    }
    return EvidenceUIManager.instance;
  }

  /**
   * 証拠メインメニューを表示
   */
  public async showEvidenceMenu(player: Player): Promise<void> {
    try {
      const form = new ActionFormData()
        .title("§l§d証拠システム")
        .body("§7証拠の確認と分析を行います")
        .button("§a証拠一覧", "textures/ui/book_edit_default")
        .button("§e証拠分析", "textures/ui/magnifyingGlass")
        .button("§c推理レポート", "textures/ui/creative_icon")
        .button("§bプレイヤー行動履歴", "textures/ui/friend_glyph")
        .button("§6アリバイ分析", "textures/ui/clock")
        .button("§d矛盾検出", "textures/ui/warning")
        .button("§7閉じる", "textures/ui/cancel");

      const response = await form.show(player);
      
      if (response.canceled) return;

      switch (response.selection) {
        case 0: // 証拠一覧
          await this.showEvidenceList(player);
          break;
        case 1: // 証拠分析
          await this.showEvidenceAnalysis(player);
          break;
        case 2: // 推理レポート
          await this.showDeductionReport(player);
          break;
        case 3: // プレイヤー行動履歴
          await this.showPlayerActionHistory(player);
          break;
        case 4: // アリバイ分析
          await this.showAlibiAnalysis(player);
          break;
        case 5: // 矛盾検出
          await this.showContradictionAnalysis(player);
          break;
      }
    } catch (error) {
      console.error(`Failed to show evidence menu for ${player.name}:`, error);
      player.sendMessage("§c証拠メニューの表示に失敗しました");
    }
  }

  /**
   * 証拠一覧を表示
   */
  public async showEvidenceList(player: Player): Promise<void> {
    try {
      // 生活フェーズの証拠を抽出
      const evidenceResult = this.actionTrackingManager.extractEvidenceFromDailyLife();
      const evidence = evidenceResult.evidence;

      if (evidence.length === 0) {
        const form = new MessageFormData()
          .title("§l§d証拠一覧")
          .body("§c証拠が見つかりませんでした\n\n§7生活フェーズでの行動が記録されていません。")
          .button1("§a了解")
          .button2("§7閉じる");

        await form.show(player);
        return;
      }

      // 証拠を時系列で並べ替え
      const sortedEvidence = evidence.sort((a, b) => a.timestamp - b.timestamp);

      // 最大10件を表示
      const displayEvidence = sortedEvidence.slice(-10);
      
      const evidenceText = displayEvidence.map((e, index) => {
        const time = this.formatTimestamp(e.timestamp);
        const witnessText = e.witnessIds.length > 0 ? ` (目撃者${e.witnessIds.length}人)` : "";
        const actionName = this.getActionDisplayName(e.actionType);
        return `§6[${index + 1}] §f${time} - ${e.playerName}: ${actionName}${witnessText}`;
      }).join('\n');

      const form = new MessageFormData()
        .title("§l§d証拠一覧")
        .body(
          `§6総証拠数: §f${evidence.length}件\n` +
          `§6表示件数: §f${displayEvidence.length}件 (最新)\n\n` +
          `§6証拠リスト:\n${evidenceText}\n\n` +
          `§7※より詳細な分析は証拠分析メニューをご利用ください`
        )
        .button1("§a証拠分析へ")
        .button2("§7閉じる");

      const response = await form.show(player);
      if (!response.canceled && response.selection === 0) {
        await this.showEvidenceAnalysis(player);
      }

    } catch (error) {
      console.error(`Failed to show evidence list for ${player.name}:`, error);
      player.sendMessage("§c証拠一覧の表示に失敗しました");
    }
  }

  /**
   * 証拠分析を表示
   */
  public async showEvidenceAnalysis(player: Player): Promise<void> {
    try {
      const evidenceResult = this.actionTrackingManager.extractEvidenceFromDailyLife();
      const evidence = evidenceResult.evidence;

      if (evidence.length === 0) {
        player.sendMessage("§c分析可能な証拠がありません");
        return;
      }

      // 重要証拠を抽出
      const keyEvidence = evidence.filter(e => 
        e.actionType === ActionType.MURDER || 
        e.actionType === ActionType.DEATH ||
        e.actionType === ActionType.ABILITY_USE
      );

      // 行動タイプ別統計
      const actionStats = new Map<ActionType, number>();
      evidence.forEach(e => {
        actionStats.set(e.actionType, (actionStats.get(e.actionType) || 0) + 1);
      });

      const statsText = Array.from(actionStats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => `§f- ${this.getActionDisplayName(type)}: ${count}件`)
        .join('\n');

      const keyEvidenceText = keyEvidence.slice(0, 3).map((e, index) => {
        const time = this.formatTimestamp(e.timestamp);
        return `§c[${index + 1}] §f${time} - ${e.playerName}: ${this.getActionDisplayName(e.actionType)}`;
      }).join('\n');

      const form = new MessageFormData()
        .title("§l§d証拠分析")
        .body(
          `§6証拠統計:\n` +
          `§f総証拠数: ${evidence.length}件\n` +
          `§f重要証拠: ${keyEvidence.length}件\n` +
          `§f時間範囲: ${evidenceResult.timeRange.start}秒 - ${evidenceResult.timeRange.end}秒\n\n` +
          `§6行動タイプ別統計:\n${statsText}\n\n` +
          `§6重要証拠 (上位3件):\n${keyEvidenceText || "なし"}`
        )
        .button1("§c推理レポートへ")
        .button2("§7閉じる");

      const response = await form.show(player);
      if (!response.canceled && response.selection === 0) {
        await this.showDeductionReport(player);
      }

    } catch (error) {
      console.error(`Failed to show evidence analysis for ${player.name}:`, error);
      player.sendMessage("§c証拠分析の表示に失敗しました");
    }
  }

  /**
   * 推理レポートを表示
   */
  public async showDeductionReport(player: Player): Promise<void> {
    try {
      const report = this.evidenceAnalyzer.generateDeductionReport();

      if (report.suspectRanking.length === 0) {
        player.sendMessage("§c推理に必要なデータが不足しています");
        return;
      }

      // 上位5名の容疑者
      const topSuspects = report.suspectRanking.slice(0, 5);
      const suspectText = topSuspects.map((suspect, index) => {
        const suspicionPercent = Math.round(suspect.suspicionScore * 100);
        const rank = index + 1;
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "§7";
        return `${medal} §6[${rank}位] §f${suspect.playerName}: §c${suspicionPercent}%`;
      }).join('\n');

      const form = new MessageFormData()
        .title("§l§c推理レポート")
        .body(
          `§6分析結果:\n${report.summary}\n\n` +
          `§6容疑者ランキング:\n${suspectText}\n\n` +
          `§6分析データ:\n` +
          `§f- 重要証拠: ${report.keyEvidence.length}件\n` +
          `§f- 矛盾発見: ${report.contradictions.length}件\n` +
          `§f- 分析対象: ${report.suspectRanking.length}人\n\n` +
          `§7※このレポートはAI分析による参考情報です`
        )
        .button1("§d矛盾詳細へ")
        .button2("§7閉じる");

      const response = await form.show(player);
      if (!response.canceled && response.selection === 0) {
        await this.showContradictionAnalysis(player);
      }

    } catch (error) {
      console.error(`Failed to show deduction report for ${player.name}:`, error);
      player.sendMessage("§c推理レポートの表示に失敗しました");
    }
  }

  /**
   * プレイヤー行動履歴を表示
   */
  public async showPlayerActionHistory(player: Player): Promise<void> {
    try {
      // プレイヤー選択用のボタンを作成
      const allPlayers = world.getAllPlayers();
      const form = new ActionFormData()
        .title("§l§bプレイヤー選択")
        .body("§7行動履歴を確認したいプレイヤーを選択してください");

      for (const p of allPlayers) {
        form.button(`§f${p.name}`, "textures/ui/friend_glyph");
      }
      form.button("§7キャンセル", "textures/ui/cancel");

      const response = await form.show(player);
      if (response.canceled || response.selection === allPlayers.length) return;

      const selectedPlayer = allPlayers[response.selection!];
      await this.showSpecificPlayerActions(player, selectedPlayer);

    } catch (error) {
      console.error(`Failed to show player action history for ${player.name}:`, error);
      player.sendMessage("§c行動履歴の表示に失敗しました");
    }
  }

  /**
   * 特定プレイヤーの行動を表示
   */
  private async showSpecificPlayerActions(viewer: Player, targetPlayer: Player): Promise<void> {
    try {
      const actions = this.actionTrackingManager.getPlayerActions(targetPlayer.id, 15);

      if (actions.length === 0) {
        viewer.sendMessage(`§c${targetPlayer.name}の行動記録が見つかりませんでした`);
        return;
      }

      const actionText = actions.map((action, index) => {
        const time = this.formatTimestamp(action.timestamp);
        const witnessCount = action.witnessIds.length;
        const witnessText = witnessCount > 0 ? ` §7(目撃者${witnessCount}人)` : " §7(単独)";
        const actionName = this.getActionDisplayName(action.actionType);
        return `§6[${index + 1}] §f${time} - ${actionName}${witnessText}`;
      }).join('\n');

      const form = new MessageFormData()
        .title(`§l§b${targetPlayer.name}の行動履歴`)
        .body(
          `§6記録件数: §f${actions.length}件 (最新15件)\n\n` +
          `§6行動リスト:\n${actionText}\n\n` +
          `§7※証拠として扱われる行動のみ表示されます`
        )
        .button1("§6アリバイ分析")
        .button2("§7閉じる");

      const response = await form.show(viewer);
      if (!response.canceled && response.selection === 0) {
        await this.showPlayerAlibi(viewer, targetPlayer);
      }

    } catch (error) {
      console.error(`Failed to show specific player actions:`, error);
      viewer.sendMessage("§c行動詳細の表示に失敗しました");
    }
  }

  /**
   * アリバイ分析を表示
   */
  public async showAlibiAnalysis(player: Player): Promise<void> {
    try {
      // プレイヤー選択
      const allPlayers = world.getAllPlayers();
      const form = new ActionFormData()
        .title("§l§6アリバイ分析")
        .body("§7アリバイを分析したいプレイヤーを選択してください");

      for (const p of allPlayers) {
        form.button(`§f${p.name}`, "textures/ui/friend_glyph");
      }
      form.button("§7キャンセル", "textures/ui/cancel");

      const response = await form.show(player);
      if (response.canceled || response.selection === allPlayers.length) return;

      const selectedPlayer = allPlayers[response.selection!];
      await this.showPlayerAlibi(player, selectedPlayer);

    } catch (error) {
      console.error(`Failed to show alibi analysis for ${player.name}:`, error);
      player.sendMessage("§cアリバイ分析の表示に失敗しました");
    }
  }

  /**
   * 特定プレイヤーのアリバイを表示
   */
  private async showPlayerAlibi(viewer: Player, targetPlayer: Player): Promise<void> {
    try {
      // 事件時刻を推定（簡略化）
      const murderActions = this.actionTrackingManager.searchActions({
        actionType: ActionType.MURDER
      });

      let crimeTime = 0;
      if (murderActions.length > 0) {
        crimeTime = murderActions[0].timestamp;
      }

      // 事件前後5分間のアリバイを分析
      const alibi = this.evidenceAnalyzer.analyzeAlibi(targetPlayer.id, {
        start: crimeTime - 300,
        end: crimeTime + 300
      });

      const alibiStrength = Math.round(alibi.alibiStrength * 100);
      const alibiStatus = alibi.hasAlibi ? "§a確認済み" : "§c不十分";
      
      const witnessNames = alibi.witnesses
        .map(id => world.getAllPlayers().find(p => p.id === id)?.name || "不明")
        .slice(0, 5)
        .join(", ");

      const evidenceText = alibi.alibiDetails.slice(0, 5).map((action, index) => {
        const time = this.formatTimestamp(action.timestamp);
        return `§f- ${time}: ${this.getActionDisplayName(action.actionType)}`;
      }).join('\n');

      const form = new MessageFormData()
        .title(`§l§6${targetPlayer.name}のアリバイ`)
        .body(
          `§6アリバイ状況: ${alibiStatus}\n` +
          `§6信頼度: §f${alibiStrength}%\n\n` +
          `§6分析対象時間: §f事件前後10分間\n` +
          `§6目撃者: §f${witnessNames || "なし"}\n\n` +
          `§6関連証拠:\n${evidenceText || "なし"}\n\n` +
          `§7※アリバイの信頼度は複数要因により算出されます`
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(viewer);

    } catch (error) {
      console.error(`Failed to show player alibi:`, error);
      viewer.sendMessage("§cアリバイ表示に失敗しました");
    }
  }

  /**
   * 矛盾分析を表示
   */
  public async showContradictionAnalysis(player: Player): Promise<void> {
    try {
      const evidenceResult = this.actionTrackingManager.extractEvidenceFromDailyLife();
      const contradictions = this.evidenceAnalyzer.detectContradictions(evidenceResult.evidence);

      if (contradictions.length === 0) {
        const form = new MessageFormData()
          .title("§l§d矛盾分析")
          .body("§a現在、証拠間での矛盾は検出されていません。\n\n§7全ての証拠が一貫しています。")
          .button1("§a了解")
          .button2("§7閉じる");

        await form.show(player);
        return;
      }

      // 重要度の高い矛盾を表示
      const importantContradictions = contradictions
        .sort((a, b) => b.severity - a.severity)
        .slice(0, 5);

      const contradictionText = importantContradictions.map((contradiction, index) => {
        const severity = Math.round(contradiction.severity * 100);
        const type = this.getContradictionTypeName(contradiction.contradictionType);
        return `§c[${index + 1}] §f${type} (重要度: ${severity}%)\n§7${contradiction.evidence1.playerName} vs ${contradiction.evidence2.playerName}`;
      }).join('\n\n');

      const form = new MessageFormData()
        .title("§l§d矛盾分析")
        .body(
          `§c検出された矛盾: ${contradictions.length}件\n\n` +
          `§6重要な矛盾 (上位5件):\n${contradictionText}\n\n` +
          `§7※矛盾は証拠の信頼性や証言の一貫性から検出されます`
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);

    } catch (error) {
      console.error(`Failed to show contradiction analysis for ${player.name}:`, error);
      player.sendMessage("§c矛盾分析の表示に失敗しました");
    }
  }

  /**
   * タイムスタンプをフォーマット
   */
  private formatTimestamp(timestamp: number): string {
    const minutes = Math.floor(timestamp / 60);
    const seconds = timestamp % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * 行動タイプの表示名を取得
   */
  private getActionDisplayName(actionType: ActionType): string {
    switch (actionType) {
      case ActionType.MOVEMENT:
        return "移動";
      case ActionType.CHAT:
        return "発言";
      case ActionType.BLOCK_BREAK:
        return "ブロック破壊";
      case ActionType.BLOCK_PLACE:
        return "ブロック設置";
      case ActionType.ITEM_USE:
        return "アイテム使用";
      case ActionType.ENTITY_INTERACT:
        return "交流";
      case ActionType.BLOCK_INTERACT:
        return "ブロック操作";
      case ActionType.DEATH:
        return "死亡";
      case ActionType.MURDER:
        return "殺人";
      case ActionType.ABILITY_USE:
        return "能力使用";
      case ActionType.TASK_COMPLETE:
        return "タスク完了";
      case ActionType.AREA_ENTER:
        return "エリア進入";
      case ActionType.AREA_EXIT:
        return "エリア退出";
      default:
        return "不明な行動";
    }
  }

  /**
   * 矛盾タイプの表示名を取得
   */
  private getContradictionTypeName(contradictionType: string): string {
    switch (contradictionType) {
      case "impossible_movement":
        return "不可能な移動";
      case "action_after_death":
        return "死亡後の行動";
      case "conflicting_testimony":
        return "証言の矛盾";
      default:
        return "不明な矛盾";
    }
  }
}