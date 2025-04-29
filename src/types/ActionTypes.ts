/**
 * ゲーム内で発生する拡張アクション種別
 */
export enum MurderMysteryActions {
  // プレイヤーの基本アクション
  TALK_TO_NPC = "talk_to_npc",
  COLLECT_EVIDENCE = "collect_evidence",
  INVESTIGATE_SCENE = "investigate_scene",
  ANALYZE_EVIDENCE = "analyze_evidence",
  EVIDENCE_SHARE = "evidence_share",
  VOTE_CAST = "vote_cast",

  // 役職固有のアクション
  PERFORM_MURDER = "perform_murder",
  CREATE_ALIBI = "create_alibi",
  VERIFY_EVIDENCE = "verify_evidence",
  TAMPER_EVIDENCE = "tamper_evidence",

  // システムアクション
  PHASE_CHANGE = "phase_change",
  GAME_START = "game_start",
  GAME_END = "game_end",
  MURDER_DISCOVERED = "murder_discovered",
}

/**
 * 全てのアクション種別（基本アクションと拡張アクションを含む）
 */
export type ExtendedActionType = MurderMysteryActions | string;

/**
 * アクション結果の種別
 */
export enum ActionResultType {
  SUCCESS = "success",
  FAILURE = "failure",
  PARTIAL = "partial",
  ERROR = "error",
}

/**
 * アクション結果のインターフェース
 */
export interface ActionResult {
  type: ActionResultType;
  success: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * アクションコンテキストのインターフェース
 */
export interface ActionContext {
  playerId: string;
  phase: string;
  timestamp: number;
  location?: {
    x: number;
    y: number;
    z: number;
    dimension: string;
  };
  metadata?: Record<string, unknown>;
}
