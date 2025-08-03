import type { Player } from "@minecraft/server";
import type { BaseAbility } from "src/types/AbilityTypes";
import {
  RoleName,
  type RoleDistributionRule,
  type Role,
} from "src/types/RoleTypes";

// 探偵の調査能力
const InvestigateAbility: BaseAbility = {
  id: "detective_investigate",
  name: "調査",
  target: "player",
  description: "現場を調査し、証拠を見つけ出すのだ",
  requirements: {
    coolDownTime: 30,
    requiredState: "alive",
    requiresTarget: true,
  },
  effect: {
    type: "investigate",
    duration: 10,
    target: "area",
    radius: 5,
  },
  useAbility: async (target: Player) => {
    return true; // TODO: 調査の具体的な実装
  },
  remainingUses: -1, // 無制限使用可能
};

// 探偵の分析能力
const AnalyzeAbility: BaseAbility = {
  id: "detective_analyze",
  name: "分析",
  target: "evidence",
  description: "集めた証拠を分析し、新たな情報を得るのだ",
  requirements: {
    coolDownTime: 60,
    requiredState: "alive",
    requiresTarget: false,
    requiredItems: ["evidence"],
  },
  effect: {
    type: "investigate",
    duration: 0,
    target: "self",
  },
  useAbility: async (target: "") => {
    return true; // TODO: 調査の具体的な実装
  },
  remainingUses: -1, // 無制限使用可能
};

// 殺人者の殺害能力
const MurderAbility: BaseAbility = {
  id: "killer_murder",
  name: "殺害",
  target: "player",
  description: "対象を殺害するのだ",
  requirements: {
    coolDownTime: 300,
    requiredState: "alive",
    requiresTarget: true,
  },
  effect: {
    type: "damage",
    duration: 0,
    target: "target",
    power: 100,
  },
  useAbility: async (target: Player) => {
    return true; // TODO: 調査の具体的な実装
  },
  remainingUses: 1, // 1回のみ使用可能
};

// 各役職の能力インスタンス
const DETECTIVE_ABILITIES: BaseAbility[] = [InvestigateAbility, AnalyzeAbility];

const KILLER_ABILITIES: BaseAbility[] = [
  MurderAbility,
  // TODO: 変装能力を実装
];

const ACCOMPLICE_ABILITIES: BaseAbility[] = [
  // TODO: アリバイ作り能力を実装
  // TODO: 誤情報能力を実装
];

const CITIZEN_ABILITIES: BaseAbility[] = [
  // TODO: 通報能力を実装
  // TODO: 護衛能力を実装
];

// 役割詳細の定義
export const ROLES: Record<RoleName, Role> = {
  [RoleName.DETECTIVE]: {
    id: 0,
    name: "探偵",
    description: "真実を追求する者なのだ",
    objective: "真犯人を見つけ出すのだ",
    winCondition: "正しい犯人を特定できれば勝利なのだ",
    abilities: DETECTIVE_ABILITIES,
  },
  [RoleName.KILLER]: {
    id: 1,
    name: "殺人者",
    description: "闇に潜む者なのだ",
    objective: "罪を逃れるのだ",
    winCondition: "最後まで生き残るか、無実の市民が処刑されれば勝利なのだ",
    abilities: KILLER_ABILITIES,
  },
  [RoleName.ACCOMPLICE]: {
    id: 2,
    name: "共犯者",
    description: "殺人者を支援する者なのだ",
    objective: "殺人者を助けるのだ",
    winCondition: "殺人者が勝利すれば勝利なのだ",
    abilities: ACCOMPLICE_ABILITIES,
  },
  [RoleName.CITIZEN]: {
    id: 3,
    name: "市民",
    description: "正義のために戦う者なのだ",
    objective: "真犯人を見つけ出すのだ",
    winCondition: "正しい犯人を特定できれば勝利なのだ",
    abilities: CITIZEN_ABILITIES,
  },
};

// 役割分布のルール定義
export const ROLE_DISTRIBUTION_RULES: RoleDistributionRule[] = [
  {
    playerRange: [1, 6],
    distribution: {
      [RoleName.DETECTIVE]: 1,
      [RoleName.KILLER]: 1,
      [RoleName.ACCOMPLICE]: 0,
      [RoleName.CITIZEN]: -1, // 残りのプレイヤー
    },
  },
  {
    playerRange: [7, 12],
    distribution: {
      [RoleName.DETECTIVE]: 1,
      [RoleName.KILLER]: 1,
      [RoleName.ACCOMPLICE]: 1,
      [RoleName.CITIZEN]: -1,
    },
  },
  {
    playerRange: [13, 16],
    distribution: {
      [RoleName.DETECTIVE]: 2,
      [RoleName.KILLER]: 1,
      [RoleName.ACCOMPLICE]: 1,
      [RoleName.CITIZEN]: -1,
    },
  },
  {
    playerRange: [17, 20],
    distribution: {
      [RoleName.DETECTIVE]: 2,
      [RoleName.KILLER]: 2,
      [RoleName.ACCOMPLICE]: 2,
      [RoleName.CITIZEN]: -1,
    },
  },
];
