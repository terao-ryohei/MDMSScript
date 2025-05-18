import type { ExtendedActionType } from "./ActionTypes";

/**
 * フェーズごとの制限事項を定義
 */
export interface PhaseRestrictions {
  allowedActions: ExtendedActionType[];
  allowedAreas?: { x: number; y: number; z: number; radius: number }[];
  canVote: boolean;
  canCollectEvidence: boolean;
  canChat: boolean;
}
