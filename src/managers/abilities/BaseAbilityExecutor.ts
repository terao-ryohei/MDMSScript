import type { Player, Vector3 } from "@minecraft/server";
import type { AbilityDefinition, AbilityResult, AbilityEffect } from "../../types/AbilityTypes";

/**
 * アビリティ実行関数の型定義
 */
export type AbilityExecutorFunction = (
  player: Player,
  definition: AbilityDefinition,
  target?: Player,
  location?: Vector3,
) => Promise<AbilityResult>;

/**
 * 共通エラーレスポンス作成
 */
export const createErrorResult = (message: string, error?: string): AbilityResult => ({
  success: false,
  message,
  error,
});

/**
 * 共通成功レスポンス作成
 */
export const createSuccessResult = (message: string, data?: any): AbilityResult => ({
  success: true,
  message,
  ...data,
});

/**
 * エフェクト作成
 */
export const createEffect = (
  definition: AbilityDefinition,
  targetId: string,
  effectType: string,
  data: any = {},
): AbilityEffect => ({
  id: `${effectType}_${Date.now()}`,
  abilityId: definition.id,
  targetId,
  startTime: Date.now(),
  endTime: Date.now() + definition.duration * 1000,
  effectType,
  data,
  isActive: true,
});