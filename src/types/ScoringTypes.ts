import { VoteType, VotingResult } from "./VotingTypes";
import { GamePhase } from "./PhaseTypes";

/**
 * 勝利条件
 */
export enum VictoryCondition {
  MURDERER_VICTORY = "murderer_victory",       // 犯人勝利
  CITIZEN_VICTORY = "citizen_victory",         // 市民勝利
  ACCOMPLICE_VICTORY = "accomplice_victory",   // 共犯者勝利
  DRAW = "draw",                               // 引き分け
  TIME_LIMIT = "time_limit"                    // 時間切れ
}

/**
 * スコア計算基準
 */
export interface ScoreWeights {
  correctVote: number;        // 正しい投票
  incorrectVote: number;      // 間違った投票
  abstention: number;         // 棄権
  evidenceFound: number;      // 証拠発見
  accurateDeduction: number;  // 的確な推理
  rolePerformance: number;    // 役職パフォーマンス
  survivalBonus: number;      // 生存ボーナス
  speedBonus: number;         // 速度ボーナス
}

/**
 * プレイヤースコア詳細
 */
export interface PlayerScore {
  playerId: string;
  playerName: string;
  role: string;
  job: string;
  isAlive: boolean;
  
  // 基本スコア
  baseScore: number;
  
  // 詳細スコア
  voteScore: number;          // 投票スコア
  evidenceScore: number;      // 証拠スコア
  deductionScore: number;     // 推理スコア
  roleScore: number;          // 役職スコア
  bonusScore: number;         // ボーナススコア
  penaltyScore: number;       // ペナルティスコア
  
  // 最終スコア
  totalScore: number;
  
  // 詳細情報
  votingAccuracy: number;     // 投票精度(%)
  evidenceCount: number;      // 発見証拠数
  contributionLevel: number;  // 貢献度(%)
}

/**
 * チームスコア
 */
export interface TeamScore {
  teamName: string;
  memberCount: number;
  memberIds: string[];
  totalScore: number;
  averageScore: number;
  teamBonus: number;
  isWinner: boolean;
}

/**
 * ゲーム結果
 */
export interface GameResult {
  gameId: string;
  startTime: number;
  endTime: number;
  duration: number;
  finalPhase: GamePhase;
  
  // 勝利情報
  victoryCondition: VictoryCondition;
  winningTeam: string;
  winnerIds: string[];
  
  // スコア情報
  playerScores: PlayerScore[];
  teamScores: TeamScore[];
  
  // 統計情報
  totalVotingSessions: number;
  evidenceCollected: number;
  murdersCommitted: number;
  
  // MVP
  mvpPlayer?: PlayerScore;
  bestDetective?: PlayerScore;
  bestMurderer?: PlayerScore;
}

/**
 * スコアリング設定
 */
export interface ScoringConfig {
  weights: ScoreWeights;
  enableBonuses: boolean;
  penalizeIncorrectVotes: boolean;
  rewardTeamwork: boolean;
  mvpThreshold: number;       // MVP認定閾値
}

/**
 * 勝利判定結果
 */
export interface VictoryCheckResult {
  isGameOver: boolean;
  victoryCondition?: VictoryCondition;
  winningTeam?: string;
  winnerIds?: string[];
  reason: string;
  shouldEndGame: boolean;
}

/**
 * デフォルトスコア重み
 */
export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  correctVote: 100,
  incorrectVote: -20,
  abstention: -10,
  evidenceFound: 50,
  accurateDeduction: 75,
  rolePerformance: 80,
  survivalBonus: 30,
  speedBonus: 25
};

/**
 * デフォルトスコアリング設定
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: DEFAULT_SCORE_WEIGHTS,
  enableBonuses: true,
  penalizeIncorrectVotes: true,
  rewardTeamwork: true,
  mvpThreshold: 300
};

/**
 * 役職別基本スコア
 */
export const ROLE_BASE_SCORES = {
  murderer: 200,    // 犯人：高難易度
  accomplice: 150,  // 共犯者：中難易度
  citizen: 100      // 市民：基本
};

/**
 * 職業別スコア倍率
 */
export const JOB_SCORE_MULTIPLIERS = {
  detective: 1.2,   // 探偵：推理ボーナス
  doctor: 1.1,      // 医者：治療ボーナス
  guard: 1.1,       // 警備員：護衛ボーナス
  reporter: 1.15,   // 記者：情報ボーナス
  default: 1.0      // その他
};