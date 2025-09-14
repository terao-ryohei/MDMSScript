/**
 * ロール専用UI管理関数群（関数ベース版）
 */

import type { Player } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { createActionForm, handleUIError } from "../utils/UIHelpers";
import { ROLES } from "../constants/RoleConfigs";
import { RoleType } from "../types/RoleTypes";
import {
	assignRolesToAllPlayers,
	debugRoleAssignments,
	getAccomplices,
	getVillagers,
	getDetectives,
	getCurrentRoleComposition,
	getMurderers,
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
			player.sendMessage("§cロールが設定されていません");
			return;
		}

		const roleConfig = ROLES[role];

		const form = new MessageFormData()
			.title(`§l§6あなたのロール: ${roleConfig.name}`)
			.body(
				`§e${roleConfig.name}\n\n` +
					`§6説明: §f${roleConfig.description}\n\n` +
					`§6特殊ルール:\n` +
					roleConfig.specialRules.map((rule) => `§f- ${rule}`).join("\n") +
					"\n\n" +
					`§6基本能力ID: §f${roleConfig.baseAbilityId}\n` +
					`§6基本目的ID: §f${roleConfig.baseObjectiveId}`,
			)
			.button1("§a了解")
			.button2("§7閉じる");

		await form.show(player);
	} catch (error) {
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
			.title("§l§eロール統計")
			.body(
				`§6現在のロール構成:\n\n` +
					`§c犯人: §f${composition.murderers}人\n` +
					`§6共犯者: §f${composition.accomplices}人\n` +
					`§b一般人: §f${composition.villagers + composition.detectives}人\n\n` +
					`§7※詳細な情報は管理者のみ表示されます`,
			)
			.button1("§a了解")
			.button2("§7閉じる");

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
			return;
		}

		let abilityDescription = "";

		switch (role) {
			case RoleType.MURDERER:
				abilityDescription =
					`§c【殺人能力】\n` +
					`§f- 半径4ブロック以内のプレイヤーをキルできます\n` +
					`§f- 生活フェーズ中の任意のタイミングで使用可能\n` +
					`§f- 事件発生タイミングを自由に選択できます\n\n` +
					`§c【勝利条件】\n` +
					`§f- 投票で最多票を避けて逃げ切ること`;
				break;

			case RoleType.ACCOMPLICE:
				abilityDescription =
					`§6【内部情報】\n` +
					`§f- 犯人の名前または犯行時間のいずれかを知ることができます\n` +
					`§f- 犯人と密談が可能です\n` +
					`§f- 証拠隠滅行動が可能です\n\n` +
					`§6【勝利条件】\n` +
					`§f- 犯人の勝利をサポートすること`;
				break;

			case RoleType.VILLAGER:
				abilityDescription =
					`§b【推理強化】\n` +
					`§f- 証拠の信頼性が10%向上します\n` +
					`§f- 探偵役がいる場合は推理力がさらに強化されます\n\n` +
					`§b【勝利条件】\n` +
					`§f- 真犯人を特定すること`;
				break;
		}

		const form = new MessageFormData()
			.title("§l§aロール能力")
			.body(abilityDescription)
			.button1("§a了解")
			.button2("§7閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show role abilities for ${player.name}:`, error);
		player.sendMessage("§cロール能力の表示に失敗しました");
	}
}

/**
 * ロールヘルプメニューを表示
 */
export async function showRoleHelpMenu(player: Player): Promise<void> {
	try {
		const form = new ActionFormData()
			.title("§l§6ロールヘルプ")
			.body("§7ロールに関する情報を表示します")
			.button("§eあなたのロール詳細", "textures/ui/person")
			.button("§aロール能力説明", "textures/ui/absorption_effect")
			.button("§bロール統計", "textures/ui/friend_glyph")
			.button("§7閉じる", "textures/ui/cancel");

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

/**
 * 管理者向けロール管理メニュー
 */
export async function showAdminRoleMenu(player: Player): Promise<void> {
	try {
		const form = new ActionFormData()
			.title("§l§cロール管理")
			.body("§7管理者向けのロール管理機能です")
			.button("§aロール再割り当て", "textures/ui/refresh")
			.button("§eロール構成確認", "textures/ui/book_edit_default")
			.button("§bロール統計", "textures/ui/friend_glyph")
			.button("§6デバッグ情報", "textures/ui/debug_glyph")
			.button("§7閉じる", "textures/ui/cancel");

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
				player.sendMessage("§aロールデバッグ情報をコンソールに出力しました");
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
			.title("§l§cロール再割り当て確認")
			.body(
				"§cロールを再割り当てしますか？\n\n" +
					"§7この操作により全プレイヤーのロールが\n" +
					"§7ランダムに再設定されます。",
			)
			.button1("§c実行")
			.button2("§aキャンセル");

		const response = await form.show(player);

		if (response.canceled || response.selection === 1) {
			player.sendMessage("§aロール再割り当てをキャンセルしました");
			return;
		}

		// ロール再割り当て実行
		const result = assignRolesToAllPlayers();
		if (result.success) {
			player.sendMessage("§aロールの再割り当てが完了しました");
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
		const citizenNames = citizens.map((p: any) => p.name).join(", ") || "なし";

		const form = new MessageFormData()
			.title("§l§c詳細ロール構成")
			.body(
				`§c犯人 (${murderers.length}人):\n§f${murdererNames}\n\n` +
					`§6共犯者 (${accomplices.length}人):\n§f${accompliceNames}\n\n` +
					`§b一般人 (${citizens.length}人):\n§f${citizenNames}`,
			)
			.button1("§a了解")
			.button2("§7閉じる");

		await form.show(player);
	} catch (error) {
		console.error(
			`Failed to show detailed role composition for ${player.name}:`,
			error,
		);
		player.sendMessage("§c詳細ロール構成の表示に失敗しました");
	}
}
