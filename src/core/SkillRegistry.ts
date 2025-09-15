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
} from "../types/AbilityTypes";

/**
 * スキル実行可能情報
 */
export interface ExecutableSkill extends SkillDefinition {
	// SkillTypesのSkillインターフェースとの互換性のため
	cooldown: number;
	usageCount: number;
	executeSkill: (
		player: Player,
		target?: Player,
		args?: Record<string, unknown>,
	) => Promise<SkillExecutionResult>;
}

/**
 * スキルレジストリ - 設定と実行の統合管理
 */
export class SkillRegistry {
	private static instance: SkillRegistry;
	private skillMap: Map<string, ExecutableSkill> = new Map();

	private constructor() {
		this.initializeSkills();
	}

	public static getInstance(): SkillRegistry {
		if (!SkillRegistry.instance) {
			SkillRegistry.instance = new SkillRegistry();
		}
		return SkillRegistry.instance;
	}

	/**
	 * スキル初期化 - 設定データと実行関数を紐付け
	 */
	private initializeSkills(): void {
		for (const [skillId, skillDef] of Object.entries(SKILL_DEFINITIONS)) {
			const executor = SKILL_EXECUTORS[skillId];
			if (executor) {
				this.skillMap.set(skillId, {
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
	}

	/**
	 * スキルを取得
	 */
	public getSkill(skillId: string): ExecutableSkill | undefined {
		return this.skillMap.get(skillId);
	}

	/**
	 * スキルの設定データを取得
	 */
	public getSkillDefinition(skillId: string): SkillDefinition | undefined {
		return SKILL_DEFINITIONS[skillId];
	}

	/**
	 * 利用可能なスキル一覧を取得
	 */
	public getAllSkills(): ExecutableSkill[] {
		return Array.from(this.skillMap.values());
	}

	/**
	 * 特定条件でスキルをフィルタリング
	 */
	public getSkillsByType(type: string): ExecutableSkill[] {
		return this.getAllSkills().filter((skill) => skill.type === type);
	}

	/**
	 * スキルが実行可能かチェック
	 */
	public canExecuteSkill(
		skillId: string,
		player: Player,
		currentPhase: string,
	): boolean {
		const skill = this.getSkill(skillId);
		if (!skill) return false;

		// フェーズ制限チェック
		if (skill.allowedPhases && skill.allowedPhases.length > 0) {
			if (!skill.allowedPhases.includes(currentPhase as any)) {
				return false;
			}
		}

		// 生存状態チェック
		if (skill.requiresAlive && !this.isPlayerAlive(player)) {
			return false;
		}

		// その他の条件チェックは SkillManager に委譲
		return true;
	}

	private isPlayerAlive(player: Player): boolean {
		// 生存状態チェックのロジック
		// TODO: 実際の生存状態管理システムと連携
		return true;
	}

	/**
	 * 新しいスキルを動的に登録（開発・テスト用）
	 */
	public registerSkill(
		skillId: string,
		definition: SkillDefinition,
		executor: (
			player: Player,
			target?: Player,
			args?: Record<string, unknown>,
		) => Promise<SkillExecutionResult>,
	): void {
		this.skillMap.set(skillId, {
			...definition,
			// Skillインターフェース互換性のための追加プロパティ
			cooldown: definition.cooldownTime || 0,
			usageCount: definition.usesPerGame || -1,
			executeSkill: executor,
		});
	}
}

/**
 * グローバルアクセス用のインスタンス取得関数
 */
export function getSkillRegistry(): SkillRegistry {
	return SkillRegistry.getInstance();
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
