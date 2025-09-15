import { type Player, world } from "@minecraft/server";
import { useSkill } from "../managers/SkillManager";
import type { Skill } from "../types/AbilityTypes";
import { type Job, type JobObjective, JobType } from "../types/JobTypes";
import {
	OBJECTIVE_DEFINITIONS,
	ObjectiveCategory,
	OBJECTIVES_BY_CATEGORY,
} from "./ObjectiveDefinitions";
import { JOB_BASE_SKILLS, SKILL_DEFINITIONS } from "./SkillDefinitions";

/**
 * ゲーム状態の型定義
 */
interface GameState {
	playerStates?: Record<string, { alive: boolean; [key: string]: unknown }>;
	votingResults?: Record<string, { correct: boolean; [key: string]: unknown }>;
	playerProgress?: Record<
		string,
		{
			materials?: number;
			deals?: number;
			quests?: number;
			[key: string]: unknown;
		}
	>;
}

/**
 * SkillDefinitionをSkillインターフェースに変換するアダプター
 */
function skillDefinitionToSkill(skillId: string): Skill {
	const skill = SKILL_DEFINITIONS[skillId];
	if (!skill) {
		throw new Error(`Skill ${skillId} not found in SKILL_DEFINITIONS`);
	}

	return {
		id: skill.id,
		name: skill.name,
		description: skill.description,
		cooldown: skill.cooldownTime,
		usageCount: skill.usesPerGame,
		executeSkill: async (
			player: Player,
			target?: Player,
			args?: Record<string, unknown>,
		) => {
			// SkillManagerを使用した適切な実装
			try {
				const result = await useSkill(player, skill.id);
				return {
					success: result.success,
					message: result.message || `${skill.name}の使用に成功しました`,
				};
			} catch (error) {
				return {
					success: false,
					message: `${skill.name}の使用に失敗しました`,
					error: String(error),
				};
			}
		},
	};
}

/**
 * ジョブスキル実装（SkillDefinitionsから動的生成）
 */
const JOB_SKILLS: Record<string, Skill> = (() => {
	const skills: Record<string, Skill> = {};

	// JOB_BASE_ABILITIESからスキルを生成
	for (const [jobType, skillId] of Object.entries(JOB_BASE_SKILLS)) {
		try {
			skills[skillId] = skillDefinitionToSkill(skillId);
		} catch (error) {
			console.warn(`Failed to create skill for ${jobType}: ${skillId}`, error);
			// フォールバック用の基本スキルを作成
			skills[skillId] = {
				id: skillId,
				name: jobType + "スキル",
				description: "基本的な職業スキル",
				cooldown: 300,
				usageCount: 3,
				executeSkill: async (player: Player) => {
					player.sendMessage(`§2${jobType}の特殊能力を使用しました`);
					return { success: true, message: "スキルを使用しました" };
				},
			};
		}
	}

	return skills;
})();

/**
 * ObjectiveDefinitionをJobObjectiveインターフェースに変換するアダプター
 */
function objectiveToJobObjective(objectiveId: string): JobObjective {
	const objective = OBJECTIVE_DEFINITIONS[objectiveId];
	if (!objective) {
		throw new Error(
			`Objective ${objectiveId} not found in OBJECTIVE_DEFINITIONS`,
		);
	}

	return {
		id: objective.id,
		name: objective.name,
		description: objective.description,
		scorePoints: objective.points.completion,
		checkCompletion: (playerId: string, gameState?: GameState) => {
			// ObjectiveDefinitionsのconditionsを実際に評価
			try {
				// プレイヤーの状態を取得
				const player = world.getAllPlayers().find((p) => p.id === playerId);
				if (!player) return false;

				// 条件の種類に応じた実際の評価
				for (const condition of objective.conditions) {
					switch (condition.type) {
						case "survive": {
							// プレイヤーが生存しているかの実際のチェック
							const isAlive =
								gameState?.playerStates?.[playerId]?.alive ?? true;
							if (!isAlive) return false;
							break;
						}
						case "correct_vote": {
							// 正しい投票をしたかの実際のチェック
							const votedCorrectly =
								gameState?.votingResults?.[playerId]?.correct ?? false;
							if (!votedCorrectly) return false;
							break;
						}
						case "collect_materials": {
							// 素材収集の実際のチェック
							const materialsCollected =
								gameState?.playerProgress?.[playerId]?.materials ?? 0;
							const requiredMaterials =
								(condition.target as unknown as number) || 1;
							if (materialsCollected < requiredMaterials) return false;
							break;
						}
						case "make_deals": {
							// 取引完了の実際のチェック
							const dealsCompleted =
								gameState?.playerProgress?.[playerId]?.deals ?? 0;
							const requiredDeals =
								(condition.target as unknown as number) || 1;
							if (dealsCompleted < requiredDeals) return false;
							break;
						}
						case "complete_quests": {
							// クエスト完了の実際のチェック
							const questsCompleted =
								gameState?.playerProgress?.[playerId]?.quests ?? 0;
							const requiredQuests =
								(condition.target as unknown as number) || 1;
							if (questsCompleted < requiredQuests) return false;
							break;
						}
						default: {
							// 不明な条件タイプは達成とみなす
							continue;
						}
					}
				}
				return true;
			} catch (error) {
				console.warn(
					`Failed to check objective completion for ${playerId}:`,
					error,
				);
				return false;
			}
		},
	};
}

/**
 * 職業別目的マッピング（ObjectiveDefinitionsから適切な目的を選択）
 */
const JOB_OBJECTIVE_MAPPING: Record<JobType, string> = {
	[JobType.LORD]: "judge_criminal", // 犯罪者を裁く
	[JobType.CAPTAIN]: "find_criminal_roles", // 犯罪者役職の発見
	[JobType.HOMUNCULUS]: "assassinate_cariostro", // カリオストロの暗殺
	[JobType.COURT_ALCHEMIST]: "create_philosophers_stone", // 賢者の石の創造
	[JobType.ROGUE_ALCHEMIST]: "create_immortality_elixir", // 不老不死の薬の完成
	[JobType.THIEF]: "earn_profit", // 利益獲得（盗みによる）
	[JobType.PHARMACIST]: "create_golden_apple", // 金のリンゴの創造
	[JobType.MAID]: "infiltrate_ladys_chamber", // 貴婦人への変身
	[JobType.BUTLER]: "acquire_lords_seal", // 領主の金印獲得
	[JobType.SOLDIER]: "promotion_to_knight_guard", // 近衛騎士への昇進
	[JobType.STUDENT]: "earn_tuition", // 学費稼ぎ
	[JobType.ADVENTURER]: "improve_guild_rank", // ギルドランク向上
};

/**
 * ジョブ目的実装（ObjectiveDefinitionsから動的生成）
 */
const JOB_OBJECTIVES: Record<string, JobObjective> = (() => {
	const objectives: Record<string, JobObjective> = {};

	// JOB_OBJECTIVE_MAPPINGから目的を生成
	for (const [jobType, objectiveId] of Object.entries(JOB_OBJECTIVE_MAPPING)) {
		try {
			objectives[objectiveId] = objectiveToJobObjective(objectiveId);
		} catch (error) {
			console.warn(
				`Failed to create objective for ${jobType}: ${objectiveId}`,
				error,
			);
			// フォールバック用の基本目的を作成
			objectives[objectiveId] = {
				id: objectiveId,
				name: jobType + "の目的",
				description: "職業固有の目標を達成する",
				scorePoints: 100,
				checkCompletion: () => true,
			};
		}
	}

	// 追加の職業特化目的も生成
	const jobTaskObjectives = OBJECTIVES_BY_CATEGORY[ObjectiveCategory.JOB_TASK];
	for (const objectiveId of jobTaskObjectives) {
		if (!objectives[objectiveId]) {
			try {
				objectives[objectiveId] = objectiveToJobObjective(objectiveId);
			} catch (error) {
				console.warn(
					`Failed to create job task objective: ${objectiveId}`,
					error,
				);
			}
		}
	}

	return objectives;
})();

/**
 * 職業定義データ
 * ここを編集することで職業の設定を簡単に変更できます
 */
export const JOB_DEFINITIONS: Record<JobType, Job> = {
	// 人数制限ありの職業（各1人）
	[JobType.LORD]: {
		type: JobType.LORD,
		name: "領主",
		description: "領地を統治する支配者",
		dailyTasks: [
			"謁見の間に居る",
			"教会で神父と話し、祭事を執り行う",
			"近衛隊長と教練を執り行う（庭、武器庫、兵舎）",
			"芸術を嗜む",
			"執事と領地の方針を考える",
			"一般兵士を連れて視察に出る",
		],
		skill: JOB_SKILLS.royal_summon,
		objective: JOB_OBJECTIVES.hide_adultery,
		specialPrivileges: [
			"領主としての権威",
			"他プレイヤーを召喚可能",
			"政務に関する知識",
		],
		maxCount: 1,
	},

	[JobType.CAPTAIN]: {
		type: JobType.CAPTAIN,
		name: "近衛隊長",
		description: "領主の護衛と領地の警備を担当する武官",
		dailyTasks: [
			"領主と共に教練を執り行う",
			"牢を見廻る",
			"領主居室の門番",
			"近衛隊長専用武器やら機密兵器やらを修繕しに行く",
			"馬術練習",
			"近衛隊勧誘活動",
		],
		skill: JOB_SKILLS.protection,
		objective: JOB_OBJECTIVES.maintain_order,
		specialPrivileges: [
			"武器携帯許可",
			"緊急時の権限行使",
			"他プレイヤーの行動制限可能",
		],
		maxCount: 1,
	},

	[JobType.HOMUNCULUS]: {
		type: JobType.HOMUNCULUS,
		name: "ホムンクルス",
		description:
			"錬金術によって創られた人工生命体（カリオストロに会うまで本当の目標は隠される）",
		dailyTasks: [
			"各部屋の清掃作業", // メイドのタスク
			"城門と城壁の警備巡回", // 近衛隊長のタスク
			"薬草の採取と調合", // 薬師のタスク
			"図書館での学習", // 学生のタスク
			"館の運営管理", // 執事のタスク
			"秘密の錬金術研究", // ホムンクルス固有（混ざる別役職のタスク）
		],
		skill: JOB_SKILLS.teleportation,
		objective: JOB_OBJECTIVES.complete_research,
		specialPrivileges: [
			"他の職業に擬態して行動可能",
			"カリオストロとの対面で真の目標が判明",
			"錬成陣を稼働させる触媒の生成能力",
			"人工生命体としての特殊能力",
		],
		maxCount: 1,
	},

	[JobType.COURT_ALCHEMIST]: {
		type: JobType.COURT_ALCHEMIST,
		name: "宮廷錬金術師",
		description: "領主に仕える正式な錬金術師",
		dailyTasks: [
			"薬屋に仕入れ",
			"錬金を執り行う",
			"行商人にモノを売りに行く",
			"図書塔に禁書を読みに行く",
			"水質を調査する",
			"領主に宝石を献上する",
		],
		skill: JOB_SKILLS.divination,
		objective: JOB_OBJECTIVES.complete_research,
		specialPrivileges: [
			"宮廷資源への優先アクセス",
			"錬金術による物質変換",
			"領主からの信頼",
		],
		maxCount: 1,
	},

	[JobType.ROGUE_ALCHEMIST]: {
		type: JobType.ROGUE_ALCHEMIST,
		name: "野良錬金術師",
		description: "どこにも属さない独立した錬金術師",
		dailyTasks: [
			"透明ポーションの材料を集める",
			"城の動物を倒して素材を得る",
			"闇市に錬金薬を売りに行く",
			"宮廷錬金術師の執務室に行く",
			"執事に賄賂を渡そうとする",
			"司書に情報を仕入れに行く",
		],
		skill: JOB_SKILLS.teleportation,
		objective: JOB_OBJECTIVES.surpass_master,
		specialPrivileges: [
			"禁断の錬金術の知識",
			"秘密の隠れ家",
			"闇のネットワークへのアクセス",
		],
		maxCount: 1,
	},

	[JobType.THIEF]: {
		type: JobType.THIEF,
		name: "盗賊",
		description: "盗みや諜報活動を生業とする者",
		dailyTasks: [
			"盗品を売りに闇市に行く",
			"地下牢の仲間の様子を見に行く",
			"城から動物、物を盗む",
			"宝探しの道具を作成する",
			"透明ポーションを盗む",
			"盗みを行ったことを神父に告解に行く",
		],
		skill: JOB_SKILLS.eavesdrop,
		objective: JOB_OBJECTIVES.earn_profit,
		specialPrivileges: [
			"隠密行動の専門技術",
			"鍵開けと解錠技術",
			"裏社会とのコネクション",
		],
		maxCount: 1,
	},

	[JobType.PHARMACIST]: {
		type: JobType.PHARMACIST,
		name: "薬師",
		description: "薬草を扱い治療薬を調合する専門家",
		dailyTasks: ["暗視ポーションの作成", "パーゴラで植物を採集する"],
		skill: JOB_SKILLS.concealment,
		objective: JOB_OBJECTIVES.legendary_weapon,
		specialPrivileges: ["治療薬の調合技術", "毒物の知識", "薬草の専門知識"],
		maxCount: 1,
	},

	// 人数制限なしの職業

	[JobType.MAID]: {
		type: JobType.MAID,
		name: "メイド",
		description: "館内の清掃と給仕を担当する使用人",
		dailyTasks: [
			"炊事場で料理を作成する",
			"御曹司と勉強",
			"ガゼボの整備",
			"広間の掃除",
			"犬の散歩",
			"市場で買い物",
		],
		skill: JOB_SKILLS.surveillance,
		objective: JOB_OBJECTIVES.perfect_service,
		specialPrivileges: [
			"館内の隠し通路の知識",
			"他プレイヤーの私的情報への接触",
			"清掃を装った監視活動",
		],
		maxCount: -1,
	},

	[JobType.BUTLER]: {
		type: JobType.BUTLER,
		name: "執事",
		description: "館の運営と使用人の管理を行う上級使用人",
		dailyTasks: [
			"領主と街の運営執り行う",
			"御曹司ダンスレッスン",
			"庭師と打ち合わせ",
			"メイドに指示書を渡す",
			"ランドリールームで洗濯の様子を確認",
			"建築ギルドに依頼を出す",
		],
		skill: JOB_SKILLS.information_network,
		objective: JOB_OBJECTIVES.perfect_service,
		specialPrivileges: [
			"使用人への指揮権",
			"館の全情報へのアクセス",
			"領主への直接報告権",
		],
		maxCount: -1,
	},

	[JobType.SOLDIER]: {
		type: JobType.SOLDIER,
		name: "一般兵士",
		description: "領地の警備を担当する兵士",
		dailyTasks: [
			"城壁の見廻り",
			"正面門の見張り",
			"武器庫で武具の点検",
			"鍛冶屋に武器を買いに行く",
			"行きつけのバーで飲んだくれる",
			"司書にラブレターを渡す",
		],
		skill: JOB_SKILLS.appraisal,
		objective: JOB_OBJECTIVES.maintain_order,
		specialPrivileges: [
			"武器携帯許可",
			"警備区域への自由通行",
			"怪しい者への職務質問権",
		],
		maxCount: -1,
	},

	[JobType.STUDENT]: {
		type: JobType.STUDENT,
		name: "学生",
		description: "知識を学ぶ若い学習者",
		dailyTasks: ["宿題の提出", "鍛冶屋のアルバイト"],
		skill: JOB_SKILLS.investigate,
		objective: JOB_OBJECTIVES.complete_research,
		specialPrivileges: [
			"学習施設への優先アクセス",
			"師匠からの指導",
			"研究資料の閲覧権",
		],
		maxCount: -1,
	},

	[JobType.ADVENTURER]: {
		type: JobType.ADVENTURER,
		name: "冒険者",
		description: "自由に旅をする冒険家",
		dailyTasks: ["近衛兵の強さを評価する", "領主に挨拶する"],
		skill: JOB_SKILLS.negotiation,
		objective: JOB_OBJECTIVES.guild_reputation,
		specialPrivileges: [
			"自由な行動権",
			"危険地帯への立入許可",
			"冒険者ギルドの支援",
		],
		maxCount: -1,
	},
};

/**
 * 人数制限ありの職業
 */
const LIMITED_JOBS: JobType[] = [
	JobType.LORD,
	JobType.CAPTAIN,
	JobType.HOMUNCULUS,
	JobType.COURT_ALCHEMIST,
	JobType.ROGUE_ALCHEMIST,
	JobType.THIEF,
	JobType.PHARMACIST,
];

/**
 * 人数制限なしの職業
 */
const UNLIMITED_JOBS: JobType[] = [
	JobType.MAID,
	JobType.BUTLER,
	JobType.SOLDIER,
	JobType.STUDENT,
	JobType.ADVENTURER,
];

/**
 * バランスの取れた職業配布を生成
 */
export function generateBalancedJobDistribution(
	playerCount: number,
): JobType[] {
	const jobs: JobType[] = [];

	// 少人数の場合はランダム配布
	if (playerCount <= 3) {
		const allJobs = Object.values(JobType);
		for (let i = 0; i < playerCount; i++) {
			const randomJob = allJobs[Math.floor(Math.random() * allJobs.length)];
			jobs.push(randomJob);
		}
		return jobs;
	}

	// 人数制限ありの職業を優先的に配布（最大7人まで）
	const shuffledLimitedJobs = [...LIMITED_JOBS].sort(() => Math.random() - 0.5);
	const limitedCount = Math.min(playerCount, LIMITED_JOBS.length);

	for (let i = 0; i < limitedCount; i++) {
		jobs.push(shuffledLimitedJobs[i]);
	}

	// 残りのプレイヤーには人数制限なしの職業をランダムに配布
	const remainingPlayers = playerCount - limitedCount;
	for (let i = 0; i < remainingPlayers; i++) {
		const randomJob =
			UNLIMITED_JOBS[Math.floor(Math.random() * UNLIMITED_JOBS.length)];
		jobs.push(randomJob);
	}

	return jobs;
}
