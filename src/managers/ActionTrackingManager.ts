/**
 * プレイヤー行動追跡管理関数群（関数ベース版）
 * ScriptEventベースで全プレイヤーの行動を記録・管理
 */

import {
	type Player,
	type PlayerBreakBlockBeforeEvent,
	system,
	type Vector3,
	world,
} from "@minecraft/server";
import {
	getAreaFromCoordinates,
	getNearestLandmark,
} from "../constants/AreaConfigs";
import {
	type ActionFilter,
	type ActionRecord,
	type ActionStatistics,
	ActionType,
	EvidenceCondition,
	type EvidenceData,
	type EvidenceExtractionResult,
} from "../types/ActionTypes";
import { GamePhase } from "../types/PhaseTypes";
import { RoleType } from "../types/RoleTypes";
import { calculateDistance } from "../utils/CommonUtils";
import { getCurrentPhase } from "./PhaseManager";
import { getGameDay, getPlayerRole } from "./ScoreboardManager";

// グローバル状態変数（モジュールスコープ）
let actionRecords: ActionRecord[] = [];
let gameStartTime: number = 0;
let isTracking: boolean = false;
let recordCounter: number = 0;

// 初期化フラグ
let isInitialized = false;

/**
 * ActionTrackingシステムを初期化
 */
export function initializeActionTracking(): void {
	if (!isInitialized) {
		setupEventListeners();
		isInitialized = true;
	}
}

/**
 * 行動追跡を開始
 */
export function startTracking(): void {
	isTracking = true;
	gameStartTime = Date.now();
	actionRecords = [];
	recordCounter = 0;
	console.log("Action tracking started");
}

/**
 * 行動追跡を停止
 */
export function stopTracking(): void {
	isTracking = false;
	console.log(
		`Action tracking stopped. Total records: ${actionRecords.length}`,
	);
}

/**
 * 行動記録を追加
 */
export function recordAction(
	player: Player,
	actionType: ActionType,
	data: Record<string, any> = {},
	isEvidence: boolean = true,
): string | null {
	if (!isTracking) return null;

	try {
		const timestamp = getGameTime();
		const phaseId = convertPhaseToId(getCurrentPhase());
		const location = player.location;
		const witnessIds = findWitnesses(player, location);

		const record: ActionRecord = {
			id: `action_${recordCounter++}`,
			playerId: player.id,
			playerName: player.name,
			actionType,
			timestamp,
			phaseId,
			location: {
				x: Math.round(location.x * 100) / 100,
				y: Math.round(location.y * 100) / 100,
				z: Math.round(location.z * 100) / 100,
				dimension: player.dimension.id,
			},
			data,
			isEvidence,
			witnessIds,
		};

		// 生活フェーズ中の証拠の場合、詳細データを生成
		if (isEvidence && isInDailyLifePhase()) {
			record.evidenceData = generateDetailedEvidenceData(
				player,
				actionType,
				data,
				timestamp,
			);
		}

		actionRecords.push(record);

		// ScriptEventで他のシステムに通知
		system.run(() => {
			world
				.getDimension("overworld")
				.runCommand(
					`scriptevent mdms:action_recorded {"actionId":"${record.id}","actionType":"${actionType}","playerId":"${player.id}"}`,
				);
		});

		console.log(
			`Recorded action: ${actionType} by ${player.name} at ${timestamp}`,
		);
		return record.id;
	} catch (error) {
		console.error("Failed to record action:", error);
		return null;
	}
}

/**
 * フェーズベース証拠抽出
 */
export function extractEvidenceFromPhase(
	phase: GamePhase,
): EvidenceExtractionResult {
	try {
		const phaseId = convertPhaseToId(phase);
		const phaseActions = actionRecords.filter(
			(record) => record.phaseId === phaseId,
		);
		const evidence = phaseActions.filter((record) => record.isEvidence);

		const timeRange = getPhaseTimeRange(phaseId);

		return {
			success: true,
			evidence,
			totalActions: phaseActions.length,
			filteredActions: evidence.length,
			timeRange,
		};
	} catch (error) {
		console.error(`Failed to extract evidence from phase ${phase}:`, error);
		return {
			success: false,
			evidence: [],
			totalActions: 0,
			filteredActions: 0,
			timeRange: { start: 0, end: 0 },
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}

/**
 * 生活フェーズ内証拠抽出
 */
export function extractEvidenceFromDailyLife(): EvidenceExtractionResult {
	return extractEvidenceFromPhase(GamePhase.DAILY_LIFE);
}

/**
 * フィルター条件に基づく行動検索
 */
export function searchActions(filter: ActionFilter): ActionRecord[] {
	try {
		return actionRecords.filter((record) => {
			// プレイヤーIDフィルター
			if (filter.playerId && record.playerId !== filter.playerId) {
				return false;
			}

			// 行動タイプフィルター
			if (filter.actionType && record.actionType !== filter.actionType) {
				return false;
			}

			// フェーズIDフィルター
			if (filter.phaseId !== undefined && record.phaseId !== filter.phaseId) {
				return false;
			}

			// 時間範囲フィルター
			if (
				filter.startTime !== undefined &&
				record.timestamp < filter.startTime
			) {
				return false;
			}
			if (filter.endTime !== undefined && record.timestamp > filter.endTime) {
				return false;
			}

			// 証拠フィルター
			if (
				filter.isEvidence !== undefined &&
				record.isEvidence !== filter.isEvidence
			) {
				return false;
			}

			// 位置フィルター
			if (filter.location) {
				const distance = calculateDistance(record.location, filter.location);
				if (distance > filter.location.radius) {
					return false;
				}
			}

			return true;
		});
	} catch (error) {
		console.error("Failed to search actions:", error);
		return [];
	}
}

/**
 * プレイヤーの行動履歴を取得
 */
export function getPlayerActions(
	playerId: string,
	limit?: number,
): ActionRecord[] {
	const playerActions = actionRecords
		.filter((record) => record.playerId === playerId)
		.sort((a, b) => b.timestamp - a.timestamp);

	return limit ? playerActions.slice(0, limit) : playerActions;
}

/**
 * 行動統計を取得
 */
export function getActionStatistics(): ActionStatistics {
	const actionsByType = new Map<ActionType, number>();
	const actionsByPlayer = new Map<string, number>();
	const actionsByPhase = new Map<number, number>();

	let evidenceCount = 0;
	let minTime = Infinity;
	let maxTime = -Infinity;

	for (const record of actionRecords) {
		// タイプ別統計
		actionsByType.set(
			record.actionType,
			(actionsByType.get(record.actionType) || 0) + 1,
		);

		// プレイヤー別統計
		actionsByPlayer.set(
			record.playerId,
			(actionsByPlayer.get(record.playerId) || 0) + 1,
		);

		// フェーズ別統計
		actionsByPhase.set(
			record.phaseId,
			(actionsByPhase.get(record.phaseId) || 0) + 1,
		);

		// 証拠カウント
		if (record.isEvidence) evidenceCount++;

		// 時間範囲
		minTime = Math.min(minTime, record.timestamp);
		maxTime = Math.max(maxTime, record.timestamp);
	}

	return {
		totalActions: actionRecords.length,
		actionsByType,
		actionsByPlayer,
		actionsByPhase,
		evidenceCount,
		timeRange: {
			start: minTime === Infinity ? 0 : minTime,
			end: maxTime === -Infinity ? 0 : maxTime,
		},
	};
}

/**
 * 特定行動の目撃者を取得
 */
export function getActionWitnesses(actionId: string): Player[] {
	const record = actionRecords.find((r) => r.id === actionId);
	if (!record) return [];

	return record.witnessIds
		.map((id) => world.getAllPlayers().find((p) => p.id === id))
		.filter((p) => p !== undefined) as Player[];
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners(): void {
	// チャットイベント（APIに存在しない場合はコメントアウト）
	// world.beforeEvents.chatSend.subscribe((event: ChatSendBeforeEvent) => {
	//   if (isTracking) {
	//     recordAction(event.sender, ActionType.CHAT, {
	//       message: event.message
	//     });
	//   }
	// });

	// ブロック破壊イベント
	world.beforeEvents.playerBreakBlock.subscribe(
		(event: PlayerBreakBlockBeforeEvent) => {
			if (isTracking) {
				recordAction(event.player, ActionType.BLOCK_BREAK, {
					blockType: event.block.typeId,
					location: event.block.location,
				});
			}
		},
	);

	// ブロック設置イベント（イベントが存在しない場合はコメントアウト）
	// world.beforeEvents.playerPlaceBlock.subscribe((event: PlayerPlaceBlockBeforeEvent) => {
	//   if (isTracking) {
	//     recordAction(event.player, ActionType.BLOCK_PLACE, {
	//       blockType: event.block.typeId,
	//       location: event.block.location
	//     });
	//   }
	// });

	// アイテム使用イベント
	world.afterEvents.itemUse.subscribe((event) => {
		if (isTracking) {
			recordAction(event.source, ActionType.ITEM_USE, {
				itemType: event.itemStack.typeId,
				amount: event.itemStack.amount,
			});
		}
	});

	// ブロックとの相互作用イベント（チェスト、竈等）
	world.afterEvents.playerInteractWithBlock.subscribe((event) => {
		if (isTracking) {
			const blockType = event.block.typeId;
			const isContainer =
				blockType.includes("chest") ||
				blockType.includes("furnace") ||
				blockType.includes("barrel") ||
				blockType.includes("shulker_box") ||
				blockType.includes("hopper");

			if (isContainer) {
				recordAction(event.player, ActionType.BLOCK_INTERACT, {
					blockType: blockType,
					location: event.block.location,
					interactionType: "container_access",
					containerType: getContainerType(blockType),
				});
			}
		}
	});

	// エンティティヒットイベント（攻撃）
	world.afterEvents.entityHitEntity.subscribe((event) => {
		if (
			isTracking &&
			event.damagingEntity?.typeId === "minecraft:player" &&
			event.hitEntity?.typeId === "minecraft:player"
		) {
			const attacker = event.damagingEntity as Player;
			const victim = event.hitEntity as Player;

			recordAction(attacker, ActionType.ENTITY_INTERACT, {
				targetId: victim.id,
				targetName: victim.name,
				interactionType: "attack",
			});
		}
	});

	// プレイヤー死亡イベント
	world.afterEvents.entityDie.subscribe((event) => {
		if (isTracking && event.deadEntity?.typeId === "minecraft:player") {
			const player = event.deadEntity as Player;
			recordAction(player, ActionType.DEATH, {
				cause: event.damageSource.cause,
			});
		}
	});

	// カスタムScriptEvent処理
	system.afterEvents.scriptEventReceive.subscribe((event) => {
		if (!isTracking) return;

		if (event.id === "mdms:murder") {
			const data = JSON.parse(event.message || "{}");
			const murderer = world
				.getAllPlayers()
				.find((p) => p.id === data.murdererId);
			const victim = world.getAllPlayers().find((p) => p.id === data.victimId);

			if (murderer && victim) {
				recordAction(
					murderer,
					ActionType.MURDER,
					{
						victimId: victim.id,
						victimName: victim.name,
						method: data.method || "unknown",
					},
					true,
				);
			}
		}

		if (event.id === "mdms:skill_use") {
			const data = JSON.parse(event.message || "{}");
			const player = world.getAllPlayers().find((p) => p.id === data.playerId);

			if (player) {
				recordAction(
					player,
					ActionType.SKILL_USE,
					{
						skillId: data.skillId,
						targetId: data.targetId,
						result: data.result,
					},
					true,
				);
			}
		}

		if (event.id === "mdms:task_complete") {
			const data = JSON.parse(event.message || "{}");
			const player = world.getAllPlayers().find((p) => p.id === data.playerId);

			if (player) {
				recordAction(player, ActionType.TASK_COMPLETE, {
					taskId: data.taskId,
					taskName: data.taskName,
					duration: data.duration,
				});
			}
		}
	});
}

/**
 * 目撃者を検索
 */
function findWitnesses(
	actor: Player,
	location: Vector3,
	radius: number = 10,
): string[] {
	try {
		return world
			.getAllPlayers()
			.filter((player) => {
				if (player.id === actor.id) return false;

				const distance = calculateDistance(location, {
					x: player.location.x,
					y: player.location.y,
					z: player.location.z,
				});

				return distance <= radius;
			})
			.map((player) => player.id);
	} catch (error) {
		console.error("Failed to find witnesses:", error);
		return [];
	}
}

/**
 * ゲーム時間を取得（開始からの秒数）
 */
function getGameTime(): number {
	return Math.floor((Date.now() - gameStartTime) / 1000);
}

/**
 * フェーズの時間範囲を取得
 */
function getPhaseTimeRange(phaseId: number): { start: number; end: number } {
	// 実装は簡略化。実際にはPhaseManagerと連携して正確な時間を取得
	const phaseActions = actionRecords.filter(
		(record) => record.phaseId === phaseId,
	);

	if (phaseActions.length === 0) {
		return { start: 0, end: 0 };
	}

	const timestamps = phaseActions.map((action) => action.timestamp);
	return {
		start: Math.min(...timestamps),
		end: Math.max(...timestamps),
	};
}

/**
 * 全記録をクリア
 */
export function clearAllRecords(): void {
	actionRecords = [];
	recordCounter = 0;
	console.log("All action records cleared");
}

/**
 * フェーズをIDに変換
 */
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
			console.warn(`Unknown phase: ${phase}, defaulting to 0`);
			return 0;
	}
}

/**
 * デバッグ用：記録統計を出力
 */
export function debugActionRecords(): void {
	console.log("=== Action Records Debug ===");
	const stats = getActionStatistics();

	console.log(`Total actions: ${stats.totalActions}`);
	console.log(`Evidence count: ${stats.evidenceCount}`);
	console.log(`Time range: ${stats.timeRange.start} - ${stats.timeRange.end}`);

	console.log("Actions by type:");
	for (const [type, count] of stats.actionsByType.entries()) {
		console.log(`  ${type}: ${count}`);
	}

	console.log("Actions by player:");
	for (const [playerId, count] of stats.actionsByPlayer.entries()) {
		const player = world.getAllPlayers().find((p) => p.id === playerId);
		const playerName = player ? player.name : "Unknown";
		console.log(`  ${playerName} (${playerId}): ${count}`);
	}

	console.log("=== End Action Records Debug ===");
}

/**
 * 現在が生活フェーズかどうかをチェック
 */
function isInDailyLifePhase(): boolean {
	const currentPhase = getCurrentPhase();
	return currentPhase === GamePhase.DAILY_LIFE;
}

/**
 * コンテナタイプを判定
 */
function getContainerType(blockType: string): string {
	if (blockType.includes("chest")) return "chest";
	if (blockType.includes("furnace")) return "furnace";
	if (blockType.includes("barrel")) return "barrel";
	if (blockType.includes("shulker_box")) return "shulker_box";
	if (blockType.includes("hopper")) return "hopper";
	return "unknown_container";
}

/**
 * プレイヤー座標ベースのエリア検知
 */
function checkAreaTransition(player: Player, newLocation: Vector3): void {
	const playerId = player.id;
	const lastLocation = playerLastLocations.get(playerId);

	if (lastLocation) {
		const newArea = getAreaName(newLocation);
		const lastArea = getAreaName(lastLocation);

		if (newArea !== lastArea && newArea !== "unknown") {
			recordAction(player, ActionType.AREA_ENTER, {
				areaName: newArea,
				previousArea: lastArea,
				coordinates: newLocation,
			});
		}
	}

	playerLastLocations.set(playerId, {
		x: newLocation.x,
		y: newLocation.y,
		z: newLocation.z,
	});
}

/**
 * 座標からエリア名を取得
 */
export function getAreaName(location: Vector3): string {
	const x = Math.floor(location.x);
	const z = Math.floor(location.z);

	// 座標範囲でエリアを判定（日本語名）
	if (x >= -50 && x <= 50 && z >= -50 && z <= 50) return "城の中庭";
	if (x >= 60 && x <= 100 && z >= -20 && z <= 20) return "図書館";
	if (x >= -100 && x <= -60 && z >= -20 && z <= 20) return "武器庫";
	if (x >= -20 && x <= 20 && z >= 60 && z <= 100) return "寝室エリア";
	if (x >= -20 && x <= 20 && z >= -100 && z <= -60) return "厨房";
	if (x >= -60 && x <= -20 && z >= -60 && z <= -20) return "牢獄";
	if (x >= 20 && x <= 60 && z >= 20 && z <= 60) return "大広間";
	if (x >= -40 && x <= 0 && z >= -40 && z <= 0) return "聖堂";
	if (x >= 30 && x <= 70 && z >= 30 && z <= 70) return "庭園";
	if (x >= -10 && x <= 10 && z >= -30 && z <= -10) return "バルコニー";

	return "unknown";
}

// プレイヤーの最後の位置を記録するマップ
const playerLastLocations = new Map<string, Vector3>();

/**
 * プレイヤー移動の定期チェック（エリア検知用）
 */
function startLocationTracking(): void {
	system.runInterval(() => {
		if (isTracking) {
			const players = world.getAllPlayers();
			for (const player of players) {
				checkAreaTransition(player, player.location);
			}
		}
	}, 60); // 3秒間隔でチェック
}

// 位置追跡を開始
startLocationTracking();

/**
 * 詳細証拠データを生成
 */
function generateDetailedEvidenceData(
	player: Player,
	actionType: ActionType,
	data: Record<string, any>,
	timestamp: number,
): EvidenceData {
	const location = player.location;
	const gameDay = getGameDay();

	// 記録条件を判定
	const recordCondition = determineRecordCondition(actionType, data);

	// 信頼度を計算（目撃者数、プレイヤーの役職、行動タイプに基づく）
	const reliability = calculateEvidenceReliability(player, actionType, data);

	return {
		when: {
			gameTime: timestamp,
			realTime: formatGameTime(timestamp),
			gameDay: gameDay,
			timeOfDay: getTimeOfDay(timestamp),
		},
		where: {
			coordinates: {
				x: Math.round(location.x * 100) / 100,
				y: Math.round(location.y * 100) / 100,
				z: Math.round(location.z * 100) / 100,
			},
			area: identifyArea(location),
			nearbyPlayers: getNearbyPlayerNames(player, location),
			landmark: findNearestLandmark(location),
		},
		what: {
			primaryAction: actionType,
			details: generateActionDescription(actionType, data),
			targetBlock: data.blockType || undefined,
			targetPlayer: data.targetPlayer || undefined,
			itemUsed: data.itemType || undefined,
			taskType: data.taskType || undefined,
		},
		recordCondition,
		reliability,
	};
}

/**
 * 証拠記録条件を判定
 */
function determineRecordCondition(
	actionType: ActionType,
	data: Record<string, any>,
): EvidenceCondition {
	// タスク完了の場合
	if (actionType === ActionType.TASK_COMPLETE) {
		return EvidenceCondition.TASK_COMPLETION;
	}

	// 殺人事件の場合
	if (actionType === ActionType.MURDER || actionType === ActionType.DEATH) {
		return EvidenceCondition.INCIDENT_TIMING;
	}

	// エリア移動の場合
	if (
		actionType === ActionType.AREA_ENTER ||
		actionType === ActionType.AREA_EXIT
	) {
		return EvidenceCondition.AREA_TRANSITION;
	}

	// プレイヤー交流の場合
	if (actionType === ActionType.ENTITY_INTERACT && data.targetPlayer) {
		return EvidenceCondition.INTERACTION;
	}

	// その他はランダムタイミング
	return EvidenceCondition.RANDOM_TIMING;
}

/**
 * 証拠の信頼度を計算
 */
function calculateEvidenceReliability(
	player: Player,
	actionType: ActionType,
	data: Record<string, any>,
): number {
	let baseReliability = 70; // 基本信頼度

	// 行動タイプによる調整
	switch (actionType) {
		case ActionType.MURDER:
		case ActionType.DEATH:
			baseReliability = 95; // 殺人・死亡は高信頼度
			break;
		case ActionType.TASK_COMPLETE:
			baseReliability = 85; // タスク完了は高信頼度
			break;
		case ActionType.MOVEMENT:
			baseReliability = 50; // 移動は低信頼度
			break;
	}

	// 目撃者数による調整
	const witnessCount = data.witnessCount || 0;
	baseReliability += Math.min(witnessCount * 5, 20); // 最大+20

	// プレイヤーの役職による調整
	const role = getPlayerRole(player);
	if (role === RoleType.MURDERER) {
		baseReliability -= 10; // 犯人の証拠は信頼度下がる
	} else if (role === RoleType.VILLAGER) {
		baseReliability += 5; // 市民の証拠は信頼度上がる
	}

	return Math.max(0, Math.min(100, baseReliability));
}

/**
 * ゲーム時間をフォーマット
 */
function formatGameTime(timestamp: number): string {
	const totalSeconds = Math.floor(timestamp);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * 時間帯を判定
 */
function getTimeOfDay(timestamp: number): string {
	const dayProgress = (timestamp % 2400) / 2400; // 1日 = 2400秒と仮定

	if (dayProgress < 0.25) return "夜";
	if (dayProgress < 0.5) return "朝";
	if (dayProgress < 0.75) return "昼";
	return "夕";
}

/**
 * エリア名を特定
 */
function identifyArea(location: Vector3): string {
	return getAreaFromCoordinates(location.x, location.z);
}

/**
 * 近くのプレイヤー名を取得
 */
function getNearbyPlayerNames(player: Player, location: Vector3): string[] {
	return world
		.getAllPlayers()
		.filter((p) => p.id !== player.id)
		.filter((p) => calculateDistance(location, p.location) <= 10)
		.map((p) => p.name);
}

/**
 * 最寄りのランドマークを検索
 */
function findNearestLandmark(location: Vector3): string | null {
	return getNearestLandmark(location);
}

/**
 * 行動の詳細説明を生成
 */
function generateActionDescription(
	actionType: ActionType,
	data: Record<string, any>,
): string {
	switch (actionType) {
		case ActionType.BLOCK_BREAK:
			return `${data.blockType || "ブロック"}を破壊した`;
		case ActionType.BLOCK_PLACE:
			return `${data.blockType || "ブロック"}を設置した`;
		case ActionType.ITEM_USE:
			return `${data.itemType || "アイテム"}を使用した`;
		case ActionType.ENTITY_INTERACT:
			return `${data.targetPlayer || "誰か"}と交流した`;
		case ActionType.TASK_COMPLETE:
			return `${data.taskType || "タスク"}を完了した`;
		case ActionType.MURDER:
			return `${data.victimName || "誰か"}を殺害した`;
		case ActionType.DEATH:
			return `${data.killerName || "誰か"}により死亡した`;
		case ActionType.MOVEMENT:
			return `${data.fromArea || ""}から移動した`;
		case ActionType.CHAT:
			return `チャットで発言した: "${data.message || ""}"`;
		case ActionType.SKILL_USE:
			return `${data.skillName || "特殊スキル"}を使用した`;
		default:
			return `${actionType}を実行した`;
	}
}

/**
 * 距離計算（Vector3 | {x, y, z}両方に対応）
 */
