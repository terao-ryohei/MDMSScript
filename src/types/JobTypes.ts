import { type Skill } from "./SkillTypes";

/**
 * ジョブタイプ（職業）
 */
export enum JobType {
	// 人数制限ありの職業（各1人）
	LORD = "lord", // 領主
	CAPTAIN = "captain", // 近衛隊長
	HOMUNCULUS = "homunculus", // ホムンクルス
	COURT_ALCHEMIST = "court_alchemist", // 宮廷錬金術師
	ROGUE_ALCHEMIST = "rogue_alchemist", // 野良錬金術師
	THIEF = "thief", // 盗賊
	PHARMACIST = "pharmacist", // 薬師
	
	// 人数制限なしの職業
	MAID = "maid", // メイド
	BUTLER = "butler", // 執事
	SOLDIER = "soldier", // 一般兵士
	STUDENT = "student", // 学生
	ADVENTURER = "adventurer", // 冒険者
}


/**
 * ジョブ目的定義
 */
export interface JobObjective {
	id: string;
	name: string;
	description: string;
	scorePoints: number; // 達成時の得点
	checkCompletion: (playerId: string, gameState?: any) => boolean;
}

/**
 * ジョブ定義
 */
export interface Job {
	type: JobType;
	name: string;
	description: string;
	dailyTasks: string[]; // 日常タスクリスト
	skill: Skill; // ジョブ固有スキル
	objective: JobObjective; // ジョブ固有目的
	specialPrivileges?: string[]; // 特別権限リスト
	maxCount: number; // 最大人数（1: 制限あり、-1: 制限なし）
}

/**
 * ジョブ割り当て結果
 */
export interface JobAssignmentResult {
	success: boolean;
	assignments: Map<string, JobType>; // playerId -> job
	error?: string;
}
