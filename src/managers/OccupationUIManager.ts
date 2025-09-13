/**
 * 職業専用UI管理関数群（関数ベース版）
 */

import { type Player, world } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { JOBS } from "../constants/JobConfigs";
import { JobType } from "../types/JobTypes";
import {
	assignJobsToAllPlayers,
	debugJobAssignments,
	getPlayerJob,
	notifyAllPlayersJobs,
} from "./JobAssignmentManager";

/**
 * プレイヤーの職業詳細情報を表示
 */
export async function showJobDetails(player: Player): Promise<void> {
	try {
		const job = getPlayerJob(player);

		if (!job) {
			player.sendMessage("§c職業が設定されていません");
			return;
		}

		const jobConfig = JOBS[job as JobType];

		const form = new MessageFormData()
			.title(`§l§6あなたの職業: ${jobConfig.name}`)
			.body(
				`§e${jobConfig.name}\n\n` +
					`§6説明: §f${jobConfig.description}\n\n` +
					`§6日常タスク:\n` +
					jobConfig.dailyTasks.map((task: string) => `§f- ${task}`).join("\n") +
					"\n\n" +
					`§6スキル: §f${jobConfig.skill.name} - ${jobConfig.skill.description}\n` +
					`§6目的: §f${jobConfig.objective.name} - ${jobConfig.objective.description}`,
			)
			.button1("§a了解")
			.button2("§7閉じる");

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
			return;
		}

		const jobConfig = JOBS[job as JobType];
		const abilityDescription = getJobAbilityDescription(job as JobType);

		const form = new MessageFormData()
			.title("§l§a職業能力")
			.body(
				`§6${jobConfig.name}の能力:\n\n` +
					abilityDescription +
					"\n\n" +
					`§6日常タスク:\n` +
					jobConfig.dailyTasks.map((task: string) => `§f- ${task}`).join("\n"),
			)
			.button1("§a了解")
			.button2("§7閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show job abilities for ${player.name}:`, error);
		player.sendMessage("§c職業能力の表示に失敗しました");
	}
}


/**
 * 職業ヘルプメニューを表示
 */
export async function showJobHelpMenu(player: Player): Promise<void> {
	try {
		const form = new ActionFormData()
			.title("§l§6職業ヘルプ")
			.body("§7職業に関する情報を表示します")
			.button("§eあなたの職業詳細", "textures/ui/hammer")
			.button("§a職業能力説明", "textures/ui/strength_effect")
			.button("§d職業確認", "textures/ui/friend_glyph")
			.button("§7閉じる", "textures/ui/cancel");

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
 * 管理者向け職業管理メニュー
 */
export async function showAdminJobMenu(player: Player): Promise<void> {
	try {
		const form = new ActionFormData()
			.title("§l§c職業管理")
			.body("§7管理者向けの職業管理機能です")
			.button("§a職業再割り当て", "textures/ui/refresh")
			.button("§e職業構成確認", "textures/ui/book_edit_default")
			.button("§6デバッグ情報", "textures/ui/debug_glyph")
			.button("§7閉じる", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled) return;

		switch (response.selection) {
			case 0: // 職業再割り当て
				await confirmJobReassignment(player);
				break;
			case 1: // 職業構成確認
				await showDetailedJobComposition(player);
				break;
			case 2: // デバッグ情報
				debugJobAssignments();
				player.sendMessage("§a職業デバッグ情報をコンソールに出力しました");
				break;
		}
	} catch (error) {
		console.error(`Failed to show admin job menu for ${player.name}:`, error);
		player.sendMessage("§c職業管理メニューの表示に失敗しました");
	}
}

/**
 * 職業再割り当て確認
 */
async function confirmJobReassignment(player: Player): Promise<void> {
	try {
		const form = new MessageFormData()
			.title("§l§c職業再割り当て確認")
			.body(
				"§c職業を再割り当てしますか？\n\n" +
					"§7この操作により全プレイヤーの職業が\n" +
					"§7ランダムに再設定されます。",
			)
			.button1("§c実行")
			.button2("§aキャンセル");

		const response = await form.show(player);

		if (response.canceled || response.selection === 1) {
			player.sendMessage("§a職業再割り当てをキャンセルしました");
			return;
		}

		// 職業再割り当て実行
		const result = assignJobsToAllPlayers();
		if (result.success) {
			player.sendMessage("§a職業の再割り当てが完了しました");
			notifyAllPlayersJobs();
		} else {
			player.sendMessage(`§c職業再割り当てエラー: ${result.error}`);
		}
	} catch (error) {
		console.error(
			`Failed to confirm job reassignment for ${player.name}:`,
			error,
		);
		player.sendMessage("§c職業再割り当て確認の表示に失敗しました");
	}
}

/**
 * 詳細な職業構成を表示（管理者向け）
 */
async function showDetailedJobComposition(player: Player): Promise<void> {
	try {
		const players = world.getAllPlayers();
		const jobInfo = players.map((p) => {
			const job = getPlayerJob(p);
			const jobName = job ? JOBS[job].name : "未設定";
			return `§f${p.name}: §e${jobName})`;
		});

		const form = new MessageFormData()
			.title("§l§c詳細職業構成")
			.body(jobInfo.join("\n"))
			.button1("§a了解")
			.button2("§7閉じる");

		await form.show(player);
	} catch (error) {
		console.error(
			`Failed to show detailed job composition for ${player.name}:`,
			error,
		);
		player.sendMessage("§c詳細職業構成の表示に失敗しました");
	}
}

/**
 * 職業能力の説明を取得
 */
function getJobAbilityDescription(job: JobType): string {
	switch (job) {
		case JobType.LORD:
			return "§e【領主の権威】§f - 任意のプレイヤーを領主の間に召喚できます";
		case JobType.CAPTAIN:
			return "§a【護衛】§f - 他のプレイヤーを攻撃から守ることができます";
		case JobType.HOMUNCULUS:
			return "§d【人工生命】§f - 創造主への絶対忠誠と特殊な能力を持ちます";
		case JobType.COURT_ALCHEMIST:
			return "§6【物質変換】§f - 宮廷錬金術により物質を変換できます";
		case JobType.ROGUE_ALCHEMIST:
			return "§5【闇の錬金術】§f - 禁断の錬金術により特殊な効果を発揮します";
		case JobType.THIEF:
			return "§8【隠密】§f - 影に隠れて秘密裏に行動できます";
		case JobType.PHARMACIST:
			return "§2【治癒】§f - 薬草の知識で治療や毒物の識別ができます";
		case JobType.MAID:
			return "§f【監視】§f - 清掃中に他のプレイヤーの行動を監視できます";
		case JobType.BUTLER:
			return "§9【統率】§f - 使用人を統率し館の情報を管理します";
		case JobType.SOLDIER:
			return "§c【巡回】§f - 警備巡回で怪しい動きを発見できます";
		case JobType.STUDENT:
			return "§3【探究心】§f - 学習により隠された知識を発見できます";
		case JobType.ADVENTURER:
			return "§4【探索】§f - 冒険者の経験で秘密の場所を発見できます";
		default:
			return "§7不明な能力";
	}
}
