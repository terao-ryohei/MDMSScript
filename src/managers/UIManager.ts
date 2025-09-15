/**
 * UI管理関数群（関数ベース版）
 * Minecraft Server UIを使用したプレイヤー向けインターフェース
 */

import { type Player, world } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { MELODIES } from "src/data/MusicDefinitions";
import { PHASE_CONFIGS } from "../constants/PhaseConfigs";
import { GamePhase } from "../types/PhaseTypes";
import { RoleType } from "../types/RoleTypes";
import { createActionForm } from "../utils/UIHelpers";
import { getCurrentBGM, playBGM, stopBGM } from "./BGMManager";
import { debugJobAssignments } from "./JobAssignmentManager";
import { forcePhaseChange, getCurrentPhase } from "./PhaseManager";
import { debugRoleAssignments } from "./RoleAssignmentManager";
import {
	debugGameState,
	debugPlayerStates,
	dispose,
	getEvidenceCount,
	getMurderOccurred,
	getPhaseTimer,
	getPlayerJob,
	getPlayerRole,
	getPlayerScore,
	initializeObjectives,
} from "./ScoreboardManager";

/**
 * プレイヤー情報UIを表示
 */
export async function showPlayerInfo(player: Player): Promise<void> {
	try {
		const role = getPlayerRole(player);
		const job = getPlayerJob(player);
		const score = getPlayerScore(player);
		const evidenceCount = getEvidenceCount(player);

		const form = new MessageFormData()
			.title("§lプレイヤー情報")
			.body(
				`§6プレイヤー名: §j${player.name}\n\n` +
					`§6ロール: §j${role ? getRoleDisplayName(role) : "未設定"}\n\n` +
					`§6ジョブ: §j${job ? job.toString() : "未設定"}\n\n` +
					`§6スコア: §j${score}pt\n\n` +
					`§6証拠数: §j${evidenceCount}個`,
			)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show player info for ${player.name}:`, error);
		player.sendMessage("§cプレイヤー情報の表示に失敗しました");
	}
}

/**
 * ゲーム状態UIを表示
 */
export async function showGameState(
	player: Player,
	onBack?: () => Promise<void>,
): Promise<void> {
	try {
		const currentPhase = getCurrentPhase();
		const phaseTimer = getPhaseTimer();
		const murderOccurred = getMurderOccurred();
		const playerCount = world.getAllPlayers().length;

		const form = new MessageFormData()
			.title("§lゲーム状態")
			.body(
				`§6現在フェーズ: §j${getPhaseDisplayName(currentPhase)}\n\n` +
					`§6残り時間: §j${formatTime(phaseTimer)}\n\n` +
					`§6事件発生: §j${murderOccurred ? "発生済み" : "未発生"}\n\n` +
					`§6総プレイヤー数: §j${playerCount}人`,
			)
			.button1("了解")
			.button2("戻る");

		const response = await form.show(player);

		if (response.canceled) return;

		// 戻るボタンの場合はコールバック実行
		if (response.selection === 1 && onBack) {
			await onBack();
		}
	} catch (error) {
		console.error(`Failed to show game state for ${player.name}:`, error);
		player.sendMessage("§cゲーム状態の表示に失敗しました");
	}
}

/**
 * フェーズ情報UIを表示
 */
export async function showPhaseInfo(
	player: Player,
	onBack?: () => Promise<void>,
): Promise<void> {
	try {
		const currentPhase = getCurrentPhase();
		const phaseConfig = PHASE_CONFIGS[currentPhase];

		if (!phaseConfig) {
			player.sendMessage("§cフェーズ情報を取得できませんでした");
			return;
		}

		const form = new MessageFormData()
			.title(`§l§6${getPhaseDisplayName(currentPhase)}`)
			.body(
				`§6フェーズ名: §j${getPhaseDisplayName(currentPhase)}\n\n` +
					`§6説明: §j${phaseConfig.description}\n\n` +
					`§6制限時間: §j${formatTime(phaseConfig.duration)}\n\n` +
					`§6許可された行動:\n` +
					phaseConfig.allowedActions
						.map((action: string) => `§j- ${action}`)
						.join("\n"),
			)
			.button1("了解")
			.button2("戻る");

		const response = await form.show(player);

		if (response.canceled) return;

		// 戻るボタンの場合はコールバック実行
		if (response.selection === 1 && onBack) {
			await onBack();
		}
	} catch (error) {
		console.error(`Failed to show phase info for ${player.name}:`, error);
		player.sendMessage("§cフェーズ情報の表示に失敗しました");
	}
}

/**
 * 管理者向けデバッグUIを表示
 */
export async function showAdminMenu(player: Player): Promise<void> {
	try {
		const form = createActionForm("$1", "$2")
			.button("ゲーム状態表示", "textures/ui/book_edit_default")
			.button("プレイヤー一覧", "textures/ui/friend_glyph")
			.button("フェーズ強制変更", "textures/ui/clock")
			.button("BGMコントロール", "textures/ui/sound_glyph")
			.button("デバッグ情報出力", "textures/ui/debug_glyph")
			.button("ゲームリセット", "textures/ui/redX1")
			.button("閉じる", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled) return;

		switch (response.selection) {
			case 0: // ゲーム状態表示
				await showGameState(player);
				break;
			case 1: // プレイヤー一覧
				await showPlayerList(player);
				break;
			case 2: // フェーズ強制変更
				await showPhaseChangeMenu(player);
				break;
			case 3: // BGMコントロール
				await showBGMControlMenu(player);
				break;
			case 4: // デバッグ情報出力
				outputDebugInfo();
				player.sendMessage("§2デバッグ情報をコンソールに出力しました");
				break;
			case 5: // ゲームリセット
				await showResetConfirmation(player);
				break;
		}
	} catch (error) {
		console.error(`Failed to show admin menu for ${player.name}:`, error);
		player.sendMessage("§c管理者メニューの表示に失敗しました");
	}
}

/**
 * 証拠一覧UIを表示
 */
export async function showEvidenceList(player: Player): Promise<void> {
	try {
		const evidenceCount = getEvidenceCount(player);

		const form = new MessageFormData()
			.title("§l証拠一覧")
			.body(
				`§6収集済み証拠数: §j${evidenceCount}\n\n` +
					`§7※証拠詳細表示機能は今後実装予定です\n` +
					`§7※現在は証拠数のみ表示されます`,
			)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show evidence list for ${player.name}:`, error);
		player.sendMessage("§c証拠一覧の表示に失敗しました");
	}
}

/**
 * プレイヤー一覧UIを表示
 */
export async function showPlayerList(player: Player): Promise<void> {
	try {
		const players = world.getAllPlayers();
		const playerInfo = players.map((p) => {
			const score = getPlayerScore(p);
			return `§j${p.name} §6${score}pt`;
		});

		const form = new MessageFormData()
			.title("§lプレイヤー一覧")
			.body(`§6総プレイヤー数: §j${players.length}\n\n` + playerInfo.join("\n"))
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show player list for ${player.name}:`, error);
		player.sendMessage("§cプレイヤー一覧の表示に失敗しました");
	}
}

/**
 * フェーズ変更メニューを表示
 */
async function showPhaseChangeMenu(player: Player): Promise<void> {
	try {
		const form = createActionForm("$1", "$2")
			.button("準備フェーズ", "textures/ui/gear")
			.button("生活フェーズ", "textures/ui/heart")
			.button("調査フェーズ", "textures/ui/magnifyingGlass")
			.button("会議フェーズ", "textures/ui/chat")
			.button("再調査フェーズ", "textures/ui/magnifyingGlass")
			.button("推理フェーズ", "textures/ui/book_edit_default")
			.button("投票フェーズ", "textures/ui/vote")
			.button("エンディング", "textures/ui/check");

		const response = await form.show(player);

		if (response.canceled) return;

		const phases = [
			GamePhase.PREPARATION,
			GamePhase.DAILY_LIFE,
			GamePhase.INVESTIGATION,
			GamePhase.DISCUSSION,
			GamePhase.REINVESTIGATION,
			GamePhase.DEDUCTION,
			GamePhase.VOTING,
			GamePhase.ENDING,
		];

		const selectedPhase = phases[response.selection!];
		const result = await forcePhaseChange(selectedPhase);

		if (result.success) {
			player.sendMessage(
				`§2フェーズを ${getPhaseDisplayName(selectedPhase)} に変更しました`,
			);
		} else {
			player.sendMessage(`§cフェーズ変更エラー: ${result.error}`);
		}
	} catch (error) {
		console.error(
			`Failed to show phase change menu for ${player.name}:`,
			error,
		);
		player.sendMessage("§cフェーズ変更メニューの表示に失敗しました");
	}
}

/**
 * リセット確認UIを表示
 */
async function showResetConfirmation(player: Player): Promise<void> {
	try {
		const form = new MessageFormData()
			.title("§lゲームリセット確認")
			.body(
				"§cゲームをリセットしますか？\n\n" +
					"§7この操作により以下がリセットされます:\n" +
					"§7- 全プレイヤーの役職・職業\n" +
					"§7- ゲームフェーズ\n" +
					"§7- 証拠・スコア\n" +
					"§7- その他全てのゲーム状態",
			)
			.button1("リセット実行")
			.button2("キャンセル");

		const response = await form.show(player);

		if (response.canceled || response.selection === 1) {
			player.sendMessage("§2リセットをキャンセルしました");
			return;
		}

		// リセット実行
		dispose();
		initializeObjectives();
		world.sendMessage(`§c${player.name} によってゲームがリセットされました`);
	} catch (error) {
		console.error(
			`Failed to show reset confirmation for ${player.name}:`,
			error,
		);
		player.sendMessage("§cリセット確認の表示に失敗しました");
	}
}

/**
 * デバッグ情報をコンソールに出力
 */
function outputDebugInfo(): void {
	debugGameState();
	debugPlayerStates();
	debugRoleAssignments();
	debugJobAssignments();
}

/**
 * ロール表示名を取得
 */
function getRoleDisplayName(role: RoleType): string {
	switch (role) {
		case RoleType.VILLAGER:
			return "一般人";
		case RoleType.MURDERER:
			return "犯人";
		case RoleType.ACCOMPLICE:
			return "共犯者";
		default:
			return "不明";
	}
}

/**
 * フェーズ表示名を取得
 */
function getPhaseDisplayName(phase: GamePhase): string {
	switch (phase) {
		case GamePhase.PREPARATION:
			return "準備フェーズ";
		case GamePhase.DAILY_LIFE:
			return "生活フェーズ";
		case GamePhase.INVESTIGATION:
			return "調査フェーズ";
		case GamePhase.DISCUSSION:
			return "会議フェーズ";
		case GamePhase.REINVESTIGATION:
			return "再調査フェーズ";
		case GamePhase.DEDUCTION:
			return "推理フェーズ";
		case GamePhase.VOTING:
			return "投票フェーズ";
		case GamePhase.ENDING:
			return "エンディング";
		default:
			return "不明フェーズ";
	}
}

/**
 * BGMコントロールメニューを表示
 */
export async function showBGMControlMenu(player: Player): Promise<void> {
	try {
		const currentBGM = getCurrentBGM();
		const currentStatus = currentBGM
			? `§2再生中: ${currentBGM.track.name}`
			: "§7停止中";

		const form = new ActionFormData()
			.title("§l♪ BGMコントロール ♪")
			.body(
				`§7現在の状態: ${currentStatus}\n\n§6BGMの再生・停止・選曲ができます`,
			)
			.button("▶ BGM再生", "textures/ui/play")
			.button("⏹ BGM停止", "textures/ui/stop")
			.button("♪ 楽曲選択", "textures/ui/sound_glyph")
			.button("← 戻る", "textures/ui/back");

		const response = await form.show(player);

		if (response.canceled) return;

		switch (response.selection) {
			case 0: // BGM再生
				await showBGMPlayMenu(player);
				break;
			case 1: // BGM停止
				stopBGM();
				player.sendMessage("§cBGMを停止しました");
				await showBGMControlMenu(player);
				break;
			case 2: // 楽曲選択
				await showBGMSelectionMenu(player);
				break;
			case 3: // 戻る
				await showAdminMenu(player);
				break;
		}
	} catch (error) {
		console.error(`Failed to show BGM control menu for ${player.name}:`, error);
		player.sendMessage("§cBGMコントロールメニューの表示に失敗しました");
	}
}

/**
 * BGM再生メニューを表示（カテゴリ別）
 */
export async function showBGMPlayMenu(player: Player): Promise<void> {
	try {
		const form = createActionForm("$1", "$2")
			.button("探偵・推理", "textures/ui/book_edit_default")
			.button("クラシック", "textures/ui/sound_glyph")
			.button("ゲーム用BGM", "textures/ui/clock")
			.button("効果音・ファンファーレ", "textures/ui/debug_glyph")
			.button("← 戻る", "textures/ui/back");

		const response = await form.show(player);

		if (response.canceled) return;

		switch (response.selection) {
			case 0: // 探偵・推理
				await showBGMCategoryMenu(player, "detective");
				break;
			case 1: // クラシック
				await showBGMCategoryMenu(player, "classical");
				break;
			case 2: // ゲーム用BGM
				await showBGMCategoryMenu(player, "game");
				break;
			case 3: // 効果音・ファンファーレ
				await showBGMCategoryMenu(player, "sfx");
				break;
			case 4: // 戻る
				await showBGMControlMenu(player);
				break;
		}
	} catch (error) {
		console.error(`Failed to show BGM play menu for ${player.name}:`, error);
		player.sendMessage("§cBGM再生メニューの表示に失敗しました");
	}
}

/**
 * BGM楽曲選択メニューを表示（全楽曲リスト）
 */
export async function showBGMSelectionMenu(player: Player): Promise<void> {
	try {
		const trackList = Object.values(MELODIES);
		const form = new ActionFormData()
			.title("§l♪ 楽曲選択")
			.body(
				`§7利用可能な楽曲: ${trackList.length}曲\n§6楽曲を選択して再生します`,
			);

		// 楽曲をソートして表示（優先度の高い順）
		const sortedTracks = trackList.sort(
			(a, b) => (b.priority || 0) - (a.priority || 0),
		);

		for (const track of sortedTracks) {
			const icon = getBGMIcon(track.id);
			form.button(`§j${track.name}\n§7${track.description}`, icon);
		}

		form.button("← 戻る", "textures/ui/back");

		const response = await form.show(player);

		if (response.canceled) return;

		// 戻るボタンのチェック
		if (response.selection === sortedTracks.length) {
			await showBGMControlMenu(player);
			return;
		}

		// 選択された楽曲を再生
		const selectedTrack = sortedTracks[response.selection!];
		const success = playBGM(selectedTrack.id);

		if (success) {
			player.sendMessage(`§2♪ 再生開始: ${selectedTrack.name}`);
		} else {
			player.sendMessage(`§c楽曲の再生に失敗しました: ${selectedTrack.name}`);
		}

		await showBGMControlMenu(player);
	} catch (error) {
		console.error(
			`Failed to show BGM selection menu for ${player.name}:`,
			error,
		);
		player.sendMessage("§c楽曲選択メニューの表示に失敗しました");
	}
}

/**
 * BGMカテゴリメニューを表示
 */
export async function showBGMCategoryMenu(
	player: Player,
	category: string,
): Promise<void> {
	try {
		const trackList = Object.values(MELODIES);
		const filteredTracks = trackList.filter((track) => {
			switch (category) {
				case "detective":
					return (
						track.id.includes("detective") ||
						track.id.includes("investigation") ||
						track.id.includes("tense")
					);
				case "classical":
					return track.id.includes("pictures");
				case "game":
					return (
						track.id.includes("phase") ||
						track.id.includes("game") ||
						track.id.includes("daily") ||
						track.id.includes("preparation")
					);
				case "sfx":
					return (
						track.id.includes("victory") ||
						track.id.includes("defeat") ||
						track.id.includes("murder") ||
						track.id.includes("dramatic")
					);
				default:
					return true;
			}
		});

		const categoryName = getCategoryName(category);
		const form = new ActionFormData()
			.title(`§l§6${categoryName}`)
			.body(`§7${categoryName}カテゴリの楽曲: ${filteredTracks.length}曲`);

		for (const track of filteredTracks) {
			const icon = getBGMIcon(track.id);
			form.button(`§j${track.name}\n§7${track.description}`, icon);
		}

		form.button("← 戻る", "textures/ui/back");

		const response = await form.show(player);

		if (response.canceled) return;

		// 戻るボタンのチェック
		if (response.selection === filteredTracks.length) {
			await showBGMPlayMenu(player);
			return;
		}

		// 選択された楽曲を再生
		const selectedTrack = filteredTracks[response.selection!];
		const success = playBGM(selectedTrack.id);

		if (success) {
			player.sendMessage(`§2♪ 再生開始: ${selectedTrack.name}`);
		} else {
			player.sendMessage(`§c楽曲の再生に失敗しました: ${selectedTrack.name}`);
		}

		await showBGMControlMenu(player);
	} catch (error) {
		console.error(
			`Failed to show BGM category menu for ${player.name}:`,
			error,
		);
		player.sendMessage("§cBGMカテゴリメニューの表示に失敗しました");
	}
}

/**
 * BGMアイコンを取得
 */
function getBGMIcon(trackId: string): string {
	if (trackId.includes("detective") || trackId.includes("conan")) {
		return "textures/ui/book_edit_default";
	} else if (trackId.includes("pictures")) {
		return "textures/ui/sound_glyph";
	} else if (trackId.includes("victory") || trackId.includes("defeat")) {
		return "textures/ui/debug_glyph";
	} else if (trackId.includes("murder") || trackId.includes("ominous")) {
		return "textures/ui/redX1";
	} else if (trackId.includes("peaceful") || trackId.includes("daily")) {
		return "textures/ui/friend_glyph";
	} else {
		return "textures/ui/clock";
	}
}

/**
 * カテゴリ名を取得
 */
function getCategoryName(category: string): string {
	switch (category) {
		case "detective":
			return "探偵・推理";
		case "classical":
			return "クラシック";
		case "game":
			return "ゲーム用BGM";
		case "sfx":
			return "効果音・ファンファーレ";
		default:
			return "その他";
	}
}

/**
 * 時間をフォーマット
 */
function formatTime(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
