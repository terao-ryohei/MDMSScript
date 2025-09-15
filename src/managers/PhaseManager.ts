import { ItemStack, system, type Vector3, world } from "@minecraft/server";
import {
	getAdjustedPhaseConfig,
	PHASE_CONFIGS,
	WARNING_THRESHOLDS,
} from "../constants/PhaseConfigs";
import type { ActionRecord } from "../types/ActionTypes";
import {
	GamePhase,
	type PhaseConfig,
	type PhaseTransitionResult,
	type TimerDisplay,
} from "../types/PhaseTypes";
import {
	getCrimeTime,
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
import { startAutomaticMurderVoting } from "./VotingManager";

/**
 * ゲームフェーズ管理システム
 * 7つのフェーズの進行、タイマー管理、フェーズ遷移を制御
 */

// モジュールスコープの状態変数
let currentTimer: number | undefined;
let displayTimer: number | undefined;
let currentPhaseConfig: PhaseConfig = PHASE_CONFIGS[GamePhase.PREPARATION];
let isInitialized: boolean = false;
// 証拠配置情報の型定義
interface EvidencePlacement {
	evidenceId: string;
	location: Vector3;
	itemType: string;
	discoveredBy: string[]; // プレイヤーIDのリスト
}

// 証拠配置のグローバル管理
let evidencePlacements: EvidencePlacement[] = [];

/**
 * 証拠配置情報を設定
 */
function setEvidencePlacements(placements: EvidencePlacement[]): void {
	evidencePlacements = placements;
}

/**
 * 証拠配置情報を取得
 */
export function getEvidencePlacements(): EvidencePlacement[] {
	return evidencePlacements;
}

// 依存Managerの取得関数
function getActionTrackingManager() {
	return require("./ActionTrackingManager");
}

function getAreaName(location: Vector3): string {
	// ActionTrackingManager のgetAreaName関数を使用
	const actionTracker = getActionTrackingManager();
	if (actionTracker.getAreaName) {
		return actionTracker.getAreaName(location);
	}

	// フォールバック実装
	const x = Math.floor(location.x);
	const z = Math.floor(location.z);

	if (x >= -50 && x <= 50 && z >= -50 && z <= 50) return "城の中庭";
	if (x >= 60 && x <= 100 && z >= -20 && z <= 20) return "図書館";
	if (x >= -100 && x <= -60 && z >= -20 && z <= 20) return "武器庫";
	if (x >= -20 && x <= 20 && z >= 60 && z <= 100) return "寝室エリア";
	if (x >= -20 && x <= 20 && z >= -100 && z <= -60) return "厨房";

	return "unknown";
}

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
	let color = "§2"; // 緑（通常）
	if (
		display.remainingTime.minutes === 0 &&
		display.remainingTime.seconds <= WARNING_THRESHOLDS.CRITICAL_TIME
	) {
		color = "§c"; // 赤（緊急）
	} else if (display.isWarning) {
		color = "§6"; // 黄（警告）
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
	world.sendMessage(`§6${currentPhaseConfig.name}が終了しました`);

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

		case GamePhase.INVESTIGATION: {
			// 調査フェーズ：証拠抽出開始
			await startEvidenceCollection();
			// 証拠発見システムを初期化
			const evidenceDiscovery = require("./EvidenceDiscoveryManager");
			evidenceDiscovery.initialize();
			break;
		}

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
	world.sendMessage(`§l§6${config.name}が開始されました！`);
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
	world.sendMessage(`§6制限時間: ${timeText}`);
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
		const success = await spawnTargetNPC();
	} catch (error) {
		console.error("Failed to spawn NPC:", error);
	}
}

/**
 * 証拠収集開始（調査フェーズ）
 */
async function startEvidenceCollection(): Promise<void> {
	try {
		console.log("Starting evidence collection and distribution...");

		// 生活フェーズから証拠を抽出
		const evidenceResult =
			getActionTrackingManager().extractEvidenceFromDailyLife();

		if (!evidenceResult.success || evidenceResult.evidence.length === 0) {
			console.warn("No evidence found from daily life phase");
			return;
		}

		console.log(`Found ${evidenceResult.evidence.length} evidence records`);

		// 各プレイヤーに個別の証拠を配布
		const players = world.getAllPlayers();
		const distributedEvidence = new Map<string, ActionRecord[]>();

		for (const player of players) {
			const playerEvidence = selectEvidenceForPlayer(
				player.id,
				evidenceResult.evidence,
			);
			distributedEvidence.set(player.id, playerEvidence);

			// プレイヤーに証拠配布を通知
			player.sendMessage("§l§6証拠が配布されました！");
			player.sendMessage(`§6受け取った証拠数: §j${playerEvidence.length}個`);
			player.sendMessage("§7調査フェーズでマップ上の証拠を探してください");
		}

		// マップ上に証拠を配置
		await placeEvidenceOnMap(distributedEvidence);

		console.log("Evidence collection and distribution completed");
	} catch (error) {
		console.error("Failed to start evidence collection:", error);
	}
}

/**
 * プレイヤー用の証拠を選定（事件時刻中心にランダム選択）
 */
function selectEvidenceForPlayer(
	playerId: string,
	allEvidence: ActionRecord[],
): ActionRecord[] {
	// 事件発生時刻を取得
	const crimeTime = getCrimeTime();
	const timeWindow = 600; // 事件前後10分

	// 時間範囲内の証拠を抽出
	const relevantEvidence = allEvidence.filter((record) => {
		const timeDiff = Math.abs(record.timestamp - crimeTime);
		return timeDiff <= timeWindow;
	});

	// プレイヤー自身の行動を含める（高確率）
	const playerActions = relevantEvidence.filter(
		(record) => record.playerId === playerId,
	);
	const otherActions = relevantEvidence.filter(
		(record) => record.playerId !== playerId,
	);

	// 選択する証拠数（3-7個をランダム）
	const evidenceCount = Math.floor(Math.random() * 5) + 3;
	const selectedEvidence: ActionRecord[] = [];

	// 自分の行動を50%の確率で含める
	playerActions.forEach((action) => {
		if (Math.random() < 0.5 && selectedEvidence.length < evidenceCount) {
			selectedEvidence.push(action);
		}
	});

	// 残りを他プレイヤーの行動から選択
	const shuffledOthers = [...otherActions].sort(() => Math.random() - 0.5);
	for (
		let i = 0;
		i < shuffledOthers.length && selectedEvidence.length < evidenceCount;
		i++
	) {
		selectedEvidence.push(shuffledOthers[i]);
	}

	console.log(
		`Selected ${selectedEvidence.length} evidence pieces for player ${playerId}`,
	);
	return selectedEvidence;
}

/**
 * マップ上に証拠を配置
 */
async function placeEvidenceOnMap(
	distributedEvidence: Map<string, ActionRecord[]>,
): Promise<void> {
	try {
		const overworld = world.getDimension("overworld");
		const evidencePlacements: EvidencePlacement[] = [];

		// 全ての配布された証拠を収集
		const allDistributedEvidence: ActionRecord[] = [];
		for (const playerEvidence of distributedEvidence.values()) {
			allDistributedEvidence.push(...playerEvidence);
		}

		// 重複を除去
		const uniqueEvidence = Array.from(
			new Set(allDistributedEvidence.map((e) => e.id)),
		)
			.map((id) => allDistributedEvidence.find((e) => e.id === id)!)
			.filter(Boolean);

		// 証拠配置位置を生成
		const placementLocations = generateEvidencePlacementLocations(
			uniqueEvidence.length,
		);

		for (let i = 0; i < uniqueEvidence.length; i++) {
			const evidence = uniqueEvidence[i];
			const location = placementLocations[i];

			if (!location) continue;

			// 証拠アイテムとして紙を配置
			const itemStack = new ItemStack("minecraft:paper", 1);
			itemStack.nameTag = `§6証拠: ${evidence.actionType}`;
			itemStack.setLore([
				`§7時刻: ${formatGameTime(evidence.timestamp)}`,
				`§7場所: ${formatLocation(evidence.location)}`,
				`§7関与者: ${getPlayerName(evidence.playerId)}`,
				`§7詳細: ${formatEvidenceDetails(evidence)}`,
			]);

			// アイテムエンティティとして配置
			overworld.spawnItem(itemStack, location);

			// 配置情報を記録
			const placement: EvidencePlacement = {
				evidenceId: evidence.id,
				location: location,
				itemType: "minecraft:paper",
				discoveredBy: [],
			};
			evidencePlacements.push(placement);

			console.log(
				`Placed evidence ${evidence.id} at ${location.x}, ${location.y}, ${location.z}`,
			);
		}

		// 配置情報をグローバルに保存
		setEvidencePlacements(evidencePlacements);

		// プレイヤーに配置完了を通知
		world.sendMessage(
			"§2証拠がマップ上に配置されました！調査を開始してください。",
		);
	} catch (error) {
		console.error("Failed to place evidence on map:", error);
	}
}

/**
 * 証拠配置位置を生成
 */
function generateEvidencePlacementLocations(count: number): Vector3[] {
	const locations: Vector3[] = [];

	// 予め定義された証拠配置可能位置
	const possibleLocations = [
		{ x: 10, y: 64, z: 15 }, // 城の中庭
		{ x: -25, y: 65, z: 30 }, // 図書館入口
		{ x: 40, y: 63, z: -10 }, // 武器庫前
		{ x: -15, y: 66, z: -35 }, // 寝室エリア
		{ x: 5, y: 64, z: 45 }, // 厨房近く
		{ x: -40, y: 64, z: 5 }, // 牢獄前
		{ x: 25, y: 65, z: 25 }, // 大広間
		{ x: -30, y: 63, z: -15 }, // 聖堂
		{ x: 35, y: 64, z: 35 }, // 庭園
		{ x: -5, y: 65, z: -25 }, // バルコニー
	];

	// ランダムに選択
	const shuffled = [...possibleLocations].sort(() => Math.random() - 0.5);

	for (let i = 0; i < Math.min(count, shuffled.length); i++) {
		locations.push(shuffled[i]);
	}

	return locations;
}

/**
 * ゲーム時間をフォーマット
 */
function formatGameTime(timestamp: number): string {
	const gameStart = 0; // ゲーム開始時刻
	const elapsed = timestamp - gameStart;
	const days = Math.floor(elapsed / (24 * 60 * 60));
	const hours = Math.floor((elapsed % (24 * 60 * 60)) / (60 * 60));
	const minutes = Math.floor((elapsed % (60 * 60)) / 60);

	return `${days}日目 ${hours}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * 位置情報をフォーマット
 */
function formatLocation(location: Vector3): string {
	const areaName = getAreaName(location);
	return areaName !== "unknown"
		? areaName
		: `(${Math.floor(location.x)}, ${Math.floor(location.z)})`;
}

/**
 * プレイヤー名を取得
 */
function getPlayerName(playerId: string): string {
	const player = world.getAllPlayers().find((p) => p.id === playerId);
	return player ? player.name : "不明";
}

/**
 * 証拠詳細をフォーマット
 */
function formatEvidenceDetails(evidence: ActionRecord): string {
	switch (evidence.actionType) {
		case "block_interact":
			return `${evidence.data?.containerType || "コンテナ"}を開いた`;
		case "area_enter":
			return `${evidence.data?.areaName || "エリア"}に入った`;
		case "murder":
			return `${evidence.data?.victimName || "誰か"}を殺害した`;
		case "item_use":
			return `${evidence.data?.itemType || "アイテム"}を使用した`;
		default:
			return evidence.actionType;
	}
}

/**
 * 投票システム開始（投票フェーズ）
 */
async function startVotingSystem(): Promise<void> {
	try {
		// 自動で全プレイヤー対象の犯人投票を開始
		const result = startAutomaticMurderVoting();

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
	world.sendMessage("§l§2マーダーミステリーゲーム終了！");
	world.sendMessage("§6お疲れ様でした！");
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
