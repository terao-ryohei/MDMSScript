import { RoleType, type Role, type RoleComposition } from "../types/RoleTypes";

/**
 * ロール定義
 */
export const ROLES: Record<RoleType, Role> = {
  [RoleType.CITIZEN]: {
    type: RoleType.CITIZEN,
    name: "一般人",
    description: "真犯人を特定することが目標",
    baseAbilityId: "deduction_boost",
    baseObjectiveId: "identify_murderer",
    specialRules: [
      "証拠の信頼性が10%向上する",
      "探偵役がいる場合は推理力がさらに強化される"
    ]
  },

  [RoleType.MURDERER]: {
    type: RoleType.MURDERER,
    name: "犯人",
    description: "投票で最多票を避けて逃げ切ることが目標",
    baseAbilityId: "murder",
    baseObjectiveId: "avoid_execution",
    specialRules: [
      "半径4ブロック以内のプレイヤーをキルできる",
      "生活フェーズ中の任意のタイミングで事件を起こせる",
      "事件発生タイミングを自由に選択可能"
    ]
  },

  [RoleType.ACCOMPLICE]: {
    type: RoleType.ACCOMPLICE,
    name: "共犯者",
    description: "犯人の勝利をサポートすることが目標",
    baseAbilityId: "insider_info",
    baseObjectiveId: "support_murderer",
    specialRules: [
      "犯人の名前または犯行時間のいずれかを知ることができる",
      "犯人と密談が可能",
      "証拠隠滅行動が可能"
    ]
  }
};

/**
 * プレイヤー数に応じたロール構成
 */
export function getRoleComposition(playerCount: number): RoleComposition {
  // テスト用に1人から対応
  if (playerCount < 1) {
    throw new Error("最低1人のプレイヤーが必要です");
  }
  
  if (playerCount === 1) {
    // 1人: テスト用、犯人役のみ
    return {
      murderers: 1,
      accomplices: 0,
      citizens: 0
    };
  } else if (playerCount === 2) {
    // 2人: 犯人1人、市民1人
    return {
      murderers: 1,
      accomplices: 0,
      citizens: 1
    };
  } else if (playerCount === 3) {
    // 3人: 犯人1人、市民2人（バランス重視）
    return {
      murderers: 1,
      accomplices: 0,
      citizens: 2
    };
  } else if (playerCount <= 6) {
    // 4-6人: 犯人1, 一般人のみ
    return {
      murderers: 1,
      accomplices: 0,
      citizens: playerCount - 1
    };
  } else if (playerCount <= 12) {
    // 7-12人: 犯人1, 共犯者1, 一般人
    return {
      murderers: 1,
      accomplices: 1,
      citizens: playerCount - 2
    };
  } else if (playerCount <= 16) {
    // 13-16人: 犯人1, 共犯者2, 一般人
    return {
      murderers: 1,
      accomplices: 2,
      citizens: playerCount - 3
    };
  } else {
    // 17-20人: 犯人2, 共犯者1, 一般人
    return {
      murderers: 2,
      accomplices: 1,
      citizens: playerCount - 3
    };
  }
}

/**
 * ロール構成の妥当性チェック
 */
export function validateRoleComposition(composition: RoleComposition, playerCount: number): boolean {
  const total = composition.murderers + composition.accomplices + composition.citizens;
  return total === playerCount && composition.murderers >= 1;
}