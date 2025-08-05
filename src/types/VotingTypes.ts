import { Player } from "@minecraft/server";

/**
 * 投票タイプ
 */
export enum VoteType {
  MURDER_SUSPECT = "murder_suspect",     // 犯人投票
  EXILE = "exile",                       // 追放投票
  FINAL_JUDGMENT = "final_judgment"      // 最終審判
}

/**
 * 投票状態
 */
export enum VoteStatus {
  NOT_STARTED = "not_started",           // 未開始
  IN_PROGRESS = "in_progress",           // 進行中
  COMPLETED = "completed",               // 完了
  CANCELLED = "cancelled"                // キャンセル
}

/**
 * 投票記録
 */
export interface VoteRecord {
  voterId: string;                       // 投票者ID
  voterName: string;                     // 投票者名
  targetId: string;                      // 投票対象ID
  targetName: string;                    // 投票対象名
  timestamp: number;                     // 投票時刻
  voteType: VoteType;                    // 投票タイプ
  confidence: number;                    // 確信度（1-5）
  reason?: string;                       // 投票理由
}

/**
 * 投票セッション
 */
export interface VotingSession {
  id: string;                            // セッションID
  voteType: VoteType;                    // 投票タイプ
  status: VoteStatus;                    // 状態
  startTime: number;                     // 開始時刻
  endTime?: number;                      // 終了時刻
  duration: number;                      // 制限時間（秒）
  eligibleVoters: string[];              // 投票権者ID
  candidates: string[];                  // 候補者ID
  votes: VoteRecord[];                   // 投票記録
  allowAbstain: boolean;                 // 棄権許可
  requiresAll: boolean;                  // 全員投票必須
}

/**
 * 投票結果
 */
export interface VotingResult {
  session: VotingSession;
  totalVotes: number;                    // 総投票数
  validVotes: number;                    // 有効投票数
  abstentions: number;                   // 棄権数
  results: VoteCount[];                  // 得票結果
  winner?: string;                       // 最多得票者ID
  isTie: boolean;                        // 同票かどうか
  tiedCandidates: string[];              // 同票候補者
  participationRate: number;             // 参加率
}

/**
 * 得票数
 */
export interface VoteCount {
  candidateId: string;                   // 候補者ID
  candidateName: string;                 // 候補者名
  votes: number;                         // 得票数
  percentage: number;                    // 得票率
  voters: string[];                      // 投票者ID
}

/**
 * 投票設定
 */
export interface VotingConfig {
  voteType: VoteType;
  duration: number;                      // 制限時間（秒）
  allowAbstain: boolean;                 // 棄権許可
  requiresAll: boolean;                  // 全員投票必須
  allowSelfVote: boolean;                // 自己投票許可
  showRealTimeResults: boolean;          // リアルタイム結果表示
  announceVotes: boolean;                // 投票の公開
}

/**
 * 投票システム結果
 */
export interface VotingSystemResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * 投票統計
 */
export interface VotingStatistics {
  totalSessions: number;                 // 総セッション数
  completedSessions: number;             // 完了セッション数
  totalVotes: number;                    // 総投票数
  averageParticipation: number;          // 平均参加率
  votesByType: Map<VoteType, number>;    // タイプ別投票数
  votesByPlayer: Map<string, number>;    // プレイヤー別投票数
}

/**
 * デフォルト投票設定
 */
export const DEFAULT_VOTING_CONFIGS: Record<VoteType, VotingConfig> = {
  [VoteType.MURDER_SUSPECT]: {
    voteType: VoteType.MURDER_SUSPECT,
    duration: 300,                       // 5分
    allowAbstain: false,                 // 棄権不可
    requiresAll: true,                   // 全員投票必須
    allowSelfVote: false,                // 自己投票不可
    showRealTimeResults: false,          // リアルタイム結果非表示
    announceVotes: false                 // 投票非公開
  },
  [VoteType.EXILE]: {
    voteType: VoteType.EXILE,
    duration: 180,                       // 3分
    allowAbstain: true,                  // 棄権可能
    requiresAll: false,                  // 全員投票不要
    allowSelfVote: false,                // 自己投票不可
    showRealTimeResults: true,           // リアルタイム結果表示
    announceVotes: true                  // 投票公開
  },
  [VoteType.FINAL_JUDGMENT]: {
    voteType: VoteType.FINAL_JUDGMENT,
    duration: 600,                       // 10分
    allowAbstain: false,                 // 棄権不可
    requiresAll: true,                   // 全員投票必須
    allowSelfVote: false,                // 自己投票不可
    showRealTimeResults: false,          // リアルタイム結果非表示
    announceVotes: false                 // 投票非公開
  }
};