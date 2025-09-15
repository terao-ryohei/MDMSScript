/**
 * 管理者UI管理関数群（関数ベース版）
 */

import { type Player, world } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { GamePhase } from "../types/PhaseTypes";
import { createActionForm } from "../utils/UIHelpers";
import {
	AdminAction,
	AdminPermission,
	executeAdminAction,
	getSystemStatistics,
	hasPermission,
} from "./AdminManager";
import {
	getPlayerRole,
	getRoleString,
	roleTypeToNumber,
} from "./ScoreboardManager";

// 依存マネージャーは関数ベースに変換済み

/**
 * 管理者メインメニューを表示
 */
export async function showAdminMenu(player: Player): Promise<void> {
	try {
		// 管理者権限チェック
		if (!hasPermission(player.id, AdminPermission.SYSTEM_MONITOR)) {
			player.sendMessage("§c管理者権限が必要です");
			return;
		}

		const form = createActionForm(
			"§l管理者メニュー",
			"§7管理者機能を選択してください",
		);

		// 権限に応じてメニューを追加
		if (hasPermission(player.id, AdminPermission.GAME_CONTROL)) {
			form.button("ゲーム制御", "textures/ui/gear");
		}

		if (hasPermission(player.id, AdminPermission.PLAYER_MANAGEMENT)) {
			form.button("プレイヤー管理", "textures/ui/friend_glyph");
		}

		if (hasPermission(player.id, AdminPermission.DEBUG_ACCESS)) {
			form.button("デバッグ機能", "textures/ui/creative_icon");
		}

		if (hasPermission(player.id, AdminPermission.SYSTEM_MONITOR)) {
			form.button("システム監視", "textures/ui/book_edit_default");
		}

		if (hasPermission(player.id, AdminPermission.DATA_EXPORT)) {
			form.button("データ管理", "textures/ui/backup");
		}

		form.button("閉じる", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled) return;

		let buttonIndex = 0;

		if (hasPermission(player.id, AdminPermission.GAME_CONTROL)) {
			if (response.selection === buttonIndex) {
				await showGameControlMenu(player);
				return;
			}
			buttonIndex++;
		}

		if (hasPermission(player.id, AdminPermission.PLAYER_MANAGEMENT)) {
			if (response.selection === buttonIndex) {
				await showPlayerManagementMenu(player);
				return;
			}
			buttonIndex++;
		}

		if (hasPermission(player.id, AdminPermission.DEBUG_ACCESS)) {
			if (response.selection === buttonIndex) {
				await showDebugMenu(player);
				return;
			}
			buttonIndex++;
		}

		if (hasPermission(player.id, AdminPermission.SYSTEM_MONITOR)) {
			if (response.selection === buttonIndex) {
				await showSystemMonitorMenu(player);
				return;
			}
			buttonIndex++;
		}

		if (hasPermission(player.id, AdminPermission.DATA_EXPORT)) {
			if (response.selection === buttonIndex) {
				await showDataManagementMenu(player);
				return;
			}
			buttonIndex++;
		}
	} catch (error) {
		console.error(`Failed to show admin menu for ${player.name}:`, error);
		player.sendMessage("§c管理者メニューの表示に失敗しました");
	}
}

/**
 * ゲーム制御メニューを表示
 */
export async function showGameControlMenu(player: Player): Promise<void> {
	try {
		const form = createActionForm(
			"§lゲーム制御",
			"§7ゲームの制御機能を選択してください",
		)
			.button("ゲーム開始", "textures/ui/play")
			.button("ゲーム終了", "textures/ui/stop")
			.button("ゲームリセット", "textures/ui/refresh")
			.button("フェーズ変更", "textures/ui/clock")
			.button("戻る", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled || response.selection === 4) {
			await showAdminMenu(player);
			return;
		}

		switch (response.selection) {
			case 0: // ゲーム開始
				await confirmGameStart(player);
				break;
			case 1: // ゲーム終了
				await confirmGameEnd(player);
				break;
			case 2: // ゲームリセット
				await confirmGameReset(player);
				break;
			case 3: // フェーズ変更
				await showPhaseChangeMenu(player);
				break;
		}
	} catch (error) {
		console.error(
			`Failed to show game control menu for ${player.name}:`,
			error,
		);
		player.sendMessage("§cゲーム制御メニューの表示に失敗しました");
	}
}

/**
 * プレイヤー管理メニューを表示
 */
export async function showPlayerManagementMenu(player: Player): Promise<void> {
	try {
		const form = createActionForm("$1", "$2")
			.button("役職変更", "textures/ui/book_edit_default")
			.button("職業変更", "textures/ui/hammer")
			.button("戻る", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled || response.selection === 5) {
			await showAdminMenu(player);
			return;
		}

		switch (response.selection) {
			case 0: // 役職変更
				await showRoleChangeMenu(player);
				break;
			case 1: // 職業変更
				await showJobChangeMenu(player);
				break;
		}
	} catch (error) {
		console.error(
			`Failed to show player management menu for ${player.name}:`,
			error,
		);
		player.sendMessage("§cプレイヤー管理メニューの表示に失敗しました");
	}
}

/**
 * デバッグメニューを表示
 */
export async function showDebugMenu(player: Player): Promise<void> {
	try {
		const form = createActionForm("$1", "$2")
			.button("デバッグ情報表示", "textures/ui/creative_icon")
			.button("追跡切り替え", "textures/ui/refresh")
			.button("イベント注入", "textures/ui/gear")
			.button("エラーログ", "textures/ui/warning")
			.button("戻る", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled || response.selection === 4) {
			await showAdminMenu(player);
			return;
		}

		switch (response.selection) {
			case 0: {
				// デバッグ情報表示
				const debugResult = await executeAdminAction(
					player.id,
					AdminAction.SHOW_DEBUG,
				);
				player.sendMessage(
					debugResult.success
						? `§2${debugResult.message}`
						: `§c${debugResult.message}`,
				);
				break;
			} // 追跡切り替え
			case 1: {
				// 追跡切り替え
				const trackingResult = await executeAdminAction(
					player.id,
					AdminAction.TOGGLE_TRACKING,
				);
				player.sendMessage(
					trackingResult.success
						? `§2${trackingResult.message}`
						: `§c${trackingResult.message}`,
				);
				break;
			}
			case 2: {
				// イベント注入
				player.sendMessage("§6イベント注入機能は未実装です");
				break;
			}
			case 3: {
				// エラーログ
				await showErrorLog(player);
				break;
			}
		}
	} catch (error) {
		console.error(`Failed to show debug menu for ${player.name}:`, error);
		player.sendMessage("§cデバッグメニューの表示に失敗しました");
	}
}

/**
 * システム監視メニューを表示
 */
export async function showSystemMonitorMenu(player: Player): Promise<void> {
	try {
		const stats = getSystemStatistics();

		const uptimeMinutes = Math.floor(stats.gameInfo.uptime / 1000 / 60);
		const statusIcon =
			stats.health.systemStatus === "healthy"
				? "§2"
				: stats.health.systemStatus === "warning"
					? "§6"
					: "§c";

		const form = new MessageFormData()
			.title("§lシステム監視")
			.body(
				`§6=== システム状態 ===\n\n` +
					`${statusIcon} §7ステータス: §j${stats.health.systemStatus}\n` +
					`§7稼働時間: §j${uptimeMinutes}分\n` +
					`§7現在フェーズ: §j${stats.gameInfo.currentPhase}\n` +
					`§7プレイヤー数: §j${stats.gameInfo.playerCount}人\n` +
					`§6=== パフォーマンス ===\n\n` +
					`§7総行動数: §j${stats.performance.totalActions}\n` +
					`§7総投票数: §j${stats.performance.totalVotes}\n` +
					`§7総能力使用数: §j${stats.performance.totalAbilityUsages}\n` +
					`§7システム負荷: §j${stats.performance.systemLoad} ops/h\n` +
					`§7メモリ使用量: §j${stats.performance.memoryUsage}\n\n` +
					`§6=== ヘルス ===\n\n` +
					`§7エラー数: §j${stats.health.errorCount}\n` +
					`§7アクティブマネージャー: §j${stats.health.activeManagers}\n` +
					(stats.health.lastError
						? `§7最新エラー: §c${stats.health.lastError}`
						: "§7エラーなし"),
			)
			.button1("更新")
			.button2("戻る");

		const response = await form.show(player);

		if (!response.canceled && response.selection === 0) {
			await showSystemMonitorMenu(player);
		} else {
			await showAdminMenu(player);
		}
	} catch (error) {
		console.error(`Failed to show system monitor for ${player.name}:`, error);
		player.sendMessage("§cシステム監視の表示に失敗しました");
	}
}

/**
 * データ管理メニューを表示
 */
export async function showDataManagementMenu(player: Player): Promise<void> {
	try {
		const form = createActionForm("$1", "$2")
			.button("行動データクリア", "textures/ui/trash")
			.button("投票データクリア", "textures/ui/trash")
			.button("能力データクリア", "textures/ui/trash")
			.button("全データクリア", "textures/ui/warning")
			.button("データバックアップ", "textures/ui/backup")
			.button("戻る", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled || response.selection === 5) {
			await showAdminMenu(player);
			return;
		}

		let dataType: string;
		let confirmMessage: string;

		switch (response.selection) {
			case 0:
				dataType = "actions";
				confirmMessage = "行動データを削除しますか？";
				break;
			case 1:
				dataType = "votes";
				confirmMessage = "投票データを削除しますか？";
				break;
			case 2:
				dataType = "skills";
				confirmMessage = "能力データを削除しますか？";
				break;
			case 3:
				dataType = "all";
				confirmMessage =
					"§c全てのデータを削除しますか？この操作は取り消せません！";
				break;
			case 4:
				player.sendMessage("§6バックアップ機能は未実装です");
				return;
			default:
				return;
		}

		await confirmDataClear(player, dataType, confirmMessage);
	} catch (error) {
		console.error(
			`Failed to show data management menu for ${player.name}:`,
			error,
		);
		player.sendMessage("§cデータ管理メニューの表示に失敗しました");
	}
}

/**
 * フェーズ変更メニューを表示
 */
async function showPhaseChangeMenu(player: Player): Promise<void> {
	try {
		const form = createActionForm("$1", "$2")
			.button("準備フェーズ", "textures/ui/gear")
			.button("日常フェーズ", "textures/ui/friend_glyph")
			.button("捜査フェーズ", "textures/ui/magnifyingGlass")
			.button("議論フェーズ", "textures/ui/chat")
			.button("再捜査フェーズ", "textures/ui/creative_icon")
			.button("推理フェーズ", "textures/ui/book_edit_default")
			.button("投票フェーズ", "textures/ui/vote")
			.button("終了フェーズ", "textures/ui/check")
			.button("キャンセル", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled || response.selection === 8) {
			await showGameControlMenu(player);
			return;
		}

		const phases = [
			GamePhase.PREPARATION,
			GamePhase.DAILY_LIFE,
			GamePhase.INVESTIGATION,
			GamePhase.DISCUSSION,
			GamePhase.REINVESTIGATION,
			GamePhase.DEDUCTION,
			GamePhase.VOTING,
			GamePhase.ENDING,
		];

		const selectedPhase = phases[response.selection!];
		const result = await executeAdminAction(
			player.id,
			AdminAction.FORCE_PHASE,
			{ phase: selectedPhase },
		);

		player.sendMessage(
			result.success ? `§2${result.message}` : `§c${result.message}`,
		);
	} catch (error) {
		console.error(
			`Failed to show phase change menu for ${player.name}:`,
			error,
		);
		player.sendMessage("§cフェーズ変更メニューの表示に失敗しました");
	}
}

/**
 * 役職変更メニューを表示
 */
async function showRoleChangeMenu(player: Player): Promise<void> {
	try {
		const players = world.getAllPlayers();

		if (players.length === 0) {
			player.sendMessage("§c対象プレイヤーがいません");
			return;
		}

		const form = createActionForm("$1", "$2");

		for (const p of players) {
			const role = getPlayerRole(p);
			const roleString = getRoleString(roleTypeToNumber(role));
			form.button(`§j${p.name} §7(${roleString})`, "textures/ui/friend_glyph");
		}

		form.button("キャンセル", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled || response.selection === players.length) {
			await showPlayerManagementMenu(player);
			return;
		}

		const selectedPlayer = players[response.selection!];
		await showRoleSelectionMenu(player, selectedPlayer);
	} catch (error) {
		console.error(`Failed to show role change menu for ${player.name}:`, error);
		player.sendMessage("§c役職変更メニューの表示に失敗しました");
	}
}

/**
 * 役職選択メニューを表示
 */
async function showRoleSelectionMenu(
	player: Player,
	target: Player,
): Promise<void> {
	try {
		const form = new ActionFormData()
			.title(`§l§c${target.name}の役職変更`)
			.body("§7新しい役職を選択してください")
			.button("犯人", "textures/ui/redX1")
			.button("共犯者", "textures/ui/warning")
			.button("一般人", "textures/ui/check")
			.button("キャンセル", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled || response.selection === 3) {
			await showRoleChangeMenu(player);
			return;
		}

		const roles = [1, 2, 3]; // MURDERER, ACCOMPLICE, CITIZEN
		const selectedRole = roles[response.selection!];

		const result = await executeAdminAction(player.id, AdminAction.SET_ROLE, {
			targetId: target.id,
			role: selectedRole,
		});

		player.sendMessage(
			result.success ? `§2${result.message}` : `§c${result.message}`,
		);
	} catch (error) {
		console.error(
			`Failed to show role selection menu for ${player.name}:`,
			error,
		);
		player.sendMessage("§c役職選択メニューの表示に失敗しました");
	}
}

/**
 * 職業変更メニューを表示（簡略化）
 */
async function showJobChangeMenu(player: Player): Promise<void> {
	player.sendMessage("§6職業変更機能は未実装です");
	await showPlayerManagementMenu(player);
}

/**
 * エラーログを表示
 */
async function showErrorLog(player: Player): Promise<void> {
	try {
		const stats = getSystemStatistics();

		const form = new MessageFormData()
			.title("§lエラーログ")
			.body(
				`§6=== システムエラー情報 ===\n\n` +
					`§7総エラー数: §j${stats.health.errorCount}\n` +
					`§7システム状態: §j${stats.health.systemStatus}\n\n` +
					(stats.health.lastError
						? `§7最新エラー:\n§c${stats.health.lastError}`
						: "§7エラーは発生していません"),
			)
			.button1("了解")
			.button2("戻る");

		const response = await form.show(player);

		if (!response.canceled && response.selection === 1) {
			await showDebugMenu(player);
		}
	} catch (error) {
		console.error(`Failed to show error log for ${player.name}:`, error);
		player.sendMessage("§cエラーログの表示に失敗しました");
	}
}

/**
 * 確認ダイアログ群
 */
async function confirmGameStart(player: Player): Promise<void> {
	const form = new MessageFormData()
		.title("§l確認")
		.body("§7ゲームを開始しますか？")
		.button1("開始")
		.button2("キャンセル");

	const response = await form.show(player);

	if (!response.canceled && response.selection === 0) {
		const result = await executeAdminAction(player.id, AdminAction.START_GAME);
		player.sendMessage(
			result.success ? `§2${result.message}` : `§c${result.message}`,
		);
	}
}

async function confirmGameEnd(player: Player): Promise<void> {
	const form = new MessageFormData()
		.title("§l確認")
		.body("§c§lゲームを強制終了しますか？\n§7この操作は取り消せません")
		.button1("終了")
		.button2("キャンセル");

	const response = await form.show(player);

	if (!response.canceled && response.selection === 0) {
		const result = await executeAdminAction(player.id, AdminAction.END_GAME);
		player.sendMessage(
			result.success ? `§2${result.message}` : `§c${result.message}`,
		);
	}
}

async function confirmGameReset(player: Player): Promise<void> {
	const form = new MessageFormData()
		.title("§l確認")
		.body("§6§lゲームをリセットしますか？\n§7全てのデータが削除されます")
		.button1("実行")
		.button2("キャンセル");

	const response = await form.show(player);

	if (!response.canceled && response.selection === 0) {
		const result = await executeAdminAction(player.id, AdminAction.RESET_GAME);
		player.sendMessage(
			result.success ? `§2${result.message}` : `§c${result.message}`,
		);
	}
}

async function confirmDataClear(
	player: Player,
	dataType: string,
	message: string,
): Promise<void> {
	const form = new MessageFormData()
		.title("§l確認")
		.body(`§c§l${message}\n§7この操作は取り消せません`)
		.button1("削除")
		.button2("キャンセル");

	const response = await form.show(player);

	if (!response.canceled && response.selection === 0) {
		const result = await executeAdminAction(player.id, AdminAction.CLEAR_DATA, {
			dataType,
		});
		player.sendMessage(
			result.success ? `§2${result.message}` : `§c${result.message}`,
		);
	}
}
