import { type Entity, system, type Vector3, world } from "@minecraft/server";
import {
	getAreaInfo,
	getAreaRiskLevel,
	getRandomNPC,
	getRandomSpawnLocationForNPC,
	isValidSpawnDistance,
	type NPCDefinition,
	type NPCSpawnLocation,
} from "../data/NPCDefinitions";
import { ActionType } from "../types/ActionTypes";
import { RoleType } from "../types/RoleTypes";
import { recordAction } from "./ActionTrackingManager";
import { getGamePhase, getPlayerRole } from "./ScoreboardManager";
import { calculateDistance } from "../utils/CommonUtils";

/**
 * スポーンされたNPCの情報
 */
export interface SpawnedNPC {
	id: string;
	definition: NPCDefinition;
	entity: Entity;
	spawnLocation: NPCSpawnLocation;
	spawnTime: number;
	isAlive: boolean;
	isKilled: boolean;
	killedBy?: string; // 殺害者のプレイヤーID
	killedAt?: number; // 殺害時刻
	evidenceGenerated: boolean;
}

/**
 * NPC管理マネージャー
 * 殺害対象NPCのスポーン、管理、殺害処理を担当
 */

// モジュールスコープの状態変数
const spawnedNPCs: Map<string, SpawnedNPC> = new Map();
let targetNPC: SpawnedNPC | null = null;
let murdererNotified: boolean = false;
let isInitialized: boolean = false;

/**
 * NPCManagerを初期化
 */
export function initializeNPCManager(): void {
	if (isInitialized) return;

	setupEventListeners();
	isInitialized = true;
	console.log("NPCManager initialized");
}

/**
 * 殺害対象NPCをスポーンし、犯人に通知
 */
export async function spawnTargetNPC(): Promise<boolean> {
	try {
		console.log("Spawning target NPC...");

		// 既にターゲットが存在する場合は削除
		if (targetNPC) {
			removeNPC(targetNPC.id);
		}

		// ランダムなNPCを選択
		const npcDefinition = getRandomNPC();
		const spawnLocation = getRandomSpawnLocationForNPC(npcDefinition);

		if (!spawnLocation) {
			console.error("No valid spawn location found for NPC");
			return false;
		}

		// プレイヤー位置を取得
		const playerLocations = world.getAllPlayers().map((p) => p.location);

		// 十分離れた場所かチェック
		if (!isValidSpawnDistance(spawnLocation.coordinates, playerLocations)) {
			console.warn("Spawn location too close to players, using anyway");
		}

		// NPCをスポーン
		const dimension = world.getDimension("overworld");
		const entity = dimension.spawnEntity(
			npcDefinition.entityType,
			spawnLocation.coordinates,
		);

		if (!entity) {
			console.error("Failed to spawn NPC entity");
			return false;
		}

		// NPCに名前を設定
		entity.nameTag = npcDefinition.name;

		// AIを無効化して動かないようにする
		try {
			entity.runCommand("tp ~ ~ ~ ~ ~"); // 向きを固定
		} catch (error) {
			console.warn("Failed to set NPC facing direction:", error);
		}

		// スポーン情報を記録
		const spawnedNPC: SpawnedNPC = {
			id: `npc_${Date.now()}`,
			definition: npcDefinition,
			entity: entity,
			spawnLocation: spawnLocation,
			spawnTime: system.currentTick,
			isAlive: true,
			isKilled: false,
			evidenceGenerated: false,
		};

		spawnedNPCs.set(spawnedNPC.id, spawnedNPC);
		targetNPC = spawnedNPC;

		// 犯人に通知
		await notifyMurderers();

		// 全プレイヤーにNPCの存在を通知
		announceNPCSpawn(spawnedNPC);

		console.log(
			`Target NPC spawned: ${npcDefinition.name} at ${spawnLocation.description}`,
		);
		return true;
	} catch (error) {
		console.error("Failed to spawn target NPC:", error);
		return false;
	}
}

/**
 * NPCを殺害する
 */
export function killNPC(npcId: string, killerId: string): boolean {
	try {
		const npc = spawnedNPCs.get(npcId);
		if (!npc) {
			console.error(`NPC not found: ${npcId}`);
			return false;
		}

		if (!npc.isAlive) {
			console.error(`NPC is already dead: ${npcId}`);
			return false;
		}

		// 殺害を記録
		npc.isAlive = false;
		npc.isKilled = true;
		npc.killedBy = killerId;
		npc.killedAt = system.currentTick;

		// エンティティを削除
		try {
			npc.entity.remove();
		} catch (error) {
			console.warn("Failed to remove entity:", error);
		}

		// 証拠を生成
		generateEvidenceAtLocation(npc);

		// 行動記録
		const killer = world.getAllPlayers().find((p) => p.id === killerId);
		if (killer) {
			recordAction(
				killer,
				ActionType.MURDER,
				{
					victimId: npc.id,
					victimName: npc.definition.name,
					location: npc.spawnLocation.coordinates,
					evidenceClues: npc.definition.evidenceClues,
				},
				true,
			);
		}

		// 全プレイヤーに事件発生を通知
		announceMurderEvent(npc);

		console.log(`NPC killed: ${npc.definition.name} by player ${killerId}`);
		return true;
	} catch (error) {
		console.error("Failed to kill NPC:", error);
		return false;
	}
}

/**
 * プレイヤーが殺害可能な距離にいるかチェック
 */
export function canPlayerKillNPC(playerId: string, npcId: string): boolean {
	const npc = spawnedNPCs.get(npcId);
	if (!npc || !npc.isAlive) {
		return false;
	}

	const player = world.getAllPlayers().find((p) => p.id === playerId);
	if (!player) {
		return false;
	}

	// 犯人のみが殺害可能
	const role = getPlayerRole(player);
	if (role !== RoleType.MURDERER) {
		return false;
	}

	// 生活フェーズ中のみ殺害可能
	const currentPhase = getGamePhase();
	if (currentPhase !== 1) {
		// GamePhase.DAILY_LIFE = 1
		return false;
	}

	// 距離チェック
	const distance = calculateDistance(
		player.location,
		npc.spawnLocation.coordinates,
	);
	return distance <= 5; // 5ブロック以内
}

/**
 * 現在のターゲットNPCを取得
 */
export function getTargetNPC(): SpawnedNPC | null {
	return targetNPC;
}

/**
 * 全NPCの情報を取得
 */
export function getAllNPCs(): Map<string, SpawnedNPC> {
	return new Map(spawnedNPCs);
}

/**
 * NPCを削除
 */
export function removeNPC(npcId: string): boolean {
	try {
		const npc = spawnedNPCs.get(npcId);
		if (!npc) {
			return false;
		}

		try {
			if (npc.entity.isValid) {
				npc.entity.remove();
			}
		} catch (error) {
			console.warn("Failed to remove entity:", error);
		}

		spawnedNPCs.delete(npcId);

		if (targetNPC?.id === npcId) {
			targetNPC = null;
		}

		console.log(`NPC removed: ${npc.definition.name}`);
		return true;
	} catch (error) {
		console.error("Failed to remove NPC:", error);
		return false;
	}
}

/**
 * 全NPCをクリア
 */
export function clearAllNPCs(): void {
	try {
		for (const [npcId, npc] of spawnedNPCs) {
			try {
				if (npc.entity.isValid) {
					npc.entity.remove();
				}
			} catch (error) {
				console.warn(`Failed to remove entity ${npcId}:`, error);
			}
		}

		spawnedNPCs.clear();
		targetNPC = null;
		murdererNotified = false;

		console.log("All NPCs cleared");
	} catch (error) {
		console.error("Failed to clear NPCs:", error);
	}
}

/**
 * 犯人にターゲットを通知
 */
async function notifyMurderers(): Promise<void> {
	if (!targetNPC || murdererNotified) {
		return;
	}

	try {
		const murderers = world
			.getAllPlayers()
			.filter(
				(player) =>
					getPlayerRole(player) ===
					RoleType.MURDERER,
			);

		for (const murderer of murderers) {
			const areaInfo = getAreaInfo(targetNPC.spawnLocation.area);
			const riskLevel = getAreaRiskLevel(targetNPC.spawnLocation.area);

			murderer.sendMessage("§l§c=== 殺害指令 ===");
			murderer.sendMessage(`§e対象: §f${targetNPC.definition.name}`);
			murderer.sendMessage(`§e場所: §f${targetNPC.spawnLocation.description}`);
			murderer.sendMessage(
				`§eエリア: §f${targetNPC.spawnLocation.area} (§c目撃リスク: ${riskLevel}§f)`,
			);
			murderer.sendMessage(`§e説明: §7${targetNPC.definition.description}`);

			// エリア情報による戦略的アドバイス
			if (areaInfo) {
				murderer.sendMessage(`§8戦略: ${areaInfo.description}`);
			}

			murderer.sendMessage("§7近づいて右クリックで殺害できます");
			murderer.sendMessage(
				`§c注意: ${riskLevel}リスクエリアです。他のプレイヤーに注意してください`,
			);
		}

		murdererNotified = true;
		console.log(`Target NPC notified to ${murderers.length} murderer(s)`);
	} catch (error) {
		console.error("Failed to notify murderers:", error);
	}
}

/**
 * NPC出現を全プレイヤーに通知
 */
function announceNPCSpawn(npc: SpawnedNPC): void {
	const areaInfo = getAreaInfo(npc.spawnLocation.area);
	const riskLevel = getAreaRiskLevel(npc.spawnLocation.area);

	world.sendMessage("§l§e=== 新たな人物が到着しました ===");
	world.sendMessage(
		`§6${npc.definition.name}§r が §6${npc.spawnLocation.area}§r に現れました`,
	);
	world.sendMessage(`§7${npc.definition.description}`);

	// エリアの説明と危険度を表示
	if (areaInfo) {
		world.sendMessage(`§8エリア情報: ${areaInfo.description}`);
		world.sendMessage(`§8目撃リスク: ${riskLevel}`);
	}

	// 人目につかない場所の場合は詳細な場所は教えない
	if (!npc.spawnLocation.isSecluded) {
		world.sendMessage(`§7場所: ${npc.spawnLocation.description}`);
	} else {
		world.sendMessage("§7※人目につかない場所にいるようです");
	}
}

/**
 * 殺人事件発生を通知
 */
function announceMurderEvent(npc: SpawnedNPC): void {
	world.sendMessage("§l§c=== 事件発生！ ===");
	world.sendMessage(`§c${npc.definition.name}§r が殺害されました！`);
	world.sendMessage(`§e場所: §f${npc.spawnLocation.description}`);
	world.sendMessage("§7現場には証拠が残されているかもしれません...");

	// フェーズ遷移トリガー
	system.run(() => {
		world
			.getDimension("overworld")
			.runCommand(
				'scriptevent mdms:murder_occurred {"npcId":"' + npc.id + '"}',
			);
	});
}

/**
 * 証拠を生成
 */
function generateEvidenceAtLocation(npc: SpawnedNPC): void {
	if (npc.evidenceGenerated || !npc.definition.evidenceClues) {
		return;
	}

	try {
		// 証拠生成のScriptEventを送信
		const evidenceData = {
			npcId: npc.id,
			location: npc.spawnLocation.coordinates,
			clues: npc.definition.evidenceClues,
			killedAt: npc.killedAt,
			killedBy: npc.killedBy,
		};

		system.run(() => {
			world
				.getDimension("overworld")
				.runCommand(
					"scriptevent mdms:generate_evidence " + JSON.stringify(evidenceData),
				);
		});

		npc.evidenceGenerated = true;
		console.log(`Evidence generated for NPC: ${npc.definition.name}`);
	} catch (error) {
		console.error("Failed to generate evidence:", error);
	}
}

/**
 * 距離計算
 */


/**
 * イベントリスナーを設定
 */
function setupEventListeners(): void {
	// プレイヤーがNPCをクリックした場合の処理
	world.afterEvents.entityHitEntity.subscribe((event) => {
		try {
			if (
				event.damagingEntity?.typeId === "minecraft:player" &&
				event.hitEntity?.typeId === "minecraft:villager"
			) {
				const player = event.damagingEntity as any; // Player型にキャスト
				const targetEntity = event.hitEntity;

				// NPCかどうかチェック
				const npc = Array.from(spawnedNPCs.values()).find(
					(n) => n.entity.id === targetEntity.id && n.isAlive,
				);

				if (npc && canPlayerKillNPC(player.id, npc.id)) {
					killNPC(npc.id, player.id);
				} else if (npc && getPlayerRole(player) === RoleType.MURDERER) {
					(player as any).sendMessage("§c生活フェーズ中のみ殺害可能です");
				}
			}
		} catch (error) {
			console.error("Error in NPC hit event:", error);
		}
	});
}

/**
 * デバッグ情報を出力
 */
export function debugNPCStatus(): void {
	console.log("=== NPC Manager Debug ===");
	console.log(`Spawned NPCs: ${spawnedNPCs.size}`);
	console.log(`Target NPC: ${targetNPC?.definition.name || "None"}`);
	console.log(`Murderer notified: ${murdererNotified}`);

	for (const [id, npc] of spawnedNPCs) {
		console.log(
			`NPC ${id}: ${npc.definition.name}, alive: ${npc.isAlive}, killed: ${npc.isKilled}`,
		);
	}

	console.log("=== End NPC Debug ===");
}
