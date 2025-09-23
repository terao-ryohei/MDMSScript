import { type Player, world } from "@minecraft/server";
import { JOB_DEFINITIONS } from "src/data/JobDefinitions";
import type { JobType } from "src/types/JobTypes";
import { ActionType } from "../types/ActionTypes";
import { GamePhase } from "../types/PhaseTypes";
import { RoleType } from "../types/RoleTypes";
import {
	type GameResult,
	initializeObjectiveCheckers,
	type PlayerScore,
	RANDOM_OBJECTIVES,
	type RandomObjective,
	type TeamScore,
	type VictoryCheckResult,
	VictoryCondition,
} from "../types/ScoringTypes";
import { getActionStatistics } from "./ActionTrackingManager";
import { getCurrentPhase } from "./PhaseManager";
import {
	getPlayerJob,
	getPlayerRole,
	getRoleString,
	roleTypeToNumber,
} from "./ScoreboardManager";
import {
	getCurrentVotingStatus,
	getPlayerVoteHistory,
	getVotingStatistics,
} from "./VotingManager";

/**
 * スコアリング・勝利判定管理マネージャー
 */

// let config: ScoringConfig = DEFAULT_SCORING_CONFIG; // 3点満点システムでは未使用
let gameStartTime: number = 0;
let currentGameResult: GameResult | null = null;
const playerRandomObjectives: Map<string, RandomObjective> = new Map();
let isInitialized: boolean = false;

export function initialize(): void {
	if (isInitialized) return;

	// 汎用目標チェッカー関数を初期化
	initializeObjectiveCheckers({
		checkFirstEvidence,
		checkMostActive,
		checkCorrectVote,
		checkSurvival,
		checkEvidenceCollector,
	});

	isInitialized = true;
	console.log("ScoringManager initialized (3-point evaluation system)");
}

/**
 * ゲーム開始時の初期化
 */
export function initializeGame(): void {
	gameStartTime = Date.now();
	currentGameResult = null;
	playerRandomObjectives.clear();
	assignRandomObjectives();
	console.log("Scoring system initialized for new game");
}

/**
 * 全プレイヤーに汎用目標をランダムに割り当て
 */
function assignRandomObjectives(): void {
	const players = world.getAllPlayers();

	for (const player of players) {
		const randomIndex = Math.floor(Math.random() * RANDOM_OBJECTIVES.length);
		const objective = RANDOM_OBJECTIVES[randomIndex];
		playerRandomObjectives.set(player.id, objective);
		console.log(
			`Assigned objective "${objective.description}" to ${player.name}`,
		);
	}
}

/**
 * 勝利条件チェック
 */
export function checkVictoryConditions(): VictoryCheckResult {
	try {
		const alivePlayers = world.getAllPlayers();

		// プレイヤー不足チェック（1人になったら終了）
		if (alivePlayers.length < 1) {
			return {
				isGameOver: true,
				victoryCondition: VictoryCondition.DRAW,
				reason: "プレイヤー不足によりゲーム終了",
				shouldEndGame: true,
			};
		}

		// 1人のみ生存の場合はその人の勝利
		if (alivePlayers.length === 1) {
			const survivor = alivePlayers[0];
			const role = getPlayerRole(survivor);

			if (role === RoleType.MURDERER) {
				// MURDERER
				return {
					isGameOver: true,
					victoryCondition: VictoryCondition.MURDERER_VICTORY,
					winningTeam: "犯人チーム",
					winnerIds: [survivor.id],
					reason: "犯人が最後の生存者になりました",
					shouldEndGame: true,
				};
			} else {
				// CITIZEN or ACCOMPLICE
				return {
					isGameOver: true,
					victoryCondition: VictoryCondition.CITIZEN_VICTORY,
					winningTeam:
						role === RoleType.ACCOMPLICE ? "共犯者チーム" : "市民チーム",
					winnerIds: [survivor.id],
					reason: "最後の生存者になりました",
					shouldEndGame: true,
				};
			}
		}

		// 生存者のロール分析
		const aliveRoles = alivePlayers.map((p) => getPlayerRole(p));
		const aliveMurderers = aliveRoles.filter(
			(role) => role === RoleType.MURDERER,
		).length;
		const aliveAccomplices = aliveRoles.filter(
			(role) => role === RoleType.ACCOMPLICE,
		).length;
		const aliveCitizens = aliveRoles.filter(
			(role) => role === RoleType.VILLAGER,
		).length;

		// 犯人勝利条件：犯人・共犯者数 >= 市民数
		if (
			aliveMurderers + aliveAccomplices >= aliveCitizens &&
			aliveMurderers > 0
		) {
			const winnerIds = alivePlayers
				.filter((p) => {
					const role = getPlayerRole(p);
					return role === RoleType.MURDERER || role === RoleType.ACCOMPLICE;
				})
				.map((p) => p.id);

			return {
				isGameOver: true,
				victoryCondition: VictoryCondition.MURDERER_VICTORY,
				winningTeam: "犯人チーム",
				winnerIds,
				reason: "犯人チームが市民チームと同数以上になりました",
				shouldEndGame: true,
			};
		}

		// 市民勝利条件：全ての犯人が排除
		if (aliveMurderers === 0) {
			const winnerIds = alivePlayers
				.filter((p) => getPlayerRole(p) === RoleType.VILLAGER)
				.map((p) => p.id);

			return {
				isGameOver: true,
				victoryCondition: VictoryCondition.CITIZEN_VICTORY,
				winningTeam: "市民チーム",
				winnerIds,
				reason: "全ての犯人が排除されました",
				shouldEndGame: true,
			};
		}

		// フェーズベースの勝利条件
		if (getCurrentPhase() === GamePhase.ENDING) {
			// 投票結果による勝利判定
			return checkVotingBasedVictory();
		}

		// 時間制限チェック（12時間）
		const elapsedTime = Date.now() - gameStartTime;
		if (elapsedTime > 12 * 60 * 60 * 1000) {
			return {
				isGameOver: true,
				victoryCondition: VictoryCondition.TIME_LIMIT,
				reason: "時間制限により引き分け",
				shouldEndGame: true,
			};
		}

		// ゲーム継続
		return {
			isGameOver: false,
			reason: "ゲーム継続中",
			shouldEndGame: false,
		};
	} catch (error) {
		console.error("Failed to check victory conditions:", error);
		return {
			isGameOver: false,
			reason: "勝利条件チェックエラー",
			shouldEndGame: false,
		};
	}
}

/**
 * 投票結果による勝利判定
 */
function checkVotingBasedVictory(): VictoryCheckResult {
	const stats = getVotingStatistics();

	if (stats.completedSessions === 0) {
		return {
			isGameOver: true,
			victoryCondition: VictoryCondition.DRAW,
			reason: "投票が行われませんでした",
			shouldEndGame: true,
		};
	}

	// 最終投票結果を分析
	// TODO: 投票結果履歴から最終審判の結果を取得して勝利判定

	return {
		isGameOver: true,
		victoryCondition: VictoryCondition.DRAW,
		reason: "投票による判定",
		shouldEndGame: true,
	};
}

/**
 * 全プレイヤーのスコアを計算
 */
export function calculateAllPlayerScores(): PlayerScore[] {
	try {
		const allPlayers = world.getAllPlayers();
		const playerScores: PlayerScore[] = [];

		for (const player of allPlayers) {
			const score = calculatePlayerScore(player);
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
export function calculatePlayerScore(player: Player): PlayerScore | null {
	try {
		const role = getPlayerRole(player);
		const jobId = getPlayerJob(player);

		const roleString = getRoleString(roleTypeToNumber(role));
		const jobString = JOB_DEFINITIONS[getPlayerJob(player)].name;

		// 3点満点評価システム
		const jobGoalAchieved = checkJobGoal(player, jobId);
		const roleGoalAchieved = checkRoleGoal(player, role);
		const randomObjective = playerRandomObjectives.get(player.id);
		const randomGoalAchieved = randomObjective
			? randomObjective.checkCondition(player.id)
			: false;
		const randomGoalDescription = randomObjective
			? randomObjective.description
			: "目標なし";

		// 最終スコア（0-3点）
		let totalScore = 0;
		if (jobGoalAchieved) totalScore += 1;
		if (roleGoalAchieved) totalScore += 1;
		if (randomGoalAchieved) totalScore += 1;

		return {
			playerId: player.id,
			playerName: player.name,
			role: roleString,
			job: jobString,
			jobGoalAchieved,
			roleGoalAchieved,
			randomGoalAchieved,
			randomGoalDescription,
			totalScore,
		};
	} catch (error) {
		console.error(`Failed to calculate score for ${player.name}:`, error);
		return null;
	}
}

/**
 * 職業目標の達成をチェック
 */
function checkJobGoal(player: Player, jobId: JobType): boolean {
	const actionRecords = getActionStatistics();
	const playerActions = actionRecords.actionsByPlayer.get(player.id) || 0;

	switch (jobId) {
		case "lord": // 領主: 会議で発言し、秩序を保つ
			return playerActions >= 10;

		case "captain": // 近衛隊長: 他のプレイヤーを守る行動を取る
			return playerActions >= 15;

		case "homunculus": // ホムンクルス: 特殊な行動を多数実行
			return playerActions >= 20;

		case "court_alchemist": // 宮廷錬金術師: 証拠を科学的に分析
			// 証拠に関連する行動が5回以上
			return playerActions >= 8;

		case "rogue_alchemist": // 野良錬金術師: 独自の調査を行う
			return playerActions >= 12;

		case "thief": // 盗賊: 隠密行動で情報収集
			// 移動系アクションが多い
			return playerActions >= 15;

		case "pharmacist": // 薬師: 毒や治療に関する知識で貢献
			return playerActions >= 8;

		case "maid": // メイド: 清掃や整理で証拠を発見
			return playerActions >= 6;

		case "butler": // 執事: プレイヤー間の調整役
			return playerActions >= 8;

		case "soldier": // 一般兵士: 基本的な警備任務
			return playerActions >= 5;

		case "student": // 学生: 学習意欲で情報収集
			return playerActions >= 7;

		case "adventurer": // 冒険者: 積極的な探索
			return playerActions >= 10;

		default:
			return playerActions >= 5; // デフォルト目標
	}
}

/**
 * ロール目標の達成をチェック
 */
function checkRoleGoal(player: Player, role: RoleType): boolean {
	const votingStats = getVotingStatistics();
	const playerVotes = getPlayerVoteHistory(player.id);

	switch (role) {
		case RoleType.MURDERER: {
			// 殺人者: 投票で発覚しなかった場合に達成
			const murdererVotedOut = checkIfPlayerWasVotedOut(player.id);
			return !murdererVotedOut;
		}
		case RoleType.VILLAGER: {
			// 村人: 投票で犯人を正しく特定した場合に達成
			const villagerVotedCorrectly = checkIfVotedForMurderer(player.id);
			return villagerVotedCorrectly;
		}
		case RoleType.DETECTIVE: {
			// 探偵: 証拠を多く発見し、犯人を特定した場合に達成
			const detecitveVotedCorrectly = checkIfVotedForMurderer(player.id);
			const actionStats = getActionStatistics();
			const detectiveActions = actionStats.actionsByPlayer.get(player.id) || 0;
			return detecitveVotedCorrectly && detectiveActions >= 8;
		}
		case RoleType.ACCOMPLICE: {
			// 共犯者: 犯人をサポートし、自分も発覚しなかった場合に達成
			const accompliceVotedOut = checkIfPlayerWasVotedOut(player.id);
			return !accompliceVotedOut;
		}
		default: {
			return false;
		}
	}
}

/**
 * プレイヤーが投票で追放されたかをチェック
 */
function checkIfPlayerWasVotedOut(playerId: string): boolean {
	const votingStats = getVotingStatistics();
	const completedSessions =
		votingStats.totalSessions - (getCurrentVotingStatus() ? 1 : 0);

	// 投票結果で最多得票者になったかをチェック
	// TODO: 実際の投票結果データから判定する必要がある
	// 現在は仮実装として、確率的に判定
	return Math.random() < 0.3;
}

/**
 * プレイヤーが犯人に正しく投票したかをチェック
 */
function checkIfVotedForMurderer(playerId: string): boolean {
	const playerVotes = getPlayerVoteHistory(playerId);

	// 実際の犯人を特定する必要がある
	// TODO: 実際の犯人データから判定する必要がある
	// 現在は仮実装として、投票した場合に確率的に正解とする
	if (playerVotes.length > 0) {
		return Math.random() < 0.4;
	}
	return false;
}

/**
 * プレイヤーの汎用目標を取得
 */
export function getPlayerRandomObjective(
	playerId: string,
): RandomObjective | null {
	return playerRandomObjectives.get(playerId) || null;
}

// 汎用目標チェック関数の実装
/**
 * 最初に証拠を発見したかをチェック
 */
export function checkFirstEvidence(playerId: string): boolean {
	// TODO: 実際の証拠発見時刻データから判定
	// 現在は行動統計から推定
	const actionStats = getActionStatistics();
	const playerActions = actionStats.actionsByPlayer.get(playerId) || 0;
	return playerActions >= 3; // 仮実装: 行動数が多い場合に達成とする
}

/**
 * 最も多くの行動を起こしたかをチェック
 */
export function checkMostActive(playerId: string): boolean {
	const actionStats = getActionStatistics();
	const playerActions = actionStats.actionsByPlayer.get(playerId) || 0;

	// 全プレイヤー中で最も行動数が多いかをチェック
	let maxActions = 0;
	for (const [_, actions] of actionStats.actionsByPlayer) {
		maxActions = Math.max(maxActions, actions);
	}

	return playerActions === maxActions && playerActions > 0;
}

/**
 * 投票で犯人を正しく特定したかをチェック
 */
export function checkCorrectVote(playerId: string): boolean {
	// checkIfVotedForMurderer関数を再利用
	return checkIfVotedForMurderer(playerId);
}

/**
 * ゲーム終了まで生存したかをチェック
 */
export function checkSurvival(playerId: string): boolean {
	// 現在のところ、全員生存している前提
	// TODO: 実際の生存データから判定
	const player = world.getAllPlayers().find((p) => p.id === playerId);
	return player !== undefined; // プレイヤーが存在する場合は生存とする
}

/**
 * 3つ以上の証拠を発見したかをチェック
 */
export function checkEvidenceCollector(playerId: string): boolean {
	const actionStats = getActionStatistics();
	const playerActions = actionStats.actionsByPlayer.get(playerId) || 0;

	// TODO: 実際の証拠発見データから判定
	// 現在は行動数から推定 (行動数の1/3が証拠発見と仮定)
	const estimatedEvidenceCount = Math.floor(playerActions / 3);
	return estimatedEvidenceCount >= 3;
}

/**
 * チームスコアを計算
 */
export function calculateTeamScores(playerScores: PlayerScore[]): TeamScore[] {
	const teams: { [key: string]: PlayerScore[] } = {};

	// ロール別にチーム分け
	for (const playerScore of playerScores) {
		const teamName = getTeamName(playerScore.role);
		if (!teams[teamName]) {
			teams[teamName] = [];
		}
		teams[teamName].push(playerScore);
	}

	const teamScores: TeamScore[] = [];

	for (const [teamName, members] of Object.entries(teams)) {
		const totalScore = members.reduce(
			(sum, member) => sum + member.totalScore,
			0,
		);
		const averageScore = members.length > 0 ? totalScore / members.length : 0;
		const teamBonus = calculateTeamBonus(members);

		teamScores.push({
			teamName,
			memberCount: members.length,
			memberIds: members.map((m) => m.playerId),
			totalScore: totalScore + teamBonus,
			averageScore,
			teamBonus,
			isWinner: false, // 後で設定
		});
	}

	return teamScores.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * ゲーム結果を生成
 */
export function generateGameResult(): GameResult {
	try {
		const endTime = Date.now();
		const playerScores = calculateAllPlayerScores();
		const teamScores = calculateTeamScores(playerScores);
		const victoryResult = checkVictoryConditions();

		// 勝利チーム設定
		if (victoryResult.winnerIds) {
			for (const teamScore of teamScores) {
				teamScore.isWinner = teamScore.memberIds.some((id) =>
					victoryResult.winnerIds!.includes(id),
				);
			}
		}

		// MVP選出
		const mvpPlayer = selectMVP(playerScores);

		const gameResult: GameResult = {
			gameId: `game_${gameStartTime}`,
			startTime: gameStartTime,
			endTime,
			duration: endTime - gameStartTime,
			finalPhase: getCurrentPhase(),
			victoryCondition: victoryResult.victoryCondition || VictoryCondition.DRAW,
			winningTeam: victoryResult.winningTeam || "なし",
			winnerIds: victoryResult.winnerIds || [],
			playerScores,
			teamScores,
			totalVotingSessions: getVotingStatistics().completedSessions,
			evidenceCollected: getActionStatistics().totalActions,
			murdersCommitted: getMurderCount(),
			mvpPlayer,
		};

		currentGameResult = gameResult;
		return gameResult;
	} catch (error) {
		console.error("Failed to generate game result:", error);
		throw error;
	}
}

/**
 * チーム名取得
 */
function getTeamName(role: string): string {
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
 * チームボーナス計算（3点満点システム用）
 */
function calculateTeamBonus(members: PlayerScore[]): number {
	// 3点満点システムではボーナスなし
	return 0;
}

/**
 * MVP選出（3点満点システム用）
 */
function selectMVP(playerScores: PlayerScore[]): PlayerScore | undefined {
	const maxScore = Math.max(...playerScores.map((p) => p.totalScore));
	return playerScores.find((p) => p.totalScore === maxScore);
}

/**
 * 殺人事件数取得
 */
function getMurderCount(): number {
	const stats = getActionStatistics();
	return stats.actionsByType.get(ActionType.MURDER) || 0;
}

/**
 * 現在のゲーム結果取得
 */
export function getCurrentGameResult(): GameResult | null {
	return currentGameResult;
}

/**
 * デバッグ用：スコア情報出力
 */
export function debugScoring(): void {
	console.log("=== Scoring System Debug ===");

	if (currentGameResult) {
		console.log(`Game ID: ${currentGameResult.gameId}`);
		console.log(`Victory: ${currentGameResult.victoryCondition}`);
		console.log(`Winner: ${currentGameResult.winningTeam}`);

		console.log("Top 3 Players:");
		currentGameResult.playerScores.slice(0, 3).forEach((player, index) => {
			console.log(
				`${index + 1}. ${player.playerName}: ${player.totalScore} points (${player.role})`,
			);
		});
	} else {
		console.log("No game result available");
	}

	console.log("=== End Scoring Debug ===");
}
