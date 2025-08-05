import { Player, world } from "@minecraft/server";
import { ScoreboardManager } from "./ScoreboardManager";
import { RoleAssignmentManager } from "./RoleAssignmentManager";
import { JobAssignmentManager } from "./JobAssignmentManager";
import { VotingManager } from "./VotingManager";
import { EvidenceAnalyzer } from "./EvidenceAnalyzer";
import { ActionTrackingManager } from "./ActionTrackingManager";
import { PhaseManager } from "./PhaseManager";
import { 
  VictoryCondition, 
  PlayerScore, 
  TeamScore, 
  GameResult, 
  VictoryCheckResult,
  ScoringConfig,
  DEFAULT_SCORING_CONFIG,
  ROLE_BASE_SCORES,
  JOB_SCORE_MULTIPLIERS
} from "../types/ScoringTypes";
import { GamePhase } from "../types/PhaseTypes";
import { VoteType } from "../types/VotingTypes";

/**
 * スコアリング・勝利判定管理マネージャー
 */
export class ScoringManager {
  private static instance: ScoringManager;
  private scoreboardManager: ScoreboardManager;
  private roleAssignmentManager: RoleAssignmentManager;
  private jobAssignmentManager: JobAssignmentManager;
  private votingManager: VotingManager;
  private evidenceAnalyzer: EvidenceAnalyzer;
  private actionTrackingManager: ActionTrackingManager;
  private phaseManager: PhaseManager;
  
  private config: ScoringConfig;
  private gameStartTime: number = 0;
  private currentGameResult: GameResult | null = null;

  private constructor() {
    this.scoreboardManager = ScoreboardManager.getInstance();
    this.roleAssignmentManager = RoleAssignmentManager.getInstance();
    this.jobAssignmentManager = JobAssignmentManager.getInstance();
    this.votingManager = VotingManager.getInstance();
    this.evidenceAnalyzer = EvidenceAnalyzer.getInstance();
    this.actionTrackingManager = ActionTrackingManager.getInstance();
    this.phaseManager = PhaseManager.getInstance();
    this.config = DEFAULT_SCORING_CONFIG;
  }

  public static getInstance(): ScoringManager {
    if (!ScoringManager.instance) {
      ScoringManager.instance = new ScoringManager();
    }
    return ScoringManager.instance;
  }

  /**
   * ゲーム開始時の初期化
   */
  public initializeGame(): void {
    this.gameStartTime = Date.now();
    this.currentGameResult = null;
    console.log("Scoring system initialized for new game");
  }

  /**
   * 勝利条件チェック
   */
  public checkVictoryConditions(): VictoryCheckResult {
    try {
      const alivePlayers = world.getAllPlayers().filter(p => this.scoreboardManager.isPlayerAlive(p));
      const currentPhase = this.phaseManager.getCurrentPhase();
      
      // プレイヤー不足チェック
      if (alivePlayers.length < 2) {
        return {
          isGameOver: true,
          victoryCondition: VictoryCondition.DRAW,
          reason: "プレイヤー不足によりゲーム終了",
          shouldEndGame: true
        };
      }

      // 生存者の役職分析
      const aliveRoles = alivePlayers.map(p => this.scoreboardManager.getPlayerRole(p));
      const aliveMurderers = aliveRoles.filter(role => role === 1).length; // 1 = MURDERER
      const aliveAccomplices = aliveRoles.filter(role => role === 2).length; // 2 = ACCOMPLICE
      const aliveCitizens = aliveRoles.filter(role => role === 3).length; // 3 = CITIZEN

      // 犯人勝利条件：犯人・共犯者数 >= 市民数
      if (aliveMurderers + aliveAccomplices >= aliveCitizens && aliveMurderers > 0) {
        const winnerIds = alivePlayers
          .filter(p => {
            const role = this.scoreboardManager.getPlayerRole(p);
            return role === 1 || role === 2; // MURDERER or ACCOMPLICE
          })
          .map(p => p.id);

        return {
          isGameOver: true,
          victoryCondition: VictoryCondition.MURDERER_VICTORY,
          winningTeam: "犯人チーム",
          winnerIds,
          reason: "犯人チームが市民チームと同数以上になりました",
          shouldEndGame: true
        };
      }

      // 市民勝利条件：全ての犯人が排除
      if (aliveMurderers === 0) {
        const winnerIds = alivePlayers
          .filter(p => this.scoreboardManager.getPlayerRole(p) === 3) // CITIZEN
          .map(p => p.id);

        return {
          isGameOver: true,
          victoryCondition: VictoryCondition.CITIZEN_VICTORY,
          winningTeam: "市民チーム",
          winnerIds,
          reason: "全ての犯人が排除されました",
          shouldEndGame: true
        };
      }

      // フェーズベースの勝利条件
      if (currentPhase === GamePhase.ENDING) {
        // 投票結果による勝利判定
        return this.checkVotingBasedVictory();
      }

      // 時間制限チェック（12時間）
      const elapsedTime = Date.now() - this.gameStartTime;
      if (elapsedTime > 12 * 60 * 60 * 1000) {
        return {
          isGameOver: true,
          victoryCondition: VictoryCondition.TIME_LIMIT,
          reason: "時間制限により引き分け",
          shouldEndGame: true
        };
      }

      // ゲーム継続
      return {
        isGameOver: false,
        reason: "ゲーム継続中",
        shouldEndGame: false
      };

    } catch (error) {
      console.error("Failed to check victory conditions:", error);
      return {
        isGameOver: false,
        reason: "勝利条件チェックエラー",
        shouldEndGame: false
      };
    }
  }

  /**
   * 投票結果による勝利判定
   */
  private checkVotingBasedVictory(): VictoryCheckResult {
    const stats = this.votingManager.getVotingStatistics();
    
    if (stats.completedSessions === 0) {
      return {
        isGameOver: true,
        victoryCondition: VictoryCondition.DRAW,
        reason: "投票が行われませんでした",
        shouldEndGame: true
      };
    }

    // 最終投票結果を分析
    // TODO: 投票結果履歴から最終審判の結果を取得して勝利判定
    
    return {
      isGameOver: true,
      victoryCondition: VictoryCondition.DRAW,
      reason: "投票による判定",
      shouldEndGame: true
    };
  }

  /**
   * 全プレイヤーのスコアを計算
   */
  public calculateAllPlayerScores(): PlayerScore[] {
    try {
      const allPlayers = world.getAllPlayers();
      const playerScores: PlayerScore[] = [];

      for (const player of allPlayers) {
        const score = this.calculatePlayerScore(player);
        if (score) {
          playerScores.push(score);
        }
      }

      return playerScores.sort((a, b) => b.totalScore - a.totalScore);

    } catch (error) {
      console.error("Failed to calculate player scores:", error);
      return [];
    }
  }

  /**
   * 個別プレイヤーのスコアを計算
   */
  public calculatePlayerScore(player: Player): PlayerScore | null {
    try {
      const role = this.scoreboardManager.getPlayerRole(player);
      const job = this.scoreboardManager.getPlayerJob(player);
      const isAlive = this.scoreboardManager.isPlayerAlive(player);
      
      const roleString = this.scoreboardManager.getRoleString(role);
      const jobString = this.scoreboardManager.getJobString(job);

      // 基本スコア
      const baseScore = this.getBaseScore(roleString);
      
      // 各種スコア計算
      const voteScore = this.calculateVotingScore(player);
      const evidenceScore = this.calculateEvidenceScore(player);
      const deductionScore = this.calculateDeductionScore(player);
      const roleScore = this.calculateRolePerformanceScore(player);
      const bonusScore = this.calculateBonusScore(player, isAlive);
      const penaltyScore = this.calculatePenaltyScore(player);

      // 職業倍率
      const jobMultiplier = this.getJobMultiplier(jobString);
      
      // 最終スコア計算
      const subtotal = baseScore + voteScore + evidenceScore + deductionScore + roleScore + bonusScore + penaltyScore;
      const totalScore = Math.round(subtotal * jobMultiplier);

      // 統計情報
      const votingAccuracy = this.calculateVotingAccuracy(player);
      const evidenceCount = this.getPlayerEvidenceCount(player);
      const contributionLevel = this.calculateContributionLevel(player);

      return {
        playerId: player.id,
        playerName: player.name,
        role: roleString,
        job: jobString,
        isAlive,
        baseScore,
        voteScore,
        evidenceScore,
        deductionScore,
        roleScore,
        bonusScore,
        penaltyScore,
        totalScore,
        votingAccuracy,
        evidenceCount,
        contributionLevel
      };

    } catch (error) {
      console.error(`Failed to calculate score for ${player.name}:`, error);
      return null;
    }
  }

  /**
   * チームスコアを計算
   */
  public calculateTeamScores(playerScores: PlayerScore[]): TeamScore[] {
    const teams: { [key: string]: PlayerScore[] } = {};
    
    // 役職別にチーム分け
    for (const playerScore of playerScores) {
      const teamName = this.getTeamName(playerScore.role);
      if (!teams[teamName]) {
        teams[teamName] = [];
      }
      teams[teamName].push(playerScore);
    }

    const teamScores: TeamScore[] = [];
    
    for (const [teamName, members] of Object.entries(teams)) {
      const totalScore = members.reduce((sum, member) => sum + member.totalScore, 0);
      const averageScore = members.length > 0 ? totalScore / members.length : 0;
      const teamBonus = this.calculateTeamBonus(members);

      teamScores.push({
        teamName,
        memberCount: members.length,
        memberIds: members.map(m => m.playerId),
        totalScore: totalScore + teamBonus,
        averageScore,
        teamBonus,
        isWinner: false // 後で設定
      });
    }

    return teamScores.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * ゲーム結果を生成
   */
  public generateGameResult(): GameResult {
    try {
      const endTime = Date.now();
      const playerScores = this.calculateAllPlayerScores();
      const teamScores = this.calculateTeamScores(playerScores);
      const victoryResult = this.checkVictoryConditions();

      // 勝利チーム設定
      if (victoryResult.winnerIds) {
        for (const teamScore of teamScores) {
          teamScore.isWinner = teamScore.memberIds.some(id => 
            victoryResult.winnerIds!.includes(id)
          );
        }
      }

      // MVP選出
      const mvpPlayer = this.selectMVP(playerScores);
      const bestDetective = this.selectBestByJob(playerScores, "detective");
      const bestMurderer = this.selectBestByRole(playerScores, "murderer");

      const gameResult: GameResult = {
        gameId: `game_${this.gameStartTime}`,
        startTime: this.gameStartTime,
        endTime,
        duration: endTime - this.gameStartTime,
        finalPhase: this.phaseManager.getCurrentPhase(),
        victoryCondition: victoryResult.victoryCondition || VictoryCondition.DRAW,
        winningTeam: victoryResult.winningTeam || "なし",
        winnerIds: victoryResult.winnerIds || [],
        playerScores,
        teamScores,
        totalVotingSessions: this.votingManager.getVotingStatistics().completedSessions,
        evidenceCollected: this.actionTrackingManager.getActionStatistics().totalActions,
        murdersCommitted: this.getMurderCount(),
        mvpPlayer,
        bestDetective,
        bestMurderer
      };

      this.currentGameResult = gameResult;
      return gameResult;

    } catch (error) {
      console.error("Failed to generate game result:", error);
      throw error;
    }
  }

  /**
   * 投票スコア計算
   */
  private calculateVotingScore(player: Player): number {
    const votes = this.votingManager.getPlayerVoteHistory(player.id);
    let score = 0;

    for (const vote of votes) {
      if (vote.targetId === "ABSTAIN") {
        score += this.config.weights.abstention;
      } else {
        // TODO: 投票の正確性を判定
        // 現在は基本スコアのみ
        score += this.config.weights.correctVote * 0.5;
      }
    }

    return score;
  }

  /**
   * 証拠スコア計算
   */
  private calculateEvidenceScore(player: Player): number {
    const evidenceCount = this.getPlayerEvidenceCount(player);
    return evidenceCount * this.config.weights.evidenceFound;
  }

  /**
   * 推理スコア計算
   */
  private calculateDeductionScore(player: Player): number {
    // TODO: 推理の正確性を評価
    return this.config.weights.accurateDeduction * 0.5;
  }

  /**
   * 役職パフォーマンススコア計算
   */
  private calculateRolePerformanceScore(player: Player): number {
    const role = this.scoreboardManager.getPlayerRole(player);
    // TODO: 役職別の詳細パフォーマンス評価
    return this.config.weights.rolePerformance * 0.7;
  }

  /**
   * ボーナススコア計算
   */
  private calculateBonusScore(player: Player, isAlive: boolean): number {
    let bonus = 0;
    
    if (isAlive && this.config.enableBonuses) {
      bonus += this.config.weights.survivalBonus;
    }
    
    // 速度ボーナス（早期参加等）
    bonus += this.config.weights.speedBonus * 0.5;
    
    return bonus;
  }

  /**
   * ペナルティスコア計算
   */
  private calculatePenaltyScore(player: Player): number {
    // TODO: ペナルティ要因の評価
    return 0;
  }

  /**
   * 基本スコア取得
   */
  private getBaseScore(role: string): number {
    switch (role.toLowerCase()) {
      case "murderer":
        return ROLE_BASE_SCORES.murderer;
      case "accomplice":
        return ROLE_BASE_SCORES.accomplice;
      case "citizen":
        return ROLE_BASE_SCORES.citizen;
      default:
        return ROLE_BASE_SCORES.citizen;
    }
  }

  /**
   * 職業倍率取得
   */
  private getJobMultiplier(job: string): number {
    switch (job.toLowerCase()) {
      case "detective":
        return JOB_SCORE_MULTIPLIERS.detective;
      case "doctor":
        return JOB_SCORE_MULTIPLIERS.doctor;
      case "guard":
        return JOB_SCORE_MULTIPLIERS.guard;
      case "reporter":
        return JOB_SCORE_MULTIPLIERS.reporter;
      default:
        return JOB_SCORE_MULTIPLIERS.default;
    }
  }

  /**
   * チーム名取得
   */
  private getTeamName(role: string): string {
    switch (role.toLowerCase()) {
      case "murderer":
      case "accomplice":
        return "犯人チーム";
      case "citizen":
        return "市民チーム";
      default:
        return "不明";
    }
  }

  /**
   * チームボーナス計算
   */
  private calculateTeamBonus(members: PlayerScore[]): number {
    if (!this.config.rewardTeamwork || members.length === 0) {
      return 0;
    }
    
    const aliveMembers = members.filter(m => m.isAlive).length;
    const teamworkBonus = aliveMembers * 20;
    
    return teamworkBonus;
  }

  /**
   * MVP選出
   */
  private selectMVP(playerScores: PlayerScore[]): PlayerScore | undefined {
    const topPlayer = playerScores[0];
    if (topPlayer && topPlayer.totalScore >= this.config.mvpThreshold) {
      return topPlayer;
    }
    return undefined;
  }

  /**
   * 職業別ベスト選出
   */
  private selectBestByJob(playerScores: PlayerScore[], job: string): PlayerScore | undefined {
    const jobPlayers = playerScores.filter(p => p.job.toLowerCase() === job.toLowerCase());
    return jobPlayers.length > 0 ? jobPlayers[0] : undefined;
  }

  /**
   * 役職別ベスト選出
   */
  private selectBestByRole(playerScores: PlayerScore[], role: string): PlayerScore | undefined {
    const rolePlayers = playerScores.filter(p => p.role.toLowerCase() === role.toLowerCase());
    return rolePlayers.length > 0 ? rolePlayers[0] : undefined;
  }

  /**
   * プレイヤーの投票精度計算
   */
  private calculateVotingAccuracy(player: Player): number {
    // TODO: 投票の正確性を計算
    return 75; // 暫定値
  }

  /**
   * プレイヤーの証拠発見数取得
   */
  private getPlayerEvidenceCount(player: Player): number {
    const records = this.actionTrackingManager.getPlayerActions(player.id);
    return records.filter(r => r.isEvidence).length;
  }

  /**
   * プレイヤーの貢献度計算
   */
  private calculateContributionLevel(player: Player): number {
    // TODO: 総合的な貢献度を計算
    return 60; // 暫定値
  }

  /**
   * 殺人事件数取得
   */
  private getMurderCount(): number {
    const stats = this.actionTrackingManager.getActionStatistics();
    return stats.actionsByType.get("murder" as any) || 0;
  }

  /**
   * 現在のゲーム結果取得
   */
  public getCurrentGameResult(): GameResult | null {
    return this.currentGameResult;
  }

  /**
   * スコアリング設定更新
   */
  public updateScoringConfig(config: Partial<ScoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * デバッグ用：スコア情報出力
   */
  public debugScoring(): void {
    console.log("=== Scoring System Debug ===");
    
    if (this.currentGameResult) {
      console.log(`Game ID: ${this.currentGameResult.gameId}`);
      console.log(`Victory: ${this.currentGameResult.victoryCondition}`);
      console.log(`Winner: ${this.currentGameResult.winningTeam}`);
      
      console.log("Top 3 Players:");
      this.currentGameResult.playerScores.slice(0, 3).forEach((player, index) => {
        console.log(`${index + 1}. ${player.playerName}: ${player.totalScore} points (${player.role})`);
      });
    } else {
      console.log("No game result available");
    }
    
    console.log("=== End Scoring Debug ===");
  }
}