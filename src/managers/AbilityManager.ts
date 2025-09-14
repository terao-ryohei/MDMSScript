import { type Player, system, type Vector3, world } from "@minecraft/server";
import { ABILITY_DEFINITIONS } from "../data/AbilityDefinitions";
import { calculateDistance } from "../utils/CommonUtils";
import {
	type AbilityDefinition,
	type AbilityEffect,
	type AbilityInstanceState,
	type AbilityResult,
	type AbilityStatistics,
	AbilityStatus,
	type AbilityType,
	type AbilityUsage,
	type PlayerAbilityState,
} from "../types/AbilityTypes";
import { ActionType } from "../types/ActionTypes";
import { GamePhase } from "../types/PhaseTypes";
import { createAbilityExecutorFactory } from "./abilities/AbilityExecutorFactory";
import { getPlayerActions, recordAction } from "./ActionTrackingManager";
import { getCurrentPhase } from "./PhaseManager";
import {
	getJobString,
	getPlayerJob,
	getPlayerRole,
	getRoleString,
	isPlayerAlive,
	roleTypeToNumber,
} from "./ScoreboardManager";

/**
 * 能力システム管理マネージャー
 */
let isInitialized: boolean = false;
const playerStates: Map<string, PlayerAbilityState> = new Map();
let abilityUsages: AbilityUsage[] = [];
const activeEffects: Map<string, AbilityEffect> = new Map();
let usageCounter: number = 0;
let executorFactory: ReturnType<typeof createAbilityExecutorFactory>;

export function initialize(): void {
	if (isInitialized) return;

	isInitialized = true;
	executorFactory = createAbilityExecutorFactory(activeEffects);
	setupEventListeners();
	console.log("AbilityManager initialized");
}

/**
 * プレイヤー能力を初期化
 */
export function initializePlayerAbilities(player: Player): void {
	try {
		const role = getRoleString(roleTypeToNumber(getPlayerRole(player)));
		const job = getJobString(getPlayerJob(player));

		const playerState: PlayerAbilityState = {
			playerId: player.id,
			abilities: new Map(),
			activeEffects: new Map(),
			lastUsage: new Map(),
			usageCount: new Map(),
		};

		// 役職・職業に応じた能力を付与
		for (const [abilityId, definition] of Object.entries(ABILITY_DEFINITIONS)) {
			const abilityState: AbilityInstanceState = {
				abilityId,
				status: AbilityStatus.AVAILABLE,
				cooldownEnd: 0,
				usesRemaining: definition.usesPerGame,
				usesThisPhase: 0,
			};
			playerState.abilities.set(abilityId, abilityState);
		}

		playerStates.set(player.id, playerState);
		console.log(
			`Initialized abilities for ${player.name}: ${playerState.abilities.size} abilities`,
		);
	} catch (error) {
		console.error(`Failed to initialize abilities for ${player.name}:`, error);
	}
}

/**
 * 能力を使用
 */
export async function useAbility(
	player: Player,
	abilityId: string,
	targetId?: string,
	location?: Vector3,
): Promise<AbilityResult> {
	try {
		const playerState = playerStates.get(player.id);
		const definition = ABILITY_DEFINITIONS[abilityId];

		if (!playerState || !definition) {
			return {
				success: false,
				message: "能力が見つかりません",
				error: "Ability not found",
			};
		}

		const abilityState = playerState.abilities.get(abilityId);
		if (!abilityState) {
			return {
				success: false,
				message: "この能力は使用できません",
				error: "Ability not available",
			};
		}

		// 使用可能チェック
		const canUseResult = canUseAbility(player, abilityId);
		if (!canUseResult.success) {
			return canUseResult;
		}

		// 対象チェック
		let target: Player | undefined;
		if (definition.requiresTarget && targetId) {
			target = world.getAllPlayers().find((p) => p.id === targetId);
			if (!target) {
				return {
					success: false,
					message: "対象プレイヤーが見つかりません",
					error: "Target not found",
				};
			}

			// 範囲チェック
			const distance = calculateDistance(player.location, target.location);
			if (distance > definition.range) {
				return {
					success: false,
					message: `対象が範囲外です（${Math.round(distance)}m > ${definition.range}m）`,
					error: "Target out of range",
				};
			}
		}

		// 能力実行
		const result = await executeAbility(player, definition, target, location);

		if (result.success) {
			// 使用記録
			recordAbilityUsage(player, definition, target, location, result);

			// 状態更新
			updateAbilityState(player.id, abilityId, definition);

			// 行動記録
			recordAction(
				player,
				ActionType.ABILITY_USE,
				{
					abilityId,
					abilityType: definition.type,
					targetId: target?.id,
					location: location || player.location,
					result: result.success,
				},
				true,
			);
		}

		return result;
	} catch (error) {
		console.error(
			`Failed to use ability ${abilityId} for ${player.name}:`,
			error,
		);
		return {
			success: false,
			message: "能力使用エラーが発生しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * 能力使用可能チェック
 */
export function canUseAbility(
	player: Player,
	abilityId: string,
): AbilityResult {
	try {
		const definition = ABILITY_DEFINITIONS[abilityId];
		if (!definition) {
			return {
				success: false,
				message: "能力が見つかりません",
				error: "Ability not found",
			};
		}

		const playerState = playerStates.get(player.id);
		if (!playerState) {
			return {
				success: false,
				message: "プレイヤー状態が見つかりません",
				error: "Player state not found",
			};
		}

		const abilityState = playerState.abilities.get(abilityId);
		if (!abilityState) {
			return {
				success: false,
				message: "この能力は使用できません",
				error: "Ability not available",
			};
		}

		// 生存チェック
		if (definition.requiresAlive && !isPlayerAlive(player)) {
			return {
				success: false,
				message: "死亡状態では使用できません",
				error: "Player is dead",
			};
		}

		// フェーズチェック
		const currentPhase = getCurrentPhase();
		const phaseString = getPhaseString(currentPhase);
		if (!definition.allowedPhases.includes(phaseString)) {
			return {
				success: false,
				message: `このフェーズでは使用できません（現在: ${phaseString}）`,
				error: "Phase not allowed",
			};
		}

		// ステータスチェック
		if (abilityState.status === AbilityStatus.COOLDOWN) {
			const remaining = Math.ceil(
				(abilityState.cooldownEnd - Date.now()) / 1000,
			);
			return {
				success: false,
				message: `クールダウン中です（残り${remaining}秒）`,
				error: "On cooldown",
			};
		}

		if (abilityState.status === AbilityStatus.DISABLED) {
			return {
				success: false,
				message: "能力が無効化されています",
				error: "Ability disabled",
			};
		}

		// 使用回数チェック
		if (abilityState.usesRemaining <= 0) {
			return {
				success: false,
				message: "使用回数制限に達しています",
				error: "No uses remaining",
			};
		}

		if (abilityState.usesThisPhase >= definition.usesPerPhase) {
			return {
				success: false,
				message: "このフェーズでの使用回数制限に達しています",
				error: "Phase limit reached",
			};
		}

		return {
			success: true,
			message: "使用可能です",
		};
	} catch (error) {
		console.error(
			`Failed to check ability ${abilityId} for ${player.name}:`,
			error,
		);
		return {
			success: false,
			message: "チェックエラーが発生しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * 能力実行
 */
async function executeAbility(
	player: Player,
	definition: AbilityDefinition,
	target?: Player,
	location?: Vector3,
): Promise<AbilityResult> {
	try {
		const executor = executorFactory.getExecutor(definition.type);

		if (!executor) {
			return {
				success: false,
				message: "未実装の能力です",
				error: "Ability not implemented",
			};
		}

		return await executor(player, definition, target, location);
	} catch (error) {
		console.error(`Failed to execute ability ${definition.type}:`, error);
		return {
			success: false,
			message: "能力実行エラーが発生しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * 能力使用記録
 */
function recordAbilityUsage(
	player: Player,
	definition: AbilityDefinition,
	target?: Player,
	location?: Vector3,
	result?: AbilityResult,
): void {
	const usage: AbilityUsage = {
		id: `usage_${usageCounter++}`,
		userId: player.id,
		userName: player.name,
		abilityId: definition.id,
		abilityType: definition.type,
		targetId: target?.id,
		targetName: target?.name,
		location: location
			? {
					x: Math.round(location.x * 100) / 100,
					y: Math.round(location.y * 100) / 100,
					z: Math.round(location.z * 100) / 100,
					dimension: player.dimension.id,
				}
			: undefined,
		timestamp: Date.now(),
		phaseId: convertPhaseToId(getCurrentPhase()),
		result: result || { success: false, message: "No result" },
	};

	abilityUsages.push(usage);
}

/**
 * 能力状態更新
 */
function updateAbilityState(
	playerId: string,
	abilityId: string,
	definition: AbilityDefinition,
): void {
	const playerState = playerStates.get(playerId);
	if (!playerState) return;

	const abilityState = playerState.abilities.get(abilityId);
	if (!abilityState) return;

	// 使用回数更新
	abilityState.usesRemaining--;
	abilityState.usesThisPhase++;

	// クールダウン設定
	if (definition.cooldownTime > 0) {
		abilityState.status = AbilityStatus.COOLDOWN;
		abilityState.cooldownEnd = Date.now() + definition.cooldownTime * 1000;

		// クールダウン終了タイマー
		system.runTimeout(() => {
			if (abilityState.usesRemaining > 0) {
				abilityState.status = AbilityStatus.AVAILABLE;
			} else {
				abilityState.status = AbilityStatus.USED;
			}
		}, definition.cooldownTime * 20);
	} else if (abilityState.usesRemaining <= 0) {
		abilityState.status = AbilityStatus.USED;
	}

	// 使用記録更新
	playerState.lastUsage.set(abilityId, Date.now());
	playerState.usageCount.set(
		abilityId,
		(playerState.usageCount.get(abilityId) || 0) + 1,
	);
}

/**
 * プレイヤーの能力一覧取得
 */
export function getPlayerAbilities(
	playerId: string,
): Map<string, AbilityInstanceState> {
	const playerState = playerStates.get(playerId);
	return playerState ? playerState.abilities : new Map();
}

/**
 * 能力統計取得
 */
export function getAbilityStatistics(): AbilityStatistics {
	const usagesByType = new Map<AbilityType, number>();
	const usagesByPlayer = new Map<string, number>();
	const usagesByPhase = new Map<number, number>();

	let totalSuccesses = 0;

	for (const usage of abilityUsages) {
		usagesByType.set(
			usage.abilityType,
			(usagesByType.get(usage.abilityType) || 0) + 1,
		);
		usagesByPlayer.set(
			usage.userId,
			(usagesByPlayer.get(usage.userId) || 0) + 1,
		);
		usagesByPhase.set(
			usage.phaseId,
			(usagesByPhase.get(usage.phaseId) || 0) + 1,
		);

		if (usage.result.success) totalSuccesses++;
	}

	const mostUsedAbility =
		Array.from(usagesByType.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
		"";

	const mostActivePlayer =
		Array.from(usagesByPlayer.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
		"";

	return {
		totalUsages: abilityUsages.length,
		usagesByType,
		usagesByPlayer,
		usagesByPhase,
		successRate:
			abilityUsages.length > 0
				? (totalSuccesses / abilityUsages.length) * 100
				: 0,
		mostUsedAbility,
		mostActivePlayer,
	};
}

/**
 * イベントリスナー設定
 */
function setupEventListeners(): void {
	// フェーズ変更時の処理
	system.afterEvents.scriptEventReceive.subscribe((event) => {
		if (event.id === "mdms:phase_changed") {
			onPhaseChanged();
		}
	});
}

/**
 * フェーズ変更時処理
 */
function onPhaseChanged(): void {
	// 全プレイヤーのフェーズ使用回数をリセット
	for (const playerState of playerStates.values()) {
		for (const abilityState of playerState.abilities.values()) {
			abilityState.usesThisPhase = 0;
		}
	}

	console.log("Phase changed: Reset ability usage counts for all players");
}

/**
 * ヘルパーメソッド
 */


function getPhaseString(phase: GamePhase): string {
	switch (phase) {
		case GamePhase.PREPARATION:
			return "preparation";
		case GamePhase.DAILY_LIFE:
			return "daily_life";
		case GamePhase.INVESTIGATION:
			return "investigation";
		case GamePhase.DISCUSSION:
			return "discussion";
		case GamePhase.REINVESTIGATION:
			return "reinvestigation";
		case GamePhase.DEDUCTION:
			return "deduction";
		case GamePhase.VOTING:
			return "voting";
		case GamePhase.ENDING:
			return "ending";
		default:
			return "unknown";
	}
}

function convertPhaseToId(phase: GamePhase): number {
	// 文字列としてのフェーズ値も対応
	switch (phase) {
		case GamePhase.PREPARATION:
			return 0;
		case GamePhase.DAILY_LIFE:
			return 1;
		case GamePhase.INVESTIGATION:
			return 2;
		case GamePhase.DISCUSSION:
			return 3;
		case GamePhase.REINVESTIGATION:
			return 4;
		case GamePhase.DEDUCTION:
			return 5;
		case GamePhase.VOTING:
			return 6;
		case GamePhase.ENDING:
			return 7;
		default:
			console.warn(
				`Unknown phase in AbilityManager: ${phase}, defaulting to 0`,
			);
			return 0;
	}
}

function analyzePlayerBehavior(player: Player): string {
	const actions = getPlayerActions(player.id, 20);
	if (actions.length === 0) return "行動データなし";

	const actionTypes = actions.map((a) => a.actionType);
	const uniqueTypes = new Set(actionTypes);

	if (uniqueTypes.has(ActionType.MURDER)) return "極めて危険";
	if (uniqueTypes.size > 5) return "活発";
	if (uniqueTypes.size > 3) return "普通";
	return "静観";
}

function calculateTestimonyReliability(player: Player): number {
	// 簡易的な信頼性計算（分析機能を削除したため固定値）
	return 75; // デフォルト75%
}

function generateInterviewInfo(player: Player): string {
	const recentActions = getPlayerActions(player.id, 3);
	if (recentActions.length === 0) return "特になし";

	const lastAction = recentActions[0];
	return `${lastAction.actionType}に関する証言を得た`;
}

/**
 * 全記録をクリア
 */
export function clearAllData(): void {
	playerStates.clear();
	abilityUsages = [];
	activeEffects.clear();
	usageCounter = 0;
	console.log("All ability data cleared");
}

/**
 * デバッグ用：能力システム状況出力
 */
export function debugAbilitySystem(): void {
	console.log("=== Ability System Debug ===");
	console.log(`Active players: ${playerStates.size}`);
	console.log(`Total usages: ${abilityUsages.length}`);
	console.log(`Active effects: ${activeEffects.size}`);

	const stats = getAbilityStatistics();
	console.log(`Success rate: ${Math.round(stats.successRate)}%`);
	console.log(`Most used ability: ${stats.mostUsedAbility}`);
	console.log(`Most active player: ${stats.mostActivePlayer}`);

	console.log("=== End Ability System Debug ===");
}
