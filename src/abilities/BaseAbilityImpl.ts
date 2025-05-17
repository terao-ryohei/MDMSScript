import type {
  BaseAbility,
  AbilityRequirement,
  AbilityEffect,
} from "../types/AbilityTypes";
import type {
  AbilityTarget,
  AbilityTargetType,
} from "../types/AdvancedFeatureTypes";

export abstract class BaseAbilityImpl implements BaseAbility {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly coolDown: number,
    public readonly requirements: AbilityRequirement,
    public readonly effect: AbilityEffect,
    public readonly targetType: AbilityTargetType,
    public remainingUses = -1, // -1 は無制限を表すのだ
  ) {}

  public async useAbility(target: AbilityTarget): Promise<boolean> {
    // 基本的な能力の使用ロジックを実装するのだ
    if (this.remainingUses === 0) {
      return false;
    }

    if (this.remainingUses > 0) {
      this.remainingUses--;
    }

    // 具体的な効果の適用は派生クラスで実装するのだ
    return await this.applyEffect(target);
  }

  protected abstract applyEffect(target: AbilityTarget): Promise<boolean>;
}
