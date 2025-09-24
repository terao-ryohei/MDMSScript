/**
 * 証拠発見システム管理
 * 調査フェーズでのプレイヤーによる証拠発見を処理
 */

import {
	type ItemStack,
	type Player,
	system,
	type Vector3,
	world,
} from "@minecraft/server";
import type { ActionRecord } from "../types/ActionTypes";
import { extractEvidenceFromDailyLife } from "./ActionTrackingManager";
import { getCurrentPhase, getEvidencePlacements } from "./PhaseManager";
import { setEvidenceCount } from "./ScoreboardManager";

interface EvidencePlacement {
	evidenceId: string;
	location: Vector3;
	itemType: string;
	discoveredBy: string[]; // プレイヤーIDのリスト
}

// プレイヤーが発見した証拠を管理
const playerDiscoveredEvidence = new Map<string, string[]>(); // playerId -> evidenceIds[]

// 証拠発見のクールダウン（プレイヤーごと）
const discoveryLastTime = new Map<string, number>(); // playerId -> timestamp

let isInitialized: boolean = false;

/**
 * 証拠発見システムを初期化
 */
export function initialize(): void {
	if (isInitialized) return;

	setupEvidenceDiscoveryListeners();
	isInitialized = true;
	console.log("EvidenceDiscoveryManager initialized");
}

/**
 * 証拠発見イベントリスナーを設定
 */
function setupEvidenceDiscoveryListeners(): void {
	// アイテム拾得イベントで証拠発見を検知
	world.afterEvents.entitySpawn.subscribe((event) => {
		if (event.entity.typeId === "minecraft:item") {
			// アイテムエンティティが生成された時の処理
			// プレイヤーがアイテムを拾った時に証拠発見判定
		}
	});

	// プレイヤーがアイテムを拾った時
	world.afterEvents.itemCompleteUse.subscribe((event) => {
		if (event.source.typeId === "minecraft:player") {
			const player = event.source as Player;
			checkEvidencePickup(player, event.itemStack);
		}
	});

	// プレイヤーの近接チェック（定期実行）
	system.runInterval(() => {
		if (getCurrentPhase() === "investigation") {
			checkPlayerProximityToEvidence();
		}
	}, 40); // 2秒間隔
}

/**
 * プレイヤーと証拠の近接チェック
 */
function checkPlayerProximityToEvidence(): void {
	try {
		const players = world.getAllPlayers();
		const evidencePlacements = getEvidencePlacements();

		for (const player of players) {
			const now = Date.now();
			const lastCheck = discoveryLastTime.get(player.id) || 0;

			// 5秒のクールダウン
			if (now - lastCheck < 5000) continue;

			for (const placement of evidencePlacements) {
				// プレイヤーが既に発見済みかチェック
				if (placement.discoveredBy.includes(player.id)) continue;

				// 距離チェック（3ブロック以内）
				const distance = calculateDistance(player.location, placement.location);
				if (distance <= 3) {
					handleEvidenceDiscovery(player, placement);
					discoveryLastTime.set(player.id, now);
					break; // 一度に一つの証拠のみ発見
				}
			}
		}
	} catch (error) {
		console.error("Error in checkPlayerProximityToEvidence:", error);
	}
}

/**
 * プレイヤーがアイテムを拾った時の証拠チェック
 */
function checkEvidencePickup(player: Player, itemStack: ItemStack): void {
	try {
		// 証拠アイテム（紙）かチェック
		if (itemStack.typeId !== "minecraft:paper") return;

		// 証拠の名前タグから証拠IDを取得
		const nameTag = itemStack.nameTag;
		if (!nameTag || !nameTag.includes("証拠:")) return;

		const evidencePlacements = getEvidencePlacements();
		const nearbyPlacement = evidencePlacements.find((p) => {
			const distance = calculateDistance(player.location, p.location);
			return distance <= 5; // 5ブロック以内
		});

		if (nearbyPlacement && !nearbyPlacement.discoveredBy.includes(player.id)) {
			handleEvidenceDiscovery(player, nearbyPlacement);
		}
	} catch (error) {
		console.error("Error in checkEvidencePickup:", error);
	}
}

/**
 * 証拠発見を処理
 */
function handleEvidenceDiscovery(
	player: Player,
	placement: EvidencePlacement,
): void {
	try {
		// 発見者リストに追加
		placement.discoveredBy.push(player.id);

		// プレイヤーの発見リストに追加
		const discovered = playerDiscoveredEvidence.get(player.id) || [];
		discovered.push(placement.evidenceId);
		playerDiscoveredEvidence.set(player.id, discovered);

		// 証拠詳細を取得
		const evidenceDetails = getEvidenceDetails(placement.evidenceId);

		// プレイヤーに発見通知
		player.sendMessage("§l§2証拠を発見しました！");
		player.sendMessage("§6=== 発見した証拠 ===");

		if (evidenceDetails) {
			player.sendMessage(
				`§6時刻: §j${formatGameTime(evidenceDetails.timestamp)}`,
			);
			player.sendMessage(
				`§6場所: §j${formatLocation(evidenceDetails.location)}`,
			);
			player.sendMessage(
				`§6関与者: §j${getPlayerName(evidenceDetails.playerId)}`,
			);
			player.sendMessage(`§6詳細: §j${formatEvidenceDetails(evidenceDetails)}`);
		}

		player.sendMessage("§7この情報は推理に役立つかもしれません...");

		// 効果音とパーティクル
		player.playSound("random.levelup", { volume: 0.5 });

		// スコアボードの証拠数を更新
		updatePlayerEvidenceCount(player);

		console.log(
			`Player ${player.name} discovered evidence: ${placement.evidenceId}`,
		);
	} catch (error) {
		console.error("Error handling evidence discovery:", error);
	}
}

/**
 * プレイヤーの証拠発見数を更新
 */
function updatePlayerEvidenceCount(player: Player): void {
	try {
		const discovered = playerDiscoveredEvidence.get(player.id) || [];
		const count = discovered.length;

		// スコアボードに反映
		setEvidenceCount(player, count);
	} catch (error) {
		console.error("Error updating evidence count:", error);
	}
}

/**
 * 証拠詳細を取得（ActionTrackingManagerから）
 */
function getEvidenceDetails(evidenceId: string): ActionRecord | null {
	try {
		const allEvidence = extractEvidenceFromDailyLife();

		if (allEvidence.success) {
			return (
				allEvidence.evidence.find((e: ActionRecord) => e.id === evidenceId) ||
				null
			);
		}

		return null;
	} catch (error) {
		console.error("Error getting evidence details:", error);
		return null;
	}
}

/**
 * 距離計算
 */
function calculateDistance(loc1: Vector3, loc2: Vector3): number {
	const dx = loc1.x - loc2.x;
	const dy = loc1.y - loc2.y;
	const dz = loc1.z - loc2.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function formatGameTime(timestamp: number): string {
	const gameStart = 0;
	const elapsed = timestamp - gameStart;
	const days = Math.floor(elapsed / (24 * 60 * 60));
	const hours = Math.floor((elapsed % (24 * 60 * 60)) / (60 * 60));
	const minutes = Math.floor((elapsed % (60 * 60)) / 60);

	return `${days}日目 ${hours}:${minutes.toString().padStart(2, "0")}`;
}

function formatLocation(location: Vector3): string {
	const x = Math.floor(location.x);
	const z = Math.floor(location.z);

	if (x >= -50 && x <= 50 && z >= -50 && z <= 50) return "城の中庭";
	if (x >= 60 && x <= 100 && z >= -20 && z <= 20) return "図書館";
	if (x >= -100 && x <= -60 && z >= -20 && z <= 20) return "武器庫";
	if (x >= -20 && x <= 20 && z >= 60 && z <= 100) return "寝室エリア";
	if (x >= -20 && x <= 20 && z >= -100 && z <= -60) return "厨房";

	return `座標 (${x}, ${z})`;
}

function getPlayerName(playerId: string): string {
	const player = world.getAllPlayers().find((p) => p.id === playerId);
	return player ? player.name : "不明";
}

function formatEvidenceDetails(evidence: ActionRecord): string {
	switch (evidence.actionType) {
		case "block_interact":
			return `${evidence.data?.containerType || "コンテナ"}を開いた`;
		case "area_enter":
			return `${evidence.data?.areaName || "エリア"}に入った`;
		case "murder":
			return `${evidence.data?.victimName || "誰か"}を殺害した`;
		case "item_use":
			return `${evidence.data?.itemType || "アイテム"}を使用した`;
		case "task_complete":
			return `${evidence.data?.taskName || "タスク"}を完了した`;
		default:
			return evidence.actionType;
	}
}
