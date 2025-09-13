import { system, world } from "@minecraft/server";
import {
	DEFAULT_VOTING_CONFIGS,
	type VoteCount,
	type VoteRecord,
	VoteStatus,
	VoteType,
	type VotingConfig,
	type VotingResult,
	type VotingSession,
	type VotingStatistics,
	type VotingSystemResult,
} from "../types/VotingTypes";
import {
	getPlayerVotes,
	isPlayerAlive,
	setPlayerVotes,
} from "./ScoreboardManager";

/**
 * 投票管理マネージャー
 * プレイヤー投票システムの完全な管理
 */

// モジュールスコープの状態変数
let currentSession: VotingSession | null = null;
let completedSessions: VotingSession[] = [];
let sessionCounter: number = 0;
let voteTimer: number | null = null;
let isInitialized: boolean = false;

/**
 * VotingManagerを初期化
 */
export function initializeVotingManager(): void {
	if (isInitialized) return;

	isInitialized = true;
	console.log("VotingManager initialized");
}

/**
 * 投票セッションを開始（簡素化：犯人投票のみ）
 */
export function startVotingSession(
	candidates?: string[],
	config?: Partial<VotingConfig>,
): VotingSystemResult {
	try {
		if (currentSession && currentSession.status === VoteStatus.IN_PROGRESS) {
			return {
				success: false,
				error: "既に投票が進行中です",
			};
		}

		// 犯人投票のみに固定
		const voteType = VoteType.MURDER_SUSPECT;
		const fullConfig = { ...DEFAULT_VOTING_CONFIGS[voteType], ...config };
		const alivePlayers = world.getAllPlayers().filter((p) => isPlayerAlive(p));

		if (alivePlayers.length === 0) {
			return {
				success: false,
				error: "投票可能なプレイヤーがいません",
			};
		}

		// 候補者が指定されていない場合は全生存者を候補にする
		const validCandidates = candidates
			? candidates.filter((id) => alivePlayers.some((p) => p.id === id))
			: alivePlayers.map((p) => p.id);

		if (validCandidates.length === 0) {
			return {
				success: false,
				error: "有効な候補者がいません",
			};
		}

		const session: VotingSession = {
			id: `vote_${sessionCounter++}`,
			voteType,
			status: VoteStatus.IN_PROGRESS,
			startTime: Date.now(),
			duration: fullConfig.duration,
			eligibleVoters: alivePlayers.map((p) => p.id),
			candidates: validCandidates,
			votes: [],
			requiresAll: fullConfig.requiresAll,
		};

		currentSession = session;
		startVoteTimer(session);

		// 簡素化：状況は表示せず、開始のみ通知
		world.sendMessage("§l§6犯人投票を開始します");
		world.sendMessage(
			"§7投票メニューを開いて犯人だと思うプレイヤーに投票してください",
		);

		console.log(`Murder voting started: ${session.id}`);
		return {
			success: true,
			message: "犯人投票が開始されました",
			data: session,
		};
	} catch (error) {
		console.error("Failed to start voting session:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "投票開始エラー",
		};
	}
}

/**
 * 投票を記録
 */
export function castVote(
	voterId: string,
	targetId: string,
	confidence: number = 3,
	reason?: string,
): VotingSystemResult {
	try {
		if (!currentSession || currentSession.status !== VoteStatus.IN_PROGRESS) {
			return {
				success: false,
				error: "現在投票中ではありません",
			};
		}

		const voter = world.getAllPlayers().find((p) => p.id === voterId);
		if (!voter) {
			return {
				success: false,
				error: "投票者が見つかりません",
			};
		}

		// 投票権チェック
		if (!currentSession.eligibleVoters.includes(voterId)) {
			return {
				success: false,
				error: "投票権がありません",
			};
		}

		// 既に投票済みかチェック
		const existingVote = currentSession.votes.find(
			(v) => v.voterId === voterId,
		);
		if (existingVote) {
			return {
				success: false,
				error: "既に投票済みです",
			};
		}

		// 候補者チェック
		if (!currentSession.candidates.includes(targetId)) {
			return {
				success: false,
				error: "無効な候補者です",
			};
		}

		// 自己投票チェック
		if (targetId === voterId) {
			return {
				success: false,
				error: "自分に投票することはできません",
			};
		}

		const target = world.getAllPlayers().find((p) => p.id === targetId);
		const targetName = target ? target.name : "不明";

		const voteRecord: VoteRecord = {
			voterId,
			voterName: voter.name,
			targetId,
			targetName,
			timestamp: Date.now(),
			voteType: currentSession.voteType,
			confidence: Math.max(1, Math.min(5, confidence)),
			reason,
		};

		currentSession.votes.push(voteRecord);

		// Scoreboardに投票数を更新
		const currentVotes = getPlayerVotes(target!);
		setPlayerVotes(target!, currentVotes + 1);

		// 投票完了チェック
		if (isVotingComplete()) {
			endVotingSession();
		}

		console.log(`Vote cast: ${voter.name} -> ${targetName}`);
		return {
			success: true,
			message: `${targetName}に投票しました`,
			data: voteRecord,
		};
	} catch (error) {
		console.error("Failed to cast vote:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "投票エラー",
		};
	}
}

/**
 * 投票セッションを強制終了
 */
export function endVotingSession(): VotingSystemResult {
	try {
		if (!currentSession) {
			return {
				success: false,
				error: "進行中の投票がありません",
			};
		}

		currentSession.status = VoteStatus.COMPLETED;
		currentSession.endTime = Date.now();

		if (voteTimer) {
			system.clearRun(voteTimer);
			voteTimer = null;
		}

		const result = calculateVotingResult(currentSession);
		completedSessions.push(currentSession);

		// 結果を発表
		announceVotingResult(result);

		const session = currentSession;
		currentSession = null;

		console.log(`Voting session ended: ${session.id}`);
		return {
			success: true,
			message: "投票が終了しました",
			data: result,
		};
	} catch (error) {
		console.error("Failed to end voting session:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "投票終了エラー",
		};
	}
}

/**
 * 現在の投票状況を取得
 */
export function getCurrentVotingStatus(): VotingSession | null {
	return currentSession;
}

/**
 * 投票結果を計算
 */
export function calculateVotingResult(session: VotingSession): VotingResult {
	try {
		const validVotes = session.votes;
		const abstentions = 0;

		// 候補者別得票数を計算
		const voteCounts = new Map<string, VoteCount>();

		for (const candidate of session.candidates) {
			const candidateVotes = validVotes.filter((v) => v.targetId === candidate);
			const player = world.getAllPlayers().find((p) => p.id === candidate);

			voteCounts.set(candidate, {
				candidateId: candidate,
				candidateName: player ? player.name : "不明",
				votes: candidateVotes.length,
				percentage:
					validVotes.length > 0
						? (candidateVotes.length / validVotes.length) * 100
						: 0,
				voters: candidateVotes.map((v) => v.voterId),
			});
		}

		const results = Array.from(voteCounts.values()).sort(
			(a, b) => b.votes - a.votes,
		);

		// 最多得票者を決定
		let winner: string | undefined;
		let isTie = false;
		let tiedCandidates: string[] = [];

		if (results.length > 0) {
			const maxVotes = results[0].votes;
			const topCandidates = results.filter((r) => r.votes === maxVotes);

			if (topCandidates.length === 1) {
				winner = topCandidates[0].candidateId;
			} else {
				isTie = true;
				tiedCandidates = topCandidates.map((c) => c.candidateId);
			}
		}

		const participationRate =
			session.eligibleVoters.length > 0
				? (session.votes.length / session.eligibleVoters.length) * 100
				: 0;

		return {
			session,
			totalVotes: session.votes.length,
			validVotes: validVotes.length,
			results,
			winner,
			isTie,
			tiedCandidates,
			participationRate,
		};
	} catch (error) {
		console.error("Failed to calculate voting result:", error);
		// エラー時はデフォルト結果を返す
		return {
			session,
			totalVotes: 0,
			validVotes: 0,
			results: [],
			isTie: false,
			tiedCandidates: [],
			participationRate: 0,
		};
	}
}

/**
 * プレイヤーの投票記録を取得
 */
export function getPlayerVoteHistory(playerId: string): VoteRecord[] {
	const allVotes: VoteRecord[] = [];

	// 現在のセッションの投票
	if (currentSession) {
		allVotes.push(
			...currentSession.votes.filter((v) => v.voterId === playerId),
		);
	}

	// 完了したセッションの投票
	for (const session of completedSessions) {
		allVotes.push(...session.votes.filter((v) => v.voterId === playerId));
	}

	return allVotes.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * 投票統計を取得
 */
export function getVotingStatistics(): VotingStatistics {
	const allSessions = [...completedSessions];
	if (currentSession) {
		allSessions.push(currentSession);
	}

	const votesByType = new Map<VoteType, number>();
	const votesByPlayer = new Map<string, number>();

	let totalVotes = 0;
	let totalParticipation = 0;

	for (const session of allSessions) {
		votesByType.set(
			session.voteType,
			(votesByType.get(session.voteType) || 0) + session.votes.length,
		);
		totalVotes += session.votes.length;

		if (session.eligibleVoters.length > 0) {
			totalParticipation +=
				session.votes.length / session.eligibleVoters.length;
		}

		for (const vote of session.votes) {
			votesByPlayer.set(
				vote.voterId,
				(votesByPlayer.get(vote.voterId) || 0) + 1,
			);
		}
	}

	return {
		totalSessions: allSessions.length,
		completedSessions: completedSessions.length,
		totalVotes,
		averageParticipation:
			allSessions.length > 0
				? (totalParticipation / allSessions.length) * 100
				: 0,
		votesByType,
		votesByPlayer,
	};
}

/**
 * 投票完了チェック
 */
function isVotingComplete(): boolean {
	if (!currentSession) return false;

	if (currentSession.requiresAll) {
		return currentSession.votes.length >= currentSession.eligibleVoters.length;
	}

	// 必須でない場合は、過半数が投票したら完了とする
	return (
		currentSession.votes.length >=
		Math.ceil(currentSession.eligibleVoters.length / 2)
	);
}

/**
 * 投票タイマーを開始
 */
function startVoteTimer(session: VotingSession): void {
	voteTimer = system.runTimeout(() => {
		if (currentSession && currentSession.id === session.id) {
			world.sendMessage("§c投票時間が終了しました");
			endVotingSession();
		}
	}, session.duration * 20); // Minecraftは20tick = 1秒
}

/**
 * 自動犯人投票を開始（投票フェーズ開始時に自動実行）
 */
export function startAutomaticMurderVoting(): VotingSystemResult {
	try {
		// 全生存者を候補として投票を開始
		const result = startVotingSession();

		if (result.success) {
			// 全プレイヤーに投票UI開始のイベントを送信
			system.run(() => {
				world
					.getDimension("overworld")
					.runCommand("scriptevent mdms:auto_voting_start {}");
			});
		}

		return result;
	} catch (error) {
		console.error("Failed to start automatic murder voting:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "自動投票開始エラー",
		};
	}
}

/**
 * 投票結果を発表（簡素化：最多得票者のみ）
 */
function announceVotingResult(result: VotingResult): void {
	world.sendMessage("§l§6犯人投票が終了しました");

	if (result.winner) {
		const winner = world.getAllPlayers().find((p) => p.id === result.winner);
		if (winner) {
			world.sendMessage(`§l§c${winner.name} §rが犯人として選ばれました`);
		}
	} else if (result.isTie) {
		world.sendMessage("§e同票のため犯人を決定できませんでした");
	} else {
		world.sendMessage("§7有効な投票がありませんでした");
	}
}

/**
 * 投票タイプの表示名を取得
 */
function getVoteTypeDisplayName(voteType: VoteType): string {
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
export function clearAllVotes(): void {
	currentSession = null;
	completedSessions = [];
	sessionCounter = 0;

	if (voteTimer) {
		system.clearRun(voteTimer);
		voteTimer = null;
	}

	console.log("All voting data cleared");
}

/**
 * デバッグ用：投票状況を出力
 */
export function debugVotingStatus(): void {
	console.log("=== Voting Status Debug ===");

	if (currentSession) {
		console.log(
			`Current session: ${currentSession.id} (${currentSession.voteType})`,
		);
		console.log(`Status: ${currentSession.status}`);
		console.log(
			`Votes: ${currentSession.votes.length} / ${currentSession.eligibleVoters.length}`,
		);
	} else {
		console.log("No current voting session");
	}

	console.log(`Completed sessions: ${completedSessions.length}`);

	const stats = getVotingStatistics();
	console.log(`Total votes: ${stats.totalVotes}`);
	console.log(
		`Average participation: ${Math.round(stats.averageParticipation)}%`,
	);

	console.log("=== End Voting Status Debug ===");
}
