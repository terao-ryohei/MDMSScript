import type { Player } from "@minecraft/server";
import { world } from "@minecraft/server";
import { JOB_DEFINITIONS } from "src/data/JobDefinitions";
import type {
	SkillDefinition,
	SkillEffect,
	SkillResult,
} from "../../types/SkillTypes";
import { getPlayerActions } from "../ActionTrackingManager";
import {
	getPlayerJob,
	getPlayerRole,
	getRoleString,
	roleTypeToNumber,
} from "../ScoreboardManager";
import {
	createEffect,
	createErrorResult,
	createSuccessResult,
	type SkillExecutorFunction,
} from "./BaseSkillExecutor";

/**
 * プレイヤー行動分析
 */
const analyzePlayerBehavior = (target: Player): string => {
	const actions = getPlayerActions(target.id, 20);
	if (actions.length === 0) return "行動データなし";

	const actionTypes = actions.map((a) => a.actionType);
	const uniqueTypes = new Set(actionTypes);

	if (uniqueTypes.size > 5) return "活発";
	if (uniqueTypes.size > 3) return "普通";
	return "静観";
};

/**
 * 調査アビリティ実行関数
 */
export const executeInvestigate: SkillExecutorFunction = async (
	player: Player,
	definition: SkillDefinition,
	target?: Player,
): Promise<SkillResult> => {
	if (!target) {
		return createErrorResult("対象が指定されていません", "No target specified");
	}

	const role = getRoleString(roleTypeToNumber(getPlayerRole(target)));
	const job = JOB_DEFINITIONS[getPlayerJob(target)].name;

	const playerActions = getPlayerActions(target.id, 10);
	const recentActions = playerActions
		.slice(0, 3)
		.map(
			(action) =>
				`${action.actionType} (${new Date(action.timestamp * 1000).toLocaleTimeString()})`,
		)
		.join(", ");

	const investigationResult =
		`§6=== ${target.name} の調査結果 ===\n\n` +
		`§7最近の行動: §j${recentActions || "なし"}\n` +
		`§7行動パターン: §j${analyzePlayerBehavior(target)}\n\n`;

	player.sendMessage(investigationResult);

	return createSuccessResult(`${target.name}を調査しました`, {
		data: {
			targetId: target.id,
			role: role,
			job: job,
			behaviorPattern: analyzePlayerBehavior(target),
		},
	});
};

/**
 * 証拠捜索アビリティ実行関数
 */
export const createSearchEvidenceExecutor =
	(activeEffects: Map<string, SkillEffect>): SkillExecutorFunction =>
	async (player: Player, definition: SkillDefinition): Promise<SkillResult> => {
		const effect = createEffect(definition, player.id, "evidence_boost", {
			boost: 2.0,
		});
		activeEffects.set(effect.id, effect);

		player.sendMessage(
			`§2証拠捜索モードが有効になりました（${Math.floor(definition.duration / 60)}分間）`,
		);
		player.sendMessage("§7周囲での行動で証拠を発見しやすくなります");

		return createSuccessResult("証拠捜索能力を発動しました", {
			effectDuration: definition.duration,
			data: { effectId: effect.id },
		});
	};

/**
 * 検死アビリティ実行関数
 */
export const executeAutopsy: SkillExecutorFunction = async (
	player: Player,
	definition: SkillDefinition,
	target?: Player,
): Promise<SkillResult> => {
	if (!target) {
		return createErrorResult("対象が指定されていません", "No target specified");
	}

	const deathActions = getPlayerActions(target.id).filter(
		(action) => action.actionType === "death" || action.actionType === "murder",
	);

	let autopsyResult = `§6=== ${target.name} の検死結果 ===\n\n`;

	if (deathActions.length > 0) {
		const deathAction = deathActions[0];
		autopsyResult += `§7死亡時刻: §j${new Date(deathAction.timestamp * 1000).toLocaleString()}\n`;
		autopsyResult += `§7死因: §j${deathAction.data.method || "不明"}\n`;
		autopsyResult += `§7発見場所: §j${Math.round(deathAction.location.x)}, ${Math.round(deathAction.location.y)}, ${Math.round(deathAction.location.z)}\n`;

		if (deathAction.witnessIds.length > 0) {
			const witnesses = deathAction.witnessIds
				.map((id) => {
					const witness = world.getAllPlayers().find((p) => p.id === id);
					return witness ? witness.name : "不明";
				})
				.join(", ");
			autopsyResult += `§7目撃者: §j${witnesses}\n`;
		}
	} else {
		autopsyResult += "§7詳細な死因は特定できませんでした\n";
	}

	autopsyResult += "\n§7※ この情報は証拠として記録されました";
	player.sendMessage(autopsyResult);

	return createSuccessResult(`${target.name}の検死を行いました`, {
		discoveredEvidence: [`autopsy_${target.id}_${Date.now()}`],
		data: { deathActions },
	});
};
