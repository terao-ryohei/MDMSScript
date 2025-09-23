/**
 * 目的（Objective）定義データ
 * プレイヤーの個別目標を定義
 */

export interface ObjectiveDefinition {
	id: string;
	name: string;
	description: string;
	category: ObjectiveCategory;
	difficulty: ObjectiveDifficulty;
	points: {
		completion: number;
		bonus: number;
	};
	conditions: ObjectiveCondition[];
	hints?: string[];
}

export enum ObjectiveCategory {
	ROLE_PRIMARY = "role_primary", // ロールの主目的
	JOB_TASK = "job_task", // 職業課題
	PERSONAL = "personal", // 個人的目標
	SOCIAL = "social", // 社会的目標
	MYSTERY = "mystery", // 謎解き目標
}

export enum ObjectiveDifficulty {
	EASY = "easy", // 簡単
	NORMAL = "normal", // 普通
	HARD = "hard", // 難しい
	EXPERT = "expert", // 専門的
}

export interface ObjectiveCondition {
	type: string;
	target?: string;
	value?: number;
	description: string;
}

/**
 * 目的定義データベース
 */
export const OBJECTIVE_DEFINITIONS: Record<string, ObjectiveDefinition> = {
	// === ロール関連の主目的 ===
	identify_murderer: {
		id: "identify_murderer",
		name: "真犯人の特定",
		description: "証拠を集めて真犯人を特定し、正しい投票をする",
		category: ObjectiveCategory.ROLE_PRIMARY,
		difficulty: ObjectiveDifficulty.NORMAL,
		points: { completion: 200, bonus: 100 },
		conditions: [
			{ type: "correct_vote", description: "犯人に正しく投票する" },
			{ type: "survive", description: "最後まで生存する" },
		],
		hints: [
			"他プレイヤーの行動を注意深く観察しよう",
			"矛盾した証言を見つけよう",
			"証拠の時系列を整理しよう",
		],
	},

	avoid_execution: {
		id: "avoid_execution",
		name: "処刑回避",
		description: "投票で最多票を避けて最後まで生き残る",
		category: ObjectiveCategory.ROLE_PRIMARY,
		difficulty: ObjectiveDifficulty.HARD,
		points: { completion: 300, bonus: 200 },
		conditions: [
			{ type: "avoid_votes", value: 50, description: "投票で過半数を回避する" },
			{ type: "survive", description: "ゲーム終了まで生存する" },
		],
		hints: [
			"他プレイヤーに疑いを向けよう",
			"自分のアリバイを作ろう",
			"証拠を隠蔽しよう",
		],
	},

	support_murderer: {
		id: "support_murderer",
		name: "犯人支援",
		description: "犯人の勝利をサポートし、捜査を撹乱する",
		category: ObjectiveCategory.ROLE_PRIMARY,
		difficulty: ObjectiveDifficulty.HARD,
		points: { completion: 250, bonus: 150 },
		conditions: [
			{ type: "protect_murderer", description: "犯人への投票を防ぐ" },
			{ type: "mislead_investigation", description: "捜査を妨害する" },
		],
		hints: [
			"偽の証言で混乱を作ろう",
			"無実の人に疑いを向けよう",
			"犯人のアリバイを作ろう",
		],
	},

	// === 職業関連の目的 ===
	hide_adultery: {
		id: "hide_adultery",
		name: "不倫の隠蔽",
		description: "王室の不倫スキャンダルを隠し通す",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.EXPERT,
		points: { completion: 150, bonus: 100 },
		conditions: [
			{
				type: "keep_secret",
				target: "royal_affair",
				description: "王室の秘密を守る",
			},
			{ type: "mislead_gossip", description: "噂を他の話題にそらす" },
		],
		hints: [
			"王室の行動を注意深く管理しよう",
			"怪しい質問をする相手を警戒しよう",
		],
	},

	judge_criminal: {
		id: "judge_criminal",
		name: "犯罪者を裁く",
		description: "正義の裁きを下し、犯罪者を適切に処罰する",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.HARD,
		points: { completion: 140, bonus: 90 },
		conditions: [
			{ type: "identify_criminal", description: "犯罪者を正しく特定する" },
			{ type: "deliver_justice", description: "正義の裁きを下す" },
			{ type: "maintain_law", description: "法と秩序を維持する" },
		],
		hints: [
			"証拠を慎重に検討しよう",
			"公正な裁判を心がけよう",
			"正義を貫き通そう",
		],
	},

	find_criminal_roles: {
		id: "find_criminal_roles",
		name: "犯罪者ロールの発見",
		description: "犯罪者のロールを持つプレイヤーを特定し、証拠を集める",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.HARD,
		points: { completion: 130, bonus: 80 },
		conditions: [
			{ type: "identify_murderer_role", description: "殺人者ロールを特定する" },
			{
				type: "identify_accomplice_role",
				description: "共犯者ロールを特定する",
			},
			{
				type: "gather_evidence",
				value: 3,
				description: "3つ以上の証拠を収集する",
			},
		],
		hints: [
			"怪しい行動を監視しよう",
			"他プレイヤーの発言に注意を払おう",
			"証拠を論理的に整理しよう",
		],
	},

	assassinate_cariostro: {
		id: "assassinate_cariostro",
		name: "カリオストロの暗殺",
		description: "創造主カリオストロを殺害し、自由を手に入れる",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.EXPERT,
		points: { completion: 200, bonus: 150 },
		conditions: [
			{
				type: "eliminate_target",
				target: "cariostro",
				description: "カリオストロを殺害する",
			},
			{
				type: "conceal_identity",
				description: "ホムンクルスとしての正体を隠し通す",
			},
			{ type: "complete_mission", description: "暗殺任務を完遂する" },
		],
		hints: [
			"カリオストロに会うまで本当の目標は隠されている",
			"他の職業に紛れて行動しよう",
			"錬金術の知識を活用しよう",
		],
	},

	create_philosophers_stone: {
		id: "create_philosophers_stone",
		name: "賢者の石の創造",
		description: "究極の錬金術の成果、賢者の石を作成する",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.EXPERT,
		points: { completion: 250, bonus: 200 },
		conditions: [
			{
				type: "gather_rare_materials",
				value: 5,
				description: "5つの希少材料を集める",
			},
			{
				type: "complete_transmutation",
				description: "最高レベルの錬成を成功させる",
			},
			{ type: "master_forbidden_arts", description: "禁断の錬金術を習得する" },
			{ type: "present_to_lord", description: "領主に成果を献上する" },
		],
		hints: [
			"図書塔の禁書に重要な情報が隠されている",
			"水質調査で特殊な素材を発見できるかもしれない",
			"行商人との取引で珍しい材料を入手しよう",
		],
	},

	infiltrate_ladys_chamber: {
		id: "infiltrate_ladys_chamber",
		name: "貴婦人への変身",
		description: "領主の妻の部屋に忍び込み、ドレスを着て大広間に現れる",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.HARD,
		points: { completion: 160, bonus: 120 },
		conditions: [
			{
				type: "infiltrate_chamber",
				target: "lady_room",
				description: "領主の妻の部屋に忍び込む",
			},
			{ type: "wear_dress", description: "貴婦人のドレスを着用する" },
			{
				type: "appear_in_hall",
				target: "great_hall",
				description: "大広間に堂々と現れる",
			},
			{ type: "avoid_detection", description: "正体がばれずに任務を完遂する" },
		],
		hints: [
			"適切なタイミングを見計らおう",
			"他の使用人の目を避けて行動しよう",
			"堂々とした態度で貴婦人を演じよう",
		],
	},

	acquire_lords_seal: {
		id: "acquire_lords_seal",
		name: "領主の金印獲得",
		description: "領主の金印を何らかの方法で入手する",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.EXPERT,
		points: { completion: 180, bonus: 150 },
		conditions: [
			{ type: "max_favor_route", description: "好感度をMAXにして強制入手" },
			{ type: "theft_route", description: "盗賊等の能力で盗む" },
			{ type: "gift_route", description: "領主から直接もらう" },
			{
				type: "obtain_seal",
				target: "lords_golden_seal",
				description: "金印を所持する",
			},
		],
		hints: [
			"複数の入手ルートが存在する",
			"好感度を最大まで上げるのが最も確実",
			"盗賊系の能力があれば直接盗むことも可能",
			"領主との信頼関係を築こう",
		],
	},

	promotion_to_knight_guard: {
		id: "promotion_to_knight_guard",
		name: "近衛騎士への昇進",
		description: "専用タスクを一定量達成して近衛騎士の地位を獲得する",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.NORMAL,
		points: { completion: 120, bonus: 80 },
		conditions: [
			{
				type: "complete_patrols",
				value: 5,
				description: "巡回任務を5回完了する",
			},
			{
				type: "equipment_maintenance",
				value: 3,
				description: "武具点検を3回完了する",
			},
			{ type: "guard_duty", value: 4, description: "見張り任務を4回完了する" },
			{ type: "demonstrate_loyalty", description: "忠誠心を証明する" },
			{ type: "gain_recognition", description: "上官から認められる" },
		],
		hints: [
			"軍務を忠実に遂行しよう",
			"武器の扱いを向上させよう",
			"上官への敬意を忘れずに",
			"私生活も充実させることで士気を保とう",
		],
	},

	create_immortality_elixir: {
		id: "create_immortality_elixir",
		name: "不老不死の薬の完成",
		description: "禁断の錬金術で不老不死の薬（？）を完成させる",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.EXPERT,
		points: { completion: 300, bonus: 250 },
		conditions: [
			{
				type: "gather_forbidden_materials",
				value: 7,
				description: "禁断の材料を7つ集める",
			},
			{
				type: "infiltrate_court_lab",
				description: "宮廷錬金術師の執務室に潜入する",
			},
			{ type: "bribe_contacts", description: "賄賂で情報源を確保する" },
			{ type: "black_market_trade", description: "闇市で禁制品を取引する" },
			{ type: "complete_elixir", description: "不老不死の薬を完成させる" },
		],
		hints: [
			"透明ポーションは潜入に必要かもしれない",
			"城の動物から貴重な素材が手に入る",
			"執事への賄賂で内部情報を得よう",
			"司書は意外な知識を持っているかもしれない",
		],
	},

	create_golden_apple: {
		id: "create_golden_apple",
		name: "金のリンゴの創造",
		description: "特殊な調合技術で金のリンゴを作成し、納品する",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.HARD,
		points: { completion: 150, bonus: 100 },
		conditions: [
			{
				type: "gather_special_plants",
				value: 3,
				description: "特殊な植物を3種類採集する",
			},
			{ type: "create_night_vision", description: "暗視ポーションを作成する" },
			{ type: "craft_golden_apple", description: "金のリンゴを調合する" },
			{
				type: "deliver_item",
				target: "golden_apple",
				description: "金のリンゴを納品する",
			},
		],
		hints: [
			"パーゴラには希少な植物が育っている",
			"暗視ポーションの技術が応用できるかもしれない",
			"調合の順序と分量が重要だ",
			"納品先を事前に確認しよう",
		],
	},

	earn_tuition: {
		id: "earn_tuition",
		name: "学費の獲得",
		description: "アルバイトや節約で学費を稼ぎ、学業を続ける",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.EASY,
		points: { completion: 80, bonus: 50 },
		conditions: [
			{ type: "complete_homework", value: 3, description: "宿題を3回提出する" },
			{
				type: "work_part_time",
				value: 5,
				description: "アルバイトを5回こなす",
			},
			{ type: "save_money", value: 500, description: "500ゴールド節約する" },
			{ type: "maintain_grades", description: "学業成績を維持する" },
		],
		hints: [
			"鍛冶屋のアルバイトは安定した収入源だ",
			"宿題をしっかり出せば学業も安心",
			"学割を活用して出費を抑えよう",
			"勉強とバイトの両立が大切だ",
		],
	},
	improve_guild_rank: {
		id: "improve_guild_rank",
		name: "ギルドランク向上",
		description: "冒険者ギルドでの評価を高め、より高い地位を目指す",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.NORMAL,
		points: { completion: 120, bonus: 80 },
		conditions: [
			{ type: "evaluate_guards", value: 3, description: "近衛兵を3回評価する" },
			{ type: "greet_lord", value: 2, description: "領主に2回挨拶する" },
			{
				type: "complete_quests",
				value: 5,
				description: "ギルドクエストを5回完了する",
			},
			{
				type: "gain_reputation",
				value: 1000,
				description: "1000の評判ポイントを獲得する",
			},
		],
		hints: [
			"近衛兵との良好な関係は重要な情報源だ",
			"領主への敬意は社会的地位を示す",
			"クエストの成功率が証拠収集力に影響する",
			"ギルドでの信頼が全ての基礎となる",
		],
	},

	maintain_order: {
		id: "maintain_order",
		name: "治安維持",
		description: "城内の秩序を保ち、混乱を最小限に抑える",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.NORMAL,
		points: { completion: 120, bonus: 80 },
		conditions: [
			{ type: "prevent_conflicts", value: 3, description: "争いを3回以上防ぐ" },
			{ type: "maintain_security", description: "警備体制を維持する" },
		],
		hints: ["怪しい行動を監視しよう", "プレイヤー間の対立を仲裁しよう"],
	},

	complete_research: {
		id: "complete_research",
		name: "研究完成",
		description: "重要な魔術研究を完成させる",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.HARD,
		points: { completion: 140, bonus: 90 },
		conditions: [
			{
				type: "collect_materials",
				value: 5,
				description: "必要な材料を5つ集める",
			},
			{ type: "complete_experiment", description: "実験を成功させる" },
		],
		hints: ["他プレイヤーと材料取引をしよう", "図書館で古文書を調べよう"],
	},

	earn_profit: {
		id: "earn_profit",
		name: "利益獲得",
		description: "盗みや闇取引で一定額以上を稼ぎ、ゲーム終了時に所持する",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.NORMAL,
		points: { completion: 100, bonus: 75 },
		conditions: [
			{
				type: "make_deals",
				value: 5,
				description: "5回以上の取引を成功させる",
			},
			{ type: "earn_gold", value: 1000, description: "1000ゴールド以上稼ぐ" },
		],
		hints: [
			"盗品は闇市で高く売れる",
			"透明ポーションは貴重品だ",
			"動物や物品も盗みの対象になる",
			"神父への告解は魂の救済だが利益にはならない",
		],
	},

	guild_reputation: {
		id: "guild_reputation",
		name: "ギルドの評判向上",
		description: "ギルドの評判を高め、新規依頼を増やす",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.NORMAL,
		points: { completion: 110, bonus: 60 },
		conditions: [
			{ type: "complete_quests", value: 3, description: "3つの依頼を完遂する" },
			{
				type: "recruit_members",
				value: 2,
				description: "新メンバーを2人勧誘する",
			},
		],
		hints: ["他プレイヤーにギルドの魅力を伝えよう", "依頼の成功率を上げよう"],
	},

	legendary_weapon: {
		id: "legendary_weapon",
		name: "伝説の武器製作",
		description: "伝説級の武器を製作して名声を得る",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.EXPERT,
		points: { completion: 180, bonus: 120 },
		conditions: [
			{
				type: "gather_rare_materials",
				value: 3,
				description: "希少材料を3つ入手する",
			},
			{ type: "master_craftsmanship", description: "最高品質で製作する" },
		],
		hints: ["希少な鉱石を探そう", "他の職人と技術交換をしよう"],
	},

	tavern_prosperity: {
		id: "tavern_prosperity",
		name: "酒場の繁盛",
		description: "酒場を情報交換の拠点として発展させる",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.NORMAL,
		points: { completion: 130, bonus: 70 },
		conditions: [
			{
				type: "host_meetings",
				value: 3,
				description: "3回の秘密会議を開催する",
			},
			{
				type: "collect_information",
				value: 5,
				description: "5つの重要情報を収集する",
			},
		],
		hints: ["お客さんの会話に耳を傾けよう", "美味しい料理で常連を作ろう"],
	},

	perfect_garden: {
		id: "perfect_garden",
		name: "完璧な庭園",
		description: "城の庭園を完璧な状態に保つ",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.EASY,
		points: { completion: 90, bonus: 50 },
		conditions: [
			{ type: "maintain_plants", description: "全ての植物を健康に保つ" },
			{ type: "create_beauty", description: "美しい景観を作り上げる" },
		],
		hints: ["季節に適した手入れをしよう", "他の人の庭園への意見を聞こう"],
	},

	perfect_service: {
		id: "perfect_service",
		name: "完璧なサービス",
		description: "全ての給仕と清掃を完璧にこなす",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.NORMAL,
		points: { completion: 100, bonus: 60 },
		conditions: [
			{ type: "serve_all_meals", description: "全ての食事を完璧に配膳する" },
			{ type: "maintain_cleanliness", description: "城内を清潔に保つ" },
		],
		hints: ["主人の好みを覚えよう", "効率的な作業順序を考えよう"],
	},

	surpass_master: {
		id: "surpass_master",
		name: "師匠の超越",
		description: "師匠を超える錬金術の技術を身につける",
		category: ObjectiveCategory.JOB_TASK,
		difficulty: ObjectiveDifficulty.EXPERT,
		points: { completion: 160, bonus: 100 },
		conditions: [
			{ type: "master_technique", description: "高度な錬金術技術を習得する" },
			{ type: "create_innovation", description: "新しい錬金術を開発する" },
		],
		hints: ["古い錬金術書を研究しよう", "実験を繰り返して経験を積もう"],
	},

	// === 個人的目標 ===
	social_butterfly: {
		id: "social_butterfly",
		name: "社交家",
		description: "多くのプレイヤーと友好関係を築く",
		category: ObjectiveCategory.PERSONAL,
		difficulty: ObjectiveDifficulty.EASY,
		points: { completion: 80, bonus: 40 },
		conditions: [
			{
				type: "befriend_players",
				value: 5,
				description: "5人以上と友好関係を築く",
			},
		],
		hints: ["積極的に話しかけよう", "他人の話をよく聞こう"],
	},

	information_broker: {
		id: "information_broker",
		name: "情報ブローカー",
		description: "重要な情報を多く収集し、活用する",
		category: ObjectiveCategory.PERSONAL,
		difficulty: ObjectiveDifficulty.NORMAL,
		points: { completion: 120, bonus: 80 },
		conditions: [
			{
				type: "collect_secrets",
				value: 7,
				description: "7つの秘密情報を収集する",
			},
		],
		hints: ["会話の中の矛盾を見つけよう", "情報の価値を見極めよう"],
	},

	survivor: {
		id: "survivor",
		name: "サバイバー",
		description: "どんな状況でも最後まで生き残る",
		category: ObjectiveCategory.PERSONAL,
		difficulty: ObjectiveDifficulty.HARD,
		points: { completion: 150, bonus: 100 },
		conditions: [
			{ type: "survive_all_phases", description: "全フェーズを生存する" },
			{ type: "avoid_suspicion", description: "疑いを避け続ける" },
		],
		hints: ["目立たない行動を心がけよう", "危険な状況は避けよう"],
	},
};

/**
 * カテゴリ別目的リスト
 */
export const OBJECTIVES_BY_CATEGORY: Record<ObjectiveCategory, string[]> = {
	[ObjectiveCategory.ROLE_PRIMARY]: [
		"identify_murderer",
		"avoid_execution",
		"support_murderer",
	],
	[ObjectiveCategory.JOB_TASK]: [
		"hide_adultery",
		"judge_criminal",
		"find_criminal_roles",
		"assassinate_cariostro",
		"create_philosophers_stone",
		"infiltrate_ladys_chamber",
		"acquire_lords_seal",
		"promotion_to_knight_guard",
		"create_immortality_elixir",
		"create_golden_apple",
		"earn_tuition",
		"maintain_order",
		"complete_research",
		"earn_profit",
		"guild_reputation",
		"legendary_weapon",
		"tavern_prosperity",
		"perfect_garden",
		"perfect_service",
		"surpass_master",
	],
	[ObjectiveCategory.PERSONAL]: [
		"social_butterfly",
		"information_broker",
		"survivor",
	],
	[ObjectiveCategory.SOCIAL]: [],
	[ObjectiveCategory.MYSTERY]: [],
};

/**
 * 難易度別目的リスト
 */
export const OBJECTIVES_BY_DIFFICULTY: Record<ObjectiveDifficulty, string[]> = {
	[ObjectiveDifficulty.EASY]: [
		"perfect_garden",
		"social_butterfly",
		"earn_tuition",
	],
	[ObjectiveDifficulty.NORMAL]: [
		"identify_murderer",
		"maintain_order",
		"promotion_to_knight_guard",
		"earn_profit",
		"guild_reputation",
		"tavern_prosperity",
		"perfect_service",
		"information_broker",
		"improve_guild_rank",
	],
	[ObjectiveDifficulty.HARD]: [
		"avoid_execution",
		"support_murderer",
		"complete_research",
		"judge_criminal",
		"find_criminal_roles",
		"infiltrate_ladys_chamber",
		"create_golden_apple",
		"survivor",
	],
	[ObjectiveDifficulty.EXPERT]: [
		"hide_adultery",
		"assassinate_cariostro",
		"create_philosophers_stone",
		"acquire_lords_seal",
		"create_immortality_elixir",
		"legendary_weapon",
		"surpass_master",
	],
};

/**
 * ランダムな個人目標を取得
 */
export function getRandomPersonalObjective(): string {
	const personalObjectives = OBJECTIVES_BY_CATEGORY[ObjectiveCategory.PERSONAL];
	return personalObjectives[
		Math.floor(Math.random() * personalObjectives.length)
	];
}

/**
 * 難易度別ランダム目標を取得
 */
export function getRandomObjectiveByDifficulty(
	difficulty: ObjectiveDifficulty,
): string {
	const objectives = OBJECTIVES_BY_DIFFICULTY[difficulty];
	return objectives[Math.floor(Math.random() * objectives.length)];
}
