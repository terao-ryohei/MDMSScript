/**
 * 投票UI管理関数群（関数ベース版）
 */

import { type Player, world } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import {
	DEFAULT_VOTING_CONFIGS,
	VoteStatus,
	VoteType,
	type VotingSession,
} from "../types/VotingTypes";
import { getEvidenceData, getAllPlayers } from "./EvidenceAnalyzer";
import { isPlayerAlive } from "./ScoreboardManager";
import {
	calculateVotingResult,
	castVote,
	getCurrentVotingStatus,
	getPlayerVoteHistory,
	getVotingStatistics,
	startVotingSession,
} from "./VotingManager";

/**
 * 投票メインメニューを表示
 */
export async function showVotingMenu(player: Player): Promise<void> {
	try {
		const currentSession = getCurrentVotingStatus();

		if (currentSession && currentSession.status === VoteStatus.IN_PROGRESS) {
			await showVotingInterface(player);
		} else {
			player.sendMessage("§c現在投票中ではありません");
		}
	} catch (error) {
		console.error(`Failed to show voting menu for ${player.name}:`, error);
		player.sendMessage("§c投票メニューの表示に失敗しました");
	}
}

/**
 * 投票開始メニューを表示
 */
export async function showStartVotingMenu(player: Player): Promise<void> {
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

		const voteTypes = [
			VoteType.MURDER_SUSPECT,
			VoteType.EXILE,
			VoteType.FINAL_JUDGMENT,
		];
		const selectedType = voteTypes[response.selection!];

		await showCandidateSelection(player, selectedType);
	} catch (error) {
		console.error(
			`Failed to show start voting menu for ${player.name}:`,
			error,
		);
		player.sendMessage("§c投票開始メニューの表示に失敗しました");
	}
}

/**
 * 候補者選択画面を表示
 */
export async function showCandidateSelection(
	player: Player,
	voteType: VoteType,
): Promise<void> {
	try {
		const alivePlayers = world.getAllPlayers().filter((p) => isPlayerAlive(p));

		if (alivePlayers.length < 2) {
			player.sendMessage("§c投票可能なプレイヤーが不足しています");
			return;
		}

		const form = new ActionFormData()
			.title(`§l§6候補者選択 - ${getVoteTypeDisplayName(voteType)}`)
			.body(
				"§7投票対象の候補者を選択してください\n\n" +
					"§6参加者一覧:\n" +
					alivePlayers
						.map((p, index) => {
							return `§7${index + 1}. ${p.name}`;
						})
						.join("\n"),
			);

		for (const candidate of alivePlayers) {
			form.button(`§f${candidate.name}`, "textures/ui/friend_glyph");
		}

		form.button("§7キャンセル", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled || response.selection === alivePlayers.length) return;

		const selectedPlayer = alivePlayers[response.selection!];
		await confirmStartVoting(player, voteType, [selectedPlayer.id]);
	} catch (error) {
		console.error(
			`Failed to show candidate selection for ${player.name}:`,
			error,
		);
		player.sendMessage("§c候補者選択の表示に失敗しました");
	}
}

/**
 * 投票開始確認（内部関数）
 */
async function confirmStartVoting(
	player: Player,
	voteType: VoteType,
	candidates: string[],
): Promise<void> {
	try {
		const config = DEFAULT_VOTING_CONFIGS[voteType];
		const candidateNames = candidates
			.map(
				(id) => world.getAllPlayers().find((p) => p.id === id)?.name || "不明",
			)
			.join(", ");

		const form = new MessageFormData()
			.title("§l§c投票開始確認")
			.body(
				`§6投票タイプ: §f${getVoteTypeDisplayName(voteType)}\n` +
					`§6候補者: §f${candidateNames}\n` +
					`§6制限時間: §f${Math.floor(config.duration / 60)}分\n\n` +
					"§7この設定で投票を開始しますか？",
			)
			.button1("§a開始")
			.button2("§cキャンセル");

		const response = await form.show(player);

		if (response.canceled || response.selection === 1) {
			player.sendMessage("§7投票開始をキャンセルしました");
			return;
		}

		const result = startVotingSession(candidates);
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
export async function showVotingInterface(player: Player): Promise<void> {
	try {
		const currentSession = getCurrentVotingStatus();

		if (!currentSession || currentSession.status !== VoteStatus.IN_PROGRESS) {
			player.sendMessage("§c現在投票中ではありません");
			return;
		}

		const existingVote = currentSession.votes.find(
			(v) => v.voterId === player.id,
		);
		if (existingVote) {
			player.sendMessage("§c既に投票済みです");
			await showVotingStatus(player);
			return;
		}

		if (!currentSession.eligibleVoters.includes(player.id)) {
			player.sendMessage("§c投票権がありません");
			return;
		}

		const form = new ActionFormData()
			.title("§l§c犯人投票")
			.body(
				`§7犯人だと思うプレイヤーを選択してください\n\n` +
					`§6制限時間内に投票してください`,
			);

		for (const candidateId of currentSession.candidates) {
			const candidate = world.getAllPlayers().find((p) => p.id === candidateId);
			if (candidate && candidate.id !== player.id) {
				form.button(`§f${candidate.name}`, "textures/ui/friend_glyph");
			}
		}

		const response = await form.show(player);

		if (response.canceled) return;

		const validCandidates = currentSession.candidates.filter(
			(id) => id !== player.id,
		);

		if (response.selection! >= validCandidates.length) {
			player.sendMessage("§c無効な選択です");
			return;
		}

		const targetId = validCandidates[response.selection!];
		await showVoteConfirmation(player, targetId);
	} catch (error) {
		console.error(`Failed to show voting interface for ${player.name}:`, error);
		player.sendMessage("§c投票画面の表示に失敗しました");
	}
}

/**
 * 投票確認画面を表示（内部関数）
 */
async function showVoteConfirmation(
	player: Player,
	targetId: string,
): Promise<void> {
	try {
		const target = world.getAllPlayers().find((p) => p.id === targetId);
		const targetName = target ? target.name : "不明";

		const form = new MessageFormData()
			.title("§l§e投票確認")
			.body(
				`§6犯人として選択: §f${targetName}\n\n` +
					"§7この人を犯人として投票しますか？\n" +
					"§7投票後は変更できません。",
			)
			.button1("§a投票する")
			.button2("§cキャンセル");

		const response = await form.show(player);

		if (response.canceled || response.selection === 1) return;

		const confidence = 3; // デフォルト確信度
		const result = castVote(player.id, targetId, confidence);

		if (result.success) {
			player.sendMessage(
				`§a${targetName}に投票しました (確信度: ${confidence})`,
			);
		} else {
			player.sendMessage(`§c投票エラー: ${result.error}`);
		}
	} catch (error) {
		console.error(
			`Failed to show vote confirmation for ${player.name}:`,
			error,
		);
		player.sendMessage("§c投票確認の表示に失敗しました");
	}
}

/**
 * 投票状況を表示
 */
export async function showVotingStatus(player: Player): Promise<void> {
	try {
		const currentSession = getCurrentVotingStatus();

		if (!currentSession) {
			player.sendMessage("§c現在進行中の投票がありません");
			return;
		}

		const timeRemaining = getTimeRemaining(currentSession);
		const votedPlayers = currentSession.votes
			.map((v) => v.voterName)
			.join(", ");
		const notVotedPlayers = currentSession.eligibleVoters
			.filter((id) => !currentSession.votes.some((v) => v.voterId === id))
			.map(
				(id) => world.getAllPlayers().find((p) => p.id === id)?.name || "不明",
			)
			.join(", ");

		const result = calculateVotingResult(currentSession);
		const resultText = result.results
			.slice(0, 5)
			.map((r, index) => {
				return `§f${index + 1}. ${r.candidateName}: ${r.votes}票 (${Math.round(r.percentage)}%)`;
			})
			.join("\n");

		const form = new MessageFormData()
			.title(
				`§l§b投票状況 - ${getVoteTypeDisplayName(currentSession.voteType)}`,
			)
			.body(
				`§6残り時間: §f${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, "0")}\n` +
					`§6進捗: §f${currentSession.votes.length}/${currentSession.eligibleVoters.length}人投票済み\n\n` +
					`§6現在の得票状況:\n${resultText}\n\n` +
					`§6投票済み: §f${votedPlayers || "なし"}\n` +
					`§6未投票: §f${notVotedPlayers || "なし"}`,
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
export async function showVotingHistory(player: Player): Promise<void> {
	try {
		const playerVotes = getPlayerVoteHistory(player.id);

		if (playerVotes.length === 0) {
			const form = new MessageFormData()
				.title("§l§e投票履歴")
				.body("§7まだ投票記録がありません。")
				.button1("§a了解")
				.button2("§7閉じる");

			await form.show(player);
			return;
		}

		const historyText = playerVotes
			.slice(0, 10)
			.map((vote, index) => {
				const date = new Date(vote.timestamp).toLocaleString();
				const voteTypeName = getVoteTypeDisplayName(vote.voteType);
				return `§6[${index + 1}] §f${voteTypeName}\n§7${vote.targetName}に投票 (確信度: ${vote.confidence}) - ${date}`;
			})
			.join("\n\n");

		const form = new MessageFormData()
			.title("§l§e投票履歴")
			.body(
				`§6投票回数: §f${playerVotes.length}回\n\n` +
					`§6最近の投票 (最大10件):\n${historyText}`,
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
export async function showVotingStatistics(player: Player): Promise<void> {
	try {
		const stats = getVotingStatistics();

		const typeStatsText = Array.from(stats.votesByType.entries())
			.map(([type, count]) => `§f- ${getVoteTypeDisplayName(type)}: ${count}回`)
			.join("\n");

		const topVoters = Array.from(stats.votesByPlayer.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([playerId, count], index) => {
				const p = world
					.getAllPlayers()
					.find((player) => player.id === playerId);
				const playerName = p ? p.name : "不明";
				return `§f${index + 1}. ${playerName}: ${count}票`;
			})
			.join("\n");

		const form = new MessageFormData()
			.title("§l§d投票統計")
			.body(
				`§6総セッション数: §f${stats.totalSessions}回\n` +
					`§6完了セッション: §f${stats.completedSessions}回\n` +
					`§6総投票数: §f${stats.totalVotes}票\n` +
					`§6平均参加率: §f${Math.round(stats.averageParticipation)}%\n\n` +
					`§6投票タイプ別:\n${typeStatsText}\n\n` +
					`§6活発な投票者 (上位5名):\n${topVoters}`,
			)
			.button1("§a了解")
			.button2("§7閉じる");

		await form.show(player);
	} catch (error) {
		console.error(
			`Failed to show voting statistics for ${player.name}:`,
			error,
		);
		player.sendMessage("§c投票統計の表示に失敗しました");
	}
}

/**
 * 推理支援投票推奨を表示
 */
export async function showVotingRecommendation(player: Player): Promise<void> {
	try {
		const evidence = getEvidenceData();

		if (evidence.length === 0) {
			player.sendMessage("§c証拠データが不足しています");
			return;
		}

		const form = new MessageFormData()
			.title("§l§6証拠確認")
			.body(
				`§6現在の証拠情報:\n\n` +
					`§7発見された証拠数: §f${evidence.length}件\n\n` +
					`§7※証拠の詳細は証拠システムから確認してください\n` +
					`§7※投票は各自の推理と判断で行ってください`,
			)
			.button1("§a投票画面へ")
			.button2("§7閉じる");

		const response = await form.show(player);

		if (!response.canceled && response.selection === 0) {
			await showVotingInterface(player);
		}
	} catch (error) {
		console.error(
			`Failed to show voting recommendation for ${player.name}:`,
			error,
		);
		player.sendMessage("§c推理支援の表示に失敗しました");
	}
}

/**
 * 投票タイプの表示名を取得（ユーティリティ関数）
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
 * 残り時間を計算（ユーティリティ関数）
 */
function getTimeRemaining(session: VotingSession): number {
	const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
	return Math.max(0, session.duration - elapsed);
}
