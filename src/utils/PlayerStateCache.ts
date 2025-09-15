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
 * キャッシュをクリア（フェーズ変更時等に使用）
 */
export const clearPlayerStateCache = (): void => {
	playerStateCache.clear();
};

/**
 * 特定プレイヤーのキャッシュをクリア
 */
export const clearPlayerCache = (playerId: string): void => {
	playerStateCache.delete(playerId);
};

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

/**
 * キャッシュされたプレイヤーロール取得
 */
export const getCachedPlayerRole = (player: Player): RoleType | null => {
	return getPlayerState(player).role;
};

/**
 * キャッシュされたプレイヤージョブ取得
 */
export const getCachedPlayerJob = (player: Player): JobType | number => {
	return getPlayerState(player).job;
};

/**
 * プレイヤー状態の強制更新（状態変更時に使用）
 */
export const updatePlayerCache = (player: Player): void => {
	const newState: PlayerStateData = {
		role: getPlayerRoleFromScoreboard(player),
		job: getPlayerJobFromScoreboard(player),
		lastUpdate: Date.now(),
	};

	playerStateCache.set(player.id, newState);
};

/**
 * キャッシュ統計情報取得（デバッグ用）
 */
export const getCacheStats = () => {
	const total = playerStateCache.size;
	const valid = Array.from(playerStateCache.values()).filter(
		isCacheValid,
	).length;

	return {
		total,
		valid,
		hitRate: total > 0 ? (valid / total) * 100 : 0,
	};
};
