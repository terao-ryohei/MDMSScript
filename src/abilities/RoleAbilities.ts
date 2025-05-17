import { BaseAbilityImpl } from "./BaseAbilityImpl";
import type {
  AbilityTarget,
  AbilityTargetType,
} from "../types/AdvancedFeatureTypes";
import { RoleType } from "../types/AdvancedFeatureTypes";
import type { RoleAbility } from "../types/RoleTypes";

// 探偵の調査能力
class InvestigateAbility extends BaseAbilityImpl implements RoleAbility {
  constructor() {
    super(
      "detective_investigate",
      "調査",
      "現場を調査し、証拠を見つけ出すのだ",
      30, // coolDown
      {
        cooldownTime: 30,
        requiredState: "alive",
        requiresTarget: true,
      },
      {
        type: "investigate",
        duration: 10,
        target: "area",
        radius: 5,
      },
      "location",
      -1, // 無制限使用可能
    );
  }

  protected async applyEffect(target: AbilityTarget): Promise<boolean> {
    // TODO: 調査の具体的な実装
    return true;
  }
}

// 探偵の分析能力
class AnalyzeAbility extends BaseAbilityImpl implements RoleAbility {
  constructor() {
    super(
      "detective_analyze",
      "分析",
      "集めた証拠を分析し、新たな情報を得るのだ",
      60, // coolDown
      {
        cooldownTime: 60,
        requiredState: "alive",
        requiresTarget: false,
        requiredItems: ["evidence"],
      },
      {
        type: "investigate",
        duration: 0,
        target: "self",
      },
      "evidence",
      -1, // 無制限使用可能
    );
  }

  protected async applyEffect(target: AbilityTarget): Promise<boolean> {
    // TODO: 分析の具体的な実装
    return true;
  }
}

// 殺人者の殺害能力
class MurderAbility extends BaseAbilityImpl implements RoleAbility {
  constructor() {
    super(
      "killer_murder",
      "殺害",
      "対象を殺害するのだ",
      300, // coolDown
      {
        cooldownTime: 300,
        requiredState: "alive",
        requiresTarget: true,
      },
      {
        type: "damage",
        duration: 0,
        target: "target",
        power: 100,
      },
      "player",
      1, // 1回のみ使用可能
    );
  }

  protected async applyEffect(target: AbilityTarget): Promise<boolean> {
    // TODO: 殺害の具体的な実装
    return true;
  }
}

// 各役職の能力インスタンス
export const DETECTIVE_ABILITIES: RoleAbility[] = [
  new InvestigateAbility(),
  new AnalyzeAbility(),
];

export const KILLER_ABILITIES: RoleAbility[] = [
  new MurderAbility(),
  // TODO: 変装能力を実装
];

export const ACCOMPLICE_ABILITIES: RoleAbility[] = [
  // TODO: アリバイ作り能力を実装
  // TODO: 誤情報能力を実装
];

export const CITIZEN_ABILITIES: RoleAbility[] = [
  // TODO: 通報能力を実装
  // TODO: 護衛能力を実装
];

// 役職ごとの能力マップ
export const ROLE_ABILITIES = new Map<RoleType, RoleAbility[]>([
  [RoleType.DETECTIVE, DETECTIVE_ABILITIES],
  [RoleType.KILLER, KILLER_ABILITIES],
  [RoleType.ACCOMPLICE, ACCOMPLICE_ABILITIES],
  [RoleType.CITIZEN, CITIZEN_ABILITIES],
]);

// 初期化用のオブジェクト
export const ROLE_ABILITY_DETAILS = {
  [RoleType.DETECTIVE]: {
    abilities: DETECTIVE_ABILITIES,
  },
  [RoleType.KILLER]: {
    abilities: KILLER_ABILITIES,
  },
  [RoleType.ACCOMPLICE]: {
    abilities: ACCOMPLICE_ABILITIES,
  },
  [RoleType.CITIZEN]: {
    abilities: CITIZEN_ABILITIES,
  },
};
