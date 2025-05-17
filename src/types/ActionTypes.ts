/**
 * ゲーム内でのアクション種別を定義
 */
export enum ActionType {
  // プレイヤーアクション
  MOVE = "move",
  JUMP = "jump",
  ATTACK = "attack",
  INTERACT = "interact",

  // ブロック操作
  BLOCK_BROKEN = "block_broken",
  BLOCK_PLACED = "block_placed",

  // スクリプトイベント
  SCRIPT_EVENT = "script_event",

  // エンティティライフサイクル
  ENTITY_SPAWN = "entity_spawn",
  ENTITY_DEATH = "entity_death",
  ENTITY_DESPAWN = "entity_despawn",

  // プレイヤー状態変更
  PLAYER_HEALTH_CHANGE = "player_health_change",
  PLAYER_HUNGER_CHANGE = "player_hunger_change",
  PLAYER_EXPERIENCE_CHANGE = "player_experience_change",
  PLAYER_EFFECT_ADDED = "player_effect_added",
  PLAYER_EFFECT_REMOVED = "player_effect_removed",

  // システム操作
  SYSTEM_RESUME = "system_resume",
  SYSTEM_PAUSE = "system_pause",
  SYSTEM_CONFIG_CHANGE = "system_config_change",
  SYSTEM_EXPORT = "system_export",

  // 役職関連
  ROLE_ASSIGNED = "role_assigned",
  ROLE_ERROR = "role_error",

  // ゲーム情報とデバッグ
  GAME_INFO = "game_info",
  GAME_DEBUG = "game_debug",
}
export enum MurderMysteryActions {
  // プレイヤーの基本アクション
  TALK_TO_NPC = "talk_to_npc",
  COLLECT_EVIDENCE = "collect_evidence",
  INVESTIGATE_SCENE = "investigate_scene",
  ANALYZE_EVIDENCE = "analyze_evidence",
  EVIDENCE_SHARE = "evidence_share",
  VOTE_CAST = "vote_cast",
  PRESENT_EVIDENCE = "present_evidence", // 推理披露フェーズで使用する証拠提示アクション

  // 役職固有のアクション
  PERFORM_MURDER = "perform_murder",
  CREATE_ALIBI = "create_alibi",
  VERIFY_EVIDENCE = "verify_evidence",
  TAMPER_EVIDENCE = "tamper_evidence",

  // 職業関連のアクション
  OCCUPATION_CHANGE = "occupation_change",
  OCCUPATION_ABILITY_USE = "occupation_ability_use",
  OCCUPATION_ERROR = "occupation_error",
  OCCUPATION_INTERACT = "occupation_interact",

  // システムアクション
  PHASE_CHANGE = "phase_change",
  GAME_START = "game_start",
  GAME_END = "game_end",
  MURDER_DISCOVERED = "murder_discovered",

  // UI関連のアクション
  UI_UPDATE = "ui_update",
  UI_EVENT = "ui_event",
  UI_ERROR = "ui_error",
  UI_NOTIFICATION = "ui_notification",
  ABILITY_USE = "ability_use",
}

/**
 * 全てのアクション種別（基本アクションと拡張アクションを含む）
 */
export type ExtendedActionType = MurderMysteryActions | string;
