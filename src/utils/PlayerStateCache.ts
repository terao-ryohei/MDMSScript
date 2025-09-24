import type { Player } from "@minecraft/server";
import {
	getPlayerJob as getPlayerJobFromScoreboard,
	getPlayerRole as getPlayerRoleFromScoreboard,
} from "../managers/ScoreboardManager";
import type { JobType } from "../types/JobTypes";
import type { RoleType } from "../types/RoleTypes";

/**
 * プレイヤー状態キャッシュシステム
 * 頻繁にアクセスされるプレイヤー情報をキャッシュしてパフォーマンスを向上
 */

interface PlayerStateData {
	role: RoleType | null;
	job: JobType | number;
	lastUpdate: number;
}

// キャッシュのTTL（ミリ秒） - 5秒
const CACHE_TTL = 5000;

// プレイヤー状態キャッシュ
const playerStateCache = new Map<string, PlayerStateData>();

/**
 * キャッシュが有効かチェック
 */
const isCacheValid = (data: PlayerStateData): boolean => {
	return Date.now() - data.lastUpdate < CACHE_TTL;
};

/**
 * プレイヤー状態を取得（キャッシュ使用）
 */
const getPlayerState = (player: Player): PlayerStateData => {
	const cached = playerStateCache.get(player.id);

	if (cached && isCacheValid(cached)) {
		return cached;
	}

	// キャッシュミス - 新しいデータを取得
	const newState: PlayerStateData = {
		role: getPlayerRoleFromScoreboard(player),
		job: getPlayerJobFromScoreboard(player),
		lastUpdate: Date.now(),
	};

	playerStateCache.set(player.id, newState);
	return newState;
};
