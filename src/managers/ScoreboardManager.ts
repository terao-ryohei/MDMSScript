import { type Player, world } from "@minecraft/server";
import { JobType } from "src/types/JobTypes";
import { RoleType } from "src/types/RoleTypes";

/**
 * Scoreboardベースのデータ管理システム
 * ゲーム状態とプレイヤー情報をMinecraftのscoreboard機能で永続管理
 */

// ゲーム状態管理用オブジェクト
const GAME_OBJECTIVES = {
	// ゲーム進行状態
	GAME_PHASE: "mdms_phase", // 0=準備, 1=生活, 2=調査, 3=会議, 4=再調査, 5=推理, 6=投票
	GAME_DAY: "mdms_day", // 1-3 (生活フェーズの日数)
	GAME_TIME: "mdms_time", // 0=朝, 1=昼, 2=夕, 3=夜
	PHASE_TIMER: "mdms_timer", // 残り時間（秒）
	MURDER_OCCURRED: "mdms_murder", // 0=未発生, 1=発生済み
	DAILY_LIFE_START: "mdms_dl_start", // 生活フェーズ開始時刻
	CRIME_TIME: "mdms_crime_time", // 事件発生時刻

	// プレイヤー基本状態
	PLAYER_ROLE: "mdms_role", // 0=市民, 1=犯人, 2=共犯者
	PLAYER_JOB: "mdms_job", // 0-9の職業ID
	PLAYER_ALIVE: "mdms_alive", // 0=死亡, 1=生存
	PLAYER_VOTES: "mdms_votes", // 受けた投票数

	// 証拠・能力関連
	EVIDENCE_COUNT: "mdms_evidence", // 収集証拠数
	SKILL_USES: "mdms_skill_uses", // スキル使用回数
	COOLDOWN_TIMER: "mdms_cooldown", // クールダウン残り時間

	// スコアリング
	PLAYER_SCORE: "mdms_score", // 総得点
	BASE_SCORE: "mdms_base", // 基礎点
	OBJECTIVE_SCORE: "mdms_obj", // 目的達成点
} as const;

// ロール・ジョブ・能力のマッピング
const ROLE_IDS = {
	VILLAGER: 0,
	MURDERER: 1,
	ACCOMPLICE: 2,
} as const;

const JOB_IDS = {
	KING: 0,
	CAPTAIN: 1,
	WIZARD: 2,
	MERCHANT: 3,
	GUILD_RECEPTIONIST: 4,
	BLACKSMITH: 5,
	TAVERN_OWNER: 6,
	GARDENER: 7,
	MAID: 8,
	ALCHEMIST: 9,
} as const;

const PHASE_IDS = {
	PREPARATION: 0,
	DAILY_LIFE: 1,
	INVESTIGATION: 2,
	DISCUSSION: 3,
	REINVESTIGATION: 4,
	DEDUCTION: 5,
	VOTING: 6,
	ENDING: 7,
} as const;

/**
 * 全Scoreboardオブジェクトを初期化
 */
export function initializeObjectives(): void {
	console.log("Initializing MDMS scoreboard objectives...");

	for (const [name, objectiveName] of Object.entries(GAME_OBJECTIVES)) {
		try {
			// 既存のオブジェクトを削除
			const existing = world.scoreboard.getObjective(objectiveName);
			if (existing) {
				world.scoreboard.removeObjective(objectiveName);
			}

			// 新しいオブジェクトを作成
			world.scoreboard.addObjective(objectiveName, objectiveName);
			console.log(`Created objective: ${objectiveName}`);
		} catch (error) {
			console.error(`Failed to create objective ${objectiveName}:`, error);
		}
	}

	// 初期値設定
	setDefaultValues();
	console.log("Scoreboard objectives initialized successfully");
}

/**
 * デフォルト値を設定
 */
function setDefaultValues(): void {
	// ゲーム状態の初期化
	setGamePhase(PHASE_IDS.PREPARATION);
	setGameDay(1);
	setGameTime(0); // 朝
	setMurderOccurred(false);

	// 全プレイヤーの初期状態設定
	for (const player of world.getAllPlayers()) {
		setPlayerRole(player, ROLE_IDS.VILLAGER);
		setPlayerJob(player, 0);
		setPlayerAlive(player, true);
		setPlayerVotes(player, 0);
		setEvidenceCount(player, 0);
		setAbilityUses(player, 0);
		setCooldownTimer(player, 0);
		setPlayerScore(player, 0);
		setBaseScore(player, 0);
		setObjectiveScore(player, 0);
	}
}

// === ゲーム状態管理メソッド ===

export function setGamePhase(phase: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.GAME_PHASE)
		?.setScore("global", phase);
}

export function getGamePhase(): number {
	return (
		world.scoreboard
			.getObjective(GAME_OBJECTIVES.GAME_PHASE)
			?.getScore("global") ?? 0
	);
}

export function setGameDay(day: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.GAME_DAY)
		?.setScore("global", day);
}

export function getGameDay(): number {
	return (
		world.scoreboard
			.getObjective(GAME_OBJECTIVES.GAME_DAY)
			?.getScore("global") ?? 1
	);
}

export function setGameTime(time: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.GAME_TIME)
		?.setScore("global", time);
}

export function getGameTime(): number {
	return (
		world.scoreboard
			.getObjective(GAME_OBJECTIVES.GAME_TIME)
			?.getScore("global") ?? 0
	);
}

export function setPhaseTimer(seconds: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.PHASE_TIMER)
		?.setScore("global", seconds);
}

export function getPhaseTimer(): number {
	return (
		world.scoreboard
			.getObjective(GAME_OBJECTIVES.PHASE_TIMER)
			?.getScore("global") ?? 0
	);
}

export function setMurderOccurred(occurred: boolean): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.MURDER_OCCURRED)
		?.setScore("global", occurred ? 1 : 0);
}

export function getMurderOccurred(): boolean {
	return (
		(world.scoreboard
			.getObjective(GAME_OBJECTIVES.MURDER_OCCURRED)
			?.getScore("global") ?? 0) === 1
	);
}

export function setDailyLifeStartTime(timestamp: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.DAILY_LIFE_START)
		?.setScore("global", timestamp);
}

export function getDailyLifeStartTime(): number {
	return (
		world.scoreboard
			.getObjective(GAME_OBJECTIVES.DAILY_LIFE_START)
			?.getScore("global") ?? 0
	);
}

export function getCrimeTime(): number {
	return (
		world.scoreboard
			.getObjective(GAME_OBJECTIVES.CRIME_TIME)
			?.getScore("global") ?? 0
	);
}

// === プレイヤー状態管理メソッド ===

export function setPlayerRole(player: Player, roleId: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.PLAYER_ROLE)
		?.setScore(player, roleId);
}

// RoleTypeをnumberに変換
export function roleTypeToNumber(role: RoleType): number {
	switch (role) {
		case RoleType.VILLAGER:
			return 0;
		case RoleType.MURDERER:
			return 1;
		case RoleType.ACCOMPLICE:
			return 2;
		default:
			return 0;
	}
}

// numberをRoleTypeに変換
export function numberToRoleType(roleId: number): RoleType {
	switch (roleId) {
		case 0:
			return RoleType.VILLAGER;
		case 1:
			return RoleType.MURDERER;
		case 2:
			return RoleType.ACCOMPLICE;
		default:
			return RoleType.VILLAGER;
	}
}

export function getPlayerRole(player: Player): RoleType {
	const scoreValue = world.scoreboard
		.getObjective(GAME_OBJECTIVES.PLAYER_ROLE)
		?.getScore(player);

	if (scoreValue === undefined || scoreValue === null) {
		return RoleType.VILLAGER;
	}

	// number to RoleType conversion
	switch (scoreValue) {
		case 0:
			return RoleType.VILLAGER;
		case 1:
			return RoleType.MURDERER;
		case 2:
			return RoleType.ACCOMPLICE;
		default:
			return RoleType.VILLAGER;
	}
}

export function setPlayerJob(player: Player, jobId: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.PLAYER_JOB)
		?.setScore(player, jobId);
}

export function getPlayerJob(player: Player): JobType {
	const scoreValue =
		world.scoreboard
			.getObjective(GAME_OBJECTIVES.PLAYER_JOB)
			?.getScore(player) ?? 0;

	if (scoreValue === undefined || scoreValue === null) {
		return JobType.ADVENTURER;
	}

	// number to JobqType conversion
	switch (scoreValue) {
		case 0:
			return JobType.LORD;
		case 1:
			return JobType.CAPTAIN;
		case 2:
			return JobType.HOMUNCULUS;
		case 3:
			return JobType.ADVENTURER;
		case 4:
			return JobType.COURT_ALCHEMIST;
		case 5:
			return JobType.ROGUE_ALCHEMIST;
		case 6:
			return JobType.THIEF;
		case 7:
			return JobType.PHARMACIST;
		case 8:
			return JobType.MAID;
		case 9:
			return JobType.BUTLER;
		case 10:
			return JobType.SOLDIER;
		case 11:
			return JobType.STUDENT;
		case 12:
			return JobType.ADVENTURER;
		default:
			return JobType.ADVENTURER;
	}
}

export function setPlayerAlive(player: Player, alive: boolean): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.PLAYER_ALIVE)
		?.setScore(player, alive ? 1 : 0);
}

export function setPlayerVotes(player: Player, votes: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.PLAYER_VOTES)
		?.setScore(player, votes);
}

export function getPlayerVotes(player: Player): number {
	return (
		world.scoreboard
			.getObjective(GAME_OBJECTIVES.PLAYER_VOTES)
			?.getScore(player) ?? 0
	);
}

export function setEvidenceCount(player: Player, count: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.EVIDENCE_COUNT)
		?.setScore(player, count);
}

export function getEvidenceCount(player: Player): number {
	return (
		world.scoreboard
			.getObjective(GAME_OBJECTIVES.EVIDENCE_COUNT)
			?.getScore(player) ?? 0
	);
}

export function setAbilityUses(player: Player, uses: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.SKILL_USES)
		?.setScore(player, uses);
}

export function setCooldownTimer(player: Player, seconds: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.COOLDOWN_TIMER)
		?.setScore(player, seconds);
}

export function setPlayerScore(player: Player, score: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.PLAYER_SCORE)
		?.setScore(player, score);
}

export function getPlayerScore(player: Player): number {
	return (
		world.scoreboard
			.getObjective(GAME_OBJECTIVES.PLAYER_SCORE)
			?.getScore(player) ?? 0
	);
}

export function setBaseScore(player: Player, score: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.BASE_SCORE)
		?.setScore(player, score);
}

export function setObjectiveScore(player: Player, score: number): void {
	world.scoreboard
		.getObjective(GAME_OBJECTIVES.OBJECTIVE_SCORE)
		?.setScore(player, score);
}

// === ユーティリティメソッド ===

/**
 * ロールIDから文字列に変換
 */
export function getRoleString(roleId: number): string {
	const entries = Object.entries(ROLE_IDS);
	return (
		entries.find(([_, id]) => id === roleId)?.[0].toLowerCase() ?? "citizen"
	);
}

/**
 * ジョブIDから文字列に変換
 */
export function getJobString(jobId: number): string {
	const entries = Object.entries(JOB_IDS);
	return entries.find(([_, id]) => id === jobId)?.[0].toLowerCase() ?? "king";
}

/**
 * フェーズIDから文字列に変換
 */
export function getPhaseString(phaseId: number): string {
	const entries = Object.entries(PHASE_IDS);
	return (
		entries.find(([_, id]) => id === phaseId)?.[0].toLowerCase() ??
		"preparation"
	);
}
