/**
 * プレイヤーロール（マダミス上の役割）
 */
export enum RoleType {
	MURDERER = "murderer", // 殺人者
	VILLAGER = "villager", // 村人
	DETECTIVE = "detective", // 探偵
	ACCOMPLICE = "accomplice", // 共犯者
}

/**
 * ロール定義
 */
export interface Role {
	type: RoleType;
	name: string;
	description: string;
	baseAbilityId: string; // 基本能力ID
	baseObjectiveId: string; // 基本目的ID
	specialRules: string[];
}

/**
 * ロール構成定義
 */
export interface RoleComposition {
	murderers: number;
	villagers: number;
	detectives: number;
	accomplices: number;
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
