import type { Player } from "@minecraft/server";
import type { Evidence } from "./EvidenceTypes";
import type { GamePhase, Phase } from "./PhaseType";

/**
 * プレイヤー状態を表すインターフェース
 */
export interface PlayerState {
  player: Player;
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
 * ゲーム開始設定を表すインターフェース
 */
export interface GameStartupConfig {
  playerCount: number;
}

/**
 * ゲーム開始結果を表すインターフェース
 */
export interface StartupResult {
  success: boolean;
  gameId: string;
  startTime: number;
  initialPhase: Phase;
  error?: string;
}
