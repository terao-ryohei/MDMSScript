import type { OccupationAbility, OccupationDetails } from "./OccupationTypes";
import { OccupationType } from "./OccupationEnum";
import { BaseAbilityImpl } from "../abilities/BaseAbilityImpl";
import type { AbilityTarget } from "../types/AdvancedFeatureTypes";

// 看守の監視能力
class SurveillanceAbility extends BaseAbilityImpl implements OccupationAbility {
  constructor() {
    super(
      "guard_surveillance",
      "監視",
      "指定したエリアを監視し、不審な行動を検知するのだ",
      60, // coolDown
      {
        cooldownTime: 60,
        requiredState: "alive",
        requiresTarget: true,
      },
      {
        type: "investigate",
        duration: 30,
        target: "area",
        radius: 10,
      },
      "location",
      -1, // 無制限使用可能
    );
  }

  protected async applyEffect(target: AbilityTarget): Promise<boolean> {
    // TODO: 監視の具体的な実装
    return true;
  }
}

// 看守の拘束能力
class RestraintAbility extends BaseAbilityImpl implements OccupationAbility {
  constructor() {
    super(
      "guard_restraint",
      "拘束",
      "容疑者を一時的に拘束し、移動を制限するのだ",
      120, // coolDown
      {
        cooldownTime: 120,
        requiredState: "alive",
        requiresTarget: true,
      },
      {
        type: "debuff",
        duration: 15,
        target: "target",
        power: 1,
      },
      "player",
      3, // 3回使用可能
    );
  }

  protected async applyEffect(target: AbilityTarget): Promise<boolean> {
    // TODO: 拘束の具体的な実装
    return true;
  }
}

// 神父の告解能力
class ConfessionAbility extends BaseAbilityImpl implements OccupationAbility {
  constructor() {
    super(
      "priest_confession",
      "告解",
      "他のプレイヤーから告解を聞き、情報を得るのだ",
      90, // coolDown
      {
        cooldownTime: 90,
        requiredState: "alive",
        requiresTarget: true,
      },
      {
        type: "investigate",
        duration: 0,
        target: "target",
      },
      "player",
      -1, // 無制限使用可能
    );
  }

  protected async applyEffect(target: AbilityTarget): Promise<boolean> {
    // TODO: 告解の具体的な実装
    return true;
  }
}

// 各職業の能力インスタンスを定義
const GUARD_ABILITIES: OccupationAbility[] = [
  new SurveillanceAbility(),
  new RestraintAbility(),
];

const PRIEST_ABILITIES: OccupationAbility[] = [
  new ConfessionAbility(),
  // TODO: 祝福能力を実装
];

const MERCHANT_ABILITIES: OccupationAbility[] = [
  // TODO: 取引能力を実装
  // TODO: 情報売買能力を実装
];

const PRISONER_ABILITIES: OccupationAbility[] = [
  // TODO: 脱出能力を実装
  // TODO: 情報収集能力を実装
];

// 職業ごとの能力マップ
export const OCCUPATION_ABILITIES = new Map<
  OccupationType,
  OccupationAbility[]
>([
  [OccupationType.GUARD, GUARD_ABILITIES],
  [OccupationType.PRIEST, PRIEST_ABILITIES],
  [OccupationType.MERCHANT, MERCHANT_ABILITIES],
  [OccupationType.PRISONER, PRISONER_ABILITIES],
]);

// 職業詳細の作成関数
function createOccupationDetails(): Map<OccupationType, OccupationDetails> {
  return new Map([
    [
      OccupationType.GUARD,
      {
        name: "看守",
        description: "囚人を監視し、秩序を維持する重要な役割なのだ",
        abilities: GUARD_ABILITIES,
      },
    ],
    [
      OccupationType.PRIEST,
      {
        name: "神父",
        description: "囚人の心の救済と更生を支援する存在なのだ",
        abilities: PRIEST_ABILITIES,
      },
    ],
    [
      OccupationType.MERCHANT,
      {
        name: "商人",
        description: "刑務所内での物資の取引を担当するのだ",
        abilities: MERCHANT_ABILITIES,
      },
    ],
    [
      OccupationType.PRISONER,
      {
        name: "囚人",
        description: "刑務所に収容されている存在なのだ",
        abilities: PRISONER_ABILITIES,
      },
    ],
  ]);
}

// 職業詳細情報を初期化してエクスポート
export const OCCUPATION_DETAILS = createOccupationDetails();
