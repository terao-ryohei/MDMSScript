import type { Player } from "@minecraft/server";
import type { BaseAbility } from "src/types/AbilityTypes";
import {
  type Occupation,
  type OccupationDistributionRule,
  OccupationName,
} from "src/types/OccupationTypes";

// 看守の監視能力
const SurveillanceAbility: BaseAbility = {
  id: "guard_surveillance",
  name: "監視",
  target: "location",
  description: "指定したエリアを監視し、不審な行動を検知するのだ",
  requirements: {
    coolDownTime: 60,
    requiredState: "alive",
    requiresTarget: true,
  },
  effect: {
    type: "investigate",
    duration: 30,
    target: "area",
    radius: 10,
  },
  useAbility: async (target: "") => {
    return true; // TODO: 調査の具体的な実装
  },

  remainingUses: -1, // 無制限使用可能
};

// 看守の拘束能力
const RestraintAbility: BaseAbility = {
  id: "guard_restraint",
  name: "拘束",
  target: "player",
  description: "容疑者を一時的に拘束し、移動を制限するのだ",
  requirements: {
    coolDownTime: 120,
    requiredState: "alive",
    requiresTarget: true,
  },
  effect: {
    type: "debuff",
    duration: 15,
    target: "target",
    power: 1,
  },
  useAbility: async (target: Player) => {
    return true; // TODO: 調査の具体的な実装
  },
  remainingUses: 3, // 3回使用可能
};

// 神父の告解能力
const ConfessionAbility: BaseAbility = {
  id: "priest_confession",
  name: "告解",
  target: "player",
  description: "他のプレイヤーから告解を聞き、情報を得るのだ",
  requirements: {
    coolDownTime: 90,
    requiredState: "alive",
    requiresTarget: true,
  },
  effect: {
    type: "investigate",
    duration: 0,
    target: "target",
  },
  useAbility: async (target: Player) => {
    return true; // TODO: 調査の具体的な実装
  },
  remainingUses: -1, // 無制限使用可能
};

// 各職業の能力インスタンスを定義
const GUARD_ABILITIES: BaseAbility[] = [SurveillanceAbility, RestraintAbility];

const PRIEST_ABILITIES: BaseAbility[] = [
  ConfessionAbility,
  // TODO: 祝福能力を実装
];

const MERCHANT_ABILITIES: BaseAbility[] = [
  // TODO: 取引能力を実装
  // TODO: 情報売買能力を実装
];

const PRISONER_ABILITIES: BaseAbility[] = [
  // TODO: 脱出能力を実装
  // TODO: 情報収集能力を実装
];

// 職業詳細の作成関数
export const OCCUPATIONS: Record<OccupationName, Occupation> = {
  [OccupationName.GUARD]: {
    id: 0,
    name: "看守",
    description: "囚人を監視し、秩序を維持する重要な役割なのだ",
    objective: "囚人の脱走を防ぐのだ",
    winCondition: "囚人が脱走しなければ勝利なのだ",
    abilities: GUARD_ABILITIES,
  },
  [OccupationName.PRIEST]: {
    id: 1,
    name: "神父",
    description: "囚人の心の救済と更生を支援する存在なのだ",
    objective: "囚人の心を癒すのだ",
    winCondition: "囚人が心の平穏を得れば勝利なのだ",
    abilities: PRIEST_ABILITIES,
  },
  [OccupationName.MERCHANT]: {
    id: 2,
    name: "商人",
    description: "刑務所内での物資の取引を担当するのだ",
    objective: "物資を適切に管理するのだ",
    winCondition: "物資の流通が円滑に行われれば勝利なのだ",
    abilities: MERCHANT_ABILITIES,
  },
  [OccupationName.PRISONER]: {
    id: 3,
    name: "囚人",
    description: "刑務所に収容されている存在なのだ",
    objective: "脱走を試みるのだ",
    winCondition: "脱走に成功すれば勝利なのだ",
    abilities: PRISONER_ABILITIES,
  },
};

// 職業分布のルール定義
export const OCCUPATIONS_DISTRIBUTION_RULES: OccupationDistributionRule[] = [
  {
    playerRange: [1, 6],
    distribution: {
      [OccupationName.GUARD]: 1,
      [OccupationName.PRIEST]: 1,
      [OccupationName.MERCHANT]: 0,
      [OccupationName.PRISONER]: -1, // 残りのプレイヤー
    },
  },
  {
    playerRange: [7, 12],
    distribution: {
      [OccupationName.GUARD]: 1,
      [OccupationName.PRIEST]: 1,
      [OccupationName.MERCHANT]: 1,
      [OccupationName.PRISONER]: -1,
    },
  },
  {
    playerRange: [13, 16],
    distribution: {
      [OccupationName.GUARD]: 2,
      [OccupationName.PRIEST]: 1,
      [OccupationName.MERCHANT]: 1,
      [OccupationName.PRISONER]: -1,
    },
  },
  {
    playerRange: [17, 20],
    distribution: {
      [OccupationName.GUARD]: 2,
      [OccupationName.PRIEST]: 2,
      [OccupationName.MERCHANT]: 2,
      [OccupationName.PRISONER]: -1,
    },
  },
];
