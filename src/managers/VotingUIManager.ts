/**
 * 投票UI管理関数群（関数ベース版）
 */

import { type Player, world } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { VoteStatus, VoteType, type VotingSession } from "../types/VotingTypes";
import {
	calculateVotingResult,
	castVote,
	getCurrentVotingStatus,
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
			.title("§l犯人投票")
			.body(
				`§7犯人だと思うプレイヤーを選択してください\n\n` +
					`§6制限時間内に投票してください`,
			);

		for (const candidateId of currentSession.candidates) {
			const candidate = world.getAllPlayers().find((p) => p.id === candidateId);
			if (candidate && candidate.id !== player.id) {
				form.button(`§j${candidate.name}`, "textures/ui/friend_glyph");
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
			.title("§l投票確認")
			.body(
				`§6犯人として選択: §j${targetName}\n\n` +
					"§7この人を犯人として投票しますか？\n" +
					"§7投票後は変更できません。",
			)
			.button1("投票する")
			.button2("キャンセル");

		const response = await form.show(player);

		if (response.canceled || response.selection === 1) return;

		const confidence = 3; // デフォルト確信度
		const result = castVote(player.id, targetId, confidence);

		if (result.success) {
			player.sendMessage(
				`§2${targetName}に投票しました (確信度: ${confidence})`,
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
				return `§j${index + 1}. ${r.candidateName}: ${r.votes}票 (${Math.round(r.percentage)}%)`;
			})
			.join("\n");

		const form = new MessageFormData()
			.title(
				`§l§3投票状況 - ${getVoteTypeDisplayName(currentSession.voteType)}`,
			)
			.body(
				`§6残り時間: §j${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, "0")}\n` +
					`§6進捗: §j${currentSession.votes.length}/${currentSession.eligibleVoters.length}人投票済み\n\n` +
					`§6現在の得票状況:\n${resultText}\n\n` +
					`§6投票済み: §j${votedPlayers || "なし"}\n` +
					`§6未投票: §j${notVotedPlayers || "なし"}`,
			)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show voting status for ${player.name}:`, error);
		player.sendMessage("§c投票状況の表示に失敗しました");
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
