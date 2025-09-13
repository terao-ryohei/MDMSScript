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
			.title("§l§6プレイヤー情報")
			.body(
				`§6プレイヤー名: §f${player.name}\n\n` +
					`§6ロール: §f${role ? getRoleDisplayName(role) : "未設定"}\n\n` +
					`§6ジョブ: §f${job ? job.toString() : "未設定"}\n\n` +
					`§6スコア: §f${score}pt\n\n` +
					`§6証拠数: §f${evidenceCount}個`,
			)
			.button1("§a了解")
			.button2("§7閉じる");

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
			.title("§l§aゲーム状態")
			.body(
				`§6現在フェーズ: §f${getPhaseDisplayName(currentPhase)}\n\n` +
					`§6残り時間: §f${formatTime(phaseTimer)}\n\n` +
					`§6事件発生: §f${murderOccurred ? "発生済み" : "未発生"}\n\n` +
					`§6総プレイヤー数: §f${playerCount}人`,
			)
			.button1("§a了解")
			.button2("§7戻る");

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
			.title(`§l§e${getPhaseDisplayName(currentPhase)}`)
			.body(
				`§6フェーズ名: §f${getPhaseDisplayName(currentPhase)}\n\n` +
					`§6説明: §f${phaseConfig.description}\n\n` +
					`§6制限時間: §f${formatTime(phaseConfig.duration)}\n\n` +
					`§6許可された行動:\n` +
					phaseConfig.allowedActions
						.map((action: string) => `§f- ${action}`)
						.join("\n"),
			)
			.button1("§a了解")
			.button2("§7戻る");

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
		const form = new ActionFormData()
			.title("§l§c管理者メニュー")
			.body("§7管理者向けのデバッグ機能です")
			.button("§aゲーム状態表示", "textures/ui/book_edit_default")
			.button("§eプレイヤー一覧", "textures/ui/friend_glyph")
			.button("§bフェーズ強制変更", "textures/ui/clock")
			.button("§dBGMコントロール", "textures/ui/sound_glyph")
			.button("§6デバッグ情報出力", "textures/ui/debug_glyph")
			.button("§cゲームリセット", "textures/ui/redX1")
			.button("§7閉じる", "textures/ui/cancel");

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
				player.sendMessage("§aデバッグ情報をコンソールに出力しました");
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
			.title("§l§b証拠一覧")
			.body(
				`§6収集済み証拠数: §f${evidenceCount}\n\n` +
					`§7※証拠詳細表示機能は今後実装予定です\n` +
					`§7※現在は証拠数のみ表示されます`,
			)
			.button1("§a了解")
			.button2("§7閉じる");

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
			return `§f${p.name} §6${score}pt`;
		});

		const form = new MessageFormData()
			.title("§l§eプレイヤー一覧")
			.body(`§6総プレイヤー数: §f${players.length}\n\n` + playerInfo.join("\n"))
			.button1("§a了解")
			.button2("§7閉じる");

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
		const form = new ActionFormData()
			.title("§l§bフェーズ変更")
			.body("§7変更したいフェーズを選択してください")
			.button("§a準備フェーズ", "textures/ui/gear")
			.button("§e生活フェーズ", "textures/ui/heart")
			.button("§6調査フェーズ", "textures/ui/magnifyingGlass")
			.button("§c会議フェーズ", "textures/ui/chat")
			.button("§d再調査フェーズ", "textures/ui/magnifyingGlass")
			.button("§b推理フェーズ", "textures/ui/book_edit_default")
			.button("§4投票フェーズ", "textures/ui/vote")
			.button("§8エンディング", "textures/ui/check");

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
				`§aフェーズを ${getPhaseDisplayName(selectedPhase)} に変更しました`,
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
			.title("§l§cゲームリセット確認")
			.body(
				"§cゲームをリセットしますか？\n\n" +
					"§7この操作により以下がリセットされます:\n" +
					"§7- 全プレイヤーの役職・職業\n" +
					"§7- ゲームフェーズ\n" +
					"§7- 証拠・スコア\n" +
					"§7- その他全てのゲーム状態",
			)
			.button1("§cリセット実行")
			.button2("§aキャンセル");

		const response = await form.show(player);

		if (response.canceled || response.selection === 1) {
			player.sendMessage("§aリセットをキャンセルしました");
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
			? `§a再生中: ${currentBGM.track.name}`
			: "§7停止中";

		const form = new ActionFormData()
			.title("§l§d♪ BGMコントロール ♪")
			.body(
				`§7現在の状態: ${currentStatus}\n\n§eBGMの再生・停止・選曲ができます`,
			)
			.button("§a▶ BGM再生", "textures/ui/play")
			.button("§c⏹ BGM停止", "textures/ui/stop")
			.button("§e♪ 楽曲選択", "textures/ui/sound_glyph")
			.button("§8← 戻る", "textures/ui/back");

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
		const form = new ActionFormData()
			.title("§l§a▶ BGM再生")
			.body("§7カテゴリを選択してください")
			.button("§d探偵・推理", "textures/ui/book_edit_default")
			.button("§6クラシック", "textures/ui/sound_glyph")
			.button("§bゲーム用BGM", "textures/ui/clock")
			.button("§c効果音・ファンファーレ", "textures/ui/debug_glyph")
			.button("§8← 戻る", "textures/ui/back");

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
			.title("§l§e♪ 楽曲選択")
			.body(
				`§7利用可能な楽曲: ${trackList.length}曲\n§e楽曲を選択して再生します`,
			);

		// 楽曲をソートして表示（優先度の高い順）
		const sortedTracks = trackList.sort(
			(a, b) => (b.priority || 0) - (a.priority || 0),
		);

		for (const track of sortedTracks) {
			const icon = getBGMIcon(track.id);
			form.button(`§f${track.name}\n§7${track.description}`, icon);
		}

		form.button("§8← 戻る", "textures/ui/back");

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
			player.sendMessage(`§a♪ 再生開始: ${selectedTrack.name}`);
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
			form.button(`§f${track.name}\n§7${track.description}`, icon);
		}

		form.button("§8← 戻る", "textures/ui/back");

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
			player.sendMessage(`§a♪ 再生開始: ${selectedTrack.name}`);
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
