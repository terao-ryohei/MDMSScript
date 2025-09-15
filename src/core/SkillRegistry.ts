/**
 * スキルレジストリ - 設定データと実行ロジックを統合管理
 *
 * 【役割】
 * - 新しいスキル追加時: SkillDefinitions.tsの設定データとSkillExecutors.tsの実行関数を紐付け
 * - システム見直し時: この層の変更で全体の動作を調整
 */

import type { Player } from "@minecraft/server";
import { SKILL_DEFINITIONS } from "../data/SkillDefinitions";
import { SKILL_EXECUTORS } from "../executors/SkillExecutors";
import type {
	SkillDefinition,
	SkillExecutionResult,
} from "../types/SkillTypes";

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
	usesPerPhase: number;
	requiresTarget: boolean;
	duration: number;
	range: number;
	detectRange: number;
	allowedPhases: string[];
	requiresAlive: boolean;

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

	for (const [skillId, skillDef] of Object.entries(SKILL_DEFINITIONS)) {
		const executor = SKILL_EXECUTORS[skillId];
		if (executor) {
			map.set(skillId, {
				...skillDef,
				// Skillインターフェース互換性のための追加プロパティ
				cooldown: skillDef.cooldownTime || 0,
				usageCount: skillDef.usesPerGame || -1,
				executeSkill: executor,
			});
		} else {
			console.warn(`No executor found for skill: ${skillId}`);
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
 * スキルの設定データを取得
 */
export function getSkillDefinition(
	skillId: string,
): SkillDefinition | undefined {
	return SKILL_DEFINITIONS[skillId];
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
 * プレイヤーの生存状態チェック
 */
function isPlayerAlive(player: Player): boolean {
	// 生存状態チェックのロジック
	// TODO: 実際の生存状態管理システムと連携
	return true;
}

/**
 * スキルが実行可能かチェック
 */
export function canExecuteSkill(
	skillId: string,
	player: Player,
	currentPhase: string,
): boolean {
	const skill = getSkill(skillId);
	if (!skill) return false;

	// フェーズ制限チェック
	if (skill.allowedPhases && skill.allowedPhases.length > 0) {
		if (!skill.allowedPhases.includes(currentPhase as any)) {
			return false;
		}
	}

	// 生存状態チェック
	if (skill.requiresAlive && !isPlayerAlive(player)) {
		return false;
	}

	// その他の条件チェックは SkillManager に委譲
	return true;
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
	getSkillDefinition,
	getAllSkills,
	getSkillsByType,
	canExecuteSkill,
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
