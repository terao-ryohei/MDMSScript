import type { Player, Vector3 } from "@minecraft/server";
import type {
	SkillDefinition,
	SkillEffect,
	SkillResult,
} from "../../types/AbilityTypes";

/**
 * アビリティ実行関数の型定義
 */
export type SkillExecutorFunction = (
	player: Player,
	definition: SkillDefinition,
	target?: Player,
	location?: Vector3,
) => Promise<SkillResult>;

/**
 * 共通エラーレスポンス作成
 */
export const createErrorResult = (
	message: string,
	error?: string,
): SkillResult => ({
	success: false,
	message,
	error,
});

/**
 * 共通成功レスポンス作成
 */
export const createSuccessResult = (
	message: string,
	data?: Record<string, unknown>,
): SkillResult => ({
	success: true,
	message,
	...data,
});

/**
 * エフェクト作成
 */
export const createEffect = (
	definition: SkillDefinition,
	targetId: string,
	effectType: string,
	data: Record<string, unknown> = {},
): SkillEffect => ({
	id: `${effectType}_${Date.now()}`,
	skillId: definition.id,
	targetId,
	startTime: Date.now(),
	endTime: Date.now() + definition.duration * 1000,
	effectType,
	data,
	isActive: true,
});
