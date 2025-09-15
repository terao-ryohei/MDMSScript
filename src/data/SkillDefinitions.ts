import { JobType } from "../types/JobTypes";
import { GamePhase } from "../types/PhaseTypes";
import { RoleType } from "../types/RoleTypes";
import {
	type SkillDefinition,
	SkillTargetType,
	SkillType,
} from "../types/SkillTypes";

/**
 * 能力定義データ
 * ここを編集することで能力の設定を簡単に変更できます
 */
export const SKILL_DEFINITIONS: Record<string, SkillDefinition> = {
	// === 役職基本能力 ===
	deduction_boost: {
		id: "deduction_boost",
		name: "推理力強化",
		description: "証拠の信頼性が向上し、推理能力が強化される",
		type: SkillType.OBSERVE,
		targetType: SkillTargetType.SELF,
		cooldownTime: 0,
		usesPerGame: 999,
		usesPerPhase: 999,
		requiresTarget: false,
		duration: 0,
		range: 0,
		detectRange: 0,
		allowedPhases: [
			GamePhase.INVESTIGATION,
			GamePhase.DISCUSSION,
			GamePhase.REINVESTIGATION,
		],
		requiresAlive: true,
	},

	murder: {
		id: "murder",
		name: "殺人",
		description: "指定したプレイヤーを殺害する",
		type: SkillType.MURDER,
		targetType: SkillTargetType.PLAYER,
		cooldownTime: 0,
		usesPerGame: 1,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 0,
		range: 4,
		detectRange: 0,
		allowedPhases: [GamePhase.DAILY_LIFE],
		requiresAlive: true,
	},

	insider_info: {
		id: "insider_info",
		name: "内部情報",
		description: "犯人に関する重要な情報を1つ知ることができる",
		type: SkillType.GATHER_INFO,
		targetType: SkillTargetType.SELF,
		cooldownTime: 0,
		usesPerGame: 1,
		usesPerPhase: 1,
		requiresTarget: false,
		duration: 0,
		range: 0,
		detectRange: 0,
		allowedPhases: [GamePhase.PREPARATION, GamePhase.INVESTIGATION],
		requiresAlive: true,
	},

	// === 職業専用能力 ===
	royal_summon: {
		id: "royal_summon",
		name: "王の召喚",
		description: "指定したプレイヤーを自分の元に強制召喚する",
		type: SkillType.COMMUNICATE,
		targetType: SkillTargetType.PLAYER,
		cooldownTime: 300,
		usesPerGame: 3,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 0,
		range: 999,
		detectRange: 0,
		allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.DISCUSSION],
		requiresAlive: true,
	},

	protection: {
		id: "protection",
		name: "護衛",
		description: "指定したプレイヤーを1フェーズ間保護する",
		type: SkillType.GUARD,
		targetType: SkillTargetType.PLAYER,
		cooldownTime: 0,
		usesPerGame: 2,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 1800, // 30分
		range: 10,
		detectRange: 0,
		allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.INVESTIGATION],
		requiresAlive: true,
	},

	prison_escort: {
		id: "prison_escort",
		name: "牢獄連行",
		description: "指定したプレイヤーを3分間地下牢に連行する",
		type: SkillType.DETAIN,
		targetType: SkillTargetType.PLAYER,
		cooldownTime: 0,
		usesPerGame: 1,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 180, // 3分
		range: 5,
		detectRange: 0,
		allowedPhases: [
			GamePhase.DAILY_LIFE,
			GamePhase.INVESTIGATION,
			GamePhase.REINVESTIGATION,
		],
		requiresAlive: true,
	},

	transmutation_catalyst: {
		id: "transmutation_catalyst",
		name: "錬成触媒生成",
		description: "特定の錬成陣を稼働させるアイテムを錬金する",
		type: SkillType.ALCHEMY,
		targetType: SkillTargetType.LOCATION,
		cooldownTime: 0,
		usesPerGame: 3,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 0, // 瞬間効果
		range: 5,
		detectRange: 0,
		allowedPhases: [
			GamePhase.DAILY_LIFE,
			GamePhase.INVESTIGATION,
			GamePhase.REINVESTIGATION,
		],
		requiresAlive: true,
	},

	basic_alchemy: {
		id: "basic_alchemy",
		name: "錬金",
		description: "基礎的な錬金術を行い、材料を変換・精製する",
		type: SkillType.ALCHEMY,
		targetType: SkillTargetType.LOCATION,
		cooldownTime: 300, // 5分
		usesPerGame: -1, // 無制限
		usesPerPhase: 3,
		requiresTarget: false,
		duration: 60, // 1分間の作業時間
		range: 0,
		detectRange: 0,
		allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.INVESTIGATION],
		requiresAlive: true,
	},

	auto_evidence_collect: {
		id: "auto_evidence_collect",
		name: "証拠自動収集",
		description: "清掃中に城内の証拠アイテムを一つ自動的に発見・入手する",
		type: SkillType.SEARCH_EVIDENCE,
		targetType: SkillTargetType.SELF,
		cooldownTime: 0,
		usesPerGame: 1,
		usesPerPhase: 1,
		requiresTarget: false,
		duration: 0, // 瞬間効果
		range: 0,
		detectRange: 20, // 広範囲で自動検索
		allowedPhases: [GamePhase.INVESTIGATION, GamePhase.REINVESTIGATION],
		requiresAlive: true,
	},

	social_advantage: {
		id: "social_advantage",
		name: "社交的優位",
		description:
			"執事としての権威で買取価格と好感度上昇にバフを得る（領主を除く）",
		type: SkillType.COMMUNICATE,
		targetType: SkillTargetType.SELF,
		cooldownTime: 0,
		usesPerGame: -1, // 常時効果
		usesPerPhase: -1,
		requiresTarget: false,
		duration: -1, // 永続効果
		range: 0,
		detectRange: 0,
		allowedPhases: [
			GamePhase.DAILY_LIFE,
			GamePhase.INVESTIGATION,
			GamePhase.REINVESTIGATION,
			GamePhase.DISCUSSION,
		],
		requiresAlive: true,
	},

	daily_wage: {
		id: "daily_wage",
		name: "日当収入",
		description: "一般兵士として毎日一定の日当を受け取る",
		type: SkillType.GATHER_INFO, // 経済系として分類
		targetType: SkillTargetType.SELF,
		cooldownTime: 1440, // 24時間（1日1回）
		usesPerGame: -1, // 毎日使用可能
		usesPerPhase: 1,
		requiresTarget: false,
		duration: 0, // 瞬間効果
		range: 0,
		detectRange: 0,
		allowedPhases: [
			GamePhase.DAILY_LIFE,
			GamePhase.INVESTIGATION,
			GamePhase.REINVESTIGATION,
			GamePhase.DISCUSSION,
		],
		requiresAlive: true,
	},

	theft: {
		id: "theft",
		name: "盗み",
		description: "他プレイヤーやエリアから貴重品を盗む",
		type: SkillType.GATHER_INFO, // 物品収集として分類
		targetType: SkillTargetType.PLAYER,
		cooldownTime: 0,
		usesPerGame: 2,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 0, // 瞬間効果
		range: 3,
		detectRange: 0,
		allowedPhases: [
			GamePhase.DAILY_LIFE,
			GamePhase.INVESTIGATION,
			GamePhase.REINVESTIGATION,
		],
		requiresAlive: true,
	},

	compounding: {
		id: "compounding",
		name: "調合",
		description: "薬草や材料を調合してポーションや特殊アイテムを作成する",
		type: SkillType.ALCHEMY,
		targetType: SkillTargetType.LOCATION,
		cooldownTime: 180, // 3分
		usesPerGame: -1, // 無制限
		usesPerPhase: 2,
		requiresTarget: false,
		duration: 120, // 2分間の作業時間
		range: 0,
		detectRange: 0,
		allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.INVESTIGATION],
		requiresAlive: true,
	},

	divination: {
		id: "divination",
		name: "占い",
		description: "指定したプレイヤーの役職か職業のヒントを得る",
		type: SkillType.ANALYZE_CLUE,
		targetType: SkillTargetType.PLAYER,
		cooldownTime: 600,
		usesPerGame: 2,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 0,
		range: 0,
		detectRange: 0,
		allowedPhases: [GamePhase.INVESTIGATION, GamePhase.REINVESTIGATION],
		requiresAlive: true,
	},

	negotiation: {
		id: "negotiation",
		name: "交渉",
		description: "他プレイヤーと有利な取引や情報交換を行う",
		type: SkillType.COMMUNICATE,
		targetType: SkillTargetType.PLAYER,
		cooldownTime: 180,
		usesPerGame: 5,
		usesPerPhase: 2,
		requiresTarget: true,
		duration: 300,
		range: 5,
		detectRange: 0,
		allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.DISCUSSION],
		requiresAlive: true,
	},

	information_network: {
		id: "information_network",
		name: "情報ネットワーク",
		description: "広範囲の情報を収集し、プレイヤーの行動履歴を確認",
		type: SkillType.GATHER_INFO,
		targetType: SkillTargetType.AREA,
		cooldownTime: 300,
		usesPerGame: 3,
		usesPerPhase: 1,
		requiresTarget: false,
		duration: 0,
		range: 50,
		detectRange: 50,
		allowedPhases: [GamePhase.INVESTIGATION, GamePhase.REINVESTIGATION],
		requiresAlive: true,
	},

	appraisal: {
		id: "appraisal",
		name: "鑑定",
		description: "アイテムや証拠の真偽を見極める",
		type: SkillType.ANALYZE_CLUE,
		targetType: SkillTargetType.LOCATION,
		cooldownTime: 240,
		usesPerGame: 4,
		usesPerPhase: 2,
		requiresTarget: true,
		duration: 0,
		range: 3,
		detectRange: 0,
		allowedPhases: [GamePhase.INVESTIGATION, GamePhase.REINVESTIGATION],
		requiresAlive: true,
	},

	eavesdrop: {
		id: "eavesdrop",
		name: "盗聴",
		description: "近くのプレイヤーの会話を密かに聞く",
		type: SkillType.GATHER_INFO,
		targetType: SkillTargetType.AREA,
		cooldownTime: 200,
		usesPerGame: 5,
		usesPerPhase: 2,
		requiresTarget: false,
		duration: 300,
		range: 8,
		detectRange: 8,
		allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.DISCUSSION],
		requiresAlive: true,
	},

	concealment: {
		id: "concealment",
		name: "隠蔽",
		description: "証拠を隠したり、自分の行動を隠したりできる",
		type: SkillType.HIDE,
		targetType: SkillTargetType.SELF,
		cooldownTime: 300,
		usesPerGame: 3,
		usesPerPhase: 1,
		requiresTarget: false,
		duration: 600,
		range: 0,
		detectRange: 0,
		allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.INVESTIGATION],
		requiresAlive: true,
	},

	surveillance: {
		id: "surveillance",
		name: "監視",
		description: "指定エリアを監視し、プレイヤーの行動を記録する",
		type: SkillType.OBSERVE,
		targetType: SkillTargetType.AREA,
		cooldownTime: 180,
		usesPerGame: 6,
		usesPerPhase: 2,
		requiresTarget: true,
		duration: 900,
		range: 15,
		detectRange: 15,
		allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.INVESTIGATION],
		requiresAlive: true,
	},

	teleportation: {
		id: "teleportation",
		name: "瞬間移動",
		description: "指定した場所に瞬間移動する",
		type: SkillType.HIDE, // 移動は隠れる系統として分類
		targetType: SkillTargetType.LOCATION,
		cooldownTime: 400,
		usesPerGame: 2,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 0,
		range: 100,
		detectRange: 0,
		allowedPhases: [
			GamePhase.DAILY_LIFE,
			GamePhase.INVESTIGATION,
			GamePhase.REINVESTIGATION,
		],
		requiresAlive: true,
	},

	// === 共通ランダム能力 ===
	investigate: {
		id: "investigate",
		name: "調査",
		description: "指定した場所で詳細な調査を行い、隠された証拠を発見",
		type: SkillType.INVESTIGATE,
		targetType: SkillTargetType.LOCATION,
		cooldownTime: 300,
		usesPerGame: 3,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 0,
		range: 5,
		detectRange: 0,
		allowedPhases: [GamePhase.INVESTIGATION, GamePhase.REINVESTIGATION],
		requiresAlive: true,
	},

	search_evidence: {
		id: "search_evidence",
		name: "証拠捜索",
		description: "広範囲で証拠を捜索し、重要な手がかりを発見",
		type: SkillType.SEARCH_EVIDENCE,
		targetType: SkillTargetType.AREA,
		cooldownTime: 240,
		usesPerGame: 4,
		usesPerPhase: 2,
		requiresTarget: false,
		duration: 0,
		range: 20,
		detectRange: 20,
		allowedPhases: [GamePhase.INVESTIGATION, GamePhase.REINVESTIGATION],
		requiresAlive: true,
	},

	observe: {
		id: "observe",
		name: "観察",
		description: "他プレイヤーの行動を注意深く観察する",
		type: SkillType.OBSERVE,
		targetType: SkillTargetType.PLAYER,
		cooldownTime: 120,
		usesPerGame: 8,
		usesPerPhase: 3,
		requiresTarget: true,
		duration: 300,
		range: 10,
		detectRange: 0,
		allowedPhases: [
			GamePhase.DAILY_LIFE,
			GamePhase.INVESTIGATION,
			GamePhase.DISCUSSION,
		],
		requiresAlive: true,
	},

	communicate: {
		id: "communicate",
		name: "秘密通信",
		description: "指定したプレイヤーと秘密のメッセージを交換",
		type: SkillType.COMMUNICATE,
		targetType: SkillTargetType.PLAYER,
		cooldownTime: 300,
		usesPerGame: 3,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 0,
		range: 0,
		detectRange: 0,
		allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.DISCUSSION],
		requiresAlive: true,
	},

	hide: {
		id: "hide",
		name: "隠れる",
		description: "一定時間、他プレイヤーから見つかりにくくなる",
		type: SkillType.HIDE,
		targetType: SkillTargetType.SELF,
		cooldownTime: 600,
		usesPerGame: 2,
		usesPerPhase: 1,
		requiresTarget: false,
		duration: 300,
		range: 0,
		detectRange: 0,
		allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.INVESTIGATION],
		requiresAlive: true,
	},

	// === 特殊能力（犯人・共犯専用） ===
	sabotage: {
		id: "sabotage",
		name: "妨害工作",
		description: "他プレイヤーの能力を一時的に無効化する",
		type: SkillType.SABOTAGE,
		targetType: SkillTargetType.PLAYER,
		cooldownTime: 450,
		usesPerGame: 2,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 300,
		range: 8,
		detectRange: 0,
		allowedPhases: [GamePhase.INVESTIGATION, GamePhase.REINVESTIGATION],
		requiresAlive: true,
	},

	disguise: {
		id: "disguise",
		name: "変装",
		description: "他プレイヤーになりすまして行動できる",
		type: SkillType.DISGUISE,
		targetType: SkillTargetType.PLAYER,
		cooldownTime: 800,
		usesPerGame: 1,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 600,
		range: 0,
		detectRange: 0,
		allowedPhases: [GamePhase.DAILY_LIFE],
		requiresAlive: true,
	},

	assist: {
		id: "assist",
		name: "協力",
		description: "犯人の能力を強化し、成功率を向上させる",
		type: SkillType.ASSIST,
		targetType: SkillTargetType.PLAYER,
		cooldownTime: 300,
		usesPerGame: 3,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 600,
		range: 10,
		detectRange: 0,
		allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.INVESTIGATION],
		requiresAlive: true,
	},

	distract: {
		id: "distract",
		name: "注意逸らし",
		description: "他プレイヤーの注意を逸らして調査を妨害",
		type: SkillType.DISTRACT,
		targetType: SkillTargetType.PLAYER,
		cooldownTime: 200,
		usesPerGame: 4,
		usesPerPhase: 2,
		requiresTarget: true,
		duration: 180,
		range: 15,
		detectRange: 0,
		allowedPhases: [GamePhase.INVESTIGATION, GamePhase.DISCUSSION],
		requiresAlive: true,
	},

	cover_up: {
		id: "cover_up",
		name: "隠蔽工作",
		description: "証拠を隠蔽し、痕跡を消去する",
		type: SkillType.COVER_UP,
		targetType: SkillTargetType.LOCATION,
		cooldownTime: 400,
		usesPerGame: 2,
		usesPerPhase: 1,
		requiresTarget: true,
		duration: 0,
		range: 5,
		detectRange: 0,
		allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.INVESTIGATION],
		requiresAlive: true,
	},

	student_discount: {
		id: "student_discount",
		name: "学割が効く",
		description: "各種サービスや商品を学生割引価格で利用できる",
		type: SkillType.PASSIVE,
		targetType: SkillTargetType.SELF,
		cooldownTime: 0,
		usesPerGame: -1, // 常時効果
		usesPerPhase: -1,
		requiresTarget: false,
		duration: -1, // 永続効果
		range: 0,
		detectRange: 0,
		allowedPhases: [GamePhase.DAILY_LIFE],
		requiresAlive: true,
	},

	guild_quest_mastery: {
		id: "guild_quest_mastery",
		name: "ギルドクエスト熟練",
		description: "ギルドクエスト成功回数によって追加で得られる証拠が増える",
		type: SkillType.PASSIVE,
		targetType: SkillTargetType.SELF,
		cooldownTime: 0,
		usesPerGame: -1, // 常時効果
		usesPerPhase: -1,
		requiresTarget: false,
		duration: -1, // 永続効果
		range: 0,
		detectRange: 0,
		allowedPhases: [GamePhase.INVESTIGATION, GamePhase.REINVESTIGATION],
		requiresAlive: true,
	},
};

/**
 * 能力カテゴリ分類
 */
export const SKILLS_BY_CATEGORY = {
	ROLE_BASIC: ["deduction_boost", "murder", "insider_info"],
	JOB_SPECIFIC: [
		"royal_summon",
		"protection",
		"divination",
		"negotiation",
		"information_network",
		"appraisal",
		"eavesdrop",
		"concealment",
		"surveillance",
		"teleportation",
	],
	COMMON_RANDOM: [
		"investigate",
		"search_evidence",
		"observe",
		"communicate",
		"hide",
	],
	SPECIAL_EVIL: ["sabotage", "disguise", "assist", "distract", "cover_up"],
};

/**
 * フェーズ別使用可能能力
 */
export const ABILITIES_BY_PHASE: Record<GamePhase, string[]> = {
	[GamePhase.PREPARATION]: ["insider_info"],
	[GamePhase.DAILY_LIFE]: [
		"murder",
		"royal_summon",
		"protection",
		"negotiation",
		"eavesdrop",
		"concealment",
		"surveillance",
		"teleportation",
		"observe",
		"communicate",
		"hide",
		"disguise",
		"assist",
		"cover_up",
	],
	[GamePhase.INVESTIGATION]: [
		"deduction_boost",
		"protection",
		"divination",
		"information_network",
		"appraisal",
		"concealment",
		"surveillance",
		"teleportation",
		"investigate",
		"search_evidence",
		"observe",
		"sabotage",
		"assist",
		"distract",
		"cover_up",
	],
	[GamePhase.DISCUSSION]: [
		"deduction_boost",
		"royal_summon",
		"negotiation",
		"eavesdrop",
		"observe",
		"communicate",
		"distract",
	],
	[GamePhase.REINVESTIGATION]: [
		"deduction_boost",
		"divination",
		"information_network",
		"appraisal",
		"teleportation",
		"investigate",
		"search_evidence",
		"sabotage",
	],
	[GamePhase.DEDUCTION]: [],
	[GamePhase.VOTING]: [],
	[GamePhase.ENDING]: [],
};

/**
 * 役職別基本能力マッピング
 */
export const ROLE_BASE_SKILLS: Record<RoleType, string> = {
	[RoleType.MURDERER]: "murder",
	[RoleType.VILLAGER]: "deduction_boost",
	[RoleType.DETECTIVE]: "investigation_boost",
	[RoleType.ACCOMPLICE]: "insider_info",
};

/**
 * 職業別基本能力マッピング
 */
export const JOB_BASE_SKILLS: Record<JobType, string> = {
	[JobType.LORD]: "royal_summon", // royal_commandから修正
	[JobType.CAPTAIN]: "prison_escort",
	[JobType.HOMUNCULUS]: "transmutation_catalyst", // artificial_lifeは存在しないためteleportationに変更
	[JobType.COURT_ALCHEMIST]: "basic_alchemy", // transmutationは存在しないためdivinationに変更
	[JobType.ROGUE_ALCHEMIST]: "basic_alchemy", // dark_alchemyは存在しないためteleportationに変更
	[JobType.THIEF]: "theft", // stealthは存在しないためeavesdropに変更
	[JobType.PHARMACIST]: "compounding", // healingは存在しないためconcealmentに変更
	[JobType.MAID]: "auto_evidence_collect",
	[JobType.BUTLER]: "social_advantage", // coordinationは存在しないためinformation_networkに変更
	[JobType.SOLDIER]: "daily_wage", // patrolは存在しないためappraisalに変更
	[JobType.STUDENT]: "student_discount", // 学割が効く
	[JobType.ADVENTURER]: "guild_quest_mastery", // ギルドクエスト熟練
};

/**
 * ランダム能力プールから選択
 */
export function getRandomCommonSkill(): string {
	const commonAbilities = SKILLS_BY_CATEGORY.COMMON_RANDOM;
	return commonAbilities[Math.floor(Math.random() * commonAbilities.length)];
}

/**
 * フェーズで使用可能な能力を取得
 */
export function getAvailableSkillsForPhase(phase: GamePhase): string[] {
	return ABILITIES_BY_PHASE[phase] || [];
}

/**
 * 能力の使用可能性をチェック
 */
export function canUseSkill(
	skillId: string,
	role: RoleType,
	job: JobType,
	phase: GamePhase,
): boolean {
	const skill = SKILL_DEFINITIONS[skillId];
	if (!skill) return false;

	// フェーズチェック
	if (skill.allowedPhases.length > 0 && !skill.allowedPhases.includes(phase)) {
		return false;
	}

	return true;
}
