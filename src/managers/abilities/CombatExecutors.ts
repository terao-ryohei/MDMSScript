import { system, world } from "@minecraft/server";
import type { Player } from "@minecraft/server";
import type { AbilityDefinition, AbilityEffect, AbilityResult } from "../../types/AbilityTypes";
import { RoleType } from "../../types/RoleTypes";
import { getPlayerRole, isPlayerAlive, setPlayerAlive } from "../ScoreboardManager";
import { createErrorResult, createSuccessResult, createEffect, type AbilityExecutorFunction } from "./BaseAbilityExecutor";

/**
 * 殺人アビリティ実行関数
 */
export const createMurderExecutor = (activeEffects: Map<string, AbilityEffect>): AbilityExecutorFunction =>
  async (player: Player, definition: AbilityDefinition, target?: Player): Promise<AbilityResult> => {
    if (!target) {
      return createErrorResult("対象が指定されていません", "No target specified");
    }

    if (!isPlayerAlive(target)) {
      return createErrorResult("対象は既に死亡しています", "Target is already dead");
    }

    // 護衛効果チェック
    const protectionEffect = Array.from(activeEffects.values()).find(
      effect => 
        effect.targetId === target.id && 
        effect.effectType === "protection" && 
        effect.isActive
    );

    if (protectionEffect) {
      // 護衛によって阻止
      activeEffects.delete(protectionEffect.id);

      const protector = world.getAllPlayers().find(p => p.id === protectionEffect.data.protectorId);
      if (protector) {
        protector.sendMessage(`§c${target.name}への攻撃を阻止しました！`);
        target.sendMessage("§a護衛によって攻撃が阻止されました！");
        player.sendMessage("§c攻撃が護衛によって阻止されました");
      }

      return createErrorResult("攻撃が護衛によって阻止されました", "Attack blocked by guard");
    }

    // 殺人実行
    setPlayerAlive(target, false);

    // 殺人イベントをトリガー
    system.run(() => {
      world
        .getDimension("overworld")
        .runCommand(
          `scriptevent mdms:murder {"murdererId":"${player.id}","victimId":"${target.id}","method":"ability"}`
        );
    });

    world.sendMessage(`§c${target.name}が殺害されました！`);
    target.sendMessage("§c§lあなたは殺害されました");

    return createSuccessResult(`${target.name}を殺害しました`, {
      affectedPlayers: [target.id],
    });
  };

/**
 * 護衛アビリティ実行関数
 */
export const createGuardExecutor = (activeEffects: Map<string, AbilityEffect>): AbilityExecutorFunction =>
  async (player: Player, definition: AbilityDefinition, target?: Player): Promise<AbilityResult> => {
    if (!target) {
      return createErrorResult("対象が指定されていません", "No target specified");
    }

    const effect = createEffect(definition, target.id, "protection", { protectorId: player.id });
    activeEffects.set(effect.id, effect);

    player.sendMessage(`§a${target.name}を護衛しました（${Math.floor(definition.duration / 3600)}時間）`);
    target.sendMessage("§a警備員によって護衛されています");

    return createSuccessResult(`${target.name}を護衛しました`, {
      effectDuration: definition.duration,
      affectedPlayers: [target.id],
    });
  };

/**
 * 妨害工作アビリティ実行関数
 */
export const createSabotageExecutor = (activeEffects: Map<string, AbilityEffect>): AbilityExecutorFunction =>
  async (player: Player, definition: AbilityDefinition, target?: Player): Promise<AbilityResult> => {
    if (!target) {
      return createErrorResult("対象が指定されていません", "No target specified");
    }

    const effect = createEffect(definition, target.id, "sabotage", { saboteurId: player.id });
    activeEffects.set(effect.id, effect);

    player.sendMessage(`§c${target.name}の行動を妨害しました（${Math.floor(definition.duration / 60)}分間）`);
    target.sendMessage("§c何者かによって行動が妨害されています");

    return createSuccessResult(`${target.name}を妨害しました`, {
      effectDuration: definition.duration,
      affectedPlayers: [target.id],
    });
  };

/**
 * 協力アビリティ実行関数
 */
export const createAssistExecutor = (activeEffects: Map<string, AbilityEffect>): AbilityExecutorFunction =>
  async (player: Player, definition: AbilityDefinition, target?: Player): Promise<AbilityResult> => {
    if (!target) {
      return createErrorResult("対象が指定されていません", "No target specified");
    }

    // 対象が犯人かチェック
    const targetRole = getPlayerRole(target);
    if (targetRole !== RoleType.MURDERER) {
      return createErrorResult("対象は犯人ではありません", "Target is not murderer");
    }

    const effect = createEffect(definition, target.id, "assistance", { assistantId: player.id, boost: 1.5 });
    activeEffects.set(effect.id, effect);

    player.sendMessage(`§6${target.name}をサポートしました（${Math.floor(definition.duration / 60)}分間）`);
    target.sendMessage("§6共犯者からのサポートを受けています");

    return createSuccessResult(`${target.name}をサポートしました`, {
      effectDuration: definition.duration,
      affectedPlayers: [target.id],
    });
  };