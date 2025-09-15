import { type Player, world } from "@minecraft/server";
import {
	getRoleComposition,
	validateRoleComposition,
} from "../data/RoleDefinitions";
import {
	type RoleAssignmentResult,
	type RoleComposition,
	RoleType,
} from "../types/RoleTypes";
import {
	getPlayerRole,
	getRoleString,
	numberToRoleType,
	roleTypeToNumber,
	setPlayerRole,
} from "./ScoreboardManager";

// ScoreboardManagerの関数を再export
export {
	getPlayerRole,
	getRoleString,
	numberToRoleType,
	roleTypeToNumber,
	setPlayerRole,
};

/**
 * プレイヤーロール割り当てマネージャー
 * マダミス役職（犯人・共犯者・一般人）の割り当てを管理
 */

// モジュールスコープの状態変数
let isInitialized: boolean = false;

/**
 * RoleAssignmentManagerを初期化
 */
export function initializeRoleAssignmentManager(): void {
	if (isInitialized) return;

	isInitialized = true;
	console.log("RoleAssignmentManager initialized");
}

/**
 * 全プレイヤーにロールを割り当て
 */
export function assignRolesToAllPlayers(): RoleAssignmentResult {
	try {
		const players = world.getAllPlayers();
		const playerCount = players.length;

		// プレイヤー数チェック（テスト用に1人から可能に変更）
		if (playerCount < 1) {
			return {
				success: false,
				assignments: new Map(),
				composition: {
					murderers: 0,
					villagers: 0,
					detectives: 0,
					accomplices: 0,
				},
				error: "最低1人のプレイヤーが必要です",
			};
		}

		if (playerCount > 20) {
			return {
				success: false,
				assignments: new Map(),
				composition: {
					murderers: 0,
					villagers: 0,
					detectives: 0,
					accomplices: 0,
				},
				error: "プレイヤー数が多すぎます（最大20人）",
			};
		}

		// ロール構成を取得
		const composition = getRoleComposition(playerCount);

		// 構成の妥当性チェック
		if (!validateRoleComposition(composition, playerCount)) {
			return {
				success: false,
				assignments: new Map(),
				composition,
				error: "ロール構成が無効です",
			};
		}

		// ロール配列を生成
		const roles: RoleType[] = [];

		// 犯人を追加
		for (let i = 0; i < composition.murderers; i++) {
			roles.push(RoleType.MURDERER);
		}

		// 共犯者を追加
		for (let i = 0; i < composition.accomplices; i++) {
			roles.push(RoleType.ACCOMPLICE);
		}

		// 一般人を追加
		for (let i = 0; i < composition.villagers + composition.detectives; i++) {
			roles.push(RoleType.VILLAGER);
		}

		// ロールをシャッフル
		shuffleArray(roles);

		// プレイヤーにロールを割り当て
		const assignments = new Map<string, RoleType>();

		for (let i = 0; i < players.length; i++) {
			const player = players[i];
			const role = roles[i];

			// Scoreboardに設定
			setPlayerRole(player, convertRoleToId(role));
			assignments.set(player.id, role);

			console.log(
				`Assigned role ${role} to player ${player.name} (${player.id})`,
			);
		}

		// 成功結果を返す
		return {
			success: true,
			assignments,
			composition,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "不明なエラー";
		console.error("Role assignment failed:", error);

		return {
			success: false,
			assignments: new Map(),
			composition: {
				murderers: 0,
				villagers: 0,
				detectives: 0,
				accomplices: 0,
			},
			error: errorMessage,
		};
	}
}

/**
 * ロールタイプに該当する全プレイヤーを取得
 */
export function getPlayersByRole(roleType: RoleType): Player[] {
	try {
		const players = world.getAllPlayers();
		return players.filter((player) => {
			const role = getPlayerRole(player);
			return role === roleType;
		});
	} catch (error) {
		console.error(`Failed to get players by role ${roleType}:`, error);
		return [];
	}
}

/**
 * 犯人プレイヤーリストを取得
 */
export function getMurderers(): Player[] {
	return getPlayersByRole(RoleType.MURDERER);
}

/**
 * 共犯者プレイヤーリストを取得
 */
export function getAccomplices(): Player[] {
	return getPlayersByRole(RoleType.ACCOMPLICE);
}

/**
 * 一般人プレイヤーリストを取得
 */
export function getVillagers(): Player[] {
	return getPlayersByRole(RoleType.VILLAGER);
}

export function getDetectives(): Player[] {
	return getPlayersByRole(RoleType.DETECTIVE);
}

/**
 * 現在のロール構成を取得
 */
export function getCurrentRoleComposition(): RoleComposition {
	const murderers = getMurderers().length;
	const accomplices = getAccomplices().length;
	const villagers = getVillagers().length;
	const detectives = getDetectives().length;

	return { murderers, villagers, detectives, accomplices };
}

/**
 * プレイヤーにロール情報を通知
 */
export function notifyPlayerRole(player: Player): boolean {
	try {
		const role = getPlayerRole(player);
		if (!role) {
			player.sendMessage("§cロールが設定されていません");
			return false;
		}

		const roleString = getRoleString(convertRoleToId(role));

		player.sendMessage("§2=== あなたのロール ===");
		player.sendMessage(`§6${roleString}`);

		// ロール別の追加情報
		switch (role) {
			case RoleType.MURDERER:
				player.sendMessage("§c目標: 投票で最多票を避けて逃げ切る");
				player.sendMessage("§7生活フェーズ中に事件を起こしてください");
				break;

			case RoleType.ACCOMPLICE:
				player.sendMessage("§6目標: 犯人の勝利をサポートする");
				player.sendMessage("§7犯人の情報を一部知ることができます");
				break;

			case RoleType.VILLAGER:
				player.sendMessage("§3目標: 真犯人を特定する");
				player.sendMessage("§7証拠を集めて推理してください");
				break;
		}

		return true;
	} catch (error) {
		console.error(`Failed to notify role to player ${player.name}:`, error);
		player.sendMessage("§cロール通知エラーが発生しました");
		return false;
	}
}

/**
 * 全プレイヤーにロール情報を通知
 */
export function notifyAllPlayersRoles(): void {
	try {
		const players = world.getAllPlayers();
		for (const player of players) {
			notifyPlayerRole(player);
		}
	} catch (error) {
		console.error("Failed to notify all players roles:", error);
	}
}

/**
 * ロールタイプをIDに変換
 */
function convertRoleToId(role: RoleType): number {
	switch (role) {
		case RoleType.VILLAGER:
			return 0;
		case RoleType.MURDERER:
			return 1;
		case RoleType.ACCOMPLICE:
			return 2;
		default:
			return 0; // デフォルトは市民
	}
}

/**
 * IDをロールタイプに変換
 */
function convertIdToRole(id: number): RoleType | null {
	switch (id) {
		case 0:
			return RoleType.VILLAGER;
		case 1:
			return RoleType.MURDERER;
		case 2:
			return RoleType.ACCOMPLICE;
		default:
			return null;
	}
}

/**
 * 配列をシャッフル（Fisher-Yates shuffle）
 */
function shuffleArray<T>(array: T[]): void {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

/**
 * デバッグ用：ロール割り当て状況を出力
 */
export function debugRoleAssignments(): void {
	try {
		console.log("=== Role Assignment Debug ===");

		const composition = getCurrentRoleComposition();
		console.log(`Total composition: ${JSON.stringify(composition)}`);

		const players = world.getAllPlayers();
		for (const player of players) {
			const role = getPlayerRole(player);
			const roleString = role ? getRoleString(convertRoleToId(role)) : "未設定";
			console.log(`Player ${player.name} (${player.id}): ${roleString}`);
		}

		console.log("=== End Role Assignment Debug ===");
	} catch (error) {
		console.error("Failed to debug role assignments:", error);
	}
}
