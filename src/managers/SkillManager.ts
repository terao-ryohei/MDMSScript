/**
 * スキル管理マネージャー
 */

import { type Player, world, system } from "@minecraft/server";
import { JobType } from "../types/JobTypes";
import { RoleType } from "../types/RoleTypes";
import {
  type Skill,
  type PlayerSkills,
  type SkillUsageRecord,
  type SkillExecutionResult,
  ROLE_SKILLS,
  RANDOM_SKILLS,
} from "../types/SkillTypes";
import { getPlayerJob, getPlayerRole } from "./ScoreboardManager";
import { JOB_DEFINITIONS } from "../data/JobDefinitions";

// モジュールスコープ変数
let playerSkills: Map<string, PlayerSkills> = new Map();
let skillUsageHistory: SkillUsageRecord[] = [];
let isInitialized: boolean = false;

/**
 * 数値IDからJobTypeを取得するヘルパー関数
 */
function getJobTypeFromId(jobId: number): JobType | null {
  const jobTypes = Object.values(JobType);
  return jobTypes[jobId] || null;
}

/**
 * スキルマネージャーを初期化
 */
export function initializeSkillManager(): void {
  if (isInitialized) return;
  
  isInitialized = true;
  console.log("SkillManager initialized");
}

/**
 * ゲーム開始時にプレイヤーにスキルを割り当て
 */
export function assignPlayerSkills(): void {
  try {
    const players = world.getAllPlayers();
    
    console.log(`Assigning skills to ${players.length} players`);
    
    for (const player of players) {
    const jobId = getPlayerJob(player);
    const role = getPlayerRole(player);
    
    console.log(`Assigning skills to ${player.name}: jobId=${jobId}, role=${role}`);
    
    // 職業スキル
    const jobType = getJobTypeFromId(jobId);
    if (!jobType) {
      console.error(`Invalid job ID: ${jobId} for player ${player.name}`);
      continue;
    }
    
    const jobDefinition = JOB_DEFINITIONS[jobType];
    if (!jobDefinition) {
      console.error(`No job definition found for job: ${jobType}`);
      continue;
    }
    
    const jobSkill = jobDefinition.skill;
    if (!jobSkill) {
      console.error(`No job skill found for job: ${jobType}`);
      continue;
    }
    
    // ロールスキル  
    const roleSkill = ROLE_SKILLS[role];
    if (!roleSkill) {
      console.error(`No role skill found for role: ${role}`);
      continue;
    }
    
    // ランダムスキル
    const randomIndex = Math.floor(Math.random() * RANDOM_SKILLS.length);
    const randomSkill = RANDOM_SKILLS[randomIndex];
    if (!randomSkill) {
      console.error(`No random skill found at index: ${randomIndex}`);
      continue;
    }
    
    const playerSkillData: PlayerSkills = {
      playerId: player.id,
      jobSkill,
      roleSkill,
      randomSkill,
      jobSkillUses: 0,
      roleSkillUses: 0,
      randomSkillUses: 0,
      jobSkillCooldown: 0,
      roleSkillCooldown: 0,
      randomSkillCooldown: 0,
    };
    
    playerSkills.set(player.id, playerSkillData);
    
    // プレイヤーに割り当てられたスキルを通知
    try {
      player.sendMessage("§l§6スキルが割り当てられました！");
      player.sendMessage(`§a職業スキル: §f${jobSkill.name} - ${jobSkill.description}`);
      player.sendMessage(`§c役職スキル: §f${roleSkill.name} - ${roleSkill.description}`);
      player.sendMessage(`§d汎用スキル: §f${randomSkill.name} - ${randomSkill.description}`);
      
      console.log(`Assigned skills to ${player.name}: ${jobSkill.name}, ${roleSkill.name}, ${randomSkill.name}`);
    } catch (error) {
      console.error(`Error notifying ${player.name} about skills: ${error}`);
    }
  }
  } catch (error) {
    console.error("Error in assignPlayerSkills:", error);
  }
}

/**
 * スキルを使用
 */
export function useSkill(
  player: Player, 
  skillType: "job" | "role" | "random", 
  target?: Player, 
  args?: any
): SkillExecutionResult {
  const playerSkillData = playerSkills.get(player.id);
  
  if (!playerSkillData) {
    return {
      success: false,
      message: "スキルデータが見つかりません",
      error: "Player skills not found"
    };
  }
  
  let skill: Skill;
  let usageCount: number;
  let cooldown: number;
  
  // スキルタイプに応じて適切なデータを取得
  switch (skillType) {
    case "job":
      skill = playerSkillData.jobSkill;
      usageCount = playerSkillData.jobSkillUses;
      cooldown = playerSkillData.jobSkillCooldown;
      break;
    case "role":
      skill = playerSkillData.roleSkill;
      usageCount = playerSkillData.roleSkillUses;
      cooldown = playerSkillData.roleSkillCooldown;
      break;
    case "random":
      skill = playerSkillData.randomSkill;
      usageCount = playerSkillData.randomSkillUses;
      cooldown = playerSkillData.randomSkillCooldown;
      break;
  }
  
  // 使用回数チェック
  if (skill.usageCount !== -1 && usageCount >= skill.usageCount) {
    return {
      success: false,
      message: "スキルの使用回数を超過しています",
      error: "Usage limit exceeded"
    };
  }
  
  // クールダウンチェック
  const currentTime = Date.now();
  if (cooldown > currentTime) {
    const remainingTime = Math.ceil((cooldown - currentTime) / 1000);
    return {
      success: false,
      message: `スキルはクールダウン中です (残り${remainingTime}秒)`,
      error: "Skill on cooldown"
    };
  }
  
  // スキルを実行
  const result = skill.executeSkill(player, target, args);
  
  if (result.success) {
    // 使用回数とクールダウンを更新
    const newCooldown = currentTime + (skill.cooldown * 1000);
    
    switch (skillType) {
      case "job":
        playerSkillData.jobSkillUses++;
        playerSkillData.jobSkillCooldown = newCooldown;
        break;
      case "role":
        playerSkillData.roleSkillUses++;
        playerSkillData.roleSkillCooldown = newCooldown;
        break;
      case "random":
        playerSkillData.randomSkillUses++;
        playerSkillData.randomSkillCooldown = newCooldown;
        break;
    }
    
    // 使用履歴を記録
    const usageRecord: SkillUsageRecord = {
      playerId: player.id,
      playerName: player.name,
      skillId: skill.id,
      skillName: skill.name,
      targetId: target?.id,
      targetName: target?.name,
      timestamp: currentTime,
      success: true,
      result: result.message
    };
    
    skillUsageHistory.push(usageRecord);
    
    // 全体通知（ロールスキル以外）
    if (skillType !== "role") {
      world.sendMessage(`§6${player.name} §7が §a${skill.name} §7を使用しました`);
    }
    
    console.log(`${player.name} used skill: ${skill.name}`);
  }
  
  return result;
}

/**
 * プレイヤーのスキル情報を取得
 */
export function getPlayerSkills(playerId: string): PlayerSkills | null {
  return playerSkills.get(playerId) || null;
}

/**
 * スキル使用履歴を取得
 */
export function getSkillUsageHistory(playerId?: string): SkillUsageRecord[] {
  if (playerId) {
    return skillUsageHistory.filter(record => record.playerId === playerId);
  }
  return skillUsageHistory.slice(); // コピーを返す
}

/**
 * プレイヤーのスキルクールダウン状況を取得
 */
export function getSkillCooldowns(playerId: string): {
  jobCooldown: number;
  roleCooldown: number;
  randomCooldown: number;
} {
  const playerSkillData = playerSkills.get(playerId);
  const currentTime = Date.now();
  
  if (!playerSkillData) {
    return { jobCooldown: 0, roleCooldown: 0, randomCooldown: 0 };
  }
  
  return {
    jobCooldown: Math.max(0, Math.ceil((playerSkillData.jobSkillCooldown - currentTime) / 1000)),
    roleCooldown: Math.max(0, Math.ceil((playerSkillData.roleSkillCooldown - currentTime) / 1000)),
    randomCooldown: Math.max(0, Math.ceil((playerSkillData.randomSkillCooldown - currentTime) / 1000)),
  };
}

/**
 * プレイヤーのスキル残り使用回数を取得
 */
export function getSkillRemainingUses(playerId: string): {
  jobRemaining: number;
  roleRemaining: number;
  randomRemaining: number;
} {
  const playerSkillData = playerSkills.get(playerId);
  
  if (!playerSkillData) {
    return { jobRemaining: 0, roleRemaining: 0, randomRemaining: 0 };
  }
  
  return {
    jobRemaining: playerSkillData.jobSkill.usageCount === -1 ? 999 : 
      Math.max(0, playerSkillData.jobSkill.usageCount - playerSkillData.jobSkillUses),
    roleRemaining: playerSkillData.roleSkill.usageCount === -1 ? 999 :
      Math.max(0, playerSkillData.roleSkill.usageCount - playerSkillData.roleSkillUses),
    randomRemaining: playerSkillData.randomSkill.usageCount === -1 ? 999 :
      Math.max(0, playerSkillData.randomSkill.usageCount - playerSkillData.randomSkillUses),
  };
}

/**
 * 全スキルデータをクリア
 */
export function clearAllSkills(): void {
  playerSkills.clear();
  skillUsageHistory = [];
  console.log("All skill data cleared");
}

/**
 * スキル統計を取得
 */
export function getSkillStatistics(): {
  totalUsages: number;
  skillUsagesByType: Map<string, number>;
  playerUsages: Map<string, number>;
  mostUsedSkill: string | null;
} {
  const skillUsagesByType = new Map<string, number>();
  const playerUsages = new Map<string, number>();
  
  for (const record of skillUsageHistory) {
    // スキルタイプ別使用回数
    const currentCount = skillUsagesByType.get(record.skillId) || 0;
    skillUsagesByType.set(record.skillId, currentCount + 1);
    
    // プレイヤー別使用回数
    const playerCount = playerUsages.get(record.playerId) || 0;
    playerUsages.set(record.playerId, playerCount + 1);
  }
  
  // 最も使用されたスキル
  let mostUsedSkill: string | null = null;
  let maxUsages = 0;
  for (const [skillId, count] of skillUsagesByType) {
    if (count > maxUsages) {
      maxUsages = count;
      mostUsedSkill = skillId;
    }
  }
  
  return {
    totalUsages: skillUsageHistory.length,
    skillUsagesByType,
    playerUsages,
    mostUsedSkill,
  };
}

/**
 * デバッグ用：スキル状況を出力
 */
export function debugSkillStatus(): void {
  console.log("=== Skill System Debug ===");
  console.log(`Total players with skills: ${playerSkills.size}`);
  console.log(`Total skill usages: ${skillUsageHistory.length}`);
  
  const stats = getSkillStatistics();
  console.log(`Most used skill: ${stats.mostUsedSkill || "None"}`);
  
  // プレイヤー別スキル情報
  for (const [playerId, skills] of playerSkills) {
    const player = world.getAllPlayers().find(p => p.id === playerId);
    const playerName = player?.name || "Unknown";
    
    console.log(`${playerName}:`);
    console.log(`  Job: ${skills.jobSkill.name} (${skills.jobSkillUses}/${skills.jobSkill.usageCount})`);
    console.log(`  Role: ${skills.roleSkill.name} (${skills.roleSkillUses}/${skills.roleSkill.usageCount})`);
    console.log(`  Random: ${skills.randomSkill.name} (${skills.randomSkillUses}/${skills.randomSkill.usageCount})`);
  }
  
  console.log("=== End Skill Debug ===");
}