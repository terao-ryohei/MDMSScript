import type { Evidence } from "./EvidenceTypes";

/**
 * ゲームフェーズを表すenum
 */
export enum GamePhase {
  PREPARATION = "preparation",
  DAILY_LIFE = "daily_life",
  INVESTIGATION = "investigation",
  DISCUSSION = "discussion",
  REINVESTIGATION = "reinvestigation",
  FINAL_DISCUSSION = "final_discussion",
  VOTING = "voting",
}

/**
 * プレイヤーの役職を表すenum
 */
export enum RoleType {
  VILLAGER = "villager",
  DETECTIVE = "detective",
  MURDERER = "murderer",
  ACCOMPLICE = "accomplice",
}

/**
 * プレイヤー状態を表すインターフェース
 */
export interface PlayerState {
  playerId: string;
  role: RoleType;
  location: {
    x: number;
    y: number;
    z: number;
    dimension: string;
  };
  inventory: string[];
  collectedEvidence: string[];
  isAlive: boolean;
  hasVoted: boolean;
  actionLog: string[];
  abilities: Map<string, boolean>;
}

/**
 * ゲーム状態を表すインターフェース
 */
export interface GameState {
  gameId: string;
  phase: GamePhase;
  startTime: number;
  currentDay: number;
  players: Map<string, PlayerState>;
  roles: Map<string, RoleType>;
  evidenceList: Evidence[];
  collectedEvidence: Map<string, Set<string>>;
  votes: Map<string, string>;
  isActive: boolean;
  murderCommitted: boolean;
  investigationComplete: boolean;
  murderTime?: number; // 殺人が発生した時刻
}

/**
 * フェーズごとのタイミング設定を表すインターフェース
 */
export interface PhaseTimings {
  preparation: number;
  investigation: number;
  discussion: number;
  reinvestigation: number;
  finalDiscussion: number;
  voting: number;
}

/**
 * 証拠関連の設定を表すインターフェース
 */
export interface EvidenceSettings {
  maxPhysicalEvidence: number;
  maxTestimonies: number;
  reliabilityThreshold: number;
}

/**
 * ゲーム設定を表すインターフェース
 */
export interface GameConfig {
  maxPlayers: number;
  minPlayers: number;
  phaseTimings: PhaseTimings;
  evidenceSettings: EvidenceSettings;
  roleDistribution: {
    [key in RoleType]?: number;
  };
}
