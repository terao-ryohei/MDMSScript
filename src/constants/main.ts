import { OccupationType } from "../types/OccupationTypes";

// ゲーム開始設定
export const DEFAULT_CONFIG = {
  maxPlayers: 20,
  minPlayers: 4,
  timeSettings: {
    preparation: 300,
    dailyLife: 1200,
    investigation: 1200,
    discussion: 900,
    privateTalk: 900,
    finalMeeting: 600,
    reasoning: 600,
    voting: 300,
  },
  evidenceSettings: {
    maxPhysicalEvidence: 10,
    maxTestimonies: 20,
    reliabilityThreshold: 0.7,
  },
  roleDistribution: {
    detective: 1,
    killer: 1,
    accomplice: 1,
    citizen: 5,
  },
  occupationRules: {
    detective: {
      allowedOccupations: [OccupationType.GUARD, OccupationType.PRIEST],
      forbiddenOccupations: [OccupationType.PRISONER],
    },
    killer: {
      allowedOccupations: [OccupationType.PRISONER],
      forbiddenOccupations: [OccupationType.GUARD, OccupationType.PRIEST],
    },
    accomplice: {
      allowedOccupations: [OccupationType.MERCHANT, OccupationType.PRISONER],
      forbiddenOccupations: [OccupationType.GUARD],
    },
    citizen: {
      allowedOccupations: [
        OccupationType.GUARD,
        OccupationType.MERCHANT,
        OccupationType.PRIEST,
        OccupationType.PRISONER,
      ],
      forbiddenOccupations: [],
    },
  },
  occupationBalance: {
    minOccupationDiversity: 2,
    maxSameOccupation: 2,
  },
};

/**
 * ゲームフェーズを表すenum
 */
/**
 * ゲームの各フェーズを定義するenum
 *
 * @remarks
 * - 準備：ゲーム開始前の準備フェーズ
 * - 日常生活：通常活動と事件発生の機会を提供
 * - 調査：証拠収集と初期調査
 * - 会議：全体での情報共有と議論
 * - 密談：個別の追加調査と情報交換
 * - 最終会議：最終的な情報共有
 * - 推理披露：各プレイヤーの推理発表
 * - 投票：犯人特定のための投票
 * - エンディング：結果発表と振り返り
 */
export enum GamePhase {
  PREPARATION = "preparation", // 準備フェーズ
  DAILY_LIFE = "daily_life", // 日常生活フェーズ
  INVESTIGATION = "investigation", // 調査フェーズ
  DISCUSSION = "discussion", // 会議フェーズ
  PRIVATE_TALK = "private_talk", // 密談（再調査）フェーズ
  FINAL_MEETING = "final_meeting", // 最終会議フェーズ
  REASONING = "reasoning", // 推理披露フェーズ
  VOTING = "voting", // 投票フェーズ
  ENDING = "ending", // エンディングフェーズ
}

/**
 * フェーズ名の日本語マッピング
 */
export const PHASE_NAMES: Record<GamePhase, string> = {
  [GamePhase.PREPARATION]: "準備フェーズ",
  [GamePhase.DAILY_LIFE]: "日常生活フェーズ",
  [GamePhase.INVESTIGATION]: "調査フェーズ",
  [GamePhase.DISCUSSION]: "会議フェーズ",
  [GamePhase.PRIVATE_TALK]: "密談フェーズ",
  [GamePhase.FINAL_MEETING]: "最終会議フェーズ",
  [GamePhase.REASONING]: "推理披露フェーズ",
  [GamePhase.VOTING]: "投票フェーズ",
  [GamePhase.ENDING]: "エンディングフェーズ",
};

/**
 * フェーズ遷移の定義
 */
export const PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  [GamePhase.PREPARATION]: [GamePhase.DAILY_LIFE],
  [GamePhase.DAILY_LIFE]: [GamePhase.INVESTIGATION],
  [GamePhase.INVESTIGATION]: [GamePhase.DISCUSSION],
  [GamePhase.DISCUSSION]: [GamePhase.PRIVATE_TALK],
  [GamePhase.PRIVATE_TALK]: [GamePhase.FINAL_MEETING],
  [GamePhase.FINAL_MEETING]: [GamePhase.REASONING],
  [GamePhase.REASONING]: [GamePhase.VOTING],
  [GamePhase.VOTING]: [GamePhase.ENDING],
  [GamePhase.ENDING]: [],
};

/**
 * フェーズごとの制限時間（秒）
 */
export const PHASE_DURATIONS: Record<GamePhase, number> = {
  [GamePhase.PREPARATION]: 300, // 5分
  [GamePhase.DAILY_LIFE]: 600, // 10分
  [GamePhase.INVESTIGATION]: 900, // 15分
  [GamePhase.DISCUSSION]: 600, // 10分
  [GamePhase.PRIVATE_TALK]: 300, // 5分
  [GamePhase.FINAL_MEETING]: 600, // 10分
  [GamePhase.REASONING]: 300, // 5分
  [GamePhase.VOTING]: 180, // 3分
  [GamePhase.ENDING]: 300, // 5分
};
