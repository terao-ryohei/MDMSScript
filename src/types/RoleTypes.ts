import { RoleType } from "./AdvancedFeatureTypes";
import type { AbilityTarget } from "./AdvancedFeatureTypes";

/**
 * 役職の詳細情報を定義するインターフェース
 */
export interface RoleDetails {
  type: RoleType;
  name: string;
  description: string;
  objective: string;
  winCondition: string;
  abilities: RoleAbility[];
  icon: string;
}

/**
 * 役職の特殊能力を定義するインターフェース
 */
export interface RoleAbility {
  id: string;
  name: string;
  description: string;
  coolDown: number;
  isActive: boolean;
  targetType: "player" | "evidence" | "location";
  lastUsedTime: number;
  remainingUses: number;
  maxUsesPerDay: number;
  useAbility: (target: AbilityTarget) => Promise<boolean>;
}

/**
 * 役職のUI表示状態を定義するインターフェース
 */
export interface RoleUIState {
  showDetails: boolean;
  activeAbility: string | null;
  coolDowns: Map<string, number>;
  notifications: RoleNotification[];
}

/**
 * 役職関連の通知を定義するインターフェース
 */
export interface RoleNotification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  message: string;
  timestamp: number;
  duration: number; // ミリ秒単位、0は永続表示
  priority: "low" | "medium" | "high";
}

/**
 * 各役職の詳細情報を定義
 */
export const ROLE_DETAILS: Record<RoleType, RoleDetails> = {
  [RoleType.DETECTIVE]: {
    type: RoleType.DETECTIVE,
    name: "探偵",
    description: "証拠を分析し、事件を解決に導く重要な役職",
    objective:
      "殺人者と共犯を見つけ出し、他のプレイヤーと協力して事件を解決する",
    winCondition: "殺人者が投票で追放されるか、証拠によって有罪となる",
    abilities: [
      {
        id: "analyze_evidence",
        name: "証拠分析",
        description: "証拠の信頼性スコアを確認できる",
        coolDown: 0, // 常時使用可能
        isActive: true,
        targetType: "evidence",
        lastUsedTime: 0,
        remainingUses: Number.POSITIVE_INFINITY, // 無制限
        maxUsesPerDay: Number.POSITIVE_INFINITY,
        useAbility: async () => true,
      },
      {
        id: "analyze_player",
        name: "プレイヤー分析",
        description: "特定のプレイヤーの行動ログを詳細に分析できる",
        coolDown: 86400000, // 24時間（ミリ秒）
        isActive: true,
        targetType: "player",
        lastUsedTime: 0,
        remainingUses: 1,
        maxUsesPerDay: 1,
        useAbility: async () => true,
      },
    ],
    icon: "detective_icon",
  },
  [RoleType.KILLER]: {
    type: RoleType.KILLER,
    name: "殺人者",
    description: "他のプレイヤーを欺き、事件を解決させない役職",
    objective: "探偵と市民を欺き、罪を逃れる",
    winCondition: "探偵が投票で追放されるか、無実のプレイヤーが有罪となる",
    abilities: [
      {
        id: "kill_player",
        name: "殺害",
        description: "プレイヤーを殺害する",
        coolDown: 86400000, // 24時間（ミリ秒）
        isActive: false, // 夜間フェーズのみtrue
        targetType: "player",
        lastUsedTime: 0,
        remainingUses: 1,
        maxUsesPerDay: 1,
        useAbility: async () => true,
      },
      {
        id: "create_false_evidence",
        name: "偽証拠作成",
        description: "偽の証拠を作成する",
        coolDown: 3600000, // 1時間（ミリ秒）
        isActive: true,
        targetType: "location",
        lastUsedTime: 0,
        remainingUses: 3,
        maxUsesPerDay: 3,
        useAbility: async () => true,
      },
    ],
    icon: "killer_icon",
  },
  [RoleType.ACCOMPLICE]: {
    type: RoleType.ACCOMPLICE,
    name: "共犯",
    description: "殺人者を支援し、事件の解決を妨害する役職",
    objective: "殺人者を支援し、探偵と市民を欺く",
    winCondition: "殺人者と同じ",
    abilities: [
      {
        id: "create_alibi",
        name: "アリバイ作成",
        description: "偽のアリバイを作成する",
        coolDown: 3600000, // 1時間（ミリ秒）
        isActive: true,
        targetType: "player",
        lastUsedTime: 0,
        remainingUses: 2,
        maxUsesPerDay: 2,
        useAbility: async () => true,
      },
    ],
    icon: "accomplice_icon",
  },
  [RoleType.CITIZEN]: {
    type: RoleType.CITIZEN,
    name: "市民",
    description: "探偵と協力して事件を解決する一般市民",
    objective: "探偵と協力して殺人者を見つけ出す",
    winCondition: "殺人者が投票で追放されるか、証拠によって有罪となる",
    abilities: [
      {
        id: "collect_evidence",
        name: "証拠収集",
        description: "基本的な証拠収集を行う",
        coolDown: 300000, // 5分（ミリ秒）
        isActive: true,
        targetType: "location",
        lastUsedTime: 0,
        remainingUses: 10,
        maxUsesPerDay: 10,
        useAbility: async () => true,
      },
    ],
    icon: "citizen_icon",
  },
};

/**
 * 役職UIのイベントタイプを定義
 */
export enum RoleUIEventType {
  SHOW_DETAILS = "showDetails",
  HIDE_DETAILS = "hideDetails",
  ACTIVATE_ABILITY = "activateAbility",
  DEACTIVATE_ABILITY = "deactivateAbility",
  ADD_NOTIFICATION = "addNotification",
  REMOVE_NOTIFICATION = "removeNotification",
}
