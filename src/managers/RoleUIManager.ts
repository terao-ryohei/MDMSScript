/**
 * ロール専用UI管理関数群（関数ベース版）
 */

import type { Player } from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";
import { ROLE_DEFINITIONS as ROLES } from "../data/RoleDefinitions";
import { RoleType } from "../types/RoleTypes";
import { createActionForm, handleUIError } from "../utils/UIHelpers";
import {
	getAccomplices,
	getCurrentRoleComposition,
	getDetectives,
	getMurderers,
	getVillagers,
} from "./RoleAssignmentManager";
import { getPlayerRole } from "./ScoreboardManager";

/**
 * プレイヤーのロール詳細情報を表示
 */
export async function showRoleDetails(player: Player): Promise<void> {
	try {
		const role = getPlayerRole(player);

		if (!role) {
			player.sendMessage("§cロールが設定されていません");
			player.sendMessage("ゲーム管理者にロールの割り当てを依頼してください");
			return;
		}

		const roleConfig = ROLES[role];

		if (!roleConfig) {
			player.sendMessage("§cロールの設定情報が見つかりません");
			console.error(`Role config not found for role: ${role}`);
			return;
		}

		const form = new MessageFormData()
			.title(`§6あなたのロール: ${roleConfig.name}`)
			.body(
				`§6${roleConfig.name}\n\n` +
					`§9説明: ${roleConfig.description}\n\n` +
					`§9特殊ルール:\n` +
					roleConfig.specialRules.map((rule) => `- ${rule}`).join("\n") +
					"\n\n" +
					`§9基本能力ID: ${roleConfig.baseAbilityId}\n` +
					`§9基本目的ID: ${roleConfig.baseObjectiveId}`,
			)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show role details for ${player.name}:`, error);
		player.sendMessage("§cロール詳細の表示に失敗しました");
		handleUIError(player, error as Error);
	}
}

/**
 * ロール統計情報を表示
 */
export async function showRoleStatistics(player: Player): Promise<void> {
	try {
		const composition = getCurrentRoleComposition();
		const murderers = getMurderers();
		const accomplices = getAccomplices();
		const citizens = getVillagers().concat(getDetectives());

		const form = new MessageFormData()
			.title("§6ロール統計")
			.body(
				`§9現在のロール構成:\n\n` +
					`§c犯人: §6${composition.murderers}人\n` +
					`§6共犯者: §6${composition.accomplices}人\n` +
					`§3村人: §6${composition.villagers + composition.detectives}人\n\n` +
					`※詳細な情報は管理者のみ表示されます`,
			)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show role statistics for ${player.name}:`, error);
		player.sendMessage("§cロール統計の表示に失敗しました");
	}
}

/**
 * ロール能力説明を表示
 */
export async function showRoleAbilities(player: Player): Promise<void> {
	try {
		const role = getPlayerRole(player);

		if (!role) {
			player.sendMessage("§cロールが設定されていません");
			player.sendMessage("ゲーム管理者にロールの割り当てを依頼してください");
			// 管理者に自動割り当てを促すメニューを提案
			const form = new MessageFormData()
				.title("§cロール未設定")
				.body(
					"ロールが設定されていません。\n管理者にゲームの初期化を依頼するか、\n管理者権限があるならばロールを割り当ててください。",
				)
				.button1("§a了解")
				.button2("閉じる");
			await form.show(player);
			return;
		}

		let skillDescription = "";

		switch (role) {
			case RoleType.MURDERER:
				skillDescription =
					`§c【殺人能力】\n` +
					`- 半径4ブロック以内のプレイヤーをキルできます\n` +
					`- 生活フェーズ中の任意のタイミングで使用可能\n` +
					`- 事件発生タイミングを自由に選択できます\n\n` +
					`§c【勝利条件】\n` +
					`投票で最多票を避けて逃げ切ること`;
				break;

			case RoleType.ACCOMPLICE:
				skillDescription =
					`§6【内部情報】\n` +
					`- 犯人の名前または犯行時間のいずれかを知ることができます\n` +
					`- 犯人と密談が可能です\n` +
					`- 証拠隠滅行動が可能です\n\n` +
					`§6【勝利条件】\n` +
					`犯人の勝利をサポートすること`;
				break;

			case RoleType.VILLAGER:
				skillDescription =
					`§b【推理強化】\n` +
					`- 証拠の信頼性が10%向上します\n` +
					`- 探偵役がいる場合は推理力がさらに強化されます\n\n` +
					`§b【勝利条件】\n` +
					`真犯人を特定すること`;
				break;

			default:
				skillDescription = `未知のロールです\nロール: ${role}`;
		}

		const form = new MessageFormData()
			.title("§eロール能力")
			.body(skillDescription)
			.button1("§a了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show role skills for ${player.name}:`, error);
		player.sendMessage("§cロール能力の表示に失敗しました");
	}
}

/**
 * ロールヘルプメニューを表示
 */
export async function showRoleHelpMenu(player: Player): Promise<void> {
	try {
		const form = createActionForm(
			"§6ロールヘルプ",
			"ロールに関する情報を表示します",
		)
			.button("あなたのロール詳細", "textures/ui/person")
			.button("ロール能力説明", "textures/ui/absorption_effect")
			.button("ロール統計", "textures/ui/friend_glyph")
			.button("閉じる", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled) return;

		switch (response.selection) {
			case 0: // ロール詳細
				await showRoleDetails(player);
				break;
			case 1: // ロール能力
				await showRoleAbilities(player);
				break;
			case 2: // ロール統計
				await showRoleStatistics(player);
				break;
		}
	} catch (error) {
		console.error(`Failed to show role help menu for ${player.name}:`, error);
		player.sendMessage("§cロールヘルプメニューの表示に失敗しました");
	}
}
