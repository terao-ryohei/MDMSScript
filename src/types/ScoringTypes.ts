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
  evidenceFound: number;      // 証拠発見
  accurateDeduction: number;  // 的確な推理
  rolePerformance: number;    // 役職パフォーマンス
  survivalBonus: number;      // 生存ボーナス
  speedBonus: number;         // 速度ボーナス
}

/**
 * 汎用目標
 */
export interface RandomObjective {
  id: string;
  description: string;
  checkCondition: (playerId: string) => boolean;
}

/**
 * プレイヤースコア詳細
 */
export interface PlayerScore {
  playerId: string;
  playerName: string;
  role: string;
  job: string;
  
  // 3点満点評価システム
  jobGoalAchieved: boolean;     // 職業目標達成 (1点)
  roleGoalAchieved: boolean;    // ロール目標達成 (1点)  
  randomGoalAchieved: boolean;  // 汎用目標達成 (1点)
  randomGoalDescription: string; // 汎用目標の内容
  
  // 最終スコア (0-3点)
  totalScore: number;
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
 * 汎用目標リスト
 */
// 動的にインポートされる関数群（循環インポートを回避）
let objectiveCheckers: any = {};

export function initializeObjectiveCheckers(checkers: any) {
  objectiveCheckers = checkers;
}

export const RANDOM_OBJECTIVES: RandomObjective[] = [
  {
    id: "first_evidence",
    description: "最初に証拠を発見する",
    checkCondition: (playerId: string) => {
      return objectiveCheckers.checkFirstEvidence ? objectiveCheckers.checkFirstEvidence(playerId) : false;
    }
  },
  {
    id: "most_active",
    description: "最も多くの行動を起こす",
    checkCondition: (playerId: string) => {
      return objectiveCheckers.checkMostActive ? objectiveCheckers.checkMostActive(playerId) : false;
    }
  },
  {
    id: "correct_vote",
    description: "投票で犯人を正しく特定する",
    checkCondition: (playerId: string) => {
      return objectiveCheckers.checkCorrectVote ? objectiveCheckers.checkCorrectVote(playerId) : false;
    }
  },
  {
    id: "survival",
    description: "ゲーム終了まで生存する",
    checkCondition: (playerId: string) => {
      return objectiveCheckers.checkSurvival ? objectiveCheckers.checkSurvival(playerId) : false;
    }
  },
  {
    id: "evidence_collector",
    description: "3つ以上の証拠を発見する",
    checkCondition: (playerId: string) => {
      return objectiveCheckers.checkEvidenceCollector ? objectiveCheckers.checkEvidenceCollector(playerId) : false;
    }
  }
];



