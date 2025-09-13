import { system, world } from "@minecraft/server";
import {
	getAdjustedPhaseConfig,
	PHASE_CONFIGS,
	WARNING_THRESHOLDS,
} from "../constants/PhaseConfigs";
import {
	GamePhase,
	type PhaseConfig,
	type PhaseTransitionResult,
	type TimerDisplay,
} from "../types/PhaseTypes";
import {
	getPhaseTimer,
	setAbilityUses,
	setCooldownTimer,
	setDailyLifeStartTime,
	setEvidenceCount,
	setGameDay,
	setGamePhase,
	setPhaseTimer,
	setPlayerAlive,
	setPlayerScore,
	setPlayerVotes,
} from "./ScoreboardManager";

/**
 * ゲームフェーズ管理システム
 * 7つのフェーズの進行、タイマー管理、フェーズ遷移を制御
 */

// モジュールスコープの状態変数
let currentTimer: number | undefined;
let displayTimer: number | undefined;
let currentPhaseConfig: PhaseConfig = PHASE_CONFIGS[GamePhase.PREPARATION];
let isInitialized: boolean = false;

/**
 * PhaseManagerを初期化
 */
export function initializePhaseManager(): void {
	if (isInitialized) return;

	currentPhaseConfig = PHASE_CONFIGS[GamePhase.PREPARATION];
	isInitialized = true;
	console.log("PhaseManager initialized");
}

/**
 * 指定フェーズを開始
 */
export async function startPhase(
	phase: GamePhase,
): Promise<PhaseTransitionResult> {
	try {
		const playerCount = world.getAllPlayers().length;
		const phaseConfig = getAdjustedPhaseConfig(phase, playerCount);
		if (!phaseConfig) {
			return {
				success: false,
				previousPhase: currentPhaseConfig.phase,
				currentPhase: currentPhaseConfig.phase,
				error: `無効なフェーズ: ${phase}`,
			};
		}

		const previousPhase = currentPhaseConfig.phase;

		// 現在のタイマーを停止
		stopCurrentTimer();

		// フェーズ設定更新
		currentPhaseConfig = phaseConfig;

		// Scoreboardに状態保存
		setGamePhase(phaseConfig.id);
		setPhaseTimer(phaseConfig.duration);

		// 特別なフェーズ処理
		await handlePhaseSpecialActions(phase);

		// タイマー開始
		startPhaseTimer(phaseConfig);

		// プレイヤーに通知
		notifyPhaseStart(phaseConfig);

		console.log(`Phase started: ${phase} (${phaseConfig.duration}s)`);

		return {
			success: true,
			previousPhase,
			currentPhase: phase,
		};
	} catch (error) {
		console.error("Failed to start phase:", error);
		return {
			success: false,
			previousPhase: currentPhaseConfig.phase,
			currentPhase: currentPhaseConfig.phase,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * 現在のフェーズを取得
 */
export function getCurrentPhase(): GamePhase {
	return currentPhaseConfig.phase;
}

/**
 * 現在のフェーズ設定を取得
 */
export function getCurrentPhaseConfig(): PhaseConfig {
	return currentPhaseConfig;
}

/**
 * 次のフェーズに自動遷移
 */
export async function advanceToNextPhase(): Promise<PhaseTransitionResult> {
	const nextPhase = currentPhaseConfig.nextPhase;

	if (!nextPhase) {
		// ゲーム終了
		await endGame();
		return {
			success: true,
			previousPhase: currentPhaseConfig.phase,
			currentPhase: GamePhase.ENDING,
		};
	}

	return await startPhase(nextPhase);
}

/**
 * アクションが現在のフェーズで許可されているかチェック
 */
export function isActionAllowed(action: string): boolean {
	return currentPhaseConfig.allowedActions.includes(action);
}

/**
 * フェーズタイマーを開始
 */
function startPhaseTimer(config: PhaseConfig): void {
	// メインタイマー（フェーズ時間経過）
	currentTimer = system.runTimeout(() => {
		onPhaseTimeUp();
	}, config.duration * 20); // 秒 → tick変換

	// 表示更新タイマー（1秒間隔）
	displayTimer = system.runInterval(() => {
		updateTimerDisplay();
	}, 20);

	console.log(`Phase timer started: ${config.duration}s`);
}

/**
 * 現在のタイマーを停止
 */
function stopCurrentTimer(): void {
	if (currentTimer !== undefined) {
		system.clearRun(currentTimer);
		currentTimer = undefined;
	}

	if (displayTimer !== undefined) {
		system.clearRun(displayTimer);
		displayTimer = undefined;
	}
}

/**
 * タイマー表示を更新
 */
function updateTimerDisplay(): void {
	const remainingTime = getPhaseTimer();

	if (remainingTime <= 0) {
		return;
	}

	// 残り時間を1秒減算
	setPhaseTimer(remainingTime - 1);

	const display = createTimerDisplay(remainingTime - 1);
	showTimerToPlayers(display);
}

/**
 * タイマー表示情報を作成
 */
function createTimerDisplay(remainingSeconds: number): TimerDisplay {
	const minutes = Math.floor(remainingSeconds / 60);
	const seconds = remainingSeconds % 60;
	const totalDuration = currentPhaseConfig.duration;
	const elapsed = totalDuration - remainingSeconds;
	const progress = (elapsed / totalDuration) * 100;

	const isWarning = remainingSeconds <= WARNING_THRESHOLDS.WARNING_TIME;

	return {
		remainingTime: { minutes, seconds },
		progress,
		isWarning,
	};
}

/**
 * プレイヤーにタイマーを表示
 */
function showTimerToPlayers(display: TimerDisplay): void {
	const { minutes, seconds } = display.remainingTime;
	const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

	// 警告レベルに応じて色を変更
	let color = "§a"; // 緑（通常）
	if (
		display.remainingTime.minutes === 0 &&
		display.remainingTime.seconds <= WARNING_THRESHOLDS.CRITICAL_TIME
	) {
		color = "§c"; // 赤（緊急）
	} else if (display.isWarning) {
		color = "§e"; // 黄（警告）
	}

	const displayText = `§7[${currentPhaseConfig.name}] ${color}残り時間: ${timeString}`;

	// 全プレイヤーのActionBarに表示
	for (const player of world.getAllPlayers()) {
		player.onScreenDisplay.setActionBar(displayText);
	}
}

/**
 * フェーズ時間終了時の処理
 */
async function onPhaseTimeUp(): Promise<void> {
	console.log(`Phase time up: ${currentPhaseConfig.phase}`);

	// フェーズ終了通知
	world.sendMessage(`§e${currentPhaseConfig.name}が終了しました`);

	// 次のフェーズに遷移
	await advanceToNextPhase();
}

/**
 * フェーズ固有の処理
 */
async function handlePhaseSpecialActions(phase: GamePhase): Promise<void> {
	switch (phase) {
		case GamePhase.PREPARATION:
			// 準備フェーズ：プレイヤー初期化
			await initializePlayers();
			break;

		case GamePhase.DAILY_LIFE:
			// 生活フェーズ：開始時刻記録とNPCスポーン
			setDailyLifeStartTime(system.currentTick);
			setGameDay(1);
			await spawnTargetNPC();
			break;

		case GamePhase.INVESTIGATION:
			// 調査フェーズ：証拠抽出開始
			await startEvidenceCollection();
			break;

		case GamePhase.VOTING:
			// 投票フェーズ：投票システム開始
			await startVotingSystem();
			break;

		case GamePhase.ENDING:
			// 終了フェーズ：結果計算
			await calculateFinalResults();
			break;
	}
}

/**
 * フェーズ開始をプレイヤーに通知
 */
function notifyPhaseStart(config: PhaseConfig): void {
	world.sendMessage("§l§6============================");
	world.sendMessage(`§l§e${config.name}が開始されました！`);
	world.sendMessage(`§7${config.description}`);

	const minutes = Math.floor(config.duration / 60);
	const seconds = config.duration % 60;
	let timeText = "";
	if (minutes > 0) {
		timeText = `${minutes}分`;
		if (seconds > 0) {
			timeText += `${seconds}秒`;
		}
	} else {
		timeText = `${seconds}秒`;
	}
	world.sendMessage(`§e制限時間: ${timeText}`);
	world.sendMessage("§l§6============================");
}

/**
 * プレイヤー初期化（準備フェーズ）
 */
async function initializePlayers(): Promise<void> {
	for (const player of world.getAllPlayers()) {
		// プレイヤー状態をリセット
		setPlayerAlive(player, true);
		setPlayerVotes(player, 0);
		setEvidenceCount(player, 0);
		setAbilityUses(player, 0);
		setCooldownTimer(player, 0);
		setPlayerScore(player, 0);
	}
	console.log("Players initialized for new game");
}

/**
 * ターゲットNPCスポーン（生活フェーズ）
 */
async function spawnTargetNPC(): Promise<void> {
	try {
		const NPCManager = await import("./NPCManager");

		const success = await NPCManager.spawnTargetNPC();
		if (success) {
			console.log("Target NPC spawned successfully");
		} else {
			console.error("Failed to spawn target NPC");
		}
	} catch (error) {
		console.error("Failed to spawn NPC:", error);
	}
}

/**
 * 証拠収集開始（調査フェーズ）
 */
async function startEvidenceCollection(): Promise<void> {
	// 証拠抽出処理は後で実装
	console.log("Evidence collection started");
}

/**
 * 投票システム開始（投票フェーズ）
 */
async function startVotingSystem(): Promise<void> {
	try {
		// VotingManagerをインポート
		const VotingManager = await import("./VotingManager");

		// 自動で全プレイヤー対象の犯人投票を開始
		const result = VotingManager.startAutomaticMurderVoting();

		if (result.success) {
			console.log("Automatic murder voting started successfully");
		} else {
			console.error("Failed to start automatic voting:", result.error);
		}
	} catch (error) {
		console.error("Failed to start voting system:", error);
	}
}

/**
 * 最終結果計算（終了フェーズ）
 */
async function calculateFinalResults(): Promise<void> {
	// 結果計算は後で実装
	console.log("Final results calculated");
}

/**
 * ゲーム終了処理
 */
async function endGame(): Promise<void> {
	stopCurrentTimer();

	// 全プレイヤーに終了通知
	world.sendMessage("§l§6============================");
	world.sendMessage("§l§aマーダーミステリーゲーム終了！");
	world.sendMessage("§eお疲れ様でした！");
	world.sendMessage("§l§6============================");

	console.log("Game ended");
}

/**
 * 緊急フェーズ変更（管理者用）
 */
export async function forcePhaseChange(
	phase: GamePhase,
): Promise<PhaseTransitionResult> {
	console.log(`Force phase change to: ${phase}`);
	return await startPhase(phase);
}

/**
 * 残り時間を取得
 */
export function getRemainingTime(): number {
	return getPhaseTimer();
}

/**
 * 残り時間を設定（管理者用）
 */
export function setRemainingTime(seconds: number): void {
	setPhaseTimer(seconds);
	console.log(`Phase timer set to: ${seconds}s`);
}

/**
 * リソースの解放
 */
export function dispose(): void {
	stopCurrentTimer();
	console.log("PhaseManager disposed");
	isInitialized = false;
}
