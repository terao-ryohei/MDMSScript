import { system, world } from "@minecraft/server";
import { GamePhase } from "../types/PhaseTypes";
import {
	clearAllData,
	debugAbilitySystem,
	getAbilityStatistics,
} from "./AbilityManager";
import {
	clearAllRecords,
	debugActionRecords,
	getActionStatistics,
	startTracking,
	stopTracking,
} from "./ActionTrackingManager";
import { debugJobAssignments } from "./JobAssignmentManager";
import { forcePhaseChange, getCurrentPhase } from "./PhaseManager";
import { debugRoleAssignments } from "./RoleAssignmentManager";
import {
	debugGameState,
	debugPlayerStates,
	getJobString,
	getRoleString,
	isPlayerAlive,
	setPlayerAlive,
	setPlayerJob,
	setPlayerRole,
} from "./ScoreboardManager";
import { debugScoring, generateGameResult } from "./ScoringManager";
import {
	clearAllVotes,
	debugVotingStatus,
	getVotingStatistics,
} from "./VotingManager";

/**
 * 管理者権限
 */
export enum AdminPermission {
	GAME_CONTROL = "game_control", // ゲーム制御
	PLAYER_MANAGEMENT = "player_management", // プレイヤー管理
	DEBUG_ACCESS = "debug_access", // デバッグアクセス
	SYSTEM_MONITOR = "system_monitor", // システム監視
	DATA_EXPORT = "data_export", // データエクスポート
}

/**
 * 管理者アクション
 */
export enum AdminAction {
	// ゲーム制御
	START_GAME = "start_game",
	END_GAME = "end_game",
	RESET_GAME = "reset_game",
	FORCE_PHASE = "force_phase",

	// プレイヤー管理
	SET_ROLE = "set_role",
	SET_JOB = "set_job",
	KILL_PLAYER = "kill_player",
	REVIVE_PLAYER = "revive_player",
	TELEPORT_PLAYER = "teleport_player",

	// システム制御
	CLEAR_DATA = "clear_data",
	BACKUP_DATA = "backup_data",
	RESTORE_DATA = "restore_data",

	// デバッグ
	SHOW_DEBUG = "show_debug",
	TOGGLE_TRACKING = "toggle_tracking",
	INJECT_EVENT = "inject_event",
}

/**
 * 管理者システム結果
 */
export interface AdminResult {
	success: boolean;
	message: string;
	data?: any;
	error?: string;
}

/**
 * システム統計
 */
export interface SystemStatistics {
	gameInfo: {
		currentPhase: GamePhase;
		playerCount: number;
		aliveCount: number;
		gameStartTime: number;
		uptime: number;
	};
	performance: {
		totalActions: number;
		totalVotes: number;
		totalAbilityUsages: number;
		systemLoad: number;
		memoryUsage: string;
	};
	health: {
		systemStatus: "healthy" | "warning" | "error";
		activeManagers: number;
		errorCount: number;
		lastError?: string;
	};
}

/**
 * 管理者権限管理マネージャー
 */
const admins: Set<string> = new Set(); // 管理者のプレイヤーID
const adminPermissions: Map<string, Set<AdminPermission>> = new Map();
let systemStartTime: number = Date.now();
let errorCount: number = 0;
let lastError: string = "";
let isInitialized: boolean = false;

/**
 * AdminManagerを初期化
 */
export function initializeAdminManager(): void {
	if (isInitialized) return;

	systemStartTime = Date.now();
	isInitialized = true;
	console.log("AdminManager initialized");
}

// Singleton パターンの削除が完了

/**
 * 管理者権限を付与
 */
export function addAdmin(
	playerId: string,
	permissions?: AdminPermission[],
): AdminResult {
	try {
		admins.add(playerId);

		const playerPermissions = new Set<AdminPermission>();
		if (permissions) {
			permissions.forEach((perm) => playerPermissions.add(perm));
		} else {
			// デフォルトで全権限を付与
			Object.values(AdminPermission).forEach((perm) =>
				playerPermissions.add(perm),
			);
		}

		adminPermissions.set(playerId, playerPermissions);

		const player = world.getAllPlayers().find((p) => p.id === playerId);
		if (player) {
			player.sendMessage("§a管理者権限が付与されました");
		}

		console.log(`Admin privileges granted to player ${playerId}`);
		return {
			success: true,
			message: "管理者権限を付与しました",
		};
	} catch (error) {
		console.error(`Failed to add admin ${playerId}:`, error);
		return {
			success: false,
			message: "管理者権限の付与に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * 管理者権限を削除
 */
export function removeAdmin(playerId: string): AdminResult {
	try {
		admins.delete(playerId);
		adminPermissions.delete(playerId);

		const player = world.getAllPlayers().find((p) => p.id === playerId);
		if (player) {
			player.sendMessage("§c管理者権限が削除されました");
		}

		console.log(`Admin privileges removed from player ${playerId}`);
		return {
			success: true,
			message: "管理者権限を削除しました",
		};
	} catch (error) {
		console.error(`Failed to remove admin ${playerId}:`, error);
		return {
			success: false,
			message: "管理者権限の削除に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * 管理者権限チェック
 */
export function hasPermission(
	playerId: string,
	permission: AdminPermission,
): boolean {
	if (!admins.has(playerId)) return false;

	const permissions = adminPermissions.get(playerId);
	return permissions ? permissions.has(permission) : false;
}

/**
 * 管理者アクション実行
 */
export async function executeAdminAction(
	playerId: string,
	action: AdminAction,
	parameters?: any,
): Promise<AdminResult> {
	try {
		// 権限チェック
		const requiredPermission = getRequiredPermission(action);
		if (!hasPermission(playerId, requiredPermission)) {
			return {
				success: false,
				message: "この操作に必要な権限がありません",
				error: "Insufficient permissions",
			};
		}

		// アクション実行
		switch (action) {
			case AdminAction.START_GAME:
				return executeStartGame();

			case AdminAction.END_GAME:
				return await executeEndGame();

			case AdminAction.RESET_GAME:
				return executeResetGame();

			case AdminAction.FORCE_PHASE:
				return await executeForcePhase(parameters?.phase);

			case AdminAction.SET_ROLE:
				return executeSetRole(parameters?.targetId, parameters?.role);

			case AdminAction.SET_JOB:
				return executeSetJob(parameters?.targetId, parameters?.job);

			case AdminAction.KILL_PLAYER:
				return executeKillPlayer(parameters?.targetId);

			case AdminAction.REVIVE_PLAYER:
				return executeRevivePlayer(parameters?.targetId);

			case AdminAction.CLEAR_DATA:
				return executeClearData(parameters?.dataType);

			case AdminAction.SHOW_DEBUG:
				return executeShowDebug();

			case AdminAction.TOGGLE_TRACKING:
				return executeToggleTracking();

			default:
				return {
					success: false,
					message: "未知のアクションです",
					error: "Unknown action",
				};
		}
	} catch (error) {
		errorCount++;
		lastError = error instanceof Error ? error.message : "Unknown error";

		console.error(`Failed to execute admin action ${action}:`, error);
		return {
			success: false,
			message: "管理者アクションの実行に失敗しました",
			error: lastError,
		};
	}
}

/**
 * ゲーム開始
 */
function executeStartGame(): AdminResult {
	try {
		// ゲーム開始処理を呼び出し
		system.run(() => {
			world
				.getDimension("overworld")
				.runCommand("scriptevent mdms:admin_start_game");
		});

		return {
			success: true,
			message: "ゲームを開始しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "ゲーム開始に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * ゲーム終了
 */
async function executeEndGame(): Promise<AdminResult> {
	try {
		// 強制的にゲーム終了フェーズに移行
		const result = await forcePhaseChange(GamePhase.ENDING);

		if (result.success) {
			// 最終結果を生成
			const gameResult = generateGameResult();
			world.sendMessage("§c管理者によってゲームが終了されました");

			return {
				success: true,
				message: "ゲームを終了しました",
				data: gameResult,
			};
		} else {
			return {
				success: false,
				message: "ゲーム終了に失敗しました",
				error: result.error,
			};
		}
	} catch (error) {
		return {
			success: false,
			message: "ゲーム終了に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * ゲームリセット
 */
function executeResetGame(): AdminResult {
	try {
		system.run(() => {
			world.getDimension("overworld").runCommand("scriptevent mdms:reset");
		});

		return {
			success: true,
			message: "ゲームをリセットしました",
		};
	} catch (error) {
		return {
			success: false,
			message: "ゲームリセットに失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * 強制フェーズ変更
 */
async function executeForcePhase(phase: GamePhase): Promise<AdminResult> {
	try {
		if (!phase) {
			return {
				success: false,
				message: "フェーズが指定されていません",
				error: "No phase specified",
			};
		}

		const result = await forcePhaseChange(phase);

		if (result.success) {
			world.sendMessage(`§e管理者によってフェーズが ${phase} に変更されました`);
			return {
				success: true,
				message: `フェーズを ${phase} に変更しました`,
			};
		} else {
			return {
				success: false,
				message: "フェーズ変更に失敗しました",
				error: result.error,
			};
		}
	} catch (error) {
		return {
			success: false,
			message: "フェーズ変更に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * 役職設定
 */
function executeSetRole(targetId: string, role: number): AdminResult {
	try {
		if (!targetId || role === undefined) {
			return {
				success: false,
				message: "対象プレイヤーまたは役職が指定されていません",
				error: "Missing parameters",
			};
		}

		const target = world.getAllPlayers().find((p) => p.id === targetId);
		if (!target) {
			return {
				success: false,
				message: "対象プレイヤーが見つかりません",
				error: "Target player not found",
			};
		}

		setPlayerRole(target, role);

		const roleString = getRoleString(role);
		target.sendMessage(`§e管理者によって役職が ${roleString} に設定されました`);

		return {
			success: true,
			message: `${target.name}の役職を ${roleString} に設定しました`,
		};
	} catch (error) {
		return {
			success: false,
			message: "役職設定に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * 職業設定
 */
function executeSetJob(targetId: string, job: number): AdminResult {
	try {
		if (!targetId || job === undefined) {
			return {
				success: false,
				message: "対象プレイヤーまたは職業が指定されていません",
				error: "Missing parameters",
			};
		}

		const target = world.getAllPlayers().find((p) => p.id === targetId);
		if (!target) {
			return {
				success: false,
				message: "対象プレイヤーが見つかりません",
				error: "Target player not found",
			};
		}

		setPlayerJob(target, job);

		const jobString = getJobString(job);
		target.sendMessage(`§e管理者によって職業が ${jobString} に設定されました`);

		return {
			success: true,
			message: `${target.name}の職業を ${jobString} に設定しました`,
		};
	} catch (error) {
		return {
			success: false,
			message: "職業設定に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * プレイヤー殺害
 */
function executeKillPlayer(targetId: string): AdminResult {
	try {
		if (!targetId) {
			return {
				success: false,
				message: "対象プレイヤーが指定されていません",
				error: "No target specified",
			};
		}

		const target = world.getAllPlayers().find((p) => p.id === targetId);
		if (!target) {
			return {
				success: false,
				message: "対象プレイヤーが見つかりません",
				error: "Target player not found",
			};
		}

		setPlayerAlive(target, false);
		target.sendMessage("§c管理者によって殺害されました");
		world.sendMessage(`§c${target.name}が管理者によって殺害されました`);

		return {
			success: true,
			message: `${target.name}を殺害しました`,
		};
	} catch (error) {
		return {
			success: false,
			message: "プレイヤー殺害に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * プレイヤー蘇生
 */
function executeRevivePlayer(targetId: string): AdminResult {
	try {
		if (!targetId) {
			return {
				success: false,
				message: "対象プレイヤーが指定されていません",
				error: "No target specified",
			};
		}

		const target = world.getAllPlayers().find((p) => p.id === targetId);
		if (!target) {
			return {
				success: false,
				message: "対象プレイヤーが見つかりません",
				error: "Target player not found",
			};
		}

		setPlayerAlive(target, true);
		target.sendMessage("§a管理者によって蘇生されました");
		world.sendMessage(`§a${target.name}が管理者によって蘇生されました`);

		return {
			success: true,
			message: `${target.name}を蘇生しました`,
		};
	} catch (error) {
		return {
			success: false,
			message: "プレイヤー蘇生に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * データクリア
 */
function executeClearData(dataType: string): AdminResult {
	try {
		switch (dataType) {
			case "actions":
				clearAllRecords();
				break;
			case "votes":
				clearAllVotes();
				break;
			case "abilities":
				clearAllData();
				break;
			case "all":
				clearAllRecords();
				clearAllVotes();
				clearAllData();
				break;
			default:
				return {
					success: false,
					message: "不明なデータタイプです",
					error: "Unknown data type",
				};
		}

		return {
			success: true,
			message: `${dataType}データをクリアしました`,
		};
	} catch (error) {
		return {
			success: false,
			message: "データクリアに失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * デバッグ表示
 */
function executeShowDebug(): AdminResult {
	try {
		// 全システムのデバッグ情報を出力
		debugGameState();
		debugPlayerStates();
		debugRoleAssignments();
		debugJobAssignments();
		debugActionRecords();
		debugVotingStatus();
		debugScoring();
		debugAbilitySystem();

		return {
			success: true,
			message: "デバッグ情報をコンソールに出力しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "デバッグ表示に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * 追跡切り替え
 */
function executeToggleTracking(): AdminResult {
	try {
		// 現在の追跡状態を取得（実装を拡張する必要があります）
		// 簡易的な実装
		stopTracking();
		startTracking();

		return {
			success: true,
			message: "行動追跡を再開しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "追跡切り替えに失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * システム統計取得
 */
export function getSystemStatistics(): SystemStatistics {
	try {
		const playerCount = world.getAllPlayers().length;
		const aliveCount = world
			.getAllPlayers()
			.filter((p) => isPlayerAlive(p)).length;
		const currentPhase = getCurrentPhase();

		const actionStats = getActionStatistics();
		const votingStats = getVotingStatistics();
		const abilityStats = getAbilityStatistics();

		const uptime = Date.now() - systemStartTime;

		return {
			gameInfo: {
				currentPhase,
				playerCount,
				aliveCount,
				gameStartTime: systemStartTime,
				uptime,
			},
			performance: {
				totalActions: actionStats.totalActions,
				totalVotes: votingStats.totalVotes,
				totalAbilityUsages: abilityStats.totalUsages,
				systemLoad: calculateSystemLoad(),
				memoryUsage: getMemoryUsage(),
			},
			health: {
				systemStatus: getSystemStatus(),
				activeManagers: 8, // 固定値
				errorCount: errorCount,
				lastError: lastError || undefined,
			},
		};
	} catch (error) {
		errorCount++;
		lastError = error instanceof Error ? error.message : "Unknown error";

		// エラー時のデフォルト統計
		return {
			gameInfo: {
				currentPhase: GamePhase.PREPARATION,
				playerCount: 0,
				aliveCount: 0,
				gameStartTime: systemStartTime,
				uptime: Date.now() - systemStartTime,
			},
			performance: {
				totalActions: 0,
				totalVotes: 0,
				totalAbilityUsages: 0,
				systemLoad: 0,
				memoryUsage: "N/A",
			},
			health: {
				systemStatus: "error",
				activeManagers: 0,
				errorCount: errorCount,
				lastError: lastError,
			},
		};
	}
}

/**
 * 必要権限取得
 */
function getRequiredPermission(action: AdminAction): AdminPermission {
	switch (action) {
		case AdminAction.START_GAME:
		case AdminAction.END_GAME:
		case AdminAction.RESET_GAME:
		case AdminAction.FORCE_PHASE:
			return AdminPermission.GAME_CONTROL;

		case AdminAction.SET_ROLE:
		case AdminAction.SET_JOB:
		case AdminAction.KILL_PLAYER:
		case AdminAction.REVIVE_PLAYER:
		case AdminAction.TELEPORT_PLAYER:
			return AdminPermission.PLAYER_MANAGEMENT;

		case AdminAction.SHOW_DEBUG:
		case AdminAction.TOGGLE_TRACKING:
		case AdminAction.INJECT_EVENT:
			return AdminPermission.DEBUG_ACCESS;

		case AdminAction.CLEAR_DATA:
		case AdminAction.BACKUP_DATA:
		case AdminAction.RESTORE_DATA:
			return AdminPermission.DATA_EXPORT;

		default:
			return AdminPermission.SYSTEM_MONITOR;
	}
}

/**
 * システム負荷計算
 */
function calculateSystemLoad(): number {
	// 簡易的な負荷計算
	const actionCount = getActionStatistics().totalActions;
	const voteCount = getVotingStatistics().totalVotes;
	const abilityCount = getAbilityStatistics().totalUsages;

	const totalOperations = actionCount + voteCount + abilityCount;
	const uptimeHours = (Date.now() - systemStartTime) / (1000 * 60 * 60);

	return uptimeHours > 0 ? Math.round(totalOperations / uptimeHours) : 0;
}

/**
 * メモリ使用量取得
 */
function getMemoryUsage(): string {
	// Minecraft ScriptAPIではメモリ情報を直接取得できないため、推定値
	const actionCount = getActionStatistics().totalActions;
	const estimatedMB = Math.round(actionCount * 0.001); // 1アクション約1KB想定
	return `${estimatedMB}MB (推定)`;
}

/**
 * システム状態取得
 */
function getSystemStatus(): "healthy" | "warning" | "error" {
	if (errorCount > 10) return "error";
	if (errorCount > 5) return "warning";
	return "healthy";
}

/**
 * 管理者一覧取得
 */
export function getAdminList(): string[] {
	return Array.from(admins);
}

/**
 * デバッグ用：管理者システム状況出力
 */
export function debugAdminSystem(): void {
	console.log("=== Admin System Debug ===");
	console.log(`Total admins: ${admins.size}`);
	console.log(
		`System uptime: ${Math.round((Date.now() - systemStartTime) / 1000 / 60)} minutes`,
	);
	console.log(`Error count: ${errorCount}`);
	console.log(`Last error: ${lastError || "None"}`);

	const stats = getSystemStatistics();
	console.log(`System status: ${stats.health.systemStatus}`);
	console.log(`System load: ${stats.performance.systemLoad} ops/hour`);

	console.log("=== End Admin System Debug ===");
}
