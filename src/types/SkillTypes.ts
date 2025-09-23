import type { Player } from "@minecraft/server";

/**
 * 能力タイプ
 */
export enum SkillType {
	// 探偵専用能力
	INVESTIGATE = "investigate", // 調査
	SEARCH_EVIDENCE = "search_evidence", // 証拠捜索
	ANALYZE_CLUE = "analyze_clue", // 手がかり分析

	// 医者専用能力
	HEAL = "heal", // 治療
	AUTOPSY = "autopsy", // 検死
	REVIVE = "revive", // 蘇生

	// 警備員専用能力
	GUARD = "guard", // 護衛
	ALERT = "alert", // 警戒
	DETAIN = "detain", // 拘束

	// 記者専用能力
	INTERVIEW = "interview", // インタビュー
	BROADCAST = "broadcast", // 放送
	GATHER_INFO = "gather_info", // 情報収集

	// 犯人専用能力
	MURDER = "murder", // 殺人
	SABOTAGE = "sabotage", // 妨害工作
	DISGUISE = "disguise", // 変装

	// 共犯者専用能力
	ASSIST = "assist", // 協力
	DISTRACT = "distract", // 注意逸らし
	COVER_UP = "cover_up", // 隠蔽工作

	// 錬金術師専用能力
	ALCHEMY = "alchemy", // 錬金術

	// 共通能力
	OBSERVE = "observe", // 観察
	COMMUNICATE = "communicate", // 秘密通信
	HIDE = "hide", // 隠れる

	// パッシブ能力
	PASSIVE = "passive", // 常時効果
}

/**
 * 能力状態
 */
export enum SkillStatus {
	AVAILABLE = "available", // 使用可能
	COOLDOWN = "cooldown", // クールダウン中
	DISABLED = "disabled", // 使用不可
	USED = "used", // 使用済み
}

/**
 * 能力対象タイプ
 */
export enum SkillTargetType {
	SELF = "self", // 自分
	PLAYER = "player", // プレイヤー
	LOCATION = "location", // 場所
	AREA = "area", // エリア
	ALL = "all", // 全体
}

/**
 * 能力定義
 */
export interface SkillDefinition {
	id: string;
	name: string;
	description: string;
	type: SkillType;
	targetType: SkillTargetType;

	// 制限
	cooldownTime: number; // クールダウン時間（秒）
	usesPerGame: number; // ゲーム中の使用回数制限
	requiresTarget: boolean; // 対象が必要か

	// 効果
	duration: number; // 効果持続時間（秒）
	range: number; // 効果範囲（ブロック）

	// 条件
	allowedPhases: string[]; // 使用可能フェーズ
}

/**
 * 能力使用記録
 */
export interface SkillUsage {
	id: string;
	userId: string;
	userName: string;
	skillId: string;
	skillType: SkillType;
	targetId?: string;
	targetName?: string;
	location?: {
		x: number;
		y: number;
		z: number;
		dimension: string;
	};
	timestamp: number;
	phaseId: number;
	result: SkillResult;
}

/**
 * 能力使用結果
 */
export interface SkillResult {
	success: boolean;
	message: string;
	data?: Record<string, unknown>;
	effectDuration?: number;
	discoveredEvidence?: string[];
	affectedPlayers?: string[];
	error?: string;
}

/**
 * プレイヤー能力状態
 */
export interface PlayerSkillState {
	playerId: string;
	skills: Map<string, SkillInstanceState>;
	activeEffects: Map<string, SkillEffect>;
	lastUsage: Map<string, number>; // 最後の使用時刻
	usageCount: Map<string, number>; // 使用回数
}

/**
 * 能力インスタンス状態
 */
export interface SkillInstanceState {
	skillId: string;
	status: SkillStatus;
	cooldownEnd: number;
	usesRemaining: number;
	usesThisPhase: number;
}

/**
 * 能力効果
 */
export interface SkillEffect {
	id: string;
	skillId: string;
	targetId: string;
	startTime: number;
	endTime: number;
	effectType: string;
	data: Record<string, unknown>;
	isActive: boolean;
}

/**
 * 能力システム結果
 */
export interface SkillSystemResult {
	success: boolean;
	message?: string;
	data?: Record<string, unknown>;
	error?: string;
}

/**
 * 能力統計
 */
export interface SkillStatistics {
	totalUsages: number;
	usagesByType: Map<SkillType, number>;
	usagesByPlayer: Map<string, number>;
	usagesByPhase: Map<number, number>;
	successRate: number;
	mostUsedSkill: string;
	mostActivePlayer: string;
}

/**
 * スキル（SkillTypes.tsから移行）
 */
export interface Skill {
	id: string;
	name: string;
	description: string;
	cooldown: number; // クールダウン時間（秒）
	usageCount: number; // 使用可能回数（-1で無制限）
	executeSkill: (
		player: Player,
		target?: Player,
		args?: Record<string, unknown>,
	) => Promise<SkillExecutionResult>;
}

/**
 * スキル実行結果（SkillTypes.tsから移行）
 */
export interface SkillExecutionResult {
	success: boolean;
	message: string;
	cooldownTime?: number;
	error?: string;
}

/**
 * プレイヤースキル情報（SkillTypes.tsから移行）
 */
export interface PlayerSkills {
	playerId: string;
	jobSkill: Skill; // 職業スキル
	roleSkill: Skill; // ロールスキル
	randomSkill: Skill; // 汎用スキル

	// 使用状況
	jobSkillUses: number;
	roleSkillUses: number;
	randomSkillUses: number;

	// クールダウン管理
	jobSkillCooldown: number;
	roleSkillCooldown: number;
	randomSkillCooldown: number;
}

/**
 * スキル使用履歴（SkillTypes.tsから移行）
 */
export interface SkillUsageRecord {
	playerId: string;
	playerName: string;
	skillId: string;
	skillName: string;
	targetId?: string;
	targetName?: string;
	timestamp: number;
	success: boolean;
	result: string;
}
