import type { SkillEffect } from "../../types/AbilityTypes";
import { SkillType } from "../../types/AbilityTypes";
import type { SkillExecutorFunction } from "./BaseSkillExecutor";
import {
	createAssistExecutor,
	createGuardExecutor,
	createMurderExecutor,
	createSabotageExecutor,
} from "./CombatExecutors";
// Import executor functions
import {
	createSearchEvidenceExecutor,
	executeAutopsy,
	executeInvestigate,
} from "./InvestigationExecutors";
import {
	createDistractExecutor,
	createPatrolExecutor,
	executeBroadcast,
	executeHeal,
	executeInterview,
} from "./UtilityExecutors";

/**
 * スキル実行ファクトリー関数
 */
export const createSkillExecutorFactory = (
	activeEffects: Map<string, SkillEffect>,
) => {
	const executors = new Map<SkillType, SkillExecutorFunction>();

	// Investigation executors
	executors.set(SkillType.INVESTIGATE, executeInvestigate);
	executors.set(
		SkillType.SEARCH_EVIDENCE,
		createSearchEvidenceExecutor(activeEffects),
	);
	executors.set(SkillType.AUTOPSY, executeAutopsy);

	// Combat executors
	executors.set(SkillType.MURDER, createMurderExecutor(activeEffects));
	executors.set(SkillType.GUARD, createGuardExecutor(activeEffects));
	executors.set(SkillType.SABOTAGE, createSabotageExecutor(activeEffects));
	executors.set(SkillType.ASSIST, createAssistExecutor(activeEffects));

	// Utility executors
	executors.set(SkillType.HEAL, executeHeal);
	executors.set(SkillType.INTERVIEW, executeInterview);
	executors.set(SkillType.BROADCAST, executeBroadcast);
	executors.set(SkillType.PATROL, createPatrolExecutor(activeEffects));
	executors.set(SkillType.DISTRACT, createDistractExecutor(activeEffects));

	return {
		/**
		 * アビリティタイプに対応する実行関数を取得
		 */
		getExecutor: (skillType: SkillType): SkillExecutorFunction | null => {
			return executors.get(skillType) || null;
		},

		/**
		 * サポートされているアビリティタイプの一覧を取得
		 */
		getSupportedSkillTypes: (): SkillType[] => {
			return Array.from(executors.keys());
		},
	};
};
