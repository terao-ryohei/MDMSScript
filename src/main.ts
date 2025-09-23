import type { ItemUseAfterEvent, Player } from "@minecraft/server";
import { system, world } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { PHASE_CONFIGS } from "./constants/PhaseConfigs";
import { JOB_DEFINITIONS } from "./data/JobDefinitions";
import { BGM_TRACKS } from "./data/MusicDefinitions";
import {
	clearAllRecords,
	getActionStatistics,
	startTracking,
	stopTracking,
} from "./managers/ActionTrackingManager";
import { addAdmin } from "./managers/AdminManager";
import { getCurrentBGM, playBGM, stopBGM } from "./managers/BGMManager";
import {
	showEvidenceList,
	showEvidenceMenu,
} from "./managers/EvidenceUIManager";
import {
	assignJobsToAllPlayers,
	notifyAllPlayersJobs,
} from "./managers/JobAssignmentManager";
import { clearAllNPCs } from "./managers/NPCManager";
import { showJobHelpMenu } from "./managers/OccupationUIManager";
import { getCurrentPhase, startPhase } from "./managers/PhaseManager";
import {
	assignRolesToAllPlayers,
	notifyAllPlayersRoles,
} from "./managers/RoleAssignmentManager";
import { showRoleHelpMenu } from "./managers/RoleUIManager";
import {
	dispose,
	getEvidenceCount,
	getGamePhase,
	getMurderOccurred,
	getPhaseString,
	getPhaseTimer,
	getPlayerJob,
	getPlayerRole,
	getPlayerScore,
	getRoleString,
	initializeObjectives,
	roleTypeToNumber,
	setAbilityUses,
	setBaseScore,
	setCooldownTimer,
	setEvidenceCount,
	setObjectiveScore,
	setPlayerAlive,
	setPlayerJob,
	setPlayerRole,
	setPlayerScore,
	setPlayerVotes,
} from "./managers/ScoreboardManager";
import {
	calculateAllPlayerScores,
	checkVictoryConditions,
	getCurrentGameResult,
} from "./managers/ScoringManager";
import {
	clearAllData,
	initializePlayerSkills,
	initialize as initializeSkillManager,
} from "./managers/SkillManager";
import { showSkillMenu } from "./managers/SkillUIManager";
import { showGameState, showPhaseInfo } from "./managers/UIManager";
import { clearAllVotes, getVotingStatistics } from "./managers/VotingManager";
import { showVotingMenu } from "./managers/VotingUIManager";
import type { BGMTrack } from "./types/AudioTypes";
import { GamePhase } from "./types/PhaseTypes";
import { RoleType } from "./types/RoleTypes";

// const composerManager = ComposerManager.getInstance();

console.log("MDMS main initialized");

// 初期化処理
function initializeGame(): void {
	try {
		// Scoreboardオブジェクト初期化
		initializeObjectives();
		// スキルシステム初期化
		initializeSkillManager();
		console.log("Game systems initialized successfully");
	} catch (error) {
		console.error("Failed to initialize game systems:", error);
	}
}

// ゲーム開始処理
async function startGame(): Promise<void> {
	try {
		const playerCount = world.getAllPlayers().length;

		// プレイヤー数チェック（3人推奨、1人からテスト可能）
		if (playerCount < 1) {
			world.sendMessage("§c最低1人のプレイヤーが必要です");
			return;
		}

		if (playerCount === 2) {
			world.sendMessage(
				"§62人でのプレイは実験的機能です。3人以上を推奨します。",
			);
		} else if (playerCount >= 3) {
			world.sendMessage("§23人以上での最適なゲーム体験をお楽しみください！");
		}

		if (playerCount > 20) {
			world.sendMessage("§cプレイヤー数が多すぎます（最大20人）");
			return;
		}

		// 現在のフェーズをチェック（すでにゲームが開始されているか）
		const currentPhase = getGamePhase();
		if (currentPhase !== 0) {
			// 全システムを停止
			stopTracking();
			clearAllRecords();
			clearAllVotes();
			clearAllData();
			clearAllNPCs();
			dispose();

			console.log("MDMS systems shut down successfully");

			// フォース終了処理を実行
			await forceEndGame("System Reset");
		}

		// ゲーム開始
		world.sendMessage("§2============================");
		world.sendMessage("§l§6MDMS ゲーム開始準備中...");
		world.sendMessage(`§6プレイヤー数: ${playerCount}人`);
		world.sendMessage("§2============================");

		// システム初期化
		initializeGame();

		// ロール・ジョブ割り当て
		world.sendMessage("§6ロール・ジョブを割り当て中...");

		const roleResult = assignRolesToAllPlayers();
		if (!roleResult.success) {
			world.sendMessage(`§cロール割り当てエラー: ${roleResult.error}`);
			return;
		}

		const jobResult = assignJobsToAllPlayers();
		if (!jobResult.success) {
			world.sendMessage(`§cジョブ割り当てエラー: ${jobResult.error}`);
			return;
		}

		world.sendMessage("§2ロール・ジョブの割り当てが完了しました");
		world.sendMessage(
			`§7構成: 殺人者${roleResult.composition.murderers}人, 村人${roleResult.composition.villagers}人, 探偵${roleResult.composition.detectives}人, 共犯者${roleResult.composition.accomplices}人`,
		);

		// 行動追跡開始
		startTracking();
		world.sendMessage("§3行動追跡システムが開始されました");

		// スコアリングシステム初期化
		initializeGame();
		world.sendMessage("§dスコアリングシステムが初期化されました");

		// スキル割り当て
		// assignPlayerSkills(); // Function does not exist
		world.sendMessage("§5スキルが全プレイヤーに割り当てられました");

		// 準備フェーズ開始
		const result = await startPhase(GamePhase.PREPARATION);

		if (result.success) {
			world.sendMessage("§2準備フェーズが開始されました！");
			world.sendMessage("§6ロール・ジョブの確認とマップ散策を行ってください");

			// ゲーム開始BGMを再生
			// playBGMEvent(BGMEvent.GAME_START);

			// 全プレイヤーにロール・ジョブ情報を通知
			system.runTimeout(() => {
				notifyAllPlayersRoles();
				notifyAllPlayersJobs();

				// 能力システム初期化
				for (const player of world.getAllPlayers()) {
					initializePlayerSkills(player);
				}

				// 管理者権限自動付与（最初のプレイヤー）
				const firstPlayer = world.getAllPlayers()[0];
				if (firstPlayer) {
					addAdmin(firstPlayer.id);
					firstPlayer.sendMessage("§6管理者権限が自動付与されました");
				}
			}, 20); // 1秒後に通知（20 ticks = 1秒）
		} else {
			world.sendMessage(
				`§cゲーム開始エラー: ${result.error || "不明なエラー"}`,
			);
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "不明なエラーが発生しました";
		world.sendMessage(`§c予期せぬエラー: ${message}`);
		console.error("Game start error:", error);
	}
}

// ゲーム強制終了・リセット処理
async function forceEndGame(playerName: string): Promise<void> {
	try {
		world.sendMessage("§c============================");
		world.sendMessage("§l§4ゲーム強制終了");
		world.sendMessage(`§7実行者: ${playerName}`);
		world.sendMessage("§c============================");

		// 各システムを停止・リセット
		dispose();
		stopTracking();
		clearAllRecords();
		clearAllVotes();
		clearAllData();
		clearAllData();
		clearAllNPCs();

		// スコアボードリセット
		initializeObjectives();

		// 全プレイヤーを生存状態に戻す
		for (const player of world.getAllPlayers()) {
			setPlayerAlive(player, true);
			setPlayerRole(player, 0);
			setPlayerJob(player, 0);
			setPlayerScore(player, 0);
			setBaseScore(player, 0);
			setObjectiveScore(player, 0);
			setEvidenceCount(player, 0);
			setPlayerVotes(player, 0);
			setAbilityUses(player, 0);
			setCooldownTimer(player, 0);
		}

		world.sendMessage("§2全システムがリセットされました");
		world.sendMessage("§6新しいゲームを開始するには時計を使用してください");

		console.log(`Game forcefully ended and reset by ${playerName}`);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "不明なエラーが発生しました";
		world.sendMessage(`§cリセットエラー: ${message}`);
		console.error("Force end game error:", error);
	}
}

// ゲーム強制終了確認UI
async function showForceEndConfirmation(player: Player): Promise<void> {
	try {
		const form = new MessageFormData()
			.title("§lゲーム強制終了")
			.body(
				"§c警告: ゲームを強制終了してすべてをリセットします。\n\n" +
					"§7• 進行中のゲームが中断されます\n" +
					"§7• すべてのプレイヤーデータがリセットされます\n" +
					"§7• 行動記録・証拠がクリアされます\n" +
					"§7• この操作は取り消せません\n\n" +
					"§6本当に実行しますか？",
			)
			.button1("強制終了")
			.button2("キャンセル");

		const response = await form.show(player);

		if (response.canceled || response.selection === 1) {
			player.sendMessage("§7ゲーム強制終了をキャンセルしました");
			return;
		}

		if (response.selection === 0) {
			await forceEndGame(player.name);
		}
	} catch (error) {
		console.error(
			`Failed to show force end confirmation for ${player.name}:`,
			error,
		);
		player.sendMessage("§c強制終了確認画面の表示に失敗しました");
	}
}

// ゲーム結果表示
async function showGameResults(player: Player): Promise<void> {
	try {
		const form = new ActionFormData()
			.title("§lゲーム結果")
			.body("§7結果表示メニューを選択してください")
			.button("スコアランキング", "textures/ui/friends")
			.button("チーム結果", "textures/ui/friend_glyph")
			.button("詳細統計", "textures/ui/book_edit_default")
			.button("MVP発表", "textures/ui/trophy")
			.button("勝利条件チェック", "textures/ui/gear")
			.button("閉じる", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled) return;

		switch (response.selection) {
			case 0: // スコアランキング
				await showScoreRanking(player);
				break;
			case 1: // 詳細統計
				await showDetailedStats(player);
				break;
			case 2: // 勝利条件チェック
				await showVictoryStatus(player);
				break;
		}
	} catch (error) {
		console.error(`Failed to show game results for ${player.name}:`, error);
		player.sendMessage("§cゲーム結果の表示に失敗しました");
	}
}

// スコアランキング表示
async function showScoreRanking(player: Player): Promise<void> {
	try {
		const playerScores = calculateAllPlayerScores();

		if (playerScores.length === 0) {
			player.sendMessage("§cスコアデータがありません");
			return;
		}

		const rankingText = playerScores
			.slice(0, 10)
			.map((score, index) => {
				return `§6${index + 1}位 §j${score.playerName}\n§7${score.role} (${score.job}) - §6${score.totalScore}点`;
			})
			.join("\n\n");

		const form = new MessageFormData()
			.title("§lスコアランキング")
			.body(`§6=== プレイヤースコア Top 10 ===\n\n` + rankingText)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show score ranking for ${player.name}:`, error);
		player.sendMessage("§cスコアランキングの表示に失敗しました");
	}
}

// 詳細統計表示
async function showDetailedStats(player: Player): Promise<void> {
	try {
		const gameResult = getCurrentGameResult();

		if (!gameResult) {
			// リアルタイム統計を計算
			const votingStats = getVotingStatistics();
			const evidenceCount = getActionStatistics().evidenceCount;
			const playerCount = world.getAllPlayers().length;

			const form = new MessageFormData()
				.title("§lゲーム統計")
				.body(
					`§6=== ゲーム進行統計 ===\n\n` +
						`§7プレイヤー数: §j${playerCount}人\n` +
						`§7投票セッション: §j${votingStats.totalSessions}回\n` +
						`§7総投票数: §j${votingStats.totalVotes}票\n` +
						`§7平均参加率: §j${Math.round(votingStats.averageParticipation)}%\n` +
						`§7収集証拠数: §j${evidenceCount}件\n` +
						`§7現在フェーズ: §j${getPhaseString(getGamePhase())}`,
				)
				.button1("了解")
				.button2("閉じる");

			await form.show(player);
			return;
		}

		const duration = Math.floor(gameResult.duration / 1000 / 60); // 分

		const form = new MessageFormData()
			.title("§lゲーム統計")
			.body(
				`§6=== 最終ゲーム統計 ===\n\n` +
					`§7ゲーム時間: §j${duration}分\n` +
					`§7最終フェーズ: §j${gameResult.finalPhase}\n` +
					`§7勝利条件: §j${gameResult.victoryCondition}\n` +
					`§7投票セッション: §j${gameResult.totalVotingSessions}回\n` +
					`§7収集証拠数: §j${gameResult.evidenceCollected}件\n` +
					`§7殺人事件数: §j${gameResult.murdersCommitted}件\n` +
					`§7参加プレイヤー: §j${gameResult.playerScores.length}人`,
			)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show detailed stats for ${player.name}:`, error);
		player.sendMessage("§c詳細統計の表示に失敗しました");
	}
}

// 勝利状況表示
async function showVictoryStatus(player: Player): Promise<void> {
	try {
		const victoryResult = checkVictoryConditions();

		// ロール分析
		const aliveRoles = world.getAllPlayers().map((p) => {
			const role = getPlayerRole(p);
			return {
				name: p.name,
				role: getRoleString(roleTypeToNumber(role)),
			};
		});

		const roleCount = {
			murderer: aliveRoles.filter((p) => p.role === "murderer").length,
			accomplice: aliveRoles.filter((p) => p.role === "accomplice").length,
			citizen: aliveRoles.filter((p) => p.role === "citizen").length,
		};

		const statusText =
			`§7状況: §j${victoryResult.reason}\n\n` +
			`§6生存者構成:\n` +
			`§c犯人: ${roleCount.murderer}人\n` +
			`§6共犯者: ${roleCount.accomplice}人\n` +
			`§2市民: ${roleCount.citizen}人\n\n`;

		let resultText = "";
		if (victoryResult.isGameOver) {
			resultText = `§c🎯 ゲーム終了\n§7勝利条件: §j${victoryResult.victoryCondition}\n`;
			if (victoryResult.winningTeam) {
				resultText += `§2勝利チーム: §j${victoryResult.winningTeam}\n`;
			}
		} else {
			resultText = `§2ゲーム継続中\n`;
		}

		const form = new MessageFormData()
			.title("§l勝利条件チェック")
			.body(statusText + resultText)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show victory status for ${player.name}:`, error);
		player.sendMessage("§c勝利状況の表示に失敗しました");
	}
}

// メインUIメニュー表示（簡素化版）
async function showMainUIMenu(player: Player): Promise<void> {
	try {
		const currentPhase = getCurrentPhase();
		const playerRole = getPlayerRole(player);
		const playerJob = getPlayerJob(player);

		// 基本情報を統合したボディテキスト
		const roleDisplayName = playerRole
			? getRoleDisplayName(playerRole)
			: "未設定";
		const jobDisplayName = playerJob
			? JOB_DEFINITIONS[playerJob].name
			: "未設定";
		const phaseDisplayName = PHASE_CONFIGS[currentPhase].name;
		const phaseTimer = getPhaseTimer();

		const bodyText =
			`§6現在: §j${phaseDisplayName} §7(残り§6${formatTime(phaseTimer)}§7)\n` +
			`§6ロール: §j${roleDisplayName} §8| §6職業: §j${jobDisplayName}\n\n` +
			`§7必要な機能を選択してください`;

		const form = new ActionFormData()
			.title("§lMDMS メインメニュー")
			.body(bodyText)
			.button("自分の情報", "textures/ui/person")
			.button("証拠・投票", "textures/ui/magnifyingGlass")
			.button("スキル", "textures/ui/gear")
			.button("詳細メニュー", "textures/ui/book_edit_default")
			.button("閉じる", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled) return;

		switch (response.selection) {
			case 0: // 自分の情報（統合）
				await showIntegratedPlayerInfo(player);
				break;
			case 1: // 証拠・投票（統合）
				await showEvidenceVotingMenu(player);
				break;
			case 2: // スキル
				await showSkillMenu(player);
				break;
			case 3: // 詳細メニュー
				await showDetailedMenu(player);
				break;
		}
	} catch (error) {
		console.error(`Failed to show main UI menu for ${player.name}:`, error);
		player.sendMessage("§cメインメニューの表示に失敗しました");
	}
}

// 統合プレイヤー情報表示
async function showIntegratedPlayerInfo(player: Player): Promise<void> {
	try {
		const role = getPlayerRole(player);
		const job = getPlayerJob(player);
		const score = getPlayerScore(player);
		const evidenceCount = getEvidenceCount(player);

		const roleDisplayName = role ? getRoleDisplayName(role) : "未設定";
		const jobDisplayName = job ? JOB_DEFINITIONS[job].name : "未設定";

		const form = new MessageFormData()
			.title("§lあなたの情報")
			.body(
				`§6プレイヤー: §j${player.name}\n\n` +
					`§c 役割情報\n` +
					`§6ロール: §j${roleDisplayName}\n` +
					`§6職業: §j${jobDisplayName}\n` +
					`§c ゲーム状況\n` +
					`§6スコア: §j${score}pt\n` +
					`§6証拠数: §j${evidenceCount}個\n\n` +
					`§7詳細なロール・職業説明は「詳細メニュー」から確認できます`,
			)
			.button1("了解")
			.button2("戻る");

		const response = await form.show(player);

		if (response.canceled) return;

		if (response.selection === 1) {
			// 戻るボタン
			await showMainUIMenu(player);
		}
	} catch (error) {
		console.error(
			`Failed to show integrated player info for ${player.name}:`,
			error,
		);
		player.sendMessage("§c情報表示に失敗しました");
	}
}

// 証拠・投票統合メニュー
async function showEvidenceVotingMenu(player: Player): Promise<void> {
	try {
		const currentPhase = getCurrentPhase();
		const evidenceCount = getEvidenceCount(player);
		const murderOccurred = getMurderOccurred();

		// フェーズに応じた案内メッセージ
		let phaseGuidance = "";
		if (
			currentPhase === GamePhase.INVESTIGATION ||
			currentPhase === GamePhase.REINVESTIGATION
		) {
			phaseGuidance = "§2現在は調査フェーズです。証拠を収集しましょう";
		} else if (currentPhase === GamePhase.VOTING) {
			phaseGuidance = "§c現在は投票フェーズです。犯人を選択しましょう";
		} else if (murderOccurred) {
			phaseGuidance = "§7事件が発生済みです。証拠情報を確認できます";
		} else {
			phaseGuidance = "§7まだ事件は発生していません";
		}

		const form = new ActionFormData()
			.title("§l証拠・投票システム")
			.body(
				`§6収集済み証拠: §j${evidenceCount}個\n` +
					`§6事件状況: §j${murderOccurred ? "発生済み" : "未発生"}\n\n` +
					`${phaseGuidance}`,
			)
			.button("証拠一覧", "textures/ui/magnifyingGlass")
			.button("推理報告", "textures/ui/book_edit_default")
			.button("投票システム", "textures/ui/vote")
			.button("戻る", "textures/ui/arrow_left");

		const response = await form.show(player);

		if (response.canceled) return;

		switch (response.selection) {
			case 0: // 証拠一覧
				await showEvidenceMenu(player);
				break;
			case 1: // 証拠確認
				await showEvidenceList(player);
				break;
			case 2: // 投票システム
				await showVotingMenu(player);
				break;
			case 3: // 戻る
				await showMainUIMenu(player);
				break;
		}
	} catch (error) {
		console.error(
			`Failed to show evidence voting menu for ${player.name}:`,
			error,
		);
		player.sendMessage("§c証拠・投票メニューの表示に失敗しました");
	}
}

// 詳細メニュー（従来の機能へのアクセス）
async function showDetailedMenu(player: Player): Promise<void> {
	try {
		const form = new ActionFormData()
			.title("§l詳細メニュー")
			.body("§7詳細情報やゲーム状態の確認ができます")
			.button("ロール詳細", "textures/ui/book_edit_default")
			.button("職業詳細", "textures/ui/hammer")
			.button("特殊能力", "textures/ui/creative_icon")
			.button("ゲーム状態", "textures/ui/world_glyph")
			.button("フェーズ情報", "textures/ui/clock")
			.button("BGM・音楽", "textures/ui/sound_on")
			.button("ゲーム結果", "textures/ui/creative_icon")
			.button("戻る", "textures/ui/arrow_left");

		const response = await form.show(player);

		if (response.canceled) return;

		switch (response.selection) {
			case 0: // ロール詳細
				await showRoleHelpMenu(player);
				break;
			case 1: // 職業詳細
				await showJobHelpMenu(player);
				break;
			case 2: // 特殊能力
				await showSkillMenu(player);
				break;
			case 3: // ゲーム状態
				await showGameState(player, () => showDetailedMenu(player));
				break;
			case 4: // フェーズ情報
				await showPhaseInfo(player, () => showDetailedMenu(player));
				break;
			case 5: // BGM・音楽
				await showBGMControlMenu(player);
				break;
			case 6: // ゲーム結果
				await showGameResults(player);
				break;
			case 7: // 戻る
				await showMainUIMenu(player);
				break;
		}
	} catch (error) {
		console.error(`Failed to show detailed menu for ${player.name}:`, error);
		player.sendMessage("§c詳細メニューの表示に失敗しました");
	}
}

// アイテム使用イベントハンドラ
world.afterEvents.itemUse.subscribe(async (event: ItemUseAfterEvent) => {
	const { itemStack, source: player } = event;

	// 時計アイテムでゲーム開始
	if (itemStack.typeId === "minecraft:clock") {
		await startGame();
	}

	// コンパスでメインUIメニュー表示
	if (itemStack.typeId === "minecraft:compass") {
		await showMainUIMenu(player);
	}

	// 殺人の斧で被害者NPCを殺害
	if (itemStack.typeId === "minecraft:iron_axe" && 
		itemStack.nameTag === "§c殺人の斧") {
		try {
			// 血痕を設置
			const setBlood = `execute as @e[type=npc,name="被害者",r=10] at @s run setblock ~ ~ ~ redstone_wire`;
			player.runCommand(setBlood);
			
			// 被害者NPCを殺害
			const killCommand = `execute as @e[type=npc,name="被害者",r=10] at @s run kill @s`;
			const commandResult = player.runCommand(killCommand);

			if (commandResult.successCount > 0) {
				player.sendMessage("§c被害者を殺害しました");
			} else {
				player.sendMessage("§7近くに被害者が見つかりません");
			}
		} catch (error) {
			console.warn("Failed to execute murder axe:", error);
			player.sendMessage("§c斧の使用に失敗しました");
		}
	}
});

// ヘルパー関数
function getRoleDisplayName(role: RoleType): string {
	switch (role) {
		case RoleType.VILLAGER:
			return "村人";
		case RoleType.MURDERER:
			return "犯人";
		case RoleType.ACCOMPLICE:
			return "共犯者";
		default:
			return "不明";
	}
}

function formatTime(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * BGMトラックの表示情報を取得するヘルパー関数
 */
interface BGMDisplayInfo {
	trackId: string;
	colorCode: string;
	iconPath: string;
	displayName: string;
	priority: number;
}

function getBGMDisplayInfo(): BGMDisplayInfo[] {
	const tracks: BGMTrack[] = Object.values(BGM_TRACKS);

	return tracks
		.filter((track: BGMTrack) => !track.uiDisplayInfo?.hidden) // hiddenなトラックを除外
		.map((track: BGMTrack) => {
			let colorCode = "§j"; // デフォルト白
			let iconPath = "textures/ui/sound_glyph"; // デフォルトアイコン

			// UIDisplayInfoを優先し、なければトラックIDから推定
			if (track.uiDisplayInfo?.colorCode) {
				colorCode = track.uiDisplayInfo.colorCode;
			}
			if (track.uiDisplayInfo?.iconPath) {
				iconPath = track.uiDisplayInfo.iconPath;
			}

			// UIDisplayInfoがない場合、メロディーのUIDisplayInfoを確認（安全なアクセス）
			if (
				(!track.uiDisplayInfo?.colorCode || !track.uiDisplayInfo?.iconPath) &&
				track.melodies?.length > 0
			) {
				const firstMelody = track.melodies[0];
				if (firstMelody && firstMelody.uiDisplayInfo) {
					if (
						firstMelody.uiDisplayInfo.colorCode &&
						!track.uiDisplayInfo?.colorCode
					) {
						colorCode = firstMelody.uiDisplayInfo.colorCode;
					}
					if (
						firstMelody.uiDisplayInfo.iconPath &&
						!track.uiDisplayInfo?.iconPath
					) {
						iconPath = firstMelody.uiDisplayInfo.iconPath;
					}
				}
			}

			// フォールバック: トラックIDから推定
			if (colorCode === "§j" || iconPath === "textures/ui/sound_glyph") {
				if (track.id.includes("detective") || track.id.includes("conan")) {
					colorCode = "§c";
					iconPath = "textures/ui/magnifyingGlass";
				} else if (track.id.includes("pictures")) {
					colorCode = "§6";
					iconPath = track.id.includes("promenade")
						? "textures/ui/book_edit_default"
						: "textures/ui/book_writable";
				} else if (
					track.id.includes("peaceful") ||
					track.id.includes("daily") ||
					track.id.includes("preparation")
				) {
					colorCode = "§2";
					iconPath = "textures/ui/heart";
				} else if (
					track.id.includes("murder") ||
					track.id.includes("ominous") ||
					track.id.includes("danger")
				) {
					colorCode = "§4";
					iconPath = "textures/ui/warning";
				} else if (
					track.id.includes("voting") ||
					track.id.includes("dramatic")
				) {
					colorCode = "§5";
					iconPath = "textures/ui/timer";
				} else if (track.id.includes("victory")) {
					colorCode = "§6";
					iconPath = "textures/ui/star";
				} else if (track.id.includes("defeat")) {
					colorCode = "§8";
					iconPath = "textures/ui/cross";
				} else if (
					track.id.includes("investigation") ||
					track.id.includes("tense")
				) {
					colorCode = "§9";
					iconPath = "textures/ui/clock";
				}
			}

			return {
				trackId: track.id,
				colorCode,
				iconPath,
				displayName: track.name,
				priority: track.priority || 0,
			};
		})
		.sort((a, b) => b.priority - a.priority); // 優先度の高い順にソート
}

// BGM再生メニュー（自動生成版）
async function showBGMControlMenu(player: Player): Promise<void> {
	try {
		const currentBGM = getCurrentBGM();
		const statusText = currentBGM
			? `§2現在再生中: ${currentBGM.track.name}`
			: "§7BGMは再生されていません";

		// BGM情報を自動生成
		const bgmTracks = getBGMDisplayInfo();

		const form = new ActionFormData()
			.title("§lBGM・音楽")
			.body(statusText + "\n\n§7再生したい音楽を選択してください");

		// 動的にボタンを追加
		bgmTracks.forEach((track) => {
			form.button(`${track.colorCode}${track.displayName}`, track.iconPath);
		});

		// 特別機能ボタン
		form
			.button("ランダムBGM", "textures/ui/random_dice")
			.button("BGM停止", "textures/ui/sound_off")
			.button("戻る", "textures/ui/arrow_left");

		const response = await form.show(player);

		if (response.canceled) return;

		const selectionIndex = response.selection!;

		if (selectionIndex < bgmTracks.length) {
			// BGMトラック選択
			const selectedTrack = bgmTracks[selectionIndex];
			if (playBGM(selectedTrack.trackId)) {
				player.sendMessage(
					`${selectedTrack.colorCode}「${selectedTrack.displayName}」を再生開始しました`,
				);
			} else {
				player.sendMessage(
					`§c「${selectedTrack.displayName}」の再生に失敗しました`,
				);
			}
		} else {
			// 特別機能
			const specialIndex = selectionIndex - bgmTracks.length;
			switch (specialIndex) {
				case 0: {
					// ランダムBGM
					player.sendMessage("§cランダムBGM機能は現在無効です");
					break;
				}
				case 1: // BGM停止
					stopBGM();
					player.sendMessage("§cBGMを停止しました");
					break;
				case 2: // 戻る
					await showMainUIMenu(player);
					break;
			}
		}
	} catch (error) {
		console.error(`Failed to show BGM control menu for ${player.name}:`, error);
		player.sendMessage("§cBGM制御メニューの表示に失敗しました");
	}
}

// BGM選択メニュー
async function showBGMSelectionMenu(player: Player): Promise<void> {
	try {
		const form = new ActionFormData()
			.title("§lBGM選択")
			.body("§7再生したいBGMを選択してください")
			.button("平和な日常", "textures/ui/heart")
			.button("緊張の調査", "textures/ui/magnifyingGlass")
			.button("不穏な気配", "textures/ui/warning")
			.button("運命の投票", "textures/ui/vote")
			.button("勝利ファンファーレ", "textures/ui/check")
			.button("敗北テーマ", "textures/ui/redX1")
			.button("戻る", "textures/ui/arrow_left");

		const response = await form.show(player);

		if (response.canceled) return;

		const bgmIds = [
			"preparation_phase",
			"investigation_phase",
			"murder_occurred",
			"voting_phase",
			"victory",
			"defeat",
		];

		if (response.selection! < bgmIds.length) {
			const bgmId = bgmIds[response.selection!];
			playBGM(bgmId); // BGM再生
			player.sendMessage(`§2BGMを再生開始: ${bgmId}`);
		} else {
			await showBGMControlMenu(player);
		}
	} catch (error) {
		console.error(
			`Failed to show BGM selection menu for ${player.name}:`,
			error,
		);
		player.sendMessage("§cBGM選択メニューの表示に失敗しました");
	}
}

// 簡単作曲メニュー
async function showComposerMenu(player: Player): Promise<void> {
	try {
		const form = new ActionFormData()
			.title("§l簡単作曲システム")
			.body("§7自動でメロディーを生成します")
			.button("平和なメロディー", "textures/ui/heart")
			.button("緊張メロディー", "textures/ui/warning")
			.button("ドラマチック", "textures/ui/book_edit_default")
			.button("勝利の歌", "textures/ui/check")
			.button("悲哀の歌", "textures/ui/redX1")
			.button("戻る", "textures/ui/arrow_left");

		const response = await form.show(player);

		if (response.canceled) return;

		const styles: Array<
			"peaceful" | "tense" | "dramatic" | "victory" | "defeat"
		> = ["peaceful", "tense", "dramatic", "victory", "defeat"];

		if (response.selection! < styles.length) {
			player.sendMessage("§cカスタム作曲機能は現在無効です");
		} else {
			await showBGMControlMenu(player);
		}
	} catch (error) {
		console.error(`Failed to show composer menu for ${player.name}:`, error);
		player.sendMessage("§c作曲メニューの表示に失敗しました");
	}
}

// ランダムBGMメニュー
async function showRandomBGMMenu(player: Player): Promise<void> {
	try {
		const form = new ActionFormData()
			.title("§lランダムBGM生成")
			.body("§7完全にランダムなBGMを生成します")
			.button("平和テーマ", "textures/ui/heart")
			.button("緊張テーマ", "textures/ui/warning")
			.button("ドラマテーマ", "textures/ui/book_edit_default")
			.button("ミックステーマ", "textures/ui/gear")
			.button("戻る", "textures/ui/arrow_left");

		const response = await form.show(player);

		if (response.canceled) return;

		const themes: Array<"peaceful" | "tense" | "dramatic" | "mixed"> = [
			"peaceful",
			"tense",
			"dramatic",
			"mixed",
		];

		if (response.selection! < themes.length) {
			player.sendMessage("§cランダムBGM機能は現在無効です");
		} else {
			await showBGMControlMenu(player);
		}
	} catch (error) {
		console.error(`Failed to show random BGM menu for ${player.name}:`, error);
		player.sendMessage("§cランダムBGMメニューの表示に失敗しました");
	}
}

// ScriptEvent処理
system.afterEvents.scriptEventReceive.subscribe(async (event) => {
	if (event.id === "mdms:shutdown") {
		try {
			// 全システムを停止
			stopTracking();
			clearAllRecords();
			clearAllVotes();
			clearAllData();
			clearAllNPCs();
			dispose();

			// PhaseManagerのdispose()でタイマーがクリアされる

			// 全プレイヤーに終了通知
			world.sendMessage("§c============================");
			world.sendMessage("§l§cMDMSシステムが停止されました");
			world.sendMessage("§c============================");

			console.log("MDMS systems shut down successfully");

			// フォース終了処理を実行
			await forceEndGame("System Reset");

			console.log("MDMS system reset completed");
		} catch (error) {
			console.error("Error during shutdown:", error);
			world.sendMessage(`§cシャットダウンエラー: ${error}`);
		}
	}

	// 自動投票開始イベント
	if (event.id === "mdms:auto_voting_start") {
		try {
			// 全プレイヤーに投票UIを開く
			for (const player of world.getAllPlayers()) {
				system.runTimeout(() => {
					showVotingMenu(player);
				}, 40); // 2秒後に投票画面を表示（プレイヤー毎に少しずらす）
			}
		} catch (error) {
			console.error("Failed to handle auto voting start:", error);
		}
	}

	// 殺人事件発生イベント
	if (event.id === "mdms:murder_occurred") {
		try {
			const data = JSON.parse(event.message || "{}");
			console.log(`Murder occurred: NPC ${data.npcId}`);

			// 調査フェーズに遷移
			system.runTimeout(() => {
				startPhase(GamePhase.INVESTIGATION);
			}, 100); // 5秒後に調査フェーズ開始
		} catch (error) {
			console.error("Failed to handle murder event:", error);
		}
	}

	// 証拠生成イベント
	if (event.id === "mdms:generate_evidence") {
		try {
			const data = JSON.parse(event.message || "{}");
			console.log(
				`Evidence generated at location: ${JSON.stringify(data.location)}`,
			);

			// 証拠生成処理（後で詳細実装）
			// evidenceManager.generateEvidenceAtLocation(data);
		} catch (error) {
			console.error("Failed to generate evidence:", error);
		}
	}
});

console.log("MDMS event handlers registered");
