import { Player, world } from "@minecraft/server";
import { ModalFormData, ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { VotingManager } from "./VotingManager";
import { ScoreboardManager } from "./ScoreboardManager";
import { RoleAssignmentManager } from "./RoleAssignmentManager";
import { EvidenceAnalyzer } from "./EvidenceAnalyzer";
import { 
  VoteType, 
  VoteStatus,
  type VotingSession,
  type VotingResult,
  DEFAULT_VOTING_CONFIGS
} from "../types/VotingTypes";

/**
 * 投票UI管理マネージャー
 */
export class VotingUIManager {
  private static instance: VotingUIManager;
  private votingManager: VotingManager;
  private scoreboardManager: ScoreboardManager;
  private roleAssignmentManager: RoleAssignmentManager;
  private evidenceAnalyzer: EvidenceAnalyzer;

  private constructor() {
    this.votingManager = VotingManager.getInstance();
    this.scoreboardManager = ScoreboardManager.getInstance();
    this.roleAssignmentManager = RoleAssignmentManager.getInstance();
    this.evidenceAnalyzer = EvidenceAnalyzer.getInstance();
  }

  public static getInstance(): VotingUIManager {
    if (!VotingUIManager.instance) {
      VotingUIManager.instance = new VotingUIManager();
    }
    return VotingUIManager.instance;
  }

  /**
   * 投票メインメニューを表示
   */
  public async showVotingMenu(player: Player): Promise<void> {
    try {
      const currentSession = this.votingManager.getCurrentVotingStatus();
      
      const form = new ActionFormData()
        .title("§l§6投票システム")
        .body("§7投票に関する機能にアクセスできます");

      if (currentSession && currentSession.status === VoteStatus.IN_PROGRESS) {
        form.button("§a投票する", "textures/ui/vote");
        form.button("§e投票状況確認", "textures/ui/friend_glyph");
      } else {
        form.button("§c新しい投票を開始", "textures/ui/gear");
      }
      
      form.button("§b投票履歴", "textures/ui/book_edit_default");
      form.button("§d投票統計", "textures/ui/creative_icon");
      form.button("§6推理支援", "textures/ui/magnifyingGlass");
      form.button("§7閉じる", "textures/ui/cancel");

      const response = await form.show(player);
      
      if (response.canceled) return;

      if (currentSession && currentSession.status === VoteStatus.IN_PROGRESS) {
        switch (response.selection) {
          case 0: // 投票する
            await this.showVotingInterface(player);
            break;
          case 1: // 投票状況確認
            await this.showVotingStatus(player);
            break;
          case 2: // 投票履歴
            await this.showVotingHistory(player);
            break;
          case 3: // 投票統計
            await this.showVotingStatistics(player);
            break;
          case 4: // 推理支援
            await this.showVotingRecommendation(player);
            break;
        }
      } else {
        switch (response.selection) {
          case 0: // 新しい投票を開始
            await this.showStartVotingMenu(player);
            break;
          case 1: // 投票履歴
            await this.showVotingHistory(player);
            break;
          case 2: // 投票統計
            await this.showVotingStatistics(player);
            break;
          case 3: // 推理支援
            await this.showVotingRecommendation(player);
            break;
        }
      }
    } catch (error) {
      console.error(`Failed to show voting menu for ${player.name}:`, error);
      player.sendMessage("§c投票メニューの表示に失敗しました");
    }
  }

  /**
   * 投票開始メニューを表示
   */
  public async showStartVotingMenu(player: Player): Promise<void> {
    try {
      const form = new ActionFormData()
        .title("§l§c投票開始")
        .body("§7開始する投票の種類を選択してください")
        .button("§c犯人投票", "textures/ui/redX1")
        .button("§6追放投票", "textures/ui/warning")
        .button("§d最終審判", "textures/ui/book_edit_default")
        .button("§7キャンセル", "textures/ui/cancel");

      const response = await form.show(player);
      
      if (response.canceled || response.selection === 3) return;

      const voteTypes = [VoteType.MURDER_SUSPECT, VoteType.EXILE, VoteType.FINAL_JUDGMENT];
      const selectedType = voteTypes[response.selection!];
      
      await this.showCandidateSelection(player, selectedType);

    } catch (error) {
      console.error(`Failed to show start voting menu for ${player.name}:`, error);
      player.sendMessage("§c投票開始メニューの表示に失敗しました");
    }
  }

  /**
   * 候補者選択画面を表示
   */
  public async showCandidateSelection(player: Player, voteType: VoteType): Promise<void> {
    try {
      const alivePlayers = world.getAllPlayers().filter(p => this.scoreboardManager.isPlayerAlive(p));
      
      if (alivePlayers.length < 2) {
        player.sendMessage("§c投票可能なプレイヤーが不足しています");
        return;
      }

      // 推理支援: 容疑者ランキングを取得
      const deductionReport = this.evidenceAnalyzer.generateDeductionReport();
      const topSuspects = deductionReport.suspectRanking.slice(0, Math.min(5, alivePlayers.length));

      const form = new ActionFormData()
        .title(`§l§6候補者選択 - ${this.getVoteTypeDisplayName(voteType)}`)
        .body(
          "§7投票対象の候補者を選択してください\n\n" +
          "§6推理システム推奨順位:\n" +
          topSuspects.map((suspect, index) => {
            const suspicionPercent = Math.round(suspect.suspicionScore * 100);
            return `§7${index + 1}. ${suspect.playerName} (${suspicionPercent}%)`;
          }).join('\n')
        );

      // 全プレイヤーを候補として追加
      for (const p of alivePlayers) {
        const suspicion = topSuspects.find(s => s.playerId === p.id);
        const suspicionText = suspicion ? ` §7(疑惑度: ${Math.round(suspicion.suspicionScore * 100)}%)` : "";
        form.button(`§f${p.name}${suspicionText}`, "textures/ui/friend_glyph");
      }
      
      form.button("§7キャンセル", "textures/ui/cancel");

      const response = await form.show(player);
      
      if (response.canceled || response.selection === alivePlayers.length) return;

      const selectedPlayer = alivePlayers[response.selection!];
      await this.confirmStartVoting(player, voteType, [selectedPlayer.id]);

    } catch (error) {
      console.error(`Failed to show candidate selection for ${player.name}:`, error);
      player.sendMessage("§c候補者選択の表示に失敗しました");
    }
  }

  /**
   * 投票開始確認
   */
  private async confirmStartVoting(player: Player, voteType: VoteType, candidates: string[]): Promise<void> {
    try {
      const config = DEFAULT_VOTING_CONFIGS[voteType];
      const candidateNames = candidates
        .map(id => world.getAllPlayers().find(p => p.id === id)?.name || "不明")
        .join(", ");

      const form = new MessageFormData()
        .title("§l§c投票開始確認")
        .body(
          `§6投票タイプ: §f${this.getVoteTypeDisplayName(voteType)}\n` +
          `§6候補者: §f${candidateNames}\n` +
          `§6制限時間: §f${Math.floor(config.duration / 60)}分\n` +
          `§6棄権許可: §f${config.allowAbstain ? "あり" : "なし"}\n\n` +
          "§7この設定で投票を開始しますか？"
        )
        .button1("§a開始")
        .button2("§cキャンセル");

      const response = await form.show(player);
      
      if (response.canceled || response.selection === 1) {
        player.sendMessage("§7投票開始をキャンセルしました");
        return;
      }

      const result = this.votingManager.startVotingSession(voteType, candidates);
      if (result.success) {
        player.sendMessage("§a投票を開始しました");
      } else {
        player.sendMessage(`§c投票開始エラー: ${result.error}`);
      }

    } catch (error) {
      console.error(`Failed to confirm start voting for ${player.name}:`, error);
      player.sendMessage("§c投票開始確認の表示に失敗しました");
    }
  }

  /**
   * 投票インターフェースを表示
   */
  public async showVotingInterface(player: Player): Promise<void> {
    try {
      const currentSession = this.votingManager.getCurrentVotingStatus();
      
      if (!currentSession || currentSession.status !== VoteStatus.IN_PROGRESS) {
        player.sendMessage("§c現在投票中ではありません");
        return;
      }

      // 既に投票済みかチェック
      const existingVote = currentSession.votes.find(v => v.voterId === player.id);
      if (existingVote) {
        player.sendMessage("§c既に投票済みです");
        await this.showVotingStatus(player);
        return;
      }

      // 投票権チェック
      if (!currentSession.eligibleVoters.includes(player.id)) {
        player.sendMessage("§c投票権がありません");
        return;
      }

      const form = new ActionFormData()
        .title(`§l§a${this.getVoteTypeDisplayName(currentSession.voteType)}`)
        .body(
          `§7投票対象を選択してください\n\n` +
          `§6残り時間: §f${this.getTimeRemaining(currentSession)}秒\n` +
          `§6投票済み: §f${currentSession.votes.length}/${currentSession.eligibleVoters.length}人`
        );

      // 候補者ボタンを追加
      for (const candidateId of currentSession.candidates) {
        const candidate = world.getAllPlayers().find(p => p.id === candidateId);
        if (candidate) {
          const currentVotes = currentSession.votes.filter(v => v.targetId === candidateId).length;
          form.button(`§f${candidate.name} §7(${currentVotes}票)`, "textures/ui/friend_glyph");
        }
      }

      // 棄権ボタン
      if (currentSession.allowAbstain) {
        const abstentions = currentSession.votes.filter(v => v.targetId === "ABSTAIN").length;
        form.button(`§7棄権 §7(${abstentions}票)`, "textures/ui/cancel");
      }

      const response = await form.show(player);
      
      if (response.canceled) return;

      let targetId: string;
      if (response.selection! < currentSession.candidates.length) {
        targetId = currentSession.candidates[response.selection!];
      } else {
        targetId = "ABSTAIN";
      }

      await this.showVoteConfirmation(player, targetId, currentSession);

    } catch (error) {
      console.error(`Failed to show voting interface for ${player.name}:`, error);
      player.sendMessage("§c投票画面の表示に失敗しました");
    }
  }

  /**
   * 投票確認画面を表示
   */
  private async showVoteConfirmation(player: Player, targetId: string, session: VotingSession): Promise<void> {
    try {
      const target = world.getAllPlayers().find(p => p.id === targetId);
      const targetName = target ? target.name : (targetId === "ABSTAIN" ? "棄権" : "不明");

      const form = new MessageFormData()
        .title("§l§e投票確認")
        .body(
          `§6投票対象: §f${targetName}\n\n` +
          "§7この候補者に投票しますか？\n" +
          "§7投票後は変更できません。"
        )
        .button1("§a投票する")
        .button2("§cキャンセル");

      const response = await form.show(player);
      
      if (response.canceled || response.selection === 1) return;

      const confidence = 3; // デフォルト確信度
      const result = this.votingManager.castVote(player.id, targetId, confidence);
      
      if (result.success) {
        player.sendMessage(`§a${targetName}に投票しました (確信度: ${confidence})`);
      } else {
        player.sendMessage(`§c投票エラー: ${result.error}`);
      }

    } catch (error) {
      console.error(`Failed to show vote confirmation for ${player.name}:`, error);
      player.sendMessage("§c投票確認の表示に失敗しました");
    }
  }

  /**
   * 投票状況を表示
   */
  public async showVotingStatus(player: Player): Promise<void> {
    try {
      const currentSession = this.votingManager.getCurrentVotingStatus();
      
      if (!currentSession) {
        player.sendMessage("§c現在進行中の投票がありません");
        return;
      }

      const timeRemaining = this.getTimeRemaining(currentSession);
      const votedPlayers = currentSession.votes.map(v => v.voterName).join(", ");
      const notVotedPlayers = currentSession.eligibleVoters
        .filter(id => !currentSession.votes.some(v => v.voterId === id))
        .map(id => world.getAllPlayers().find(p => p.id === id)?.name || "不明")
        .join(", ");

      // 現在の得票状況
      const result = this.votingManager.calculateVotingResult(currentSession);
      const resultText = result.results.slice(0, 5).map((r, index) => {
        return `§f${index + 1}. ${r.candidateName}: ${r.votes}票 (${Math.round(r.percentage)}%)`;
      }).join('\n');

      const form = new MessageFormData()
        .title(`§l§b投票状況 - ${this.getVoteTypeDisplayName(currentSession.voteType)}`)
        .body(
          `§6残り時間: §f${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}\n` +
          `§6進捗: §f${currentSession.votes.length}/${currentSession.eligibleVoters.length}人投票済み\n\n` +
          `§6現在の得票状況:\n${resultText}\n\n` +
          `§6投票済み: §f${votedPlayers || "なし"}\n` +
          `§6未投票: §f${notVotedPlayers || "なし"}`
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);

    } catch (error) {
      console.error(`Failed to show voting status for ${player.name}:`, error);
      player.sendMessage("§c投票状況の表示に失敗しました");
    }
  }

  /**
   * 投票履歴を表示
   */
  public async showVotingHistory(player: Player): Promise<void> {
    try {
      const playerVotes = this.votingManager.getPlayerVoteHistory(player.id);
      
      if (playerVotes.length === 0) {
        const form = new MessageFormData()
          .title("§l§e投票履歴")
          .body("§7まだ投票記録がありません。")
          .button1("§a了解")
          .button2("§7閉じる");

        await form.show(player);
        return;
      }

      const historyText = playerVotes.slice(0, 10).map((vote, index) => {
        const date = new Date(vote.timestamp).toLocaleString();
        const voteTypeName = this.getVoteTypeDisplayName(vote.voteType);
        return `§6[${index + 1}] §f${voteTypeName}\n§7${vote.targetName}に投票 (確信度: ${vote.confidence}) - ${date}`;
      }).join('\n\n');

      const form = new MessageFormData()
        .title("§l§e投票履歴")
        .body(
          `§6投票回数: §f${playerVotes.length}回\n\n` +
          `§6最近の投票 (最大10件):\n${historyText}`
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);

    } catch (error) {
      console.error(`Failed to show voting history for ${player.name}:`, error);
      player.sendMessage("§c投票履歴の表示に失敗しました");
    }
  }

  /**
   * 投票統計を表示
   */
  public async showVotingStatistics(player: Player): Promise<void> {
    try {
      const stats = this.votingManager.getVotingStatistics();
      
      const typeStatsText = Array.from(stats.votesByType.entries())
        .map(([type, count]) => `§f- ${this.getVoteTypeDisplayName(type)}: ${count}回`)
        .join('\n');

      const topVoters = Array.from(stats.votesByPlayer.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([playerId, count], index) => {
          const p = world.getAllPlayers().find(player => player.id === playerId);
          const playerName = p ? p.name : "不明";
          return `§f${index + 1}. ${playerName}: ${count}票`;
        })
        .join('\n');

      const form = new MessageFormData()
        .title("§l§d投票統計")
        .body(
          `§6総セッション数: §f${stats.totalSessions}回\n` +
          `§6完了セッション: §f${stats.completedSessions}回\n` +
          `§6総投票数: §f${stats.totalVotes}票\n` +
          `§6平均参加率: §f${Math.round(stats.averageParticipation)}%\n\n` +
          `§6投票タイプ別:\n${typeStatsText}\n\n` +
          `§6活発な投票者 (上位5名):\n${topVoters}`
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);

    } catch (error) {
      console.error(`Failed to show voting statistics for ${player.name}:`, error);
      player.sendMessage("§c投票統計の表示に失敗しました");
    }
  }

  /**
   * 推理支援投票推奨を表示
   */
  public async showVotingRecommendation(player: Player): Promise<void> {
    try {
      const deductionReport = this.evidenceAnalyzer.generateDeductionReport();
      
      if (deductionReport.suspectRanking.length === 0) {
        player.sendMessage("§c推理データが不足しています");
        return;
      }

      const topSuspects = deductionReport.suspectRanking.slice(0, 3);
      const recommendationText = topSuspects.map((suspect, index) => {
        const suspicionPercent = Math.round(suspect.suspicionScore * 100);
        const reasons = suspect.reasons.slice(0, 2).join(", ");
        return `§6[${index + 1}位] §f${suspect.playerName}\n§7疑惑度: ${suspicionPercent}% (${reasons})`;
      }).join('\n\n');

      const form = new MessageFormData()
        .title("§l§6推理支援システム")
        .body(
          `§6AI分析による投票推奨:\n\n` +
          `§7${deductionReport.summary}\n\n` +
          `§6推奨候補者:\n${recommendationText}\n\n` +
          `§7※この推奨は現在の証拠分析に基づく参考情報です\n` +
          `§7※最終的な判断はプレイヤーの推理にお任せします`
        )
        .button1("§a投票画面へ")
        .button2("§7閉じる");

      const response = await form.show(player);
      
      if (!response.canceled && response.selection === 0) {
        await this.showVotingInterface(player);
      }

    } catch (error) {
      console.error(`Failed to show voting recommendation for ${player.name}:`, error);
      player.sendMessage("§c推理支援の表示に失敗しました");
    }
  }

  /**
   * 投票タイプの表示名を取得
   */
  private getVoteTypeDisplayName(voteType: VoteType): string {
    switch (voteType) {
      case VoteType.MURDER_SUSPECT:
        return "犯人投票";
      case VoteType.EXILE:
        return "追放投票";
      case VoteType.FINAL_JUDGMENT:
        return "最終審判";
      default:
        return "投票";
    }
  }

  /**
   * 残り時間を計算
   */
  private getTimeRemaining(session: VotingSession): number {
    const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
    return Math.max(0, session.duration - elapsed);
  }
}