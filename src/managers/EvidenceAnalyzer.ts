import { type Player, world } from "@minecraft/server";
import type { ActionRecord } from "../types/ActionTypes";
import {
	extractEvidenceFromDailyLife,
	searchActions,
} from "./ActionTrackingManager";

/**
 * 証拠データを取得（分析なし）
 */
export function getEvidenceData(): ActionRecord[] {
	try {
		return extractEvidenceFromDailyLife().evidence || [];
	} catch (error) {
		console.error("Failed to get evidence data:", error);
		return [];
	}
}

/**
 * プレイヤーのアリバイデータを取得（分析なし）
 */
export function getPlayerAlibi(
	playerId: string,
	timeRange: { start: number; end: number },
): ActionRecord[] {
	try {
		return searchActions({
			playerId,
			startTime: timeRange.start,
			endTime: timeRange.end,
		});
	} catch (error) {
		console.error("Failed to get player alibi:", error);
		return [];
	}
}

/**
 * 特定の時間範囲の全行動データを取得
 */
export function getActionsInTimeRange(timeRange: {
	start: number;
	end: number;
}): ActionRecord[] {
	try {
		return searchActions({
			startTime: timeRange.start,
			endTime: timeRange.end,
		});
	} catch (error) {
		console.error("Failed to get actions in time range:", error);
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
	try {
		return getPlayerActions(playerId, limit);
	} catch (error) {
		console.error("Failed to get player actions:", error);
		return [];
	}
}

/**
 * 全プレイヤーのリストを取得
 */
export function getAllPlayers(): Player[] {
	return Array.from(world.getAllPlayers());
}
