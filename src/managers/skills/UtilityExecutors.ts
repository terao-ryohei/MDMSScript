import type { Player } from "@minecraft/server";
import { world } from "@minecraft/server";
import type {
	SkillDefinition,
	SkillEffect,
	SkillResult,
} from "../../types/SkillTypes";
import { calculateDistance } from "../../utils/CommonUtils";
import { getPlayerActions } from "../ActionTrackingManager";
import { getEvidenceData } from "../EvidenceAnalyzer";
import {
	createEffect,
	createErrorResult,
	createSuccessResult,
	type SkillExecutorFunction,
} from "./BaseSkillExecutor";

/**
 * 証言信頼性計算
 */
const calculateTestimonyReliability = (player: Player): number => {
	// 簡易的な信頼性計算（分析機能を削除したため固定値）
	return 75; // デフォルト75%
};

/**
 * インタビュー情報生成
 */
const generateInterviewInfo = (player: Player): string => {
	const recentActions = getPlayerActions(player.id, 3);
	if (recentActions.length === 0) return "特になし";

	const lastAction = recentActions[0];
	return `${lastAction.actionType}に関する証言を得た`;
};

/**
 * 治療アビリティ実行関数
 */
export const executeHeal: SkillExecutorFunction = async (
	player: Player,
	definition: SkillDefinition,
	target?: Player,
): Promise<SkillResult> => {
	if (!target) {
		return createErrorResult("対象が指定されていません", "No target specified");
	}

	// 死亡プレイヤーの蘇生（特別な条件下でのみ）
	// 通常は重傷状態の回復として実装

	player.sendMessage(`§2${target.name}を治療しました`);
	target.sendMessage("§2医者によって治療されました");

	// 治療効果を全体に通知
	world.sendMessage(`§3${player.name}が${target.name}を治療しました`);

	return createSuccessResult(`${target.name}を治療しました`, {
		affectedPlayers: [target.id],
	});
};

/**
 * インタビューアビリティ実行関数
 */
export const executeInterview: SkillExecutorFunction = async (
	player: Player,
	definition: SkillDefinition,
	target?: Player,
): Promise<SkillResult> => {
	if (!target) {
		return createErrorResult("対象が指定されていません", "No target specified");
	}

	// 対象プレイヤーの最近の証言や行動から情報を抽出
	const suspicionLevel = 0; // 疑惑スコア計算機能を削除

	const interviewResult =
		`§6=== ${target.name} へのインタビュー結果 ===\n\n` +
		`§7協力度: §j${suspicionLevel < 0.3 ? "積極的" : suspicionLevel < 0.7 ? "普通" : "消極的"}\n` +
		`§7証言の信頼性: §j${calculateTestimonyReliability(target)}%\n` +
		`§7新しい情報: §j${generateInterviewInfo(target)}\n\n` +
		`§7※ この情報は証拠として記録されました`;

	player.sendMessage(interviewResult);
	target.sendMessage(`§3${player.name}からインタビューを受けました`);

	return createSuccessResult(`${target.name}にインタビューしました`, {
		discoveredEvidence: [`interview_${target.id}_${Date.now()}`],
		data: {
			suspicionLevel,
			reliability: calculateTestimonyReliability(target),
		},
	});
};

/**
 * 放送アビリティ実行関数
 */
export const executeBroadcast: SkillExecutorFunction = async (
	player: Player,
	definition: SkillDefinition,
): Promise<SkillResult> => {
	// 重要な証拠情報を全プレイヤーに伝達
	const evidence = getEvidenceData();

	let broadcastMessage =
		`§6=== 緊急報道 ===\n` + `§7記者 ${player.name} からの重要情報:\n\n`;

	if (evidence.length > 0) {
		const latestEvidence = evidence[0];
		broadcastMessage +=
			`§7最新の重要証拠を発見:\n` +
			`§7時刻: §j${new Date(latestEvidence.timestamp * 1000).toLocaleTimeString("ja-JP")}\n` +
			`§7関係者: §j${latestEvidence.playerId}\n` +
			`§7内容: §j${latestEvidence.actionType}\n`;
	} else {
		broadcastMessage += `§7現在、明確な容疑者は特定されていません\n`;
	}

	broadcastMessage += `§7証拠総数: §j${evidence.length}件\n`;
	broadcastMessage += `§6========================`;

	world.sendMessage(broadcastMessage);

	return createSuccessResult("重要情報を放送しました", {
		affectedPlayers: world.getAllPlayers().map((p) => p.id),
	});
};

/**
 * 注意逸らしアビリティ実行関数
 */
export const createDistractExecutor =
	(activeEffects: Map<string, SkillEffect>): SkillExecutorFunction =>
	async (player: Player, definition: SkillDefinition): Promise<SkillResult> => {
		// 周囲のプレイヤーに影響を与える
		const nearbyPlayers = world.getAllPlayers().filter((p) => {
			if (p.id === player.id) return false;
			const distance = calculateDistance(player.location, p.location);
			return distance <= definition.range;
		});

		for (const nearbyPlayer of nearbyPlayers) {
			const effect = createEffect(definition, nearbyPlayer.id, "distraction", {
				distractorId: player.id,
			});
			activeEffects.set(effect.id, effect);
			nearbyPlayer.sendMessage("§7何かに気を取られています...");
		}

		player.sendMessage(
			`§6周囲の注意を逸らしました（${nearbyPlayers.length}人に影響）`,
		);

		return createSuccessResult("注意逸らしを発動しました", {
			affectedPlayers: nearbyPlayers.map((p) => p.id),
		});
	};
