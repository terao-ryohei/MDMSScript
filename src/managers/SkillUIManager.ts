/**
 * スキルUI管理関数群
 */

import { type Player, world } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import {
  getPlayerSkills,
  getSkillCooldowns,
  getSkillRemainingUses,
  getSkillUsageHistory,
  useSkill,
} from "./SkillManager";

/**
 * スキルメインメニューを表示
 */
export async function showSkillMenu(player: Player): Promise<void> {
  try {
    const playerSkillData = getPlayerSkills(player.id);
    
    if (!playerSkillData) {
      player.sendMessage("§cスキルデータが見つかりません");
      return;
    }
    
    const form = new ActionFormData()
      .title("§l§dスキルメニュー")
      .body("§7使用するスキルを選択してください")
      .button("§a職業スキル", "textures/ui/anvil_icon")
      .button("§c役職スキル", "textures/ui/book_edit_default") 
      .button("§d汎用スキル", "textures/ui/creative_icon")
      .button("§6スキル情報", "textures/ui/info_glyph")
      .button("§7履歴", "textures/ui/clock")
      .button("§7閉じる", "textures/ui/cancel");

    const response = await form.show(player);

    if (response.canceled) return;

    switch (response.selection) {
      case 0: // 職業スキル
        await showSkillUsage(player, "job");
        break;
      case 1: // 役職スキル
        await showSkillUsage(player, "role");
        break;
      case 2: // 汎用スキル
        await showSkillUsage(player, "random");
        break;
      case 3: // スキル情報
        await showSkillInfo(player);
        break;
      case 4: // 履歴
        await showSkillHistory(player);
        break;
      case 5: // 閉じる
        break;
    }
  } catch (error) {
    console.error(`Failed to show skill menu for ${player.name}:`, error);
    player.sendMessage("§cスキルメニューの表示に失敗しました");
  }
}

/**
 * スキル使用画面を表示
 */
async function showSkillUsage(player: Player, skillType: "job" | "role" | "random"): Promise<void> {
  try {
    const playerSkillData = getPlayerSkills(player.id);
    if (!playerSkillData) return;

    const cooldowns = getSkillCooldowns(player.id);
    const remainingUses = getSkillRemainingUses(player.id);

    let skill;
    let cooldown;
    let remaining;
    let skillTypeDisplay;

    switch (skillType) {
      case "job":
        skill = playerSkillData.jobSkill;
        cooldown = cooldowns.jobCooldown;
        remaining = remainingUses.jobRemaining;
        skillTypeDisplay = "職業スキル";
        break;
      case "role":
        skill = playerSkillData.roleSkill;
        cooldown = cooldowns.roleCooldown;
        remaining = remainingUses.roleRemaining;
        skillTypeDisplay = "役職スキル";
        break;
      case "random":
        skill = playerSkillData.randomSkill;
        cooldown = cooldowns.randomCooldown;
        remaining = remainingUses.randomRemaining;
        skillTypeDisplay = "汎用スキル";
        break;
    }

    const canUse = cooldown === 0 && remaining > 0;
    const statusText = cooldown > 0 ? 
      `§cクールダウン中 (残り${cooldown}秒)` :
      remaining === 0 ? 
        "§c使用回数上限" :
        "§a使用可能";

    // 対象選択が必要なスキルかチェック
    const requiresTarget = skill.executeSkill.length > 1;

    if (requiresTarget) {
      await showTargetSelection(player, skillType, skill);
    } else {
      // 使用確認
      const form = new MessageFormData()
        .title(`§l§d${skillTypeDisplay}使用`)
        .body(
          `§6スキル名: §f${skill.name}\n` +
          `§6説明: §f${skill.description}\n` +
          `§6残り使用回数: §f${remaining === 999 ? "無制限" : remaining}回\n` +
          `§6状態: ${statusText}\n\n` +
          "§7このスキルを使用しますか？"
        )
        .button1(canUse ? "§a使用する" : "§8使用できません")
        .button2("§cキャンセル");

      const response = await form.show(player);

      if (response.canceled || response.selection === 1 || !canUse) return;

      const result = useSkill(player, skillType);
      player.sendMessage(result.success ? `§a${result.message}` : `§c${result.message}`);
    }
  } catch (error) {
    console.error(`Failed to show skill usage for ${player.name}:`, error);
    player.sendMessage("§cスキル使用画面の表示に失敗しました");
  }
}

/**
 * 対象選択画面を表示
 */
async function showTargetSelection(player: Player, skillType: "job" | "role" | "random", skill: any): Promise<void> {
  try {
    const players = world.getAllPlayers().filter(p => p.id !== player.id);

    if (players.length === 0) {
      player.sendMessage("§c対象となるプレイヤーがいません");
      return;
    }

    const form = new ActionFormData()
      .title(`§l§d${skill.name}の対象選択`)
      .body(`§7${skill.description}\n\n§6対象プレイヤーを選択してください:`);

    for (const target of players) {
      form.button(`§f${target.name}`, "textures/ui/friend_glyph");
    }

    form.button("§7キャンセル", "textures/ui/cancel");

    const response = await form.show(player);

    if (response.canceled || response.selection === players.length) return;

    const target = players[response.selection!];
    const result = useSkill(player, skillType, target);
    player.sendMessage(result.success ? `§a${result.message}` : `§c${result.message}`);
  } catch (error) {
    console.error(`Failed to show target selection for ${player.name}:`, error);
    player.sendMessage("§c対象選択画面の表示に失敗しました");
  }
}

/**
 * スキル情報を表示
 */
async function showSkillInfo(player: Player): Promise<void> {
  try {
    const playerSkillData = getPlayerSkills(player.id);
    if (!playerSkillData) return;

    const cooldowns = getSkillCooldowns(player.id);
    const remainingUses = getSkillRemainingUses(player.id);

    const form = new MessageFormData()
      .title("§l§6スキル情報")
      .body(
        `§a==== 職業スキル ====\n` +
        `§6名前: §f${playerSkillData.jobSkill.name}\n` +
        `§6説明: §f${playerSkillData.jobSkill.description}\n` +
        `§6クールダウン: §f${playerSkillData.jobSkill.cooldown}秒\n` +
        `§6使用回数: §f${playerSkillData.jobSkill.usageCount === -1 ? "無制限" : playerSkillData.jobSkill.usageCount}回\n` +
        `§6残り: §f${remainingUses.jobRemaining === 999 ? "無制限" : remainingUses.jobRemaining}回\n` +
        `§6状態: ${cooldowns.jobCooldown > 0 ? `§cクールダウン中 (${cooldowns.jobCooldown}秒)` : "§a使用可能"}\n\n` +

        `§c==== 役職スキル ====\n` +
        `§6名前: §f${playerSkillData.roleSkill.name}\n` +
        `§6説明: §f${playerSkillData.roleSkill.description}\n` +
        `§6クールダウン: §f${playerSkillData.roleSkill.cooldown}秒\n` +
        `§6使用回数: §f${playerSkillData.roleSkill.usageCount === -1 ? "無制限" : playerSkillData.roleSkill.usageCount}回\n` +
        `§6残り: §f${remainingUses.roleRemaining === 999 ? "無制限" : remainingUses.roleRemaining}回\n` +
        `§6状態: ${cooldowns.roleCooldown > 0 ? `§cクールダウン中 (${cooldowns.roleCooldown}秒)` : "§a使用可能"}\n\n` +

        `§d==== 汎用スキル ====\n` +
        `§6名前: §f${playerSkillData.randomSkill.name}\n` +
        `§6説明: §f${playerSkillData.randomSkill.description}\n` +
        `§6クールダウン: §f${playerSkillData.randomSkill.cooldown}秒\n` +
        `§6使用回数: §f${playerSkillData.randomSkill.usageCount === -1 ? "無制限" : playerSkillData.randomSkill.usageCount}回\n` +
        `§6残り: §f${remainingUses.randomRemaining === 999 ? "無制限" : remainingUses.randomRemaining}回\n` +
        `§6状態: ${cooldowns.randomCooldown > 0 ? `§cクールダウン中 (${cooldowns.randomCooldown}秒)` : "§a使用可能"}`
      )
      .button1("§a了解")
      .button2("§7閉じる");

    await form.show(player);
  } catch (error) {
    console.error(`Failed to show skill info for ${player.name}:`, error);
    player.sendMessage("§cスキル情報の表示に失敗しました");
  }
}

/**
 * スキル使用履歴を表示
 */
async function showSkillHistory(player: Player): Promise<void> {
  try {
    const history = getSkillUsageHistory(player.id);

    if (history.length === 0) {
      const form = new MessageFormData()
        .title("§l§eスキル使用履歴")
        .body("§7まだスキルを使用していません。")
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);
      return;
    }

    const historyText = history
      .slice(-10) // 最新10件
      .reverse()
      .map((record, index) => {
        const date = new Date(record.timestamp).toLocaleString();
        const target = record.targetName ? ` → ${record.targetName}` : "";
        return `§6[${index + 1}] §f${record.skillName}${target}\n§7${record.result} - ${date}`;
      })
      .join("\n\n");

    const form = new MessageFormData()
      .title("§l§eスキル使用履歴")
      .body(
        `§6使用回数: §f${history.length}回\n\n` +
        `§6最近の使用履歴 (最大10件):\n${historyText}`
      )
      .button1("§a了解")
      .button2("§7閉じる");

    await form.show(player);
  } catch (error) {
    console.error(`Failed to show skill history for ${player.name}:`, error);
    player.sendMessage("§cスキル履歴の表示に失敗しました");
  }
}