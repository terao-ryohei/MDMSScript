import { type Role, type RoleComposition, RoleType } from "../types/RoleTypes";

/**
 * ロール定義データ
 * ここを編集することでロールの設定を簡単に変更できます
 */
export const ROLE_DEFINITIONS: Record<RoleType, Role> = {
	[RoleType.MURDERER]: {
		type: RoleType.MURDERER,
		name: "殺人者",
		description: "投票で最多票を避けて逃げ切ることが目標",
		baseAbilityId: "murder", // AbilityDefinitionsに存在
		baseObjectiveId: "avoid_execution", // ObjectiveDefinitionsに存在
		specialRules: [
			"半径4ブロック以内のプレイヤーをキルできる",
			"生活フェーズ中の任意のタイミングで事件を起こせる",
			"事件発生タイミングを自由に選択可能",
			"共犯者とは密談が可能",
			"証拠を残しにくい特殊行動が可能",
		],
	},

	[RoleType.VILLAGER]: {
		type: RoleType.VILLAGER,
		name: "村人",
		description: "真犯人を特定することが目標",
		baseAbilityId: "deduction_boost", // villager_intuitionから修正
		baseObjectiveId: "identify_murderer", // ObjectiveDefinitionsに存在
		specialRules: [
			"証拠の信頼性が向上する",
			"他の村人と情報を共有可能",
			"投票時に論理的な推理を展開できる",
		],
	},

	[RoleType.DETECTIVE]: {
		type: RoleType.DETECTIVE,
		name: "探偵",
		description: "証拠を集めて真犯人を特定することが目標",
		baseAbilityId: "investigate", // investigationから修正
		baseObjectiveId: "identify_murderer", // solve_caseから修正（ObjectiveDefinitionsに存在）
		specialRules: [
			"証拠の信頼性が20%向上する",
			"詳細な捜査で追加情報を得られる",
			"他のプレイヤーの行動を詳しく観察可能",
			"投票時の発言力が強化される",
		],
	},

	[RoleType.ACCOMPLICE]: {
		type: RoleType.ACCOMPLICE,
		name: "共犯者",
		description: "犯人の勝利をサポートすることが目標",
		baseAbilityId: "assist", // evidence_tamperingから修正
		baseObjectiveId: "support_murderer", // ObjectiveDefinitionsに存在
		specialRules: [
			"犯人の名前または犯行時間のいずれかを知ることができる",
			"犯人と密談が可能",
			"証拠隠滅行動が可能",
			"偽の証言で捜査を撹乱できる",
			"投票において犯人を守る責任がある",
		],
	},
};

/**
 * プレイヤー数に応じたロール構成設定
 * ゲームバランスを調整する場合はここを編集
 */
export const ROLE_COMPOSITION_RULES = {
	// 最小プレイヤー数
	MIN_PLAYERS: 1,

	// 最大プレイヤー数
	MAX_PLAYERS: 20,

	// プレイヤー数別構成
	COMPOSITIONS: [
		{
			playerRange: { min: 1, max: 1 },
			composition: {
				murderers: 1,
				villagers: 0,
				detectives: 0,
				accomplices: 0,
			},
			description: "テスト用：殺人者のみ",
		},
		{
			playerRange: { min: 2, max: 2 },
			composition: {
				murderers: 1,
				villagers: 1,
				detectives: 0,
				accomplices: 0,
			},
			description: "殺人者1人、村人1人",
		},
		{
			playerRange: { min: 3, max: 3 },
			composition: {
				murderers: 1,
				villagers: 1,
				detectives: 1,
				accomplices: 0,
			},
			description: "殺人者1人、村人1人、探偵1人",
		},
		{
			playerRange: { min: 4, max: 6 },
			composition: {
				murderers: 1,
				villagers: -1,
				detectives: 1,
				accomplices: 0,
			},
			description: "殺人者1人、探偵1人、残り村人",
		},
		{
			playerRange: { min: 7, max: 10 },
			composition: {
				murderers: 1,
				villagers: -1,
				detectives: 1,
				accomplices: 1,
			},
			description: "標準構成：殺人者1人、探偵1人、共犯者1人、残り村人",
		},
		{
			playerRange: { min: 11, max: 16 },
			composition: {
				murderers: 1,
				villagers: -1,
				detectives: 2,
				accomplices: 1,
			},
			description: "大人数対応：殺人者1人、探偵2人、共犯者1人、残り村人",
		},
		{
			playerRange: { min: 17, max: 20 },
			composition: {
				murderers: 2,
				villagers: -1,
				detectives: 2,
				accomplices: 1,
			},
			description: "最大構成：殺人者2人、探偵2人、共犯者1人、残り村人",
		},
	],
};

/**
 * プレイヤー数に応じたロール構成を取得
 */
export function getRoleComposition(playerCount: number): RoleComposition {
	if (playerCount < ROLE_COMPOSITION_RULES.MIN_PLAYERS) {
		throw new Error(
			`最低${ROLE_COMPOSITION_RULES.MIN_PLAYERS}人のプレイヤーが必要です`,
		);
	}

	if (playerCount > ROLE_COMPOSITION_RULES.MAX_PLAYERS) {
		throw new Error(
			`最大${ROLE_COMPOSITION_RULES.MAX_PLAYERS}人まで対応しています`,
		);
	}

	// 該当する構成を見つける
	const rule = ROLE_COMPOSITION_RULES.COMPOSITIONS.find(
		(rule) =>
			playerCount >= rule.playerRange.min &&
			playerCount <= rule.playerRange.max,
	);

	if (!rule) {
		throw new Error(`プレイヤー数${playerCount}人の構成が定義されていません`);
	}

	// -1が指定されている場合は残り全員を計算
	const composition: RoleComposition = {
		murderers: rule.composition.murderers,
		villagers:
			rule.composition.villagers === -1
				? playerCount -
					rule.composition.murderers -
					rule.composition.detectives -
					rule.composition.accomplices
				: rule.composition.villagers,
		detectives: rule.composition.detectives,
		accomplices: rule.composition.accomplices,
	};

	return composition;
}

/**
 * ロール構成の妥当性チェック
 */
export function validateRoleComposition(
	composition: RoleComposition,
	playerCount: number,
): boolean {
	const total =
		composition.murderers +
		composition.villagers +
		composition.detectives +
		composition.accomplices;
	return total === playerCount && composition.murderers >= 1;
}

/**
 * ロールの勝利条件
 */
export const ROLE_VICTORY_CONDITIONS = {
	[RoleType.MURDERER]: {
		primary: "投票で処刑されずに最後まで生き残る",
		secondary: "全プレイヤーを騙し続ける",
		points: {
			base: 200,
			avoidExecution: 300,
			successfulMurder: 100,
			deceptionBonus: 50,
		},
	},

	[RoleType.VILLAGER]: {
		primary: "真犯人を特定し、投票で処刑する",
		secondary: "直感を活かして怪しい人物を見つける",
		points: {
			base: 100,
			correctVote: 200,
			intuitionBonus: 50,
			teamworkBonus: 25,
		},
	},

	[RoleType.DETECTIVE]: {
		primary: "証拠を集めて真犯人を特定する",
		secondary: "論理的推理で事件を解決する",
		points: {
			base: 120,
			correctVote: 200,
			evidenceDiscovery: 75,
			logicalDeduction: 100,
			investigationBonus: 50,
		},
	},

	[RoleType.ACCOMPLICE]: {
		primary: "犯人の勝利をサポートする",
		secondary: "犯人が処刑されないようにする",
		points: {
			base: 150,
			protectMurderer: 200,
			successfulDeception: 75,
			evidenceDestruction: 50,
		},
	},
};
