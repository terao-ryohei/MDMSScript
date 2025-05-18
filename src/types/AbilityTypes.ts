import type { Player } from "@minecraft/server";

/**
 * 能力の要件を定義するインターフェース
 */
export interface AbilityRequirement {
  // 能力使用に必要なクールダウン時間（秒）
  coolDownTime: number;
  // 能力使用に必要なアイテム（オプション）
  requiredItems?: string[];
  // 能力使用に必要な状態（生存中、死亡済みなど）
  requiredState?: "alive" | "dead" | "spectator";
  // 能力使用に必要な対象の存在（オプション）
  requiresTarget: boolean;
}

/**
 * 能力の効果を定義するインターフェース
 */
export interface AbilityEffect {
  // 効果の種類
  type: "damage" | "heal" | "buff" | "debuff" | "investigate" | "protect";
  // 効果の持続時間（秒、0は即時効果）
  duration: number;
  // 効果の対象（self: 自分自身、target: 選択対象、area: 範囲）
  target: "self" | "target" | "area";
  // 効果の強さ（ダメージ量、回復量など）
  power?: number;
  // 範囲効果の場合の半径（ブロック数）
  radius?: number;
}

/**
 * 基本的な能力インターフェース
 */
export interface BaseAbility {
  id: string;
  name: string;
  description: string;
  requirements: AbilityRequirement;
  effect: AbilityEffect;
  remainingUses: number;
  target: "player" | "location" | "evidence";
  useAbility(target: Player | string): Promise<boolean>;
}
