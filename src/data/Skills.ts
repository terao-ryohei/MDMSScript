/**
 * 統合スキルシステム - 定義と実行機能の統合
 *
 * 【役割】
 * - スキル設定データと実行関数の統合管理
 * - 新しいスキル追加時: ここでSkillEntryを追加
 * - 冗長な変換レイヤーの排除
 */

import { ItemStack, type Player, system, world } from "@minecraft/server";
import { JobType } from "../types/JobTypes";
import { GamePhase } from "../types/PhaseTypes";
import { RoleType } from "../types/RoleTypes";
import {
	type SkillDefinition,
	type SkillExecutionResult,
	SkillTargetType,
	SkillType,
} from "../types/SkillTypes";

/**
 * スキル実行関数の型定義
 */
export type SkillExecutor = (
	player: Player,
	target?: Player,
	args?: Record<string, unknown>,
) => Promise<SkillExecutionResult>;

/**
 * 統合スキルエントリ
 * 設定データと実行関数を一体化
 */
export interface SkillEntry {
	definition: SkillDefinition;
	executor: SkillExecutor;
}

/**
 * 統合スキルマップ
 * キー: スキルID
 * 値: 定義と実行機能
 */
export const SKILLS: Record<string, SkillEntry> = {
	// === ロール基本能力 ===
	deduction_boost: {
		definition: {
			id: "deduction_boost",
			name: "推理力",
			description: "類稀な洞察力で証拠を一つ得る",
			type: SkillType.OBSERVE,
			targetType: SkillTargetType.SELF,
			cooldownTime: 0,
			usesPerGame: 1,
			requiresTarget: false,
			duration: 0,
			range: 0,
			allowedPhases: [GamePhase.INVESTIGATION, GamePhase.REINVESTIGATION],
		},
		executor: async (player: Player) => {
			// 推理力強化の実装
			// TODO: 証拠信頼性向上ロジック
			return {
				success: true,
				message: "その洞察力で証拠を一つ得ました",
			};
		},
	},

	murder: {
		definition: {
			id: "murder",
			name: "殺人の斧",
			description: "最初から殺人に使用可能な斧を所持している（パッシブ）",
			type: SkillType.PASSIVE,
			targetType: SkillTargetType.SELF,
			cooldownTime: 0,
			usesPerGame: -1, // 常時効果requiresTarget: false,
			duration: -1, // 永続効果
			range: 0,
			requiresTarget: false,
			allowedPhases: [
				GamePhase.PREPARATION,
				GamePhase.DAILY_LIFE,
				GamePhase.INVESTIGATION,
				GamePhase.DISCUSSION,
				GamePhase.REINVESTIGATION,
				GamePhase.DEDUCTION,
				GamePhase.VOTING,
			],
		},
		executor: async (player: Player) => {
			// パッシブスキル：ゲーム開始時に斧を付与
			try {
				// 斧を付与するコマンド
				const giveAxeCommand = `give "${player.name}" iron_axe 1 0 {"minecraft:item_lock":{"mode":"lock_in_inventory"},"minecraft:keep_on_death":{},"display":{"Name":"§c殺人の斧","Lore":["§7右クリックで被害者NPCを殺害"]}}`;
				player.runCommand(giveAxeCommand);
				return {
					success: true,
					message: "殺人の斧を所持しています",
				};
			} catch (error) {
				return {
					success: false,
					message: "斧の付与に失敗しました",
					error: String(error),
				};
			}
		},
	},

	accomplice: {
		definition: {
			id: "accomplice",
			name: "共犯",
			description: "犯人の情報を一つ事前に得る",
			type: SkillType.PASSIVE,
			targetType: SkillTargetType.SELF,
			cooldownTime: 0,
			usesPerGame: 1,
			requiresTarget: false,
			duration: 0,
			range: 0,
			allowedPhases: [GamePhase.INVESTIGATION, GamePhase.REINVESTIGATION],
		},
		executor: async (
			player: Player,
			target?: Player,
			args?: Record<string, unknown>,
		) => {
			// 調査能力の実装
			const location = args?.location as any; // TODO: 調査ロジック
			return {
				success: true,
				message: "調査を実行しました",
			};
		},
	},

	prison_escort: {
		definition: {
			id: "prison_escort",
			name: "牢獄連行",
			description: "指定したプレイヤーを3分間地下牢に連行する",
			type: SkillType.DETAIN,
			targetType: SkillTargetType.PLAYER,
			cooldownTime: 0,
			usesPerGame: 1,
			requiresTarget: true,
			duration: 180, // 3分
			range: 5,
			allowedPhases: [
				GamePhase.DAILY_LIFE,
				GamePhase.INVESTIGATION,
				GamePhase.REINVESTIGATION,
			],
		},
		executor: async (player: Player, target?: Player) => {
			// 牢獄連行の実装
			if (!target) {
				return {
					success: false,
					message: "連行対象が指定されていません",
				};
			}
			const currentPos = target.location;
			target.teleport({ x: 713, y: 91, z: -3675 });
			player.runCommand(
				`tellraw @s {"rawtext":[{"text":"怪しかったので${target.name}を牢獄に連行しました"}]}`,
			); // 3分後に元の位置に戻すタイマー（20 ticks = 1秒なので 180秒 * 20 = 3600 ticks）
			system.runTimeout(() => {
				target.teleport(currentPos);
				player.runCommand(
					`tellraw @s {"rawtext":[{"text":"${target.name}の拘束時間が終了しました"}]}`,
				);
			}, 360);
			return {
				success: true,
				message: `${target.name}を牢獄に連行しました`,
			};
		},
	},

	transmutation_catalyst: {
		definition: {
			id: "transmutation_catalyst",
			name: "錬成触媒生成",
			description: "特定の錬成陣を稼働させるアイテムを錬金する",
			type: SkillType.ALCHEMY,
			targetType: SkillTargetType.LOCATION,
			cooldownTime: 0,
			usesPerGame: 3,
			requiresTarget: true,
			duration: 0, // 瞬間効果
			range: 5,
			allowedPhases: [
				GamePhase.DAILY_LIFE,
				GamePhase.INVESTIGATION,
				GamePhase.REINVESTIGATION,
			],
		},
		executor: async (
			player: Player,
			target?: Player,
			args?: Record<string, unknown>,
		) => {
			// 錬成触媒生成の実装
			// TODO: 錬金術ロジック
			return {
				success: true,
				message: "錬成触媒を生成しました",
			};
		},
	},

	basic_alchemy: {
		definition: {
			id: "basic_alchemy",
			name: "錬金",
			description: "基礎的な錬金術を行い、材料を変換・精製する",
			type: SkillType.ALCHEMY,
			targetType: SkillTargetType.LOCATION,
			cooldownTime: 300, // 5分
			usesPerGame: -1, // 無制限
			requiresTarget: false,
			duration: 60, // 1分間の作業時間
			range: 0,
			allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.INVESTIGATION],
		},
		executor: async (
			player: Player,
			target?: Player,
			args?: Record<string, unknown>,
		) => {
			// 基礎錬金術の実装
			// TODO: 基礎錬金術ロジック
			return {
				success: true,
				message: "錬金術を実行しました",
			};
		},
	},

	// === 職業スキル ===
	royal_summon: {
		definition: {
			id: "royal_summon",
			name: "王の召喚",
			description: "指定したプレイヤーを自分の元に強制召喚する",
			type: SkillType.COMMUNICATE,
			targetType: SkillTargetType.PLAYER,
			cooldownTime: 300,
			usesPerGame: 3,
			requiresTarget: true,
			duration: 0,
			range: 99999999,
			allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.DISCUSSION],
		},
		executor: async (player: Player, target?: Player) => {
			// 王の召喚の実装
			if (!target) {
				return {
					success: false,
					message: "連行対象が指定されていません",
				};
			}
			target?.teleport({ x: 697, y: 114, z: -3675 });
			player.runCommand(
				`tellraw @s {"rawtext":[{"text":"王命を発し${target.name}を召喚しました"}]}`,
			);
			return {
				success: true,
				message: "王の威厳により召喚を実行しました",
			};
		},
	},

	insight_boost: {
		definition: {
			id: "insight_boost",
			name: "メイドのうわさ",
			description: "メイドたちのうわさ話から証拠を一つ得る",
			type: SkillType.OBSERVE,
			targetType: SkillTargetType.SELF,
			cooldownTime: 0,
			usesPerGame: 1,
			requiresTarget: false,
			duration: 0,
			range: 0,
			allowedPhases: [GamePhase.INVESTIGATION, GamePhase.REINVESTIGATION],
		},
		executor: async (player: Player) => {
			// 推理力強化の実装
			// TODO: 証拠信頼性向上ロジック
			return {
				success: true,
				message: "メイドたちのうわさ話から証拠を一つ得ました",
			};
		},
	},

	theft: {
		definition: {
			id: "theft",
			name: "盗み",
			description: "他プレイヤーやエリアから貴重品を盗む",
			type: SkillType.GATHER_INFO, // 物品収集として分類
			targetType: SkillTargetType.PLAYER,
			cooldownTime: 0,
			usesPerGame: 2,
			requiresTarget: true,
			duration: 0, // 瞬間効果
			range: 3,
			allowedPhases: [
				GamePhase.DAILY_LIFE,
				GamePhase.INVESTIGATION,
				GamePhase.REINVESTIGATION,
			],
		},
		executor: async (player: Player, target?: Player) => {
			// 窃盗の実装
			if (!target) {
				return {
					success: false,
					message: "対象が指定されていません",
				};
			}

			try {
				// 対象プレイヤーのインベントリを確認
				const inventory = target.getComponent("inventory")?.container;
				if (!inventory) {
					return {
						success: false,
						message: "対象のインベントリにアクセスできません",
					};
				}

				// 空でないスロットを探す
				const occupiedSlots: number[] = [];
				for (let i = 0; i < inventory.size; i++) {
					const item = inventory.getItem(i);
					if (item && item.amount > 0) {
						occupiedSlots.push(i);
					}
				}

				if (occupiedSlots.length === 0) {
					return {
						success: false,
						message: `${target.name}は何も持っていません`,
					};
				}

				// ランダムにアイテムを選択
				const randomSlot =
					occupiedSlots[Math.floor(Math.random() * occupiedSlots.length)];
				const stolenItem = inventory.getItem(randomSlot);

				if (!stolenItem) {
					return {
						success: false,
						message: "アイテムの取得に失敗しました",
					};
				}

				// アイテムを1個盗む
				const itemToSteal = stolenItem.clone();
				itemToSteal.amount = 1;

				// 対象から1個減らす
				if (stolenItem.amount > 1) {
					stolenItem.amount -= 1;
					inventory.setItem(randomSlot, stolenItem);
				} else {
					inventory.setItem(randomSlot, undefined);
				}

				// 盗人のインベントリに追加
				const playerInventory = player.getComponent("inventory")?.container;
				if (playerInventory) {
					playerInventory.addItem(itemToSteal);
				}

				return {
					success: true,
					message: `${target.name}から${itemToSteal.typeId}を盗みました`,
				};
			} catch (error) {
				console.warn("Failed to steal item:", error);
				return {
					success: false,
					message: "盗みに失敗しました",
					error: String(error),
				};
			}
		},
	},

	daily_wage: {
		definition: {
			id: "daily_wage",
			name: "日当収入",
			description: "一般兵士として毎日一定の日当を受け取る",
			type: SkillType.GATHER_INFO, // 経済系として分類
			targetType: SkillTargetType.SELF,
			cooldownTime: 1440, // 24時間（1日1回）
			usesPerGame: -1, // 毎日使用可能requiresTarget: false,
			duration: 0, // 瞬間効果
			range: 0,
			requiresTarget: false,
			allowedPhases: [
				GamePhase.DAILY_LIFE,
				GamePhase.INVESTIGATION,
				GamePhase.REINVESTIGATION,
				GamePhase.DISCUSSION,
			],
		},
		executor: async (player: Player) => {
			// 日給の実装
			// TODO: 報酬ロジック
			return {
				success: true,
				message: "兵士の給料を受け取りました",
			};
		},
	},

	student_discount: {
		definition: {
			id: "student_discount",
			name: "学割が効く",
			description: "各種サービスや商品を学生割引価格で利用できる",
			type: SkillType.PASSIVE,
			targetType: SkillTargetType.SELF,
			cooldownTime: 0,
			requiresTarget: false,
			usesPerGame: -1, // 常時効果requiresTarget: false,
			duration: -1, // 永続効果
			range: 0,
			allowedPhases: [GamePhase.DAILY_LIFE],
		},
		executor: async (player: Player) => {
			// 学割の実装
			// TODO: 学割ロジック
			return {
				success: true,
				message: "学生割引を利用しました",
			};
		},
	},

	guild_quest_mastery: {
		definition: {
			id: "guild_quest_mastery",
			name: "ギルドクエスト熟練",
			description: "ギルドクエスト成功回数によって追加で得られる証拠が増える",
			type: SkillType.PASSIVE,
			targetType: SkillTargetType.SELF,
			cooldownTime: 0,
			requiresTarget: false,
			usesPerGame: -1, // 常時効果requiresTarget: false,
			duration: -1, // 永続効果
			range: 0,
			allowedPhases: [GamePhase.INVESTIGATION, GamePhase.REINVESTIGATION],
		},
		executor: async (player: Player) => {
			// ギルドクエスト熟練の実装
			// TODO: クエストロジック
			return {
				success: true,
				message: "ギルドクエストを効率的に実行しました",
			};
		},
	},

	// === ランダムスキル ===
	random_food: {
		definition: {
			id: "random_food",
			name: "ランダムフード",
			description: "ランダムな食べ物を生成する",
			type: SkillType.GATHER_INFO,
			targetType: SkillTargetType.SELF,
			cooldownTime: 300,
			usesPerGame: 1,
			requiresTarget: false,
			duration: 0,
			range: 0,
			allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.INVESTIGATION],
		},
		executor: async (player: Player) => {
			// ランダムフード生成の実装
			const foodItems = [
				"minecraft:apple",
				"minecraft:bread",
				"minecraft:carrot",
			];
			const randomFoodId =
				foodItems[Math.floor(Math.random() * foodItems.length)];
			const randomFoodItem = new ItemStack(randomFoodId, 1);

			const playerInventory = player.getComponent("inventory")?.container;
			if (playerInventory) {
				playerInventory.addItem(randomFoodItem);
			}

			return {
				success: true,
				message: `${player.name}は${randomFoodId.replace("minecraft:", "")}を生成しました`,
			};
		},
	},

	goto_pergola: {
		definition: {
			id: "goto_pergola",
			name: "パーゴラ鑑賞券",
			description: "10秒後、パーゴラに移動する",
			type: SkillType.COMMUNICATE,
			targetType: SkillTargetType.SELF,
			cooldownTime: 0,
			usesPerGame: 2,
			requiresTarget: false,
			duration: 0,
			range: 0,
			allowedPhases: [
				GamePhase.DAILY_LIFE,
				GamePhase.INVESTIGATION,
				GamePhase.REINVESTIGATION,
			],
		},
		executor: async (player: Player) => {
			// パーゴラへ移動するロジック

			system.runTimeout(() => {
				player.teleport({ x: 717, y: 144, z: -3652 });
			}, 100);

			return {
				success: true,
				message: `${player.name}は10秒後にパーゴラに移動します`,
			};
		},
	},

	call_to_square: {
		definition: {
			id: "call_to_square",
			name: "広場緊急招集",
			description: "広場に集まるように呼び掛ける",
			type: SkillType.HIDE,
			targetType: SkillTargetType.SELF,
			cooldownTime: 600,
			usesPerGame: 2,
			requiresTarget: false,
			duration: 300,
			range: 0,
			allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.INVESTIGATION],
		},
		executor: async (player: Player) => {
			// 広場に集まるように呼び掛けるロジック
			world.getDimension("overworld").runCommand("say 広場に集まれ！");
			return {
				success: true,
				message: "広場に集まるように呼び掛けました",
			};
		},
	},

	disguise: {
		definition: {
			id: "disguise",
			name: "変装",
			description: "一定時間、服装が変わる",
			type: SkillType.HIDE,
			targetType: SkillTargetType.SELF,
			cooldownTime: 300,
			usesPerGame: 2,
			requiresTarget: false,
			duration: 300,
			range: 0,
			allowedPhases: [GamePhase.DAILY_LIFE, GamePhase.DISCUSSION],
		},
		executor: async (player: Player, target?: Player) => {
			// 変装の実装（金装備、頭だけエンドラ）

			world
				.getDimension("overworld")
				.runCommand(
					`replaceitem entity "${player.name}" slot.armor.head 1 minecraft:dragon_head`,
				);
			world
				.getDimension("overworld")
				.runCommand(
					`replaceitem entity "${player.name}" slot.armor.chest 1 minecraft:golden_chestplate`,
				);
			world
				.getDimension("overworld")
				.runCommand(
					`replaceitem entity "${player.name}" slot.armor.legs 1 minecraft:golden_leggings`,
				);
			world
				.getDimension("overworld")
				.runCommand(
					`replaceitem entity "${player.name}" slot.armor.feet 1 minecraft:golden_boots`,
				);

			system.runTimeout(() => {
				// 変装解除（元の装備に戻す）
				world
					.getDimension("overworld")
					.runCommand(
						`replaceitem entity "${player.name}" slot.armor.head 1 air`,
					);
				world
					.getDimension("overworld")
					.runCommand(
						`replaceitem entity "${player.name}" slot.armor.chest 1 air`,
					);
				world
					.getDimension("overworld")
					.runCommand(
						`replaceitem entity "${player.name}" slot.armor.legs 1 air`,
					);
				world
					.getDimension("overworld")
					.runCommand(
						`replaceitem entity "${player.name}" slot.armor.feet 1 air`,
					);
			}, 300);

			return {
				success: true,
				message: `${player.name}は変装しました`,
			};
		},
	},

	darkness: {
		definition: {
			id: "darkness",
			name: "暗黒",
			description: "全員を5秒間暗闇+鈍足にする",
			type: SkillType.HIDE,
			targetType: SkillTargetType.ALL,
			cooldownTime: 0,
			usesPerGame: 1,
			requiresTarget: false,
			duration: 0,
			range: 0,
			allowedPhases: [
				GamePhase.DAILY_LIFE,
				GamePhase.INVESTIGATION,
				GamePhase.REINVESTIGATION,
			],
		},
		executor: async (player: Player) => {
			// 全員に暗黒効果を付与するロジック
			world.getDimension("overworld").runCommand("effect @a darkness 10 5");
			world.getDimension("overworld").runCommand("effect @a slowness 10 5");
			world
				.getDimension("overworld")
				.runCommand(
					`tellraw @a {"rawtext":[{"text":"突然全員が暗闇に包まれました"}]}`,
				);
			world
				.getDimension("overworld")
				.runCommand(`effect "${player.name}" clear`);

			return {
				success: true,
				message: "全員を暗闇に包みました",
			};
		},
	},
};

/**
 * ユーティリティ関数
 */

// スキル定義を取得
export function getSkillDefinition(
	skillId: string,
): SkillDefinition | undefined {
	return SKILLS[skillId]?.definition;
}

// スキル実行関数を取得
export function getSkillExecutor(skillId: string): SkillExecutor | undefined {
	return SKILLS[skillId]?.executor;
}

// 全スキルIDのリストを取得
export function getAllSkillIds(): string[] {
	return Object.keys(SKILLS);
}

/**
 * 能力カテゴリ分類
 */
export const SKILLS_BY_CATEGORY = {
	ROLE_BASIC: ["deduction_boost", "murder", "insider_info"],
	JOB_SPECIFIC: [
		"royal_summon",
		"protection",
		"divination",
		"negotiation",
		"information_network",
		"appraisal",
		"eavesdrop",
		"concealment",
		"surveillance",
		"teleportation",
	],
	COMMON_RANDOM: [
		"investigate",
		"search_evidence",
		"observe",
		"communicate",
		"hide",
	],
	SPECIAL_EVIL: ["sabotage", "disguise", "assist", "distract", "cover_up"],
};

/**
 * フェーズ別使用可能能力
 */
export const ABILITIES_BY_PHASE: Record<GamePhase, string[]> = {
	[GamePhase.PREPARATION]: ["insider_info"],
	[GamePhase.DAILY_LIFE]: [
		"murder",
		"royal_summon",
		"protection",
		"negotiation",
		"eavesdrop",
		"concealment",
		"surveillance",
		"teleportation",
		"observe",
		"communicate",
		"hide",
		"disguise",
		"assist",
		"cover_up",
	],
	[GamePhase.INVESTIGATION]: [
		"deduction_boost",
		"protection",
		"divination",
		"information_network",
		"appraisal",
		"concealment",
		"surveillance",
		"teleportation",
		"investigate",
		"search_evidence",
		"observe",
		"sabotage",
		"assist",
		"distract",
		"cover_up",
	],
	[GamePhase.DISCUSSION]: [
		"deduction_boost",
		"royal_summon",
		"negotiation",
		"eavesdrop",
		"observe",
		"communicate",
		"distract",
	],
	[GamePhase.REINVESTIGATION]: [
		"deduction_boost",
		"divination",
		"information_network",
		"appraisal",
		"teleportation",
		"investigate",
		"search_evidence",
		"sabotage",
	],
	[GamePhase.DEDUCTION]: [],
	[GamePhase.VOTING]: [],
	[GamePhase.ENDING]: [],
};

/**
 * ロール別基本能力マッピング
 */
export const ROLE_BASE_SKILLS: Record<RoleType, string> = {
	[RoleType.MURDERER]: "murder",
	[RoleType.VILLAGER]: "deduction_boost",
	[RoleType.DETECTIVE]: "investigation_boost",
	[RoleType.ACCOMPLICE]: "insider_info",
};

/**
 * 職業別基本能力マッピング
 */
export const JOB_BASE_SKILLS: Record<JobType, string> = {
	[JobType.LORD]: "royal_summon",
	[JobType.CAPTAIN]: "prison_escort",
	[JobType.HOMUNCULUS]: "transmutation_catalyst",
	[JobType.COURT_ALCHEMIST]: "basic_alchemy",
	[JobType.ROGUE_ALCHEMIST]: "basic_alchemy",
	[JobType.THIEF]: "theft",
	[JobType.PHARMACIST]: "compounding",
	[JobType.MAID]: "auto_evidence_collect",
	[JobType.BUTLER]: "social_advantage",
	[JobType.SOLDIER]: "daily_wage",
	[JobType.STUDENT]: "student_discount",
	[JobType.ADVENTURER]: "guild_quest_mastery",
};
