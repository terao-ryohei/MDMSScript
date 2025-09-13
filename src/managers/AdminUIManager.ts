/**
 * 管理者UI管理関数群（関数ベース版）
 */

import { type Player, world } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { GamePhase } from "../types/PhaseTypes";
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
	isPlayerAlive,
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

		const form = new ActionFormData()
			.title("§l§c管理者メニュー")
			.body("§7管理者機能を選択してください");

		// 権限に応じてメニューを追加
		if (hasPermission(player.id, AdminPermission.GAME_CONTROL)) {
			form.button("§aゲーム制御", "textures/ui/gear");
		}

		if (hasPermission(player.id, AdminPermission.PLAYER_MANAGEMENT)) {
			form.button("§eプレイヤー管理", "textures/ui/friend_glyph");
		}

		if (hasPermission(player.id, AdminPermission.DEBUG_ACCESS)) {
			form.button("§bデバッグ機能", "textures/ui/creative_icon");
		}

		if (hasPermission(player.id, AdminPermission.SYSTEM_MONITOR)) {
			form.button("§dシステム監視", "textures/ui/book_edit_default");
		}

		if (hasPermission(player.id, AdminPermission.DATA_EXPORT)) {
			form.button("§6データ管理", "textures/ui/backup");
		}

		form.button("§7閉じる", "textures/ui/cancel");

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
		const form = new ActionFormData()
			.title("§l§aゲーム制御")
			.body("§7ゲームの制御機能を選択してください")
			.button("§aゲーム開始", "textures/ui/play")
			.button("§cゲーム終了", "textures/ui/stop")
			.button("§eゲームリセット", "textures/ui/refresh")
			.button("§bフェーズ変更", "textures/ui/clock")
			.button("§7戻る", "textures/ui/cancel");

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
		const form = new ActionFormData()
			.title("§l§eプレイヤー管理")
			.body("§7プレイヤー管理機能を選択してください")
			.button("§c役職変更", "textures/ui/book_edit_default")
			.button("§6職業変更", "textures/ui/hammer")
			.button("§4プレイヤー殺害", "textures/ui/redX1")
			.button("§aプレイヤー蘇生", "textures/ui/check")
			.button("§bテレポート", "textures/ui/teleport")
			.button("§7戻る", "textures/ui/cancel");

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
			case 2: // プレイヤー殺害
				await showKillPlayerMenu(player);
				break;
			case 3: // プレイヤー蘇生
				await showRevivePlayerMenu(player);
				break;
			case 4: // テレポート
				player.sendMessage("§eテレポート機能は未実装です");
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
		const form = new ActionFormData()
			.title("§l§bデバッグ機能")
			.body("§7デバッグ機能を選択してください")
			.button("§aデバッグ情報表示", "textures/ui/creative_icon")
			.button("§e追跡切り替え", "textures/ui/refresh")
			.button("§cイベント注入", "textures/ui/gear")
			.button("§dエラーログ", "textures/ui/warning")
			.button("§7戻る", "textures/ui/cancel");

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
						? `§a${debugResult.message}`
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
						? `§a${trackingResult.message}`
						: `§c${trackingResult.message}`,
				);
				break;
			}
			case 2: {
				// イベント注入
				player.sendMessage("§eイベント注入機能は未実装です");
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
				? "§a●"
				: stats.health.systemStatus === "warning"
					? "§e●"
					: "§c●";

		const form = new MessageFormData()
			.title("§l§dシステム監視")
			.body(
				`§6=== システム状態 ===\n\n` +
					`${statusIcon} §7ステータス: §f${stats.health.systemStatus}\n` +
					`§7稼働時間: §f${uptimeMinutes}分\n` +
					`§7現在フェーズ: §f${stats.gameInfo.currentPhase}\n` +
					`§7プレイヤー数: §f${stats.gameInfo.playerCount}人\n` +
					`§7生存者数: §f${stats.gameInfo.aliveCount}人\n\n` +
					`§6=== パフォーマンス ===\n\n` +
					`§7総行動数: §f${stats.performance.totalActions}\n` +
					`§7総投票数: §f${stats.performance.totalVotes}\n` +
					`§7総能力使用数: §f${stats.performance.totalAbilityUsages}\n` +
					`§7システム負荷: §f${stats.performance.systemLoad} ops/h\n` +
					`§7メモリ使用量: §f${stats.performance.memoryUsage}\n\n` +
					`§6=== ヘルス ===\n\n` +
					`§7エラー数: §f${stats.health.errorCount}\n` +
					`§7アクティブマネージャー: §f${stats.health.activeManagers}\n` +
					(stats.health.lastError
						? `§7最新エラー: §c${stats.health.lastError}`
						: "§7エラーなし"),
			)
			.button1("§a更新")
			.button2("§7戻る");

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
		const form = new ActionFormData()
			.title("§l§6データ管理")
			.body("§7データ管理機能を選択してください")
			.button("§c行動データクリア", "textures/ui/trash")
			.button("§c投票データクリア", "textures/ui/trash")
			.button("§c能力データクリア", "textures/ui/trash")
			.button("§4全データクリア", "textures/ui/warning")
			.button("§eデータバックアップ", "textures/ui/backup")
			.button("§7戻る", "textures/ui/cancel");

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
				dataType = "abilities";
				confirmMessage = "能力データを削除しますか？";
				break;
			case 3:
				dataType = "all";
				confirmMessage =
					"§c全てのデータを削除しますか？この操作は取り消せません！";
				break;
			case 4:
				player.sendMessage("§eバックアップ機能は未実装です");
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
		const form = new ActionFormData()
			.title("§l§bフェーズ変更")
			.body("§7変更先のフェーズを選択してください")
			.button("§7準備フェーズ", "textures/ui/gear")
			.button("§a日常フェーズ", "textures/ui/friend_glyph")
			.button("§e捜査フェーズ", "textures/ui/magnifyingGlass")
			.button("§6議論フェーズ", "textures/ui/chat")
			.button("§c再捜査フェーズ", "textures/ui/creative_icon")
			.button("§d推理フェーズ", "textures/ui/book_edit_default")
			.button("§4投票フェーズ", "textures/ui/vote")
			.button("§5終了フェーズ", "textures/ui/check")
			.button("§7キャンセル", "textures/ui/cancel");

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
			result.success ? `§a${result.message}` : `§c${result.message}`,
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

		const form = new ActionFormData()
			.title("§l§c役職変更")
			.body("§7対象プレイヤーを選択してください");

		for (const p of players) {
			const role = getPlayerRole(p);
			const roleString = getRoleString(roleTypeToNumber(role));
			form.button(`§f${p.name} §7(${roleString})`, "textures/ui/friend_glyph");
		}

		form.button("§7キャンセル", "textures/ui/cancel");

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
			.button("§c犯人", "textures/ui/redX1")
			.button("§6共犯者", "textures/ui/warning")
			.button("§a一般人", "textures/ui/check")
			.button("§7キャンセル", "textures/ui/cancel");

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
			result.success ? `§a${result.message}` : `§c${result.message}`,
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
	player.sendMessage("§e職業変更機能は未実装です");
	await showPlayerManagementMenu(player);
}

/**
 * プレイヤー殺害メニューを表示
 */
async function showKillPlayerMenu(player: Player): Promise<void> {
	try {
		const alivePlayers = world.getAllPlayers().filter((p) => isPlayerAlive(p));

		if (alivePlayers.length === 0) {
			player.sendMessage("§c生存しているプレイヤーがいません");
			return;
		}

		const form = new ActionFormData()
			.title("§l§4プレイヤー殺害")
			.body("§c§l警告: 対象プレイヤーを殺害します\n§7対象を選択してください");

		for (const p of alivePlayers) {
			form.button(`§c${p.name}`, "textures/ui/redX1");
		}

		form.button("§7キャンセル", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled || response.selection === alivePlayers.length) {
			await showPlayerManagementMenu(player);
			return;
		}

		const selectedPlayer = alivePlayers[response.selection!];

		const result = await executeAdminAction(
			player.id,
			AdminAction.KILL_PLAYER,
			{
				targetId: selectedPlayer.id,
			},
		);

		player.sendMessage(
			result.success ? `§a${result.message}` : `§c${result.message}`,
		);
	} catch (error) {
		console.error(`Failed to show kill player menu for ${player.name}:`, error);
		player.sendMessage("§cプレイヤー殺害メニューの表示に失敗しました");
	}
}

/**
 * プレイヤー蘇生メニューを表示
 */
async function showRevivePlayerMenu(player: Player): Promise<void> {
	try {
		const deadPlayers = world.getAllPlayers().filter((p) => !isPlayerAlive(p));

		if (deadPlayers.length === 0) {
			player.sendMessage("§c死亡しているプレイヤーがいません");
			return;
		}

		const form = new ActionFormData()
			.title("§l§aプレイヤー蘇生")
			.body("§7蘇生対象を選択してください");

		for (const p of deadPlayers) {
			form.button(`§a${p.name}`, "textures/ui/check");
		}

		form.button("§7キャンセル", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled || response.selection === deadPlayers.length) {
			await showPlayerManagementMenu(player);
			return;
		}

		const selectedPlayer = deadPlayers[response.selection!];

		const result = await executeAdminAction(
			player.id,
			AdminAction.REVIVE_PLAYER,
			{
				targetId: selectedPlayer.id,
			},
		);

		player.sendMessage(
			result.success ? `§a${result.message}` : `§c${result.message}`,
		);
	} catch (error) {
		console.error(
			`Failed to show revive player menu for ${player.name}:`,
			error,
		);
		player.sendMessage("§cプレイヤー蘇生メニューの表示に失敗しました");
	}
}

/**
 * エラーログを表示
 */
async function showErrorLog(player: Player): Promise<void> {
	try {
		const stats = getSystemStatistics();

		const form = new MessageFormData()
			.title("§l§cエラーログ")
			.body(
				`§6=== システムエラー情報 ===\n\n` +
					`§7総エラー数: §f${stats.health.errorCount}\n` +
					`§7システム状態: §f${stats.health.systemStatus}\n\n` +
					(stats.health.lastError
						? `§7最新エラー:\n§c${stats.health.lastError}`
						: "§7エラーは発生していません"),
			)
			.button1("§a了解")
			.button2("§7戻る");

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
		.title("§l§a確認")
		.body("§7ゲームを開始しますか？")
		.button1("§a開始")
		.button2("§cキャンセル");

	const response = await form.show(player);

	if (!response.canceled && response.selection === 0) {
		const result = await executeAdminAction(player.id, AdminAction.START_GAME);
		player.sendMessage(
			result.success ? `§a${result.message}` : `§c${result.message}`,
		);
	}
}

async function confirmGameEnd(player: Player): Promise<void> {
	const form = new MessageFormData()
		.title("§l§c確認")
		.body("§c§lゲームを強制終了しますか？\n§7この操作は取り消せません")
		.button1("§c終了")
		.button2("§7キャンセル");

	const response = await form.show(player);

	if (!response.canceled && response.selection === 0) {
		const result = await executeAdminAction(player.id, AdminAction.END_GAME);
		player.sendMessage(
			result.success ? `§a${result.message}` : `§c${result.message}`,
		);
	}
}

async function confirmGameReset(player: Player): Promise<void> {
	const form = new MessageFormData()
		.title("§l§e確認")
		.body("§e§lゲームをリセットしますか？\n§7全てのデータが削除されます")
		.button1("§e実行")
		.button2("§7キャンセル");

	const response = await form.show(player);

	if (!response.canceled && response.selection === 0) {
		const result = await executeAdminAction(player.id, AdminAction.RESET_GAME);
		player.sendMessage(
			result.success ? `§a${result.message}` : `§c${result.message}`,
		);
	}
}

async function confirmDataClear(
	player: Player,
	dataType: string,
	message: string,
): Promise<void> {
	const form = new MessageFormData()
		.title("§l§c確認")
		.body(`§c§l${message}\n§7この操作は取り消せません`)
		.button1("§c削除")
		.button2("§7キャンセル");

	const response = await form.show(player);

	if (!response.canceled && response.selection === 0) {
		const result = await executeAdminAction(player.id, AdminAction.CLEAR_DATA, {
			dataType,
		});
		player.sendMessage(
			result.success ? `§a${result.message}` : `§c${result.message}`,
		);
	}
}
