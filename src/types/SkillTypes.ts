/**
 * スキルシステム型定義
 */

import { type Player } from "@minecraft/server";
import { JobType } from "./JobTypes";
import { RoleType } from "./RoleTypes";

/**
 * スキル
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  cooldown: number; // クールダウン時間（秒）
  usageCount: number; // 使用可能回数（-1で無制限）
  executeSkill: (player: Player, target?: Player, args?: any) => SkillExecutionResult;
}

/**
 * スキル実行結果
 */
export interface SkillExecutionResult {
  success: boolean;
  message: string;
  cooldownTime?: number;
  error?: string;
}

/**
 * プレイヤースキル情報
 */
export interface PlayerSkills {
  playerId: string;
  jobSkill: Skill;        // 職業スキル
  roleSkill: Skill;       // ロールスキル
  randomSkill: Skill;     // 汎用スキル
  
  // 使用状況
  jobSkillUses: number;
  roleSkillUses: number;
  randomSkillUses: number;
  
  // クールダウン管理
  jobSkillCooldown: number;
  roleSkillCooldown: number;
  randomSkillCooldown: number;
}

/**
 * スキル使用履歴
 */
export interface SkillUsageRecord {
  playerId: string;
  playerName: string;
  skillId: string;
  skillName: string;
  targetId?: string;
  targetName?: string;
  timestamp: number;
  success: boolean;
  result: string;
}

/**
 * 職業別スキル
 */
export const JOB_SKILLS: Record<JobType, Skill> = {
  [JobType.LORD]: {
    id: "lord_command",
    name: "王の命令",
    description: "他のプレイヤーを指定された場所に移動させる",
    cooldown: 300, // 5分
    usageCount: 2,
    executeSkill: (player: Player, target?: Player) => {
      // TODO: 実装
      return { success: true, message: "王の威厳により命令を下しました" };
    }
  },
  
  [JobType.CAPTAIN]: {
    id: "guard_protection",
    name: "護衛",
    description: "指定したプレイヤーを1つのフェーズ間保護する",
    cooldown: 180, // 3分
    usageCount: 3,
    executeSkill: (player: Player, target?: Player) => {
      // TODO: 実装
      return { success: true, message: "護衛を開始しました" };
    }
  },
  
  [JobType.HOMUNCULUS]: {
    id: "shape_shift",
    name: "変身",
    description: "他のプレイヤーの外見に変身する",
    cooldown: 240, // 4分
    usageCount: 2,
    executeSkill: (player: Player, target?: Player) => {
      // TODO: 実装
      return { success: true, message: "変身しました" };
    }
  },
  
  [JobType.COURT_ALCHEMIST]: {
    id: "evidence_analysis",
    name: "証拠分析",
    description: "証拠の詳細情報を取得する",
    cooldown: 120, // 2分
    usageCount: 5,
    executeSkill: (player: Player) => {
      // TODO: 実装
      return { success: true, message: "証拠を詳しく分析しました" };
    }
  },
  
  [JobType.ROGUE_ALCHEMIST]: {
    id: "stealth_investigation",
    name: "隠密調査",
    description: "他のプレイヤーに気づかれずに調査する",
    cooldown: 180, // 3分
    usageCount: 3,
    executeSkill: (player: Player) => {
      // TODO: 実装
      return { success: true, message: "隠密調査を実行しました" };
    }
  },
  
  [JobType.THIEF]: {
    id: "pickpocket",
    name: "スリ",
    description: "他のプレイヤーのアイテムや情報を盗む",
    cooldown: 150, // 2.5分
    usageCount: 4,
    executeSkill: (player: Player, target?: Player) => {
      // TODO: 実装
      return { success: true, message: "スリを成功させました" };
    }
  },
  
  [JobType.PHARMACIST]: {
    id: "antidote",
    name: "解毒",
    description: "毒の効果を中和する",
    cooldown: 200, // 約3.3分
    usageCount: 3,
    executeSkill: (player: Player, target?: Player) => {
      // TODO: 実装
      return { success: true, message: "解毒を行いました" };
    }
  },
  
  [JobType.MAID]: {
    id: "room_search",
    name: "部屋掃除",
    description: "部屋を掃除して隠れた証拠を発見する",
    cooldown: 120, // 2分
    usageCount: 6,
    executeSkill: (player: Player) => {
      // TODO: 実装
      return { success: true, message: "掃除中に何か発見しました" };
    }
  },
  
  [JobType.BUTLER]: {
    id: "message_relay",
    name: "伝言",
    description: "プレイヤー間で匿名のメッセージを中継する",
    cooldown: 90, // 1.5分
    usageCount: -1, // 無制限
    executeSkill: (player: Player, target?: Player, args?: any) => {
      // TODO: 実装
      return { success: true, message: "伝言をお伝えしました" };
    }
  },
  
  [JobType.SOLDIER]: {
    id: "area_patrol",
    name: "巡回",
    description: "指定エリアの状況を詳しく調査する",
    cooldown: 180, // 3分
    usageCount: 4,
    executeSkill: (player: Player) => {
      // TODO: 実装
      return { success: true, message: "巡回を完了しました" };
    }
  },
  
  [JobType.STUDENT]: {
    id: "quick_learning",
    name: "速習",
    description: "他のプレイヤーのスキルを一時的に真似する",
    cooldown: 300, // 5分
    usageCount: 2,
    executeSkill: (player: Player, target?: Player) => {
      // TODO: 実装
      return { success: true, message: "スキルを学習しました" };
    }
  },
  
  [JobType.ADVENTURER]: {
    id: "exploration",
    name: "探索",
    description: "通常アクセスできない場所を調査する",
    cooldown: 240, // 4分
    usageCount: 3,
    executeSkill: (player: Player) => {
      // TODO: 実装
      return { success: true, message: "新たな場所を発見しました" };
    }
  }
};

/**
 * ロール別スキル
 */
export const ROLE_SKILLS: Record<RoleType, Skill> = {
  [RoleType.MURDERER]: {
    id: "murder_attempt",
    name: "殺害",
    description: "対象プレイヤーを殺害する（ゲーム中1回のみ）",
    cooldown: 0,
    usageCount: 1,
    executeSkill: (player: Player, target?: Player) => {
      // TODO: 実装
      return { success: true, message: "殺害を実行しました" };
    }
  },
  
  [RoleType.VILLAGER]: {
    id: "villager_intuition",
    name: "直感",
    description: "怪しいと思うプレイヤーをマークし、他の村人に共有する",
    cooldown: 180, // 3分
    usageCount: 3,
    executeSkill: (player: Player, target?: Player) => {
      // TODO: 実装
      return { success: true, message: "直感で怪しい人物をマークしました" };
    }
  },
  
  [RoleType.DETECTIVE]: {
    id: "investigation",
    name: "捜査",
    description: "対象プレイヤーまたは場所を詳しく調査し、手がかりを得る",
    cooldown: 120, // 2分
    usageCount: 5,
    executeSkill: (player: Player, target?: Player) => {
      // TODO: 実装
      return { success: true, message: "詳細な捜査を実行しました" };
    }
  },
  
  [RoleType.ACCOMPLICE]: {
    id: "evidence_tampering",
    name: "証拠隠滅",
    description: "証拠を隠滅または改ざんする",
    cooldown: 240, // 4分
    usageCount: 2,
    executeSkill: (player: Player) => {
      // TODO: 実装
      return { success: true, message: "証拠を隠滅しました" };
    }
  }
};

/**
 * 汎用スキルプール
 */
export const RANDOM_SKILLS: Skill[] = [
  {
    id: "mind_read",
    name: "心理読解",
    description: "対象プレイヤーの役職のヒントを得る",
    cooldown: 360, // 6分
    usageCount: 1,
    executeSkill: (player: Player, target?: Player) => {
      // TODO: 実装
      return { success: true, message: "相手の心を読みました" };
    }
  },
  
  {
    id: "time_freeze",
    name: "時間停止",
    description: "短時間、他のプレイヤーの行動を制限する",
    cooldown: 480, // 8分
    usageCount: 1,
    executeSkill: (player: Player) => {
      // TODO: 実装
      return { success: true, message: "時間を停止させました" };
    }
  },
  
  {
    id: "truth_serum",
    name: "自白剤",
    description: "対象プレイヤーに真実の発言を強制する",
    cooldown: 300, // 5分
    usageCount: 1,
    executeSkill: (player: Player, target?: Player) => {
      // TODO: 実装
      return { success: true, message: "自白剤を使用しました" };
    }
  },
  
  {
    id: "invisibility",
    name: "透明化",
    description: "短時間、他のプレイヤーから見えなくなる",
    cooldown: 240, // 4分
    usageCount: 2,
    executeSkill: (player: Player) => {
      // TODO: 実装
      return { success: true, message: "透明になりました" };
    }
  },
  
  {
    id: "telepathy",
    name: "テレパシー",
    description: "離れた場所のプレイヤーと秘密の会話をする",
    cooldown: 180, // 3分
    usageCount: 3,
    executeSkill: (player: Player, target?: Player) => {
      // TODO: 実装
      return { success: true, message: "テレパシーで交信しました" };
    }
  },
  
  {
    id: "future_sight",
    name: "予知",
    description: "次のフェーズで起こることのヒントを得る",
    cooldown: 360, // 6分
    usageCount: 1,
    executeSkill: (player: Player) => {
      // TODO: 実装
      return { success: true, message: "未来を覗きました" };
    }
  },
  
  {
    id: "memory_wipe",
    name: "記憶消去",
    description: "対象プレイヤーの記憶の一部を消去する",
    cooldown: 420, // 7分
    usageCount: 1,
    executeSkill: (player: Player, target?: Player) => {
      // TODO: 実装
      return { success: true, message: "記憶を消去しました" };
    }
  },
  
  {
    id: "duplicate",
    name: "分身",
    description: "一時的に複数の場所に同時に存在する",
    cooldown: 300, // 5分
    usageCount: 2,
    executeSkill: (player: Player) => {
      // TODO: 実装
      return { success: true, message: "分身を作成しました" };
    }
  }
];