import { system, world } from "@minecraft/server";
import { GamePhase } from "../types/PhaseTypes";
import {
	clearAllRecords,
	getActionStatistics,
	startTracking,
	stopTracking,
} from "./ActionTrackingManager";
import { forcePhaseChange, getCurrentPhase } from "./PhaseManager";
import {
	getJobString,
	getRoleString,
	setPlayerAlive,
	setPlayerJob,
	setPlayerRole,
} from "./ScoreboardManager";
import { generateGameResult } from "./ScoringManager";
import { clearAllData, getSkillStatistics } from "./SkillManager";
import { clearAllVotes, getVotingStatistics } from "./VotingManager";

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
 * 管理者アクション結果のデータ型
 */
export type AdminResultData =
	| { type: "game_state"; players: number; phase: string }
	| { type: "player_info"; playerId: string; role: string; job: string }
	| { type: "system_stats"; uptime: number; actions: number }
	| { type: "debug_info"; events: unknown[]; logs: string[] }
	| Record<string, unknown>;

export interface AdminResult {
	success: boolean;
	message: string;
	data?: AdminResultData;
	error?: string;
}

/**
 * システム統計
 */
export interface SystemStatistics {
	gameInfo: {
		currentPhase: GamePhase;
		playerCount: number;
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
const systemStartTime: number = Date.now();
let errorCount: number = 0;
let lastError: string = "";

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
			player.sendMessage("§2管理者権限が付与されました");
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
	parameters?: Record<string, unknown>,
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
				return await executeForcePhase((parameters as any)?.phaseId);

			case AdminAction.SET_ROLE:
				return executeSetRole(
					(parameters as any)?.playerId,
					(parameters as any)?.roleId,
				);

			case AdminAction.SET_JOB:
				return executeSetJob(
					(parameters as any)?.playerId,
					(parameters as any)?.jobId,
				);

			case AdminAction.KILL_PLAYER:
				return executeKillPlayer((parameters as any)?.playerId);

			case AdminAction.REVIVE_PLAYER:
				return executeRevivePlayer((parameters as any)?.playerId);

			case AdminAction.CLEAR_DATA:
				return executeClearData((parameters as any)?.dataType);

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
			world.sendMessage(`§6管理者によってフェーズが ${phase} に変更されました`);
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
 * ロール設定
 */
function executeSetRole(targetId: string, role: number): AdminResult {
	try {
		if (!targetId || role === undefined) {
			return {
				success: false,
				message: "対象プレイヤーまたはロールが指定されていません",
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
		target.sendMessage(
			`§6管理者によってロールが ${roleString} に設定されました`,
		);

		return {
			success: true,
			message: `${target.name}のロールを ${roleString} に設定しました`,
		};
	} catch (error) {
		return {
			success: false,
			message: "ロール設定に失敗しました",
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
		target.sendMessage(`§6管理者によって職業が ${jobString} に設定されました`);

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
		target.sendMessage("§2管理者によって蘇生されました");
		world.sendMessage(`§2${target.name}が管理者によって蘇生されました`);

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
			case "skills":
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
		const aliveCount = world.getAllPlayers();
		const currentPhase = getCurrentPhase();

		const actionStats = getActionStatistics();
		const votingStats = getVotingStatistics();
		const skillStats = getSkillStatistics();

		const uptime = Date.now() - systemStartTime;

		return {
			gameInfo: {
				currentPhase,
				playerCount,
				gameStartTime: systemStartTime,
				uptime,
			},
			performance: {
				totalActions: actionStats.totalActions,
				totalVotes: votingStats.totalVotes,
				totalAbilityUsages: skillStats.totalUsages,
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
	const skillCount = getSkillStatistics().totalUsages;

	const totalOperations = actionCount + voteCount + skillCount;
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
