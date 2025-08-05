import { Player } from "@minecraft/server";

/**
 * 能力タイプ
 */
export enum AbilityType {
  // 探偵専用能力
  INVESTIGATE = "investigate",           // 調査
  SEARCH_EVIDENCE = "search_evidence",   // 証拠捜索
  ANALYZE_CLUE = "analyze_clue",         // 手がかり分析
  
  // 医者専用能力
  HEAL = "heal",                         // 治療
  AUTOPSY = "autopsy",                   // 検死
  REVIVE = "revive",                     // 蘇生
  
  // 警備員専用能力
  GUARD = "guard",                       // 護衛
  PATROL = "patrol",                     // 巡回
  ALERT = "alert",                       // 警戒
  
  // 記者専用能力
  INTERVIEW = "interview",               // インタビュー
  BROADCAST = "broadcast",               // 放送
  GATHER_INFO = "gather_info",          // 情報収集
  
  // 犯人専用能力
  MURDER = "murder",                     // 殺人
  SABOTAGE = "sabotage",                // 妨害工作
  DISGUISE = "disguise",                // 変装
  
  // 共犯者専用能力
  ASSIST = "assist",                     // 協力
  DISTRACT = "distract",                // 注意逸らし
  COVER_UP = "cover_up",                // 隠蔽工作
  
  // 共通能力
  OBSERVE = "observe",                   // 観察
  COMMUNICATE = "communicate",           // 秘密通信
  HIDE = "hide"                         // 隠れる
}

/**
 * 能力状態
 */
export enum AbilityStatus {
  AVAILABLE = "available",               // 使用可能
  COOLDOWN = "cooldown",                 // クールダウン中
  DISABLED = "disabled",                 // 使用不可
  USED = "used"                         // 使用済み
}

/**
 * 能力対象タイプ
 */
export enum AbilityTargetType {
  SELF = "self",                        // 自分
  PLAYER = "player",                    // プレイヤー
  LOCATION = "location",                // 場所
  AREA = "area",                        // エリア
  ALL = "all"                          // 全体
}

/**
 * 能力定義
 */
export interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  type: AbilityType;
  targetType: AbilityTargetType;
  
  // 制限
  cooldownTime: number;                 // クールダウン時間（秒）
  usesPerGame: number;                  // ゲーム中の使用回数制限
  usesPerPhase: number;                 // フェーズ中の使用回数制限
  requiresTarget: boolean;              // 対象が必要か
  
  // 効果
  duration: number;                     // 効果持続時間（秒）
  range: number;                        // 効果範囲（ブロック）
  detectRange: number;                  // 検出範囲（ブロック）
  
  // 条件
  allowedRoles: string[];               // 使用可能役職
  allowedJobs: string[];                // 使用可能職業
  allowedPhases: string[];              // 使用可能フェーズ
  requiresAlive: boolean;               // 生存が必要か
}

/**
 * 能力使用記録
 */
export interface AbilityUsage {
  id: string;
  userId: string;
  userName: string;
  abilityId: string;
  abilityType: AbilityType;
  targetId?: string;
  targetName?: string;
  location?: {
    x: number;
    y: number;
    z: number;
    dimension: string;
  };
  timestamp: number;
  phaseId: number;
  result: AbilityResult;
}

/**
 * 能力使用結果
 */
export interface AbilityResult {
  success: boolean;
  message: string;
  data?: any;
  effectDuration?: number;
  discoveredEvidence?: string[];
  affectedPlayers?: string[];
  error?: string;
}

/**
 * プレイヤー能力状態
 */
export interface PlayerAbilityState {
  playerId: string;
  abilities: Map<string, AbilityInstanceState>;
  activeEffects: Map<string, AbilityEffect>;
  lastUsage: Map<string, number>;      // 最後の使用時刻
  usageCount: Map<string, number>;     // 使用回数
}

/**
 * 能力インスタンス状態
 */
export interface AbilityInstanceState {
  abilityId: string;
  status: AbilityStatus;
  cooldownEnd: number;
  usesRemaining: number;
  usesThisPhase: number;
}

/**
 * 能力効果
 */
export interface AbilityEffect {
  id: string;
  abilityId: string;
  targetId: string;
  startTime: number;
  endTime: number;
  effectType: string;
  data: any;
  isActive: boolean;
}

/**
 * 能力システム結果
 */
export interface AbilitySystemResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * 能力統計
 */
export interface AbilityStatistics {
  totalUsages: number;
  usagesByType: Map<AbilityType, number>;
  usagesByPlayer: Map<string, number>;
  usagesByPhase: Map<number, number>;
  successRate: number;
  mostUsedAbility: string;
  mostActivePlayer: string;
}

/**
 * デフォルト能力定義
 */
export const DEFAULT_ABILITIES: Record<string, AbilityDefinition> = {
  // 探偵能力
  detective_investigate: {
    id: "detective_investigate",
    name: "調査",
    description: "対象プレイヤーの詳細情報を調査します",
    type: AbilityType.INVESTIGATE,
    targetType: AbilityTargetType.PLAYER,
    cooldownTime: 300, // 5分
    usesPerGame: 3,
    usesPerPhase: 1,
    requiresTarget: true,
    duration: 0,
    range: 20,
    detectRange: 0,
    allowedRoles: ["citizen"],
    allowedJobs: ["detective"],
    allowedPhases: ["investigation", "reinvestigation"],
    requiresAlive: true
  },
  
  detective_search: {
    id: "detective_search",
    name: "証拠捜索",
    description: "周囲のエリアから証拠を発見する確率が上がります",
    type: AbilityType.SEARCH_EVIDENCE,
    targetType: AbilityTargetType.AREA,
    cooldownTime: 600, // 10分
    usesPerGame: 2,
    usesPerPhase: 1,
    requiresTarget: false,
    duration: 300, // 5分間効果持続
    range: 15,
    detectRange: 25,
    allowedRoles: ["citizen"],
    allowedJobs: ["detective"],
    allowedPhases: ["investigation", "reinvestigation"],
    requiresAlive: true
  },

  // 医者能力
  doctor_heal: {
    id: "doctor_heal",
    name: "治療",
    description: "重傷のプレイヤーを治療します",
    type: AbilityType.HEAL,
    targetType: AbilityTargetType.PLAYER,
    cooldownTime: 900, // 15分
    usesPerGame: 1,
    usesPerPhase: 1,
    requiresTarget: true,
    duration: 0,
    range: 5,
    detectRange: 0,
    allowedRoles: ["citizen"],
    allowedJobs: ["doctor"],
    allowedPhases: ["daily_life", "investigation", "discussion"],
    requiresAlive: true
  },

  doctor_autopsy: {
    id: "doctor_autopsy",
    name: "検死",
    description: "死亡したプレイヤーの死因を詳しく調査します",
    type: AbilityType.AUTOPSY,
    targetType: AbilityTargetType.PLAYER,
    cooldownTime: 0,
    usesPerGame: 5,
    usesPerPhase: 2,
    requiresTarget: true,
    duration: 0,
    range: 3,
    detectRange: 0,
    allowedRoles: ["citizen"],
    allowedJobs: ["doctor"],
    allowedPhases: ["investigation", "reinvestigation"],
    requiresAlive: true
  },

  // 警備員能力
  guard_protect: {
    id: "guard_protect",
    name: "護衛",
    description: "対象プレイヤーを1回の攻撃から守ります",
    type: AbilityType.GUARD,
    targetType: AbilityTargetType.PLAYER,
    cooldownTime: 1800, // 30分
    usesPerGame: 2,
    usesPerPhase: 1,
    requiresTarget: true,
    duration: 3600, // 1時間持続
    range: 50, // 距離制限緩和
    detectRange: 0,
    allowedRoles: ["citizen"],
    allowedJobs: ["guard"],
    allowedPhases: ["daily_life", "investigation"],
    requiresAlive: true
  },

  guard_patrol: {
    id: "guard_patrol",
    name: "巡回",
    description: "広範囲の異常行動を検出します",
    type: AbilityType.PATROL,
    targetType: AbilityTargetType.AREA,
    cooldownTime: 1200, // 20分
    usesPerGame: 3,
    usesPerPhase: 1,
    requiresTarget: false,
    duration: 600, // 10分間効果持続
    range: 30,
    detectRange: 35,
    allowedRoles: ["citizen"],
    allowedJobs: ["guard"],
    allowedPhases: ["daily_life", "investigation", "discussion"],
    requiresAlive: true
  },

  // 記者能力
  reporter_interview: {
    id: "reporter_interview",
    name: "インタビュー",
    description: "対象プレイヤーから情報を聞き出します",
    type: AbilityType.INTERVIEW,
    targetType: AbilityTargetType.PLAYER,
    cooldownTime: 600, // 10分
    usesPerGame: 4,
    usesPerPhase: 2,
    requiresTarget: true,
    duration: 0,
    range: 10,
    detectRange: 0,
    allowedRoles: ["citizen"],
    allowedJobs: ["reporter"],
    allowedPhases: ["discussion", "deduction"],
    requiresAlive: true
  },

  reporter_broadcast: {
    id: "reporter_broadcast",
    name: "情報放送",
    description: "重要な情報を全プレイヤーに伝達します",
    type: AbilityType.BROADCAST,
    targetType: AbilityTargetType.ALL,
    cooldownTime: 1800, // 30分
    usesPerGame: 1,
    usesPerPhase: 1,
    requiresTarget: false,
    duration: 0,
    range: 0,
    detectRange: 0,
    allowedRoles: ["citizen"],
    allowedJobs: ["reporter"],
    allowedPhases: ["discussion", "deduction"],
    requiresAlive: true
  },

  // 犯人能力
  murderer_kill: {
    id: "murderer_kill",
    name: "殺人",
    description: "対象プレイヤーを殺害します",
    type: AbilityType.MURDER,
    targetType: AbilityTargetType.PLAYER,
    cooldownTime: 3600, // 1時間
    usesPerGame: 2,
    usesPerPhase: 1,
    requiresTarget: true,
    duration: 0,
    range: 3,
    detectRange: 0,
    allowedRoles: ["murderer"],
    allowedJobs: [],
    allowedPhases: ["daily_life"],
    requiresAlive: true
  },

  murderer_sabotage: {
    id: "murderer_sabotage",
    name: "妨害工作",
    description: "対象プレイヤーの行動を妨害します",
    type: AbilityType.SABOTAGE,
    targetType: AbilityTargetType.PLAYER,
    cooldownTime: 1200, // 20分
    usesPerGame: 3,
    usesPerPhase: 1,
    requiresTarget: true,
    duration: 900, // 15分間効果持続
    range: 20,
    detectRange: 0,
    allowedRoles: ["murderer"],
    allowedJobs: [],
    allowedPhases: ["investigation", "discussion"],
    requiresAlive: true
  },

  // 共犯者能力
  accomplice_assist: {
    id: "accomplice_assist",
    name: "協力",
    description: "犯人の行動をサポートします",
    type: AbilityType.ASSIST,
    targetType: AbilityTargetType.PLAYER,
    cooldownTime: 1800, // 30分
    usesPerGame: 2,
    usesPerPhase: 1,
    requiresTarget: true,
    duration: 1800, // 30分間効果持続
    range: 15,
    detectRange: 0,
    allowedRoles: ["accomplice"],
    allowedJobs: [],
    allowedPhases: ["daily_life", "investigation"],
    requiresAlive: true
  },

  accomplice_distract: {
    id: "accomplice_distract",
    name: "注意逸らし",
    description: "他のプレイヤーの注意を逸らします",
    type: AbilityType.DISTRACT,
    targetType: AbilityTargetType.AREA,
    cooldownTime: 900, // 15分
    usesPerGame: 3,
    usesPerPhase: 1,
    requiresTarget: false,
    duration: 600, // 10分間効果持続
    range: 20,
    detectRange: 0,
    allowedRoles: ["accomplice"],
    allowedJobs: [],
    allowedPhases: ["investigation", "discussion"],
    requiresAlive: true
  }
};