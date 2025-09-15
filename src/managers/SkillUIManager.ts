/**
 * 能力システムUI管理関数群（関数ベース版）
 */

import { type Player, world } from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";
import { SKILL_DEFINITIONS } from "../data/SkillDefinitions";
import {
	type SkillDefinition,
	type SkillInstanceState,
	SkillStatus,
	SkillTargetType,
} from "../types/SkillTypes";
import { calculateDistance } from "../utils/CommonUtils";
import { createActionForm, handleUIError } from "../utils/UIHelpers";
import {
	getJobString,
	getPlayerJob,
	getPlayerRole,
	getRoleString,
	roleTypeToNumber,
} from "./ScoreboardManager";
import {
	canUseSkill,
	getPlayerSkills,
	getSkillStatistics,
	useSkill,
} from "./SkillManager";

/**
 * 能力メインメニューを表示
 */
export async function showSkillMenu(player: Player): Promise<void> {
	try {
		const form = createActionForm(
			"§l§d特殊能力システム",
			"§7能力を使用するメニューを選択してください",
		);

		const playerSkills = getPlayerSkills(player.id);

		if (playerSkills.size === 0) {
			form.body("§c利用可能な特殊能力がありません");
			form.button("閉じる", "textures/ui/cancel");
		} else {
			form.button("能力を使用", "textures/ui/gear");
			form.button("能力一覧", "textures/ui/book_edit_default");
			form.button("使用履歴", "textures/ui/creative_icon");
			form.button("能力説明", "textures/ui/magnifyingGlass");
			form.button("閉じる", "textures/ui/cancel");
		}

		const response = await form.show(player);

		if (response.canceled) return;

		if (playerSkills.size === 0) {
			return; // 能力がない場合は閉じるのみ
		}

		switch (response.selection) {
			case 0: // 能力を使用
				await showAbilitySelection(player);
				break;
			case 1: // 能力一覧
				await showAbilityList(player);
				break;
			case 2: // 使用履歴
				await showAbilityHistory(player);
				break;
			case 3: // 能力説明
				await showAbilityHelp(player);
				break;
		}
	} catch (error) {
		handleUIError(player, error as Error);
	}
}

/**
 * 能力選択画面を表示
 */
export async function showAbilitySelection(player: Player): Promise<void> {
	try {
		const playerSkills = getPlayerSkills(player.id);
		const availableSkills = Array.from(playerSkills.entries()).filter(
			([_, state]) => state.status === SkillStatus.AVAILABLE,
		);

		if (availableSkills.length === 0) {
			const form = new MessageFormData()
				.title("§l能力使用")
				.body(
					"§7現在使用可能な能力がありません\n\n§cクールダウン中か使用回数を消費済みです",
				)
				.button1("了解")
				.button2("閉じる");

			await form.show(player);
			return;
		}

		const form = createActionForm(
			"§l§2能力使用",
			"§7使用する能力を選択してください",
		);

		for (const [skillId, state] of availableSkills) {
			const definition = SKILL_DEFINITIONS[skillId];
			if (definition) {
				const statusIcon = getSkillStatusIcon(state);
				const usesText = `(${state.usesRemaining}/${definition.usesPerGame})`;
				form.button(
					`${statusIcon} §j${definition.name} ${usesText}`,
					"textures/ui/gear",
				);
			}
		}

		form.button("戻る", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled || response.selection === availableSkills.length) {
			await showSkillMenu(player);
			return;
		}

		const [selectedAbilityId] = availableSkills[response.selection!];
		await showAbilityConfirmation(player, selectedAbilityId);
	} catch (error) {
		handleUIError(player, error as Error);
	}
}

/**
 * 能力使用確認画面を表示
 */
async function showAbilityConfirmation(
	player: Player,
	skillId: string,
): Promise<void> {
	try {
		const definition = SKILL_DEFINITIONS[skillId];
		if (!definition) {
			player.sendMessage("§c能力定義が見つかりません");
			return;
		}

		// 使用可能チェック
		const canUse = canUseSkill(player, skillId);
		if (!canUse.success) {
			player.sendMessage(`§c${canUse.message}`);
			return;
		}

		const playerState = getPlayerSkills(player.id);
		const skillState = playerState.get(skillId);

		if (!skillState) {
			player.sendMessage("§c能力状態が見つかりません");
			return;
		}

		let confirmationText =
			`§6能力名: §j${definition.name}\n` +
			`§6説明: §7${definition.description}\n` +
			`§6残り回数: §j${skillState.usesRemaining}/${definition.usesPerGame}\n` +
			`§6クールダウン: §j${Math.floor(definition.cooldownTime / 60)}分\n`;

		if (definition.requiresTarget) {
			// 対象選択が必要な場合
			await showTargetSelection(player, skillId, definition);
			return;
		} else {
			confirmationText += "\n§7この能力を使用しますか？";
		}

		const form = new MessageFormData()
			.title("§l能力使用確認")
			.body(confirmationText)
			.button1("使用する")
			.button2("キャンセル");

		const response = await form.show(player);

		if (response.canceled || response.selection === 1) {
			await showAbilitySelection(player);
			return;
		}

		// 能力使用実行
		const result = await useSkill(player, skillId);

		if (result.success) {
			player.sendMessage(`§2${result.message}`);
		} else {
			player.sendMessage(`§c${result.message}`);
		}
	} catch (error) {
		handleUIError(player, error as Error);
	}
}

/**
 * 対象選択画面を表示
 */
async function showTargetSelection(
	player: Player,
	skillId: string,
	definition: SkillDefinition,
): Promise<void> {
	try {
		if (definition.targetType === SkillTargetType.PLAYER) {
			const alivePlayers = world.getAllPlayers();

			if (alivePlayers.length === 0) {
				player.sendMessage("§c対象となるプレイヤーがいません");
				return;
			}

			const form = createActionForm(
				`§l§6対象選択 - ${definition.name}`,
				"§7能力の対象を選択してください",
			);

			for (const target of alivePlayers) {
				const distance = calculateDistance(player.location, target.location);
				const inRange = distance <= definition.range;
				const statusIcon = inRange ? "§2" : "§c";
				const distanceText = `(${Math.round(distance)}m)`;

				form.button(
					`${statusIcon} §j${target.name} ${distanceText}`,
					"textures/ui/friend_glyph",
				);
			}

			form.button("キャンセル", "textures/ui/cancel");

			const response = await form.show(player);

			if (response.canceled || response.selection === alivePlayers.length) {
				await showAbilitySelection(player);
				return;
			}

			const selectedTarget = alivePlayers[response.selection!];

			// 最終確認
			await showTargetConfirmation(player, skillId, definition, selectedTarget);
		} else {
			// その他の対象タイプ（エリア等）は直接実行
			const result = await useSkill(player, skillId);

			if (result.success) {
				player.sendMessage(`§2${result.message}`);
			} else {
				player.sendMessage(`§c${result.message}`);
			}
		}
	} catch (error) {
		handleUIError(player, error as Error);
	}
}

/**
 * 対象確認画面を表示
 */
async function showTargetConfirmation(
	player: Player,
	skillId: string,
	definition: SkillDefinition,
	target: Player,
): Promise<void> {
	try {
		const distance = Math.round(
			calculateDistance(player.location, target.location),
		);
		const inRange = distance <= definition.range;

		if (!inRange) {
			player.sendMessage(
				`§c対象が範囲外です（${distance}m > ${definition.range}m）`,
			);
			return;
		}

		const form = new MessageFormData()
			.title("§l能力使用確認")
			.body(
				`§6能力: §j${definition.name}\n` +
					`§6対象: §j${target.name}\n` +
					`§6距離: §j${distance}m / ${definition.range}m\n\n` +
					`§7${definition.description}\n\n` +
					"§7この対象に能力を使用しますか？",
			)
			.button1("使用する")
			.button2("キャンセル");

		const response = await form.show(player);

		if (response.canceled || response.selection === 1) {
			await showTargetSelection(player, skillId, definition);
			return;
		}

		// 能力使用実行
		const result = await useSkill(player, skillId, target.id);

		if (result.success) {
			player.sendMessage(`§2${result.message}`);
		} else {
			player.sendMessage(`§c${result.message}`);
		}
	} catch (error) {
		console.error(
			`Failed to show target confirmation for ${player.name}:`,
			error,
		);
		player.sendMessage("§c対象確認の表示に失敗しました");
	}
}

/**
 * 能力一覧を表示
 */
export async function showAbilityList(player: Player): Promise<void> {
	try {
		const playerSkills = getPlayerSkills(player.id);

		if (playerSkills.size === 0) {
			const form = new MessageFormData()
				.title("§l能力一覧")
				.body("§7利用可能な特殊能力がありません")
				.button1("了解")
				.button2("閉じる");

			await form.show(player);
			return;
		}

		let listText = "§6=== 所持能力一覧 ===\n\n";

		for (const [skillId, state] of playerSkills.entries()) {
			const definition = SKILL_DEFINITIONS[skillId];
			if (definition) {
				const statusIcon = getSkillStatusIcon(state);
				const statusText = getSkillStatusText(state);

				listText += `${statusIcon} §j${definition.name}\n`;
				listText += `§7${definition.description}\n`;
				listText += `§7状態: ${statusText}\n`;
				listText += `§7使用回数: §j${state.usesRemaining}/${definition.usesPerGame}\n`;

				if (state.status === SkillStatus.COOLDOWN) {
					const remaining = Math.ceil((state.cooldownEnd - Date.now()) / 1000);
					listText += `§7クールダウン: §j${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, "0")}\n`;
				}

				listText += "\n";
			}
		}

		const form = new MessageFormData()
			.title("§l能力一覧")
			.body(listText)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show skill list for ${player.name}:`, error);
		player.sendMessage("§c能力一覧の表示に失敗しました");
	}
}

/**
 * 能力使用履歴を表示
 */
export async function showAbilityHistory(player: Player): Promise<void> {
	try {
		const stats = getSkillStatistics();
		const playerUsages = stats.usagesByPlayer.get(player.id) || 0;

		if (playerUsages === 0) {
			const form = new MessageFormData()
				.title("§l使用履歴")
				.body("§7まだ能力を使用していません")
				.button1("了解")
				.button2("閉じる");

			await form.show(player);
			return;
		}

		let historyText = `§6=== 能力使用履歴 ===\n\n`;
		historyText += `§7総使用回数: §j${playerUsages}回\n`;
		historyText += `§7システム全体成功率: §j${Math.round(stats.successRate)}%\n\n`;

		// 簡易的な使用履歴表示（実際の履歴データは実装を拡張する必要があります）
		historyText += "§7最近の使用能力:\n";

		const playerSkills = getPlayerSkills(player.id);
		for (const [skillId, state] of playerSkills.entries()) {
			const definition = SKILL_DEFINITIONS[skillId];
			if (definition) {
				const usedCount = definition.usesPerGame - state.usesRemaining;
				if (usedCount > 0) {
					historyText += `§j- ${definition.name}: ${usedCount}回使用\n`;
				}
			}
		}

		const form = new MessageFormData()
			.title("§l使用履歴")
			.body(historyText)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show skill history for ${player.name}:`, error);
		player.sendMessage("§c使用履歴の表示に失敗しました");
	}
}

/**
 * 能力説明を表示
 */
export async function showAbilityHelp(player: Player): Promise<void> {
	try {
		const role = getRoleString(roleTypeToNumber(getPlayerRole(player)));
		const job = getJobString(getPlayerJob(player));

		let helpText = `§6=== 特殊能力システム ===\n\n`;
		helpText += `§7あなたの役職: §j${role}\n`;
		helpText += `§7あなたの職業: §j${job}\n\n`;

		helpText += "§6能力について:\n";
		helpText += "§7• 役職と職業に応じて特殊能力が付与されます\n";
		helpText += "§7• 各能力には使用回数制限があります\n";
		helpText += "§7• クールダウン時間が設定されています\n";
		helpText += "§7• フェーズによって使用可能な能力が制限されます\n\n";

		helpText += "§6能力の効果:\n";
		helpText += "§2探偵: §7調査・証拠捜索能力\n";
		helpText += "§3医者: §7治療・検死能力\n";
		helpText += "§6警備員: §7護衛・巡回能力\n";
		helpText += "§d記者: §7インタビュー・放送能力\n";
		helpText += "§c犯人: §7殺人・妨害能力\n";
		helpText += "§6共犯者: §7協力・注意逸らし能力\n\n";

		helpText += "§7※ 詳細は能力一覧で確認できます";

		const form = new MessageFormData()
			.title("§l能力説明")
			.body(helpText)
			.button1("了解")
			.button2("閉じる");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show skill help for ${player.name}:`, error);
		player.sendMessage("§c能力説明の表示に失敗しました");
	}
}

/**
 * 能力状態アイコン取得
 */
function getSkillStatusIcon(state: SkillInstanceState): string {
	switch (state.status) {
		case SkillStatus.AVAILABLE:
			return "§2✓";
		case SkillStatus.COOLDOWN:
			return "§6⏱";
		case SkillStatus.DISABLED:
			return "§c✗";
		case SkillStatus.USED:
			return "§7";
		default:
			return "§7?";
	}
}

/**
 * 能力状態テキスト取得
 */
function getSkillStatusText(state: SkillInstanceState): string {
	switch (state.status) {
		case SkillStatus.AVAILABLE:
			return "§2使用可能";
		case SkillStatus.COOLDOWN:
			return "§6クールダウン中";
		case SkillStatus.DISABLED:
			return "§c使用不可";
		case SkillStatus.USED:
			return "§7使用済み";
		default:
			return "§7不明";
	}
}

/**
 * 距離計算
 */
