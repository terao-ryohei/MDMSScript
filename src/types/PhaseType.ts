import type { ExtendedActionType } from "./ActionTypes";

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
 * フェーズごとの制限事項を定義
 */
export interface Phase {
  id: number;
  name: string;
  allowedActions: ExtendedActionType[];
  allowedAreas?: { x: number; y: number; z: number; radius: number }[];
  canVote: boolean;
  canCollectEvidence: boolean;
  canChat: boolean;
  duration: number;
}
