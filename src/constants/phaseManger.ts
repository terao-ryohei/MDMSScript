import { MurderMysteryActions } from "src/types/ActionTypes";
import { GamePhase, type Phase } from "src/types/PhaseType";

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

export const PHASES: Record<GamePhase, Phase> = {
  [GamePhase.PREPARATION]: {
    id: 0,
    name: PHASE_NAMES[GamePhase.PREPARATION],
    allowedActions: [MurderMysteryActions.TALK_TO_NPC],
    canVote: false,
    canCollectEvidence: false,
    canChat: true,
    duration: 300, // 5分
  },
  [GamePhase.DAILY_LIFE]: {
    id: 1,
    name: PHASE_NAMES[GamePhase.DAILY_LIFE],
    allowedActions: [
      MurderMysteryActions.TALK_TO_NPC,
      MurderMysteryActions.COLLECT_EVIDENCE,
      MurderMysteryActions.PERFORM_MURDER,
      MurderMysteryActions.CREATE_ALIBI,
    ],
    canVote: false,
    canCollectEvidence: true,
    canChat: true,
    duration: 1200, // 20分,
  },
  [GamePhase.INVESTIGATION]: {
    id: 2,
    name: PHASE_NAMES[GamePhase.INVESTIGATION],
    allowedActions: [
      MurderMysteryActions.INVESTIGATE_SCENE,
      MurderMysteryActions.COLLECT_EVIDENCE,
      MurderMysteryActions.ANALYZE_EVIDENCE,
      MurderMysteryActions.TALK_TO_NPC,
    ],
    canVote: false,
    canCollectEvidence: true,
    canChat: true,
    duration: 1200, // 20分
  },
  [GamePhase.DISCUSSION]: {
    id: 3,
    name: PHASE_NAMES[GamePhase.DISCUSSION],
    allowedActions: [
      MurderMysteryActions.EVIDENCE_SHARE,
      MurderMysteryActions.TALK_TO_NPC,
    ],
    canVote: false,
    canCollectEvidence: false,
    canChat: true,
    duration: 900, // 15分
  },
  [GamePhase.PRIVATE_TALK]: {
    id: 4,
    name: PHASE_NAMES[GamePhase.PRIVATE_TALK],
    allowedActions: [
      MurderMysteryActions.INVESTIGATE_SCENE,
      MurderMysteryActions.COLLECT_EVIDENCE,
      MurderMysteryActions.ANALYZE_EVIDENCE,
      MurderMysteryActions.TALK_TO_NPC,
    ],
    canVote: false,
    canCollectEvidence: true,
    canChat: true,
    duration: 900, // 15分
  },
  [GamePhase.FINAL_MEETING]: {
    id: 5,
    name: PHASE_NAMES[GamePhase.FINAL_MEETING],
    allowedActions: [
      MurderMysteryActions.EVIDENCE_SHARE,
      MurderMysteryActions.TALK_TO_NPC,
    ],
    canVote: false,
    canCollectEvidence: false,
    canChat: true,
    duration: 600, // 10分
  },
  [GamePhase.REASONING]: {
    id: 6,
    name: PHASE_NAMES[GamePhase.REASONING],
    allowedActions: [
      MurderMysteryActions.EVIDENCE_SHARE,
      MurderMysteryActions.TALK_TO_NPC,
      MurderMysteryActions.PRESENT_EVIDENCE,
    ],
    canVote: false,
    canCollectEvidence: false,
    canChat: true,
    duration: 600, // 10分
  },
  [GamePhase.VOTING]: {
    id: 7,
    name: PHASE_NAMES[GamePhase.VOTING],
    allowedActions: [MurderMysteryActions.VOTE_CAST],
    canVote: true,
    canCollectEvidence: false,
    canChat: false,
    duration: 600, // 10分
  },
  [GamePhase.ENDING]: {
    id: 8,
    name: PHASE_NAMES[GamePhase.ENDING],
    allowedActions: [MurderMysteryActions.TALK_TO_NPC],
    canVote: false,
    canCollectEvidence: false,
    canChat: true,
    duration: 300, // 5分
  },
};
