import { Player, world, system } from "@minecraft/server";
import { ScoreboardManager } from "./ScoreboardManager";
import { RoleAssignmentManager } from "./RoleAssignmentManager";
import { 
  VoteType, 
  VoteStatus,
  type VotingSession,
  type VoteRecord,
  type VotingResult,
  type VotingConfig,
  type VotingSystemResult,
  type VotingStatistics,
  type VoteCount,
  DEFAULT_VOTING_CONFIGS
} from "../types/VotingTypes";

/**
 * 投票管理マネージャー
 * プレイヤー投票システムの完全な管理
 */
export class VotingManager {
  private static instance: VotingManager;
  private scoreboardManager: ScoreboardManager;
  private roleAssignmentManager: RoleAssignmentManager;
  
  private currentSession: VotingSession | null = null;
  private completedSessions: VotingSession[] = [];
  private sessionCounter: number = 0;
  private voteTimer: number | null = null;

  private constructor() {
    this.scoreboardManager = ScoreboardManager.getInstance();
    this.roleAssignmentManager = RoleAssignmentManager.getInstance();
  }

  public static getInstance(): VotingManager {
    if (!VotingManager.instance) {
      VotingManager.instance = new VotingManager();
    }
    return VotingManager.instance;
  }

  /**
   * 投票セッションを開始
   */
  public startVotingSession(
    voteType: VoteType, 
    candidates: string[], 
    config?: Partial<VotingConfig>
  ): VotingSystemResult {
    try {
      if (this.currentSession && this.currentSession.status === VoteStatus.IN_PROGRESS) {
        return {
          success: false,
          error: "既に投票が進行中です"
        };
      }

      const fullConfig = { ...DEFAULT_VOTING_CONFIGS[voteType], ...config };
      const alivePlayers = world.getAllPlayers().filter(p => this.scoreboardManager.isPlayerAlive(p));
      
      if (alivePlayers.length === 0) {
        return {
          success: false,
          error: "投票可能なプレイヤーがいません"
        };
      }

      // 候補者の妥当性チェック
      const validCandidates = candidates.filter(id => 
        alivePlayers.some(p => p.id === id)
      );

      if (validCandidates.length === 0) {
        return {
          success: false,
          error: "有効な候補者がいません"
        };
      }

      const session: VotingSession = {
        id: `vote_${this.sessionCounter++}`,
        voteType,
        status: VoteStatus.IN_PROGRESS,
        startTime: Date.now(),
        duration: fullConfig.duration,
        eligibleVoters: alivePlayers.map(p => p.id),
        candidates: validCandidates,
        votes: [],
        allowAbstain: fullConfig.allowAbstain,
        requiresAll: fullConfig.requiresAll
      };

      this.currentSession = session;
      this.startVoteTimer(session);

      // 投票開始を通知
      this.announceVotingStart(session, fullConfig);

      console.log(`Voting session started: ${session.id} (${voteType})`);
      return {
        success: true,
        message: "投票が開始されました",
        data: session
      };

    } catch (error) {
      console.error("Failed to start voting session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "投票開始エラー"
      };
    }
  }

  /**
   * 投票を記録
   */
  public castVote(
    voterId: string, 
    targetId: string, 
    confidence: number = 3, 
    reason?: string
  ): VotingSystemResult {
    try {
      if (!this.currentSession || this.currentSession.status !== VoteStatus.IN_PROGRESS) {
        return {
          success: false,
          error: "現在投票中ではありません"
        };
      }

      const voter = world.getAllPlayers().find(p => p.id === voterId);
      if (!voter) {
        return {
          success: false,
          error: "投票者が見つかりません"
        };
      }

      // 投票権チェック
      if (!this.currentSession.eligibleVoters.includes(voterId)) {
        return {
          success: false,
          error: "投票権がありません"
        };
      }

      // 既に投票済みかチェック
      const existingVote = this.currentSession.votes.find(v => v.voterId === voterId);
      if (existingVote) {
        return {
          success: false,
          error: "既に投票済みです"
        };
      }

      // 候補者チェック
      if (targetId !== "ABSTAIN" && !this.currentSession.candidates.includes(targetId)) {
        return {
          success: false,
          error: "無効な候補者です"
        };
      }

      // 棄権チェック
      if (targetId === "ABSTAIN" && !this.currentSession.allowAbstain) {
        return {
          success: false,
          error: "棄権は許可されていません"
        };
      }

      // 自己投票チェック
      if (targetId === voterId) {
        return {
          success: false,
          error: "自分に投票することはできません"
        };
      }

      const target = world.getAllPlayers().find(p => p.id === targetId);
      const targetName = target ? target.name : (targetId === "ABSTAIN" ? "棄権" : "不明");

      const voteRecord: VoteRecord = {
        voterId,
        voterName: voter.name,
        targetId,
        targetName,
        timestamp: Date.now(),
        voteType: this.currentSession.voteType,
        confidence: Math.max(1, Math.min(5, confidence)),
        reason
      };

      this.currentSession.votes.push(voteRecord);

      // Scoreboardに投票数を更新
      if (targetId !== "ABSTAIN") {
        const currentVotes = this.scoreboardManager.getPlayerVotes(target!);
        this.scoreboardManager.setPlayerVotes(target!, currentVotes + 1);
      }

      // 投票完了チェック
      if (this.isVotingComplete()) {
        this.endVotingSession();
      }

      console.log(`Vote cast: ${voter.name} -> ${targetName}`);
      return {
        success: true,
        message: `${targetName}に投票しました`,
        data: voteRecord
      };

    } catch (error) {
      console.error("Failed to cast vote:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "投票エラー"
      };
    }
  }

  /**
   * 投票セッションを強制終了
   */
  public endVotingSession(): VotingSystemResult {
    try {
      if (!this.currentSession) {
        return {
          success: false,
          error: "進行中の投票がありません"
        };
      }

      this.currentSession.status = VoteStatus.COMPLETED;
      this.currentSession.endTime = Date.now();

      if (this.voteTimer) {
        system.clearRun(this.voteTimer);
        this.voteTimer = null;
      }

      const result = this.calculateVotingResult(this.currentSession);
      this.completedSessions.push(this.currentSession);

      // 結果を発表
      this.announceVotingResult(result);

      const session = this.currentSession;
      this.currentSession = null;

      console.log(`Voting session ended: ${session.id}`);
      return {
        success: true,
        message: "投票が終了しました",
        data: result
      };

    } catch (error) {
      console.error("Failed to end voting session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "投票終了エラー"
      };
    }
  }

  /**
   * 現在の投票状況を取得
   */
  public getCurrentVotingStatus(): VotingSession | null {
    return this.currentSession;
  }

  /**
   * 投票結果を計算
   */
  public calculateVotingResult(session: VotingSession): VotingResult {
    try {
      const validVotes = session.votes.filter(v => v.targetId !== "ABSTAIN");
      const abstentions = session.votes.filter(v => v.targetId === "ABSTAIN").length;

      // 候補者別得票数を計算
      const voteCounts = new Map<string, VoteCount>();
      
      for (const candidate of session.candidates) {
        const candidateVotes = validVotes.filter(v => v.targetId === candidate);
        const player = world.getAllPlayers().find(p => p.id === candidate);
        
        voteCounts.set(candidate, {
          candidateId: candidate,
          candidateName: player ? player.name : "不明",
          votes: candidateVotes.length,
          percentage: validVotes.length > 0 ? (candidateVotes.length / validVotes.length) * 100 : 0,
          voters: candidateVotes.map(v => v.voterId)
        });
      }

      const results = Array.from(voteCounts.values()).sort((a, b) => b.votes - a.votes);
      
      // 最多得票者を決定
      let winner: string | undefined;
      let isTie = false;
      let tiedCandidates: string[] = [];

      if (results.length > 0) {
        const maxVotes = results[0].votes;
        const topCandidates = results.filter(r => r.votes === maxVotes);
        
        if (topCandidates.length === 1) {
          winner = topCandidates[0].candidateId;
        } else {
          isTie = true;
          tiedCandidates = topCandidates.map(c => c.candidateId);
        }
      }

      const participationRate = session.eligibleVoters.length > 0 ? 
        (session.votes.length / session.eligibleVoters.length) * 100 : 0;

      return {
        session,
        totalVotes: session.votes.length,
        validVotes: validVotes.length,
        abstentions,
        results,
        winner,
        isTie,
        tiedCandidates,
        participationRate
      };

    } catch (error) {
      console.error("Failed to calculate voting result:", error);
      // エラー時はデフォルト結果を返す
      return {
        session,
        totalVotes: 0,
        validVotes: 0,
        abstentions: 0,
        results: [],
        isTie: false,
        tiedCandidates: [],
        participationRate: 0
      };
    }
  }

  /**
   * プレイヤーの投票記録を取得
   */
  public getPlayerVoteHistory(playerId: string): VoteRecord[] {
    const allVotes: VoteRecord[] = [];
    
    // 現在のセッションの投票
    if (this.currentSession) {
      allVotes.push(...this.currentSession.votes.filter(v => v.voterId === playerId));
    }
    
    // 完了したセッションの投票
    for (const session of this.completedSessions) {
      allVotes.push(...session.votes.filter(v => v.voterId === playerId));
    }
    
    return allVotes.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 投票統計を取得
   */
  public getVotingStatistics(): VotingStatistics {
    const allSessions = [...this.completedSessions];
    if (this.currentSession) {
      allSessions.push(this.currentSession);
    }

    const votesByType = new Map<VoteType, number>();
    const votesByPlayer = new Map<string, number>();
    
    let totalVotes = 0;
    let totalParticipation = 0;

    for (const session of allSessions) {
      votesByType.set(session.voteType, (votesByType.get(session.voteType) || 0) + session.votes.length);
      totalVotes += session.votes.length;
      
      if (session.eligibleVoters.length > 0) {
        totalParticipation += (session.votes.length / session.eligibleVoters.length);
      }

      for (const vote of session.votes) {
        votesByPlayer.set(vote.voterId, (votesByPlayer.get(vote.voterId) || 0) + 1);
      }
    }

    return {
      totalSessions: allSessions.length,
      completedSessions: this.completedSessions.length,
      totalVotes,
      averageParticipation: allSessions.length > 0 ? (totalParticipation / allSessions.length) * 100 : 0,
      votesByType,
      votesByPlayer
    };
  }

  /**
   * 投票完了チェック
   */
  private isVotingComplete(): boolean {
    if (!this.currentSession) return false;

    if (this.currentSession.requiresAll) {
      return this.currentSession.votes.length >= this.currentSession.eligibleVoters.length;
    }

    // 必須でない場合は、過半数が投票したら完了とする
    return this.currentSession.votes.length >= Math.ceil(this.currentSession.eligibleVoters.length / 2);
  }

  /**
   * 投票タイマーを開始
   */
  private startVoteTimer(session: VotingSession): void {
    this.voteTimer = system.runTimeout(() => {
      if (this.currentSession && this.currentSession.id === session.id) {
        world.sendMessage("§c投票時間が終了しました");
        this.endVotingSession();
      }
    }, session.duration * 20); // Minecraftは20tick = 1秒
  }

  /**
   * 投票開始を通知
   */
  private announceVotingStart(session: VotingSession, config: VotingConfig): void {
    const voteTypeName = this.getVoteTypeDisplayName(session.voteType);
    const durationMinutes = Math.floor(session.duration / 60);
    
    world.sendMessage("§6" + "=".repeat(40));
    world.sendMessage(`§l§e${voteTypeName} 開始`);
    world.sendMessage(`§7制限時間: ${durationMinutes}分`);
    world.sendMessage(`§7投票権者: ${session.eligibleVoters.length}人`);
    world.sendMessage(`§7候補者数: ${session.candidates.length}人`);
    
    if (session.allowAbstain) {
      world.sendMessage("§7棄権投票が可能です");
    }
    
    world.sendMessage("§6" + "=".repeat(40));
  }

  /**
   * 投票結果を発表
   */
  private announceVotingResult(result: VotingResult): void {
    const voteTypeName = this.getVoteTypeDisplayName(result.session.voteType);
    
    world.sendMessage("§6" + "=".repeat(40));
    world.sendMessage(`§l§c${voteTypeName} 結果発表`);
    world.sendMessage(`§7総投票数: ${result.totalVotes} / 参加率: ${Math.round(result.participationRate)}%`);
    
    if (result.isTie) {
      world.sendMessage("§e同票のため決着がつきませんでした");
      const tiedNames = result.tiedCandidates
        .map(id => world.getAllPlayers().find(p => p.id === id)?.name || "不明")
        .join(", ");
      world.sendMessage(`§7同票者: ${tiedNames}`);
    } else if (result.winner) {
      const winner = world.getAllPlayers().find(p => p.id === result.winner);
      const winnerResult = result.results.find(r => r.candidateId === result.winner);
      if (winner && winnerResult) {
        world.sendMessage(`§a最多得票: ${winner.name} (${winnerResult.votes}票, ${Math.round(winnerResult.percentage)}%)`);
      }
    } else {
      world.sendMessage("§7有効な投票がありませんでした");
    }

    // 上位3名を表示
    const topResults = result.results.slice(0, 3);
    for (let i = 0; i < topResults.length; i++) {
      const rank = i + 1;
      const candidate = topResults[i];
      world.sendMessage(`§7${rank}位: ${candidate.candidateName} (${candidate.votes}票)`);
    }
    
    world.sendMessage("§6" + "=".repeat(40));
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
   * 全投票をクリア
   */
  public clearAllVotes(): void {
    this.currentSession = null;
    this.completedSessions = [];
    this.sessionCounter = 0;
    
    if (this.voteTimer) {
      system.clearRun(this.voteTimer);
      this.voteTimer = null;
    }
    
    console.log("All voting data cleared");
  }

  /**
   * デバッグ用：投票状況を出力
   */
  public debugVotingStatus(): void {
    console.log("=== Voting Status Debug ===");
    
    if (this.currentSession) {
      console.log(`Current session: ${this.currentSession.id} (${this.currentSession.voteType})`);
      console.log(`Status: ${this.currentSession.status}`);
      console.log(`Votes: ${this.currentSession.votes.length} / ${this.currentSession.eligibleVoters.length}`);
    } else {
      console.log("No current voting session");
    }
    
    console.log(`Completed sessions: ${this.completedSessions.length}`);
    
    const stats = this.getVotingStatistics();
    console.log(`Total votes: ${stats.totalVotes}`);
    console.log(`Average participation: ${Math.round(stats.averageParticipation)}%`);
    
    console.log("=== End Voting Status Debug ===");
  }
}