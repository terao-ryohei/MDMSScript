import { type Job, JobType, type JobObjective } from "../types/JobTypes";
import { type Skill } from "../types/SkillTypes";
import { ABILITY_DEFINITIONS, JOB_BASE_ABILITIES } from "./AbilityDefinitions";
import { OBJECTIVE_DEFINITIONS, ObjectiveCategory, OBJECTIVES_BY_CATEGORY } from "./ObjectiveDefinitions";
import { type Player, world } from "@minecraft/server";

/**
 * AbilityDefinitionをSkillインターフェースに変換するアダプター
 */
function abilityToSkill(abilityId: string): Skill {
	const ability = ABILITY_DEFINITIONS[abilityId];
	if (!ability) {
		throw new Error(`Ability ${abilityId} not found in ABILITY_DEFINITIONS`);
	}
	
	return {
		id: ability.id,
		name: ability.name,
		description: ability.description,
		cooldown: ability.cooldownTime,
		usageCount: ability.usesPerGame,
		executeSkill: (player: Player, target?: Player, args?: any) => {
			// AbilityManager の実装に委譲する予定だが、今は簡易実装
			try {
				// プレイヤーにメッセージを送信
				player.sendMessage(`§a${ability.name}を使用しました: ${ability.description}`);
				
				// 簡易的な効果実装
				switch (ability.id) {
					case "royal_summon":
						if (target) {
							target.teleport(player.location);
							world.sendMessage(`§6${player.name}が${target.name}を召喚しました`);
						}
						break;
					case "protection":
						const protectTarget = target || player;
						protectTarget.addEffect("resistance", 600, { amplifier: 2 });
						world.sendMessage(`§9${protectTarget.name}が保護されました`);
						break;
					case "surveillance":
						if (target) {
							player.sendMessage(`§e${target.name}の位置: ${Math.floor(target.location.x)}, ${Math.floor(target.location.z)}`);
						}
						break;
					case "eavesdrop":
						const nearbyPlayers = world.getAllPlayers().filter(p => 
							p.id !== player.id &&
							Math.abs(p.location.x - player.location.x) < 8 && 
							Math.abs(p.location.z - player.location.z) < 8
						);
						player.sendMessage(`§e周囲に ${nearbyPlayers.length} 人のプレイヤーを感知しました`);
						break;
					case "concealment":
						player.addEffect("invisibility", 300, { amplifier: 0 });
						player.sendMessage("§8隠蔽状態になりました");
						break;
					case "divination":
						if (target) {
							// ランダムなヒントを提供
							const hints = [
								`§6${target.name}は重要な役割を持っているようです`,
								`§6${target.name}の行動には注意が必要かもしれません`,
								`§6${target.name}は信頼できる人物のようです`
							];
							const hint = hints[Math.floor(Math.random() * hints.length)];
							player.sendMessage(hint);
						}
						break;
					case "teleportation":
						// ランダムな場所にテレポート
						const x = player.location.x + (Math.random() - 0.5) * 100;
						const z = player.location.z + (Math.random() - 0.5) * 100;
						player.teleport({ x, y: player.location.y + 10, z });
						player.sendMessage("§d瞬間移動しました");
						break;
					case "information_network":
						const allPlayers = world.getAllPlayers();
						const info = allPlayers.map(p => `${p.name}: (${Math.floor(p.location.x)}, ${Math.floor(p.location.z)})`).join("\n");
						player.sendMessage(`§b情報ネットワーク:\n${info}`);
						break;
					case "appraisal":
						player.sendMessage("§6この場所に何か重要なものがありそうです...");
						break;
					case "negotiation":
						if (target) {
							player.sendMessage(`§a${target.name}との交渉を開始しました`);
							target.sendMessage(`§a${player.name}があなたと交渉したがっています`);
						}
						break;
					default:
						// 基本的な成功メッセージ
						break;
				}
				
				return { success: true, message: `${ability.name}の使用に成功しました` };
			} catch (error) {
				return { 
					success: false, 
					message: `${ability.name}の使用に失敗しました`, 
					error: String(error) 
				};
			}
		}
	};
}

/**
 * ジョブスキル実装（AbilityDefinitionsから動的生成）
 */
const JOB_SKILLS: Record<string, Skill> = (() => {
	const skills: Record<string, Skill> = {};
	
	// JOB_BASE_ABILITIESからスキルを生成
	for (const [jobType, abilityId] of Object.entries(JOB_BASE_ABILITIES)) {
		try {
			skills[abilityId] = abilityToSkill(abilityId);
		} catch (error) {
			console.warn(`Failed to create skill for ${jobType}: ${abilityId}`, error);
			// フォールバック用の基本スキルを作成
			skills[abilityId] = {
				id: abilityId,
				name: jobType + "スキル",
				description: "基本的な職業スキル",
				cooldown: 300,
				usageCount: 3,
				executeSkill: (player: Player) => {
					player.sendMessage(`§a${jobType}の特殊能力を使用しました`);
					return { success: true, message: "スキルを使用しました" };
				}
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
		throw new Error(`Objective ${objectiveId} not found in OBJECTIVE_DEFINITIONS`);
	}
	
	return {
		id: objective.id,
		name: objective.name,
		description: objective.description,
		scorePoints: objective.points.completion,
		checkCompletion: (playerId: string, gameState?: any) => {
			// ObjectiveDefinitionsのconditionsをチェック
			// 今は簡易実装として常に達成可能とするが、将来的にはconditionsを評価
			
			// 条件の種類に応じた簡易チェック
			for (const condition of objective.conditions) {
				switch (condition.type) {
					case "survive":
						// プレイヤーが生存しているかチェック（簡易）
						return true;
					case "correct_vote":
						// 正しい投票をしたかチェック（簡易）
						return true;
					case "collect_materials":
					case "make_deals":
					case "complete_quests":
						// 数値目標の簡易チェック
						return true;
					default:
						return true;
				}
			}
			return true;
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
			console.warn(`Failed to create objective for ${jobType}: ${objectiveId}`, error);
			// フォールバック用の基本目的を作成
			objectives[objectiveId] = {
				id: objectiveId,
				name: jobType + "の目的",
				description: "職業固有の目標を達成する",
				scorePoints: 100,
				checkCompletion: () => true
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
				console.warn(`Failed to create job task objective: ${objectiveId}`, error);
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
		description: "錬金術によって創られた人工生命体（カリオストロに会うまで本当の目標は隠される）",
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
		dailyTasks: [
			"暗視ポーションの作成",
			"パーゴラで植物を採集する",
		],
		skill: JOB_SKILLS.concealment,
		objective: JOB_OBJECTIVES.legendary_weapon,
		specialPrivileges: [
			"治療薬の調合技術",
			"毒物の知識",
			"薬草の専門知識",
		],
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
		dailyTasks: [
			"宿題の提出",
			"鍛冶屋のアルバイト",
		],
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
		dailyTasks: [
			"近衛兵の強さを評価する",
			"領主に挨拶する",
		],
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
		const randomJob = UNLIMITED_JOBS[Math.floor(Math.random() * UNLIMITED_JOBS.length)];
		jobs.push(randomJob);
	}

	return jobs;
}