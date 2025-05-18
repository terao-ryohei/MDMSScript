import { MurderMysteryActions } from "src/types/ActionTypes";
import { GamePhase } from "./main";
import type { PhaseRestrictions } from "src/types/PhaseType";

/**
 * フェーズ遷移の定義
 */
export const VALID_PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
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

export const PHASE_RESTRICTIONS: Record<GamePhase, PhaseRestrictions> = {
  [GamePhase.PREPARATION]: {
    allowedActions: [MurderMysteryActions.TALK_TO_NPC],
    canVote: false,
    canCollectEvidence: false,
    canChat: true,
  },
  [GamePhase.DAILY_LIFE]: {
    allowedActions: [
      MurderMysteryActions.TALK_TO_NPC,
      MurderMysteryActions.COLLECT_EVIDENCE,
      MurderMysteryActions.PERFORM_MURDER,
      MurderMysteryActions.CREATE_ALIBI,
    ],
    canVote: false,
    canCollectEvidence: true,
    canChat: true,
  },
  [GamePhase.INVESTIGATION]: {
    allowedActions: [
      MurderMysteryActions.INVESTIGATE_SCENE,
      MurderMysteryActions.COLLECT_EVIDENCE,
      MurderMysteryActions.ANALYZE_EVIDENCE,
      MurderMysteryActions.TALK_TO_NPC,
    ],
    canVote: false,
    canCollectEvidence: true,
    canChat: true,
  },
  [GamePhase.DISCUSSION]: {
    allowedActions: [
      MurderMysteryActions.EVIDENCE_SHARE,
      MurderMysteryActions.TALK_TO_NPC,
    ],
    canVote: false,
    canCollectEvidence: false,
    canChat: true,
  },
  [GamePhase.PRIVATE_TALK]: {
    allowedActions: [
      MurderMysteryActions.INVESTIGATE_SCENE,
      MurderMysteryActions.COLLECT_EVIDENCE,
      MurderMysteryActions.ANALYZE_EVIDENCE,
      MurderMysteryActions.TALK_TO_NPC,
    ],
    canVote: false,
    canCollectEvidence: true,
    canChat: true,
  },
  [GamePhase.FINAL_MEETING]: {
    allowedActions: [
      MurderMysteryActions.EVIDENCE_SHARE,
      MurderMysteryActions.TALK_TO_NPC,
    ],
    canVote: false,
    canCollectEvidence: false,
    canChat: true,
  },
  [GamePhase.REASONING]: {
    allowedActions: [
      MurderMysteryActions.EVIDENCE_SHARE,
      MurderMysteryActions.TALK_TO_NPC,
      MurderMysteryActions.PRESENT_EVIDENCE,
    ],
    canVote: false,
    canCollectEvidence: false,
    canChat: true,
  },
  [GamePhase.VOTING]: {
    allowedActions: [MurderMysteryActions.VOTE_CAST],
    canVote: true,
    canCollectEvidence: false,
    canChat: false,
  },
  [GamePhase.ENDING]: {
    allowedActions: [MurderMysteryActions.TALK_TO_NPC],
    canVote: false,
    canCollectEvidence: false,
    canChat: true,
  },
};
