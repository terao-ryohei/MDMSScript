/**
 * 能力タイプ
 */
export enum AbilityType {
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
	PATROL = "patrol", // 巡回
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
export enum AbilityStatus {
	AVAILABLE = "available", // 使用可能
	COOLDOWN = "cooldown", // クールダウン中
	DISABLED = "disabled", // 使用不可
	USED = "used", // 使用済み
}

/**
 * 能力対象タイプ
 */
export enum AbilityTargetType {
	SELF = "self", // 自分
	PLAYER = "player", // プレイヤー
	LOCATION = "location", // 場所
	AREA = "area", // エリア
	ALL = "all", // 全体
}

/**
 * 能力定義
 */
export interface AbilityDefinition {
	id: string;
	name: string;
	description: string;
	type: AbilityType;
	targetType: AbilityTargetType;

	// 制限
	cooldownTime: number; // クールダウン時間（秒）
	usesPerGame: number; // ゲーム中の使用回数制限
	usesPerPhase: number; // フェーズ中の使用回数制限
	requiresTarget: boolean; // 対象が必要か

	// 効果
	duration: number; // 効果持続時間（秒）
	range: number; // 効果範囲（ブロック）
	detectRange: number; // 検出範囲（ブロック）

	// 条件
	allowedPhases: string[]; // 使用可能フェーズ
	requiresAlive: boolean; // 生存が必要か
}

/**
 * 能力使用記録
 */
export interface AbilityUsage {
	id: string;
	userId: string;
	userName: string;
	abilityId: string;
	abilityType: AbilityType;
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
	result: AbilityResult;
}

/**
 * 能力使用結果
 */
export interface AbilityResult {
	success: boolean;
	message: string;
	data?: any;
	effectDuration?: number;
	discoveredEvidence?: string[];
	affectedPlayers?: string[];
	error?: string;
}

/**
 * プレイヤー能力状態
 */
export interface PlayerAbilityState {
	playerId: string;
	abilities: Map<string, AbilityInstanceState>;
	activeEffects: Map<string, AbilityEffect>;
	lastUsage: Map<string, number>; // 最後の使用時刻
	usageCount: Map<string, number>; // 使用回数
}

/**
 * 能力インスタンス状態
 */
export interface AbilityInstanceState {
	abilityId: string;
	status: AbilityStatus;
	cooldownEnd: number;
	usesRemaining: number;
	usesThisPhase: number;
}

/**
 * 能力効果
 */
export interface AbilityEffect {
	id: string;
	abilityId: string;
	targetId: string;
	startTime: number;
	endTime: number;
	effectType: string;
	data: any;
	isActive: boolean;
}

/**
 * 能力システム結果
 */
export interface AbilitySystemResult {
	success: boolean;
	message?: string;
	data?: any;
	error?: string;
}

/**
 * 能力統計
 */
export interface AbilityStatistics {
	totalUsages: number;
	usagesByType: Map<AbilityType, number>;
	usagesByPlayer: Map<string, number>;
	usagesByPhase: Map<number, number>;
	successRate: number;
	mostUsedAbility: string;
	mostActivePlayer: string;
}
