import type { AbilityEffect } from "../../types/AbilityTypes";
import { AbilityType } from "../../types/AbilityTypes";
import type { AbilityExecutorFunction } from "./BaseAbilityExecutor";

// Import executor functions
import { executeInvestigate, createSearchEvidenceExecutor, executeAutopsy } from "./InvestigationExecutors";
import { createMurderExecutor, createGuardExecutor, createSabotageExecutor, createAssistExecutor } from "./CombatExecutors";
import { executeHeal, executeInterview, executeBroadcast, createPatrolExecutor, createDistractExecutor } from "./UtilityExecutors";

/**
 * アビリティ実行ファクトリー関数
 */
export const createAbilityExecutorFactory = (activeEffects: Map<string, AbilityEffect>) => {
  const executors = new Map<AbilityType, AbilityExecutorFunction>();

  // Investigation executors
  executors.set(AbilityType.INVESTIGATE, executeInvestigate);
  executors.set(AbilityType.SEARCH_EVIDENCE, createSearchEvidenceExecutor(activeEffects));
  executors.set(AbilityType.AUTOPSY, executeAutopsy);

  // Combat executors
  executors.set(AbilityType.MURDER, createMurderExecutor(activeEffects));
  executors.set(AbilityType.GUARD, createGuardExecutor(activeEffects));
  executors.set(AbilityType.SABOTAGE, createSabotageExecutor(activeEffects));
  executors.set(AbilityType.ASSIST, createAssistExecutor(activeEffects));

  // Utility executors
  executors.set(AbilityType.HEAL, executeHeal);
  executors.set(AbilityType.INTERVIEW, executeInterview);
  executors.set(AbilityType.BROADCAST, executeBroadcast);
  executors.set(AbilityType.PATROL, createPatrolExecutor(activeEffects));
  executors.set(AbilityType.DISTRACT, createDistractExecutor(activeEffects));

  return {
    /**
     * アビリティタイプに対応する実行関数を取得
     */
    getExecutor: (abilityType: AbilityType): AbilityExecutorFunction | null => {
      return executors.get(abilityType) || null;
    },

    /**
     * サポートされているアビリティタイプの一覧を取得
     */
    getSupportedAbilityTypes: (): AbilityType[] => {
      return Array.from(executors.keys());
    },
  };
};