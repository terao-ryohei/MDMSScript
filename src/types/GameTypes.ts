import type { Evidence } from "./EvidenceTypes";
import type { RoleType } from "./AdvancedFeatureTypes";
import type { GamePhase } from "src/constants/main";

/**
 * プレイヤー状態を表すインターフェース
 */
export interface PlayerState {
  playerId: string;
  role: RoleType;
  inventory: string[];
  collectedEvidence: string[];
  isAlive: boolean;
  hasVoted: boolean;
  actionLog: string[];
}

/**
 * ゲーム状態を表すインターフェース
 */
export interface GameState {
  gameId: string;
  phase: GamePhase;
  startTime: number;
  currentDay: number;
  players: PlayerState[];
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
/**
 * 各フェーズの制限時間設定を定義するインターフェース
 */
interface PhaseTimings {
  preparation: number; // 準備フェーズの制限時間
  dailyLife: number; // 日常生活フェーズの制限時間
  investigation: number; // 調査フェーズの制限時間
  discussion: number; // 会議フェーズの制限時間
  privateTalk: number; // 密談フェーズの制限時間
  finalMeeting: number; // 最終会議フェーズの制限時間
  reasoning: number; // 推理披露フェーズの制限時間
  voting: number; // 投票フェーズの制限時間
}

/**
 * 証拠関連の設定を表すインターフェース
 */
interface EvidenceSettings {
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

/**
 * ゲーム開始設定を表すインターフェース
 */
export interface GameStartupConfig {
  playerCount: number;
  timeSettings: PhaseTimings;
  evidenceSettings: EvidenceSettings;
  roleDistribution: {
    [key in RoleType]?: number;
  };
}

/**
 * ゲーム開始結果を表すインターフェース
 */
export interface StartupResult {
  success: boolean;
  gameId: string;
  startTime: number;
  initialPhase: GamePhase;
  error?: string;
}
