import { world } from "@minecraft/server";
import type { Player } from "@minecraft/server";
import { calculateDistance } from "../../utils/CommonUtils";
import type { AbilityDefinition, AbilityEffect, AbilityResult } from "../../types/AbilityTypes";
import { getEvidenceData } from "../EvidenceAnalyzer";
import { getPlayerActions } from "../ActionTrackingManager";
import { isPlayerAlive } from "../ScoreboardManager";
import { createErrorResult, createSuccessResult, createEffect, type AbilityExecutorFunction } from "./BaseAbilityExecutor";

/**
 * 距離計算ヘルパー関数
 */


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
export const executeHeal: AbilityExecutorFunction = async (
  player: Player,
  definition: AbilityDefinition,
  target?: Player
): Promise<AbilityResult> => {
  if (!target) {
    return createErrorResult("対象が指定されていません", "No target specified");
  }

  if (isPlayerAlive(target)) {
    return createErrorResult("対象は既に健康です", "Target is already healthy");
  }

  // 死亡プレイヤーの蘇生（特別な条件下でのみ）
  // 通常は重傷状態の回復として実装

  player.sendMessage(`§a${target.name}を治療しました`);
  target.sendMessage("§a医者によって治療されました");

  // 治療効果を全体に通知
  world.sendMessage(`§b${player.name}が${target.name}を治療しました`);

  return createSuccessResult(`${target.name}を治療しました`, {
    affectedPlayers: [target.id],
  });
};

/**
 * インタビューアビリティ実行関数
 */
export const executeInterview: AbilityExecutorFunction = async (
  player: Player,
  definition: AbilityDefinition,
  target?: Player
): Promise<AbilityResult> => {
  if (!target) {
    return createErrorResult("対象が指定されていません", "No target specified");
  }

  // 対象プレイヤーの最近の証言や行動から情報を抽出
  const recentActions = getPlayerActions(target.id, 5);
  const suspicionLevel = 0; // 疑惑スコア計算機能を削除

  const interviewResult =
    `§6=== ${target.name} へのインタビュー結果 ===\n\n` +
    `§7協力度: §f${suspicionLevel < 0.3 ? "積極的" : suspicionLevel < 0.7 ? "普通" : "消極的"}\n` +
    `§7証言の信頼性: §f${calculateTestimonyReliability(target)}%\n` +
    `§7新しい情報: §f${generateInterviewInfo(target)}\n\n` +
    `§7※ この情報は証拠として記録されました`;

  player.sendMessage(interviewResult);
  target.sendMessage(`§b${player.name}からインタビューを受けました`);

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
export const executeBroadcast: AbilityExecutorFunction = async (
  player: Player,
  definition: AbilityDefinition
): Promise<AbilityResult> => {
  // 重要な証拠情報を全プレイヤーに伝達
  const evidence = getEvidenceData();

  let broadcastMessage =
    `§6=== 緊急報道 ===\n` + `§7記者 ${player.name} からの重要情報:\n\n`;

  if (evidence.length > 0) {
    const latestEvidence = evidence[0];
    broadcastMessage +=
      `§7最新の重要証拠を発見:\n` +
      `§7時刻: §f${new Date(latestEvidence.timestamp * 1000).toLocaleTimeString("ja-JP")}\n` +
      `§7関係者: §f${latestEvidence.playerId}\n` +
      `§7内容: §f${latestEvidence.actionType}\n`;
  } else {
    broadcastMessage += `§7現在、明確な容疑者は特定されていません\n`;
  }

  broadcastMessage += `§7証拠総数: §f${evidence.length}件\n`;
  broadcastMessage += `§6========================`;

  world.sendMessage(broadcastMessage);

  return createSuccessResult("重要情報を放送しました", {
    affectedPlayers: world.getAllPlayers().map(p => p.id),
  });
};

/**
 * 巡回アビリティ実行関数
 */
export const createPatrolExecutor = (activeEffects: Map<string, AbilityEffect>): AbilityExecutorFunction =>
  async (player: Player, definition: AbilityDefinition): Promise<AbilityResult> => {
    const effect = createEffect(definition, player.id, "detection", { range: definition.detectRange });
    activeEffects.set(effect.id, effect);

    player.sendMessage(`§a巡回モードが有効になりました（${Math.floor(definition.duration / 60)}分間）`);
    player.sendMessage("§7異常行動を検出しやすくなります");

    return createSuccessResult("巡回能力を発動しました", {
      effectDuration: definition.duration,
    });
  };

/**
 * 注意逸らしアビリティ実行関数
 */
export const createDistractExecutor = (activeEffects: Map<string, AbilityEffect>): AbilityExecutorFunction =>
  async (player: Player, definition: AbilityDefinition): Promise<AbilityResult> => {
    // 周囲のプレイヤーに影響を与える
    const nearbyPlayers = world.getAllPlayers().filter(p => {
      if (p.id === player.id) return false;
      const distance = calculateDistance(player.location, p.location);
      return distance <= definition.range;
    });

    for (const nearbyPlayer of nearbyPlayers) {
      const effect = createEffect(definition, nearbyPlayer.id, "distraction", { distractorId: player.id });
      activeEffects.set(effect.id, effect);
      nearbyPlayer.sendMessage("§7何かに気を取られています...");
    }

    player.sendMessage(`§6周囲の注意を逸らしました（${nearbyPlayers.length}人に影響）`);

    return createSuccessResult("注意逸らしを発動しました", {
      effectDuration: definition.duration,
      affectedPlayers: nearbyPlayers.map(p => p.id),
    });
  };