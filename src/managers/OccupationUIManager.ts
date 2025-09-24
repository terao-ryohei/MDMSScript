/**
 * 職業専用UI管理関数群（関数ベース版）
 */

import { type Player } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { JOB_DEFINITIONS as JOBS } from "../data/JobDefinitions";
import { JobType } from "../types/JobTypes";
import { getPlayerJob } from "./JobAssignmentManager";

/**
 * プレイヤーの職業詳細情報を表示
 */
export async function showJobDetails(player: Player): Promise<void> {
	try {
		const job = getPlayerJob(player);

		if (!job) {
			player.sendMessage("§c職業が設定されていません");
			player.sendMessage("ゲーム管理者に職業の割り当てを依頼してください");
			return;
		}

		const jobConfig = JOBS[job as JobType];

		if (!jobConfig) {
			player.sendMessage("§c職業の設定情報が見つかりません");
			console.error(`Job config not found for job: ${job}`);
			return;
		}

		const form = new MessageFormData()
			.title(`§6あなたの職業: ${jobConfig.name}`)
			.body(
				`§6${jobConfig.name}\n\n` +
					`§9説明: ${jobConfig.description}\n\n` +
					`§9日常タスク:\n` +
					jobConfig.dailyTasks.map((task: string) => `- ${task}`).join("\n") +
					"\n\n" +
					`§9スキル: §2${jobConfig.skill.name}§9 - ${jobConfig.skill.description}\n` +
					`§9目的: §6${jobConfig.objective.name}§9 - ${jobConfig.objective.description}`,
			)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show job details for ${player.name}:`, error);
		player.sendMessage("§c職業詳細の表示に失敗しました");
	}
}

/**
 * 職業能力説明を表示
 */
export async function showJobAbilities(player: Player): Promise<void> {
	try {
		const job = getPlayerJob(player);

		if (!job) {
			player.sendMessage("§c職業が設定されていません");
			player.sendMessage("ゲーム管理者に職業の割り当てを依頼してください");
			// プレイヤーに対処法を案内
			const form = new MessageFormData()
				.title("§c職業未設定")
				.body(
					"職業が設定されていません。\n管理者にゲームの初期化を依頼するか、\n管理者権限があるならば職業を割り当ててください。",
				)
				.button1("了解")
				.button2("閉じる");
			await form.show(player);
			return;
		}

		const jobConfig = JOBS[job as JobType];

		if (!jobConfig) {
			player.sendMessage("§c職業設定が見つかりません");
			console.error(`Job config not found for job: ${job}`);
			return;
		}

		const skillDescription = getJobSkillDescription(job as JobType);

		const form = new MessageFormData()
			.title("§6職業能力")
			.body(
				`§6${jobConfig.name}の能力:\n\n` +
					skillDescription +
					"\n\n" +
					`§9日常タスク:\n` +
					jobConfig.dailyTasks.map((task: string) => `- ${task}`).join("\n"),
			)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show job skills for ${player.name}:`, error);
		player.sendMessage("§c職業能力の表示に失敗しました");
	}
}

/**
 * 職業ヘルプメニューを表示
 */
export async function showJobHelpMenu(player: Player): Promise<void> {
	try {
		const form = new ActionFormData()
			.title("§6職業ヘルプ")
			.body("職業に関する情報を表示します")
			.button("あなたの職業詳細", "textures/ui/hammer")
			.button("職業能力説明", "textures/ui/strength_effect")
			.button("職業確認", "textures/ui/friend_glyph")
			.button("閉じる", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled) return;

		switch (response.selection) {
			case 0: // 職業詳細
				await showJobDetails(player);
				break;
			case 1: // 職業能力
				await showJobAbilities(player);
				break;
			case 2: // 職業詳細再表示
				await showJobDetails(player);
				break;
		}
	} catch (error) {
		console.error(`Failed to show job help menu for ${player.name}:`, error);
		player.sendMessage("§c職業ヘルプメニューの表示に失敗しました");
	}
}

/**
 * 職業能力の説明を取得
 */
function getJobSkillDescription(job: JobType): string {
	switch (job) {
		case JobType.LORD:
			return "§e【領主の権威】 - 任意のプレイヤーを領主の間に召喚できます";
		case JobType.CAPTAIN:
			return "§a【護衛】 - 他のプレイヤーを攻撃から守ることができます";
		case JobType.HOMUNCULUS:
			return "§d【人工生命】 - 創造主への絶対忠誠と特殊な能力を持ちます";
		case JobType.COURT_ALCHEMIST:
			return "§6【物質変換】 - 宮廷錬金術により物質を変換できます";
		case JobType.ROGUE_ALCHEMIST:
			return "§5【闇の錬金術】 - 禁断の錬金術により特殊な効果を発揮します";
		case JobType.THIEF:
			return "§8【隠密】 - 影に隠れて秘密裏に行動できます";
		case JobType.PHARMACIST:
			return "§2【治癒】 - 薬草の知識で治療や毒物の識別ができます";
		case JobType.MAID:
			return "§f【監視】 - 清掃中に他のプレイヤーの行動を監視できます";
		case JobType.BUTLER:
			return "§9【統率】 - 使用人を統率し館の情報を管理します";
		case JobType.SOLDIER:
			return "§c【巡回】 - 警備巡回で怪しい動きを発見できます";
		case JobType.STUDENT:
			return "§3【探究心】 - 学習により隠された知識を発見できます";
		case JobType.ADVENTURER:
			return "§4【探索】 - 冒険者の経験で秘密の場所を発見できます";
		default:
			return "不明な能力";
	}
}
