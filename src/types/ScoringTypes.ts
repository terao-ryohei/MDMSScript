import type { GamePhase } from "./PhaseTypes";

/**
 * 勝利条件
 */
export enum VictoryCondition {
	MURDERER_VICTORY = "murderer_victory", // 犯人勝利
	CITIZEN_VICTORY = "citizen_victory", // 市民勝利
	ACCOMPLICE_VICTORY = "accomplice_victory", // 共犯者勝利
	DRAW = "draw", // 引き分け
	TIME_LIMIT = "time_limit", // 時間切れ
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
	jobGoalAchieved: boolean; // 職業目標達成 (1点)
	roleGoalAchieved: boolean; // ロール目標達成 (1点)
	randomGoalAchieved: boolean; // 汎用目標達成 (1点)
	randomGoalDescription: string; // 汎用目標の内容

	// 最終スコア (0-3点)
	totalScore: number;
}

/**
 * ゲーム結果
 */
export interface GameResult extends Record<string, unknown> {
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

	// 統計情報
	totalVotingSessions: number;
	evidenceCollected: number;
	murdersCommitted: number;

	// MVP
	mvpPlayer?: PlayerScore;
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
let objectiveCheckers: Record<string, (playerId: string) => boolean> = {};

export function initializeObjectiveCheckers(
	checkers: Record<string, (playerId: string) => boolean>,
) {
	objectiveCheckers = checkers;
}

export const RANDOM_OBJECTIVES: RandomObjective[] = [
	{
		id: "first_evidence",
		description: "最初に証拠を発見する",
		checkCondition: (playerId: string) => {
			return objectiveCheckers.checkFirstEvidence
				? objectiveCheckers.checkFirstEvidence(playerId)
				: false;
		},
	},
	{
		id: "most_active",
		description: "最も多くの行動を起こす",
		checkCondition: (playerId: string) => {
			return objectiveCheckers.checkMostActive
				? objectiveCheckers.checkMostActive(playerId)
				: false;
		},
	},
	{
		id: "correct_vote",
		description: "投票で犯人を正しく特定する",
		checkCondition: (playerId: string) => {
			return objectiveCheckers.checkCorrectVote
				? objectiveCheckers.checkCorrectVote(playerId)
				: false;
		},
	},
	{
		id: "survival",
		description: "ゲーム終了まで生存する",
		checkCondition: (playerId: string) => {
			return objectiveCheckers.checkSurvival
				? objectiveCheckers.checkSurvival(playerId)
				: false;
		},
	},
	{
		id: "evidence_collector",
		description: "3つ以上の証拠を発見する",
		checkCondition: (playerId: string) => {
			return objectiveCheckers.checkEvidenceCollector
				? objectiveCheckers.checkEvidenceCollector(playerId)
				: false;
		},
	},
];
