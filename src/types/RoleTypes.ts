/**
 * プレイヤーロール（マダミス上の役割）
 */
export enum RoleType {
  CITIZEN = "citizen",         // 一般人
  MURDERER = "murderer",       // 犯人
  ACCOMPLICE = "accomplice"    // 共犯者
}

/**
 * ロール定義
 */
export interface Role {
  type: RoleType;
  name: string;
  description: string;
  baseAbilityId: string;       // 基本能力ID
  baseObjectiveId: string;     // 基本目的ID
  specialRules: string[];
}

/**
 * ロール構成定義
 */
export interface RoleComposition {
  murderers: number;
  accomplices: number;
  citizens: number;
}

/**
 * ロール割り当て結果
 */
export interface RoleAssignmentResult {
  success: boolean;
  assignments: Map<string, RoleType>; // playerId -> role
  composition: RoleComposition;
  error?: string;
}