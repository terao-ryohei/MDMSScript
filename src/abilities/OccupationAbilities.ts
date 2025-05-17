import { BaseAbilityImpl } from "./BaseAbilityImpl";
import type { AbilityTarget } from "../types/AdvancedFeatureTypes";
import type { OccupationAbility } from "../types/OccupationTypes";

// 職業の能力の基底クラスを提供
// 具体的な能力の実装は OccupationDetailsConfig.ts に移動したのだ
export abstract class OccupationAbilityBase
  extends BaseAbilityImpl
  implements OccupationAbility
{
  protected abstract applyEffect(target: AbilityTarget): Promise<boolean>;
}
