import { type Player, system, type Vector3, world } from "@minecraft/server";
import { SKILL_DEFINITIONS } from "../data/SkillDefinitions";
import {
	type PlayerSkillState,
	type SkillDefinition,
	type SkillEffect,
	type SkillInstanceState,
	type SkillResult,
	type SkillStatistics,
	SkillStatus,
	type SkillType,
	type SkillUsage,
} from "../types/AbilityTypes";
import { ActionType } from "../types/ActionTypes";
import { GamePhase } from "../types/PhaseTypes";
import { calculateDistance } from "../utils/CommonUtils";
import { getPlayerActions, recordAction } from "./ActionTrackingManager";
import { getCurrentPhase } from "./PhaseManager";
import {
	getJobString,
	getPlayerJob,
	getPlayerRole,
	getRoleString,
	roleTypeToNumber,
} from "./ScoreboardManager";
import { createSkillExecutorFactory } from "./skills/SkillExecutorFactory";

/**
 * 能力システム管理マネージャー
 */
let isInitialized: boolean = false;
const playerStates: Map<string, PlayerSkillState> = new Map();
let skillUsages: SkillUsage[] = [];
const activeEffects: Map<string, SkillEffect> = new Map();
let usageCounter: number = 0;
let executorFactory: ReturnType<typeof createSkillExecutorFactory>;

export function initialize(): void {
	if (isInitialized) return;

	isInitialized = true;
	executorFactory = createSkillExecutorFactory(activeEffects);
	setupEventListeners();
	console.log("SkillManager initialized");
}

/**
 * プレイヤー能力を初期化
 */
export function initializePlayerSkills(player: Player): void {
	try {
		const role = getRoleString(roleTypeToNumber(getPlayerRole(player)));
		const job = getJobString(getPlayerJob(player));

		const playerState: PlayerSkillState = {
			playerId: player.id,
			skills: new Map(),
			activeEffects: new Map(),
			lastUsage: new Map(),
			usageCount: new Map(),
		};

		// 役職・職業に応じた能力を付与
		for (const [skillId, definition] of Object.entries(SKILL_DEFINITIONS)) {
			const skillState: SkillInstanceState = {
				skillId,
				status: SkillStatus.AVAILABLE,
				cooldownEnd: 0,
				usesRemaining: definition.usesPerGame,
				usesThisPhase: 0,
			};
			playerState.skills.set(skillId, skillState);
		}

		playerStates.set(player.id, playerState);
		console.log(
			`Initialized skills for ${player.name}: ${playerState.skills.size} skills`,
		);
	} catch (error) {
		console.error(`Failed to initialize skills for ${player.name}:`, error);
	}
}

/**
 * 能力を使用
 */
export async function useSkill(
	player: Player,
	skillId: string,
	targetId?: string,
	location?: Vector3,
): Promise<SkillResult> {
	try {
		const playerState = playerStates.get(player.id);
		const definition = SKILL_DEFINITIONS[skillId];

		if (!playerState || !definition) {
			return {
				success: false,
				message: "能力が見つかりません",
				error: "Ability not found",
			};
		}

		const skillState = playerState.skills.get(skillId);
		if (!skillState) {
			return {
				success: false,
				message: "この能力は使用できません",
				error: "Ability not available",
			};
		}

		// 使用可能チェック
		const canUseResult = canUseSkill(player, skillId);
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
			recordSkillUsage(player, definition, target, location, result);

			// 状態更新
			updateSkillState(player.id, skillId, definition);

			// 行動記録
			recordAction(
				player,
				ActionType.SKILL_USE,
				{
					skillId,
					skillType: definition.type,
					targetId: target?.id,
					location: location || player.location,
					result: result.success,
				},
				true,
			);
		}

		return result;
	} catch (error) {
		console.error(`Failed to use skill ${skillId} for ${player.name}:`, error);
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
export function canUseSkill(player: Player, skillId: string): SkillResult {
	try {
		const definition = SKILL_DEFINITIONS[skillId];
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

		const skillState = playerState.skills.get(skillId);
		if (!skillState) {
			return {
				success: false,
				message: "この能力は使用できません",
				error: "Ability not available",
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
		if (skillState.status === SkillStatus.COOLDOWN) {
			const remaining = Math.ceil((skillState.cooldownEnd - Date.now()) / 1000);
			return {
				success: false,
				message: `クールダウン中です（残り${remaining}秒）`,
				error: "On cooldown",
			};
		}

		if (skillState.status === SkillStatus.DISABLED) {
			return {
				success: false,
				message: "能力が無効化されています",
				error: "Ability disabled",
			};
		}

		// 使用回数チェック
		if (skillState.usesRemaining <= 0) {
			return {
				success: false,
				message: "使用回数制限に達しています",
				error: "No uses remaining",
			};
		}

		if (skillState.usesThisPhase >= definition.usesPerPhase) {
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
			`Failed to check skill ${skillId} for ${player.name}:`,
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
	definition: SkillDefinition,
	target?: Player,
	location?: Vector3,
): Promise<SkillResult> {
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
		console.error(`Failed to execute skill ${definition.type}:`, error);
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
function recordSkillUsage(
	player: Player,
	definition: SkillDefinition,
	target?: Player,
	location?: Vector3,
	result?: SkillResult,
): void {
	const usage: SkillUsage = {
		id: `usage_${usageCounter++}`,
		userId: player.id,
		userName: player.name,
		skillId: definition.id,
		skillType: definition.type,
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

	skillUsages.push(usage);
}

/**
 * 能力状態更新
 */
function updateSkillState(
	playerId: string,
	skillId: string,
	definition: SkillDefinition,
): void {
	const playerState = playerStates.get(playerId);
	if (!playerState) return;

	const skillState = playerState.skills.get(skillId);
	if (!skillState) return;

	// 使用回数更新
	skillState.usesRemaining--;
	skillState.usesThisPhase++;

	// クールダウン設定
	if (definition.cooldownTime > 0) {
		skillState.status = SkillStatus.COOLDOWN;
		skillState.cooldownEnd = Date.now() + definition.cooldownTime * 1000;

		// クールダウン終了タイマー
		system.runTimeout(() => {
			if (skillState.usesRemaining > 0) {
				skillState.status = SkillStatus.AVAILABLE;
			} else {
				skillState.status = SkillStatus.USED;
			}
		}, definition.cooldownTime * 20);
	} else if (skillState.usesRemaining <= 0) {
		skillState.status = SkillStatus.USED;
	}

	// 使用記録更新
	playerState.lastUsage.set(skillId, Date.now());
	playerState.usageCount.set(
		skillId,
		(playerState.usageCount.get(skillId) || 0) + 1,
	);
}

/**
 * プレイヤーの能力一覧取得
 */
export function getPlayerSkills(
	playerId: string,
): Map<string, SkillInstanceState> {
	const playerState = playerStates.get(playerId);
	return playerState ? playerState.skills : new Map();
}

/**
 * 能力統計取得
 */
export function getSkillStatistics(): SkillStatistics {
	const usagesByType = new Map<SkillType, number>();
	const usagesByPlayer = new Map<string, number>();
	const usagesByPhase = new Map<number, number>();

	let totalSuccesses = 0;

	for (const usage of skillUsages) {
		usagesByType.set(
			usage.skillType,
			(usagesByType.get(usage.skillType) || 0) + 1,
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

	const mostUsedSkill =
		Array.from(usagesByType.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
		"";

	const mostActivePlayer =
		Array.from(usagesByPlayer.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
		"";

	return {
		totalUsages: skillUsages.length,
		usagesByType,
		usagesByPlayer,
		usagesByPhase,
		successRate:
			skillUsages.length > 0 ? (totalSuccesses / skillUsages.length) * 100 : 0,
		mostUsedSkill,
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
		for (const skillState of playerState.skills.values()) {
			skillState.usesThisPhase = 0;
		}
	}

	console.log("Phase changed: Reset skill usage counts for all players");
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
			console.warn(`Unknown phase in SkillManager: ${phase}, defaulting to 0`);
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
	skillUsages = [];
	activeEffects.clear();
	usageCounter = 0;
	console.log("All skill data cleared");
}

/**
 * デバッグ用：能力システム状況出力
 */
export function debugSkillSystem(): void {
	console.log("=== Ability System Debug ===");
	console.log(`Active players: ${playerStates.size}`);
	console.log(`Total usages: ${skillUsages.length}`);
	console.log(`Active effects: ${activeEffects.size}`);

	const stats = getSkillStatistics();
	console.log(`Success rate: ${Math.round(stats.successRate)}%`);
	console.log(`Most used skill: ${stats.mostUsedSkill}`);
	console.log(`Most active player: ${stats.mostActivePlayer}`);

	console.log("=== End Ability System Debug ===");
}
