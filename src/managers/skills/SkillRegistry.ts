/**
 * スキルレジストリ - 設定データと実行ロジックを統合管理
 *
 * 【役割】
 * - 新しいスキル追加時: SkillDefinitions.tsの設定データとSkillExecutors.tsの実行関数を紐付け
 * - システム見直し時: この層の変更で全体の動作を調整
 */

import type { Player } from "@minecraft/server";
import {
	getSkillDefinition,
	getSkillExecutor,
	SKILLS,
} from "../../data/Skills";
import type {
	SkillDefinition,
	SkillExecutionResult,
} from "../../types/SkillTypes";

/**
 * スキル実行可能情報
 */
export interface ExecutableSkill {
	// SkillDefinitionのプロパティ
	id: string;
	name: string;
	description: string;
	type: string;
	targetType: string;
	cooldownTime: number;
	usesPerGame: number;
	requiresTarget: boolean;
	duration: number;
	range: number;
	allowedPhases: string[];

	// Skillインターフェースとの互換性のため
	cooldown: number;
	usageCount: number;
	executeSkill: (
		player: Player,
		target?: Player,
		args?: Record<string, unknown>,
	) => Promise<SkillExecutionResult>;
}

/**
 * スキルマップ（グローバル状態）
 */
let skillMap: Map<string, ExecutableSkill> | null = null;

/**
 * スキル初期化 - 設定データと実行関数を紐付け
 */
function initializeSkills(): Map<string, ExecutableSkill> {
	const map = new Map<string, ExecutableSkill>();

	// 統合Skillsファイルから全スキルを取得
	const allSkillIds = Object.keys(SKILLS);

	for (const skillId of allSkillIds) {
		const skillDef = getSkillDefinition(skillId);
		const executor = getSkillExecutor(skillId);

		if (skillDef && executor) {
			map.set(skillId, {
				...skillDef,
				// Skillインターフェース互換性のための追加プロパティ
				cooldown: skillDef.cooldownTime || 0,
				usageCount: skillDef.usesPerGame || -1,
				executeSkill: executor,
			});
		} else {
			console.warn(`No definition or executor found for skill: ${skillId}`);
		}
	}

	return map;
}

/**
 * スキルマップを取得（遅延初期化）
 */
function getSkillMap(): Map<string, ExecutableSkill> {
	if (!skillMap) {
		skillMap = initializeSkills();
	}
	return skillMap;
}

/**
 * スキルを取得
 */
export function getSkill(skillId: string): ExecutableSkill | undefined {
	return getSkillMap().get(skillId);
}

/**
 * 利用可能なスキル一覧を取得
 */
export function getAllSkills(): ExecutableSkill[] {
	return Array.from(getSkillMap().values());
}

/**
 * 特定条件でスキルをフィルタリング
 */
export function getSkillsByType(type: string): ExecutableSkill[] {
	return getAllSkills().filter((skill) => skill.type === type);
}

/**
 * 新しいスキルを動的に登録（開発・テスト用）
 */
export function registerSkill(
	skillId: string,
	definition: SkillDefinition,
	executor: (
		player: Player,
		target?: Player,
		args?: Record<string, unknown>,
	) => Promise<SkillExecutionResult>,
): void {
	getSkillMap().set(skillId, {
		...definition,
		// Skillインターフェース互換性のための追加プロパティ
		cooldown: definition.cooldownTime || 0,
		usageCount: definition.usesPerGame || -1,
		executeSkill: executor,
	});
}

/**
 * レジストリの状態をリセット（テスト用）
 */
export function resetSkillRegistry(): void {
	skillMap = null;
}

/**
 * グローバルアクセス用のレジストリ関数群
 */
export const skillRegistry = {
	getSkill,
	getAllSkills,
	getSkillsByType,
	registerSkill,
	resetSkillRegistry,
};

/**
 * 後方互換性のためのラッパー関数
 */
export function getSkillRegistry() {
	return skillRegistry;
}

/**
 * 【使用方法】
 *
 * 新しいスキル追加時:
 * 1. SkillDefinitions.ts に設定データを追加
 * 2. SkillExecutors.ts に実行関数を追加
 * 3. このレジストリが自動的に紐付け
 *
 * システム変更時:
 * 1. このファイルの canExecuteSkill や初期化ロジックを修正
 * 2. 全スキルに共通の変更が適用される
 */
