import { type Player, world } from "@minecraft/server";
import {
	generateBalancedJobDistribution,
	JOB_DEFINITIONS as JOBS,
} from "../data/JobDefinitions";
import { type JobAssignmentResult, JobType } from "../types/JobTypes";
import {
	getJobString,
	getPlayerJob as getPlayerJobId,
	setPlayerJob,
} from "./ScoreboardManager";

/**
 * プレイヤージョブ割り当てマネージャー
 * 中世ファンタジー職業の割り当てを管理
 */

/**
 * 全プレイヤーにジョブを割り当て
 */
export function assignJobsToAllPlayers(): JobAssignmentResult {
	try {
		const players = world.getAllPlayers();
		const playerCount = players.length; // プレイヤー数チェック（テスト用に1人から可能に変更）
		// バランスの取れたジョブ配布を生成
		const jobDistribution = generateBalancedJobDistribution(playerCount);
		if (jobDistribution.length !== playerCount) {
			return {
				success: false,
				assignments: new Map(),
				error: "ジョブ配布の生成に失敗しました",
			};
		} // ジョブをシャッフル
		shuffleArray(jobDistribution); // プレイヤーにジョブを割り当て
		const assignments = new Map<string, JobType>();
		for (let i = 0; i < players.length; i++) {
			const player = players[i];
			const job = jobDistribution[i]; // Scoreboardに設定
			setPlayerJob(player, convertJobToId(job));
		} // 成功結果を返す
		return {
			success: true,
			assignments,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "不明なエラー";
		console.error("Job assignment failed:", error);
		return {
			success: false,
			assignments: new Map(),
			error: errorMessage,
		};
	}
}

/**
 * 特定プレイヤーのジョブを取得
 */
export function getPlayerJob(player: Player): JobType | null {
	try {
		const jobId = getPlayerJobId(player);
		if (jobId === null || jobId === undefined) {
			return null;
		}
		return jobId;
	} catch (error) {
		console.error(`Failed to get job for player ${player.name}:`, error);
		return null;
	}
}

/**
 * プレイヤーにジョブ情報を通知
 */
export function notifyPlayerJob(player: Player): boolean {
	try {
		const job = getPlayerJob(player);
		if (!job) {
			player.sendMessage("§cジョブが設定されていません");
			return false;
		}
		const jobConfig = JOBS[job];
		const jobString = getJobString(convertJobToId(job));
		player.sendMessage("§2=== あなたのジョブ ===");
		player.sendMessage(`§6${jobString}`);
		player.sendMessage(`§7${jobConfig.description}`);
		// 日常タスクを表示
		if (jobConfig.dailyTasks.length > 0) {
			player.sendMessage("§6日常タスク:");
			for (const task of jobConfig.dailyTasks) {
				player.sendMessage(`§j- ${task}`);
			}
		}
		return true;
	} catch (error) {
		console.error(`Failed to notify job to player ${player.name}:`, error);
		player.sendMessage("§cジョブ通知エラーが発生しました");
		return false;
	}
}

/**
 * 全プレイヤーにジョブ情報を通知
 */
export function notifyAllPlayersJobs(): void {
	try {
		const players = world.getAllPlayers();
		for (const player of players) {
			notifyPlayerJob(player);
		}
	} catch (error) {
		console.error("Failed to notify all players jobs:", error);
	}
}

/**
 * ジョブタイプをIDに変換
 */
function convertJobToId(job: JobType): number {
	switch (job) {
		case JobType.LORD:
			return 0;
		case JobType.CAPTAIN:
			return 1;
		case JobType.HOMUNCULUS:
			return 2;
		case JobType.COURT_ALCHEMIST:
			return 3;
		case JobType.ROGUE_ALCHEMIST:
			return 4;
		case JobType.THIEF:
			return 5;
		case JobType.PHARMACIST:
			return 6;
		case JobType.MAID:
			return 7;
		case JobType.BUTLER:
			return 8;
		case JobType.SOLDIER:
			return 9;
		case JobType.STUDENT:
			return 10;
		case JobType.ADVENTURER:
			return 11;
		default:
			return 0; // デフォルトは領主
	}
}

/**
 * 配列をシャッフル（Fisher-Yates shuffle）
 */
function shuffleArray<T>(array: T[]): void {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}
