/**
 * ロール専用UI管理関数群（関数ベース版）
 */

import type { Player } from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";
import { ROLE_DEFINITIONS as ROLES } from "../data/RoleDefinitions";
import { RoleType } from "../types/RoleTypes";
import { createActionForm, handleUIError } from "../utils/UIHelpers";
import {
	assignRolesToAllPlayers,
	debugRoleAssignments,
	getAccomplices,
	getCurrentRoleComposition,
	getDetectives,
	getMurderers,
	getVillagers,
	notifyAllPlayersRoles,
} from "./RoleAssignmentManager";
import { getPlayerRole } from "./ScoreboardManager";

/**
 * プレイヤーのロール詳細情報を表示
 */
export async function showRoleDetails(player: Player): Promise<void> {
	try {
		const role = getPlayerRole(player);

		if (!role) {
			player.sendMessage("§c役職が設定されていません");
			player.sendMessage("ゲーム管理者に役職の割り当てを依頼してください");
			return;
		}

		const roleConfig = ROLES[role];

		if (!roleConfig) {
			player.sendMessage("§c役職の設定情報が見つかりません");
			console.error(`Role config not found for role: ${role}`);
			return;
		}

		const form = new MessageFormData()
			.title(`§6あなたの役職: ${roleConfig.name}`)
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
		player.sendMessage("§c役職詳細の表示に失敗しました");
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
			.title("§6役職統計")
			.body(
				`§9現在の役職構成:\n\n` +
					`§c犯人: §6${composition.murderers}人\n` +
					`§6共犯者: §6${composition.accomplices}人\n` +
					`§3一般人: §6${composition.villagers + composition.detectives}人\n\n` +
					`※詳細な情報は管理者のみ表示されます`,
			)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show role statistics for ${player.name}:`, error);
		player.sendMessage("§c役職統計の表示に失敗しました");
	}
}

/**
 * ロール能力説明を表示
 */
export async function showRoleAbilities(player: Player): Promise<void> {
	try {
		const role = getPlayerRole(player);

		if (!role) {
			player.sendMessage("§c役職が設定されていません");
			player.sendMessage("ゲーム管理者に役職の割り当てを依頼してください");
			// 管理者に自動割り当てを促すメニューを提案
			const form = new MessageFormData()
				.title("§c役職未設定")
				.body(
					"役職が設定されていません。\n管理者にゲームの初期化を依頼するか、\n管理者権限があるならば役職を割り当ててください。",
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
				skillDescription = `未知の役職です\n役職: ${role}`;
		}

		const form = new MessageFormData()
			.title("§e役職能力")
			.body(skillDescription)
			.button1("§a了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show role skills for ${player.name}:`, error);
		player.sendMessage("§c役職能力の表示に失敗しました");
	}
}

/**
 * ロールヘルプメニューを表示
 */
export async function showRoleHelpMenu(player: Player): Promise<void> {
	try {
		const form = createActionForm(
			"§6役職ヘルプ",
			"役職に関する情報を表示します",
		)
			.button("あなたの役職詳細", "textures/ui/person")
			.button("役職能力説明", "textures/ui/absorption_effect")
			.button("役職統計", "textures/ui/friend_glyph")
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
		player.sendMessage("§c役職ヘルプメニューの表示に失敗しました");
	}
}

/**
 * 管理者向けロール管理メニュー
 */
export async function showAdminRoleMenu(player: Player): Promise<void> {
	try {
		const form = createActionForm(
			"§lロール管理",
			"§7管理者向けのロール管理機能です",
		)
			.button("ロール再割り当て", "textures/ui/refresh")
			.button("ロール構成確認", "textures/ui/book_edit_default")
			.button("ロール統計", "textures/ui/friend_glyph")
			.button("デバッグ情報", "textures/ui/debug_glyph")
			.button("閉じる", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled) return;

		switch (response.selection) {
			case 0: // ロール再割り当て
				await confirmRoleReassignment(player);
				break;
			case 1: // ロール構成確認
				await showDetailedRoleComposition(player);
				break;
			case 2: // ロール統計
				await showRoleStatistics(player);
				break;
			case 3: // デバッグ情報
				debugRoleAssignments();
				player.sendMessage("§2ロールデバッグ情報をコンソールに出力しました");
				break;
		}
	} catch (error) {
		console.error(`Failed to show admin role menu for ${player.name}:`, error);
		player.sendMessage("§cロール管理メニューの表示に失敗しました");
	}
}

/**
 * ロール再割り当て確認
 */
async function confirmRoleReassignment(player: Player): Promise<void> {
	try {
		const form = new MessageFormData()
			.title("§lロール再割り当て確認")
			.body(
				"§cロールを再割り当てしますか？\n\n" +
					"§7この操作により全プレイヤーのロールが\n" +
					"§7ランダムに再設定されます。",
			)
			.button1("実行")
			.button2("キャンセル");

		const response = await form.show(player);

		if (response.canceled || response.selection === 1) {
			player.sendMessage("§2ロール再割り当てをキャンセルしました");
			return;
		}

		// ロール再割り当て実行
		const result = assignRolesToAllPlayers();
		if (result.success) {
			player.sendMessage("§2ロールの再割り当てが完了しました");
			notifyAllPlayersRoles();
		} else {
			player.sendMessage(`§cロール再割り当てエラー: ${result.error}`);
		}
	} catch (error) {
		console.error(
			`Failed to confirm role reassignment for ${player.name}:`,
			error,
		);
		player.sendMessage("§cロール再割り当て確認の表示に失敗しました");
	}
}

/**
 * 詳細なロール構成を表示（管理者向け）
 */
async function showDetailedRoleComposition(player: Player): Promise<void> {
	try {
		const murderers = getMurderers();
		const accomplices = getAccomplices();
		const citizens = getVillagers().concat(getDetectives());

		const murdererNames = murderers.map((p) => p.name).join(", ") || "なし";
		const accompliceNames = accomplices.map((p) => p.name).join(", ") || "なし";
		const citizenNames =
			citizens.map((p: Player) => p.name).join(", ") || "なし";

		const form = new MessageFormData()
			.title("§l詳細ロール構成")
			.body(
				`§c犯人 (${murderers.length}人):\n§j${murdererNames}\n\n` +
					`§6共犯者 (${accomplices.length}人):\n§j${accompliceNames}\n\n` +
					`§3一般人 (${citizens.length}人):\n§j${citizenNames}`,
			)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(
			`Failed to show detailed role composition for ${player.name}:`,
			error,
		);
		player.sendMessage("§c詳細ロール構成の表示に失敗しました");
	}
}
