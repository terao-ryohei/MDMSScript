import { GamePhase, type PhaseConfig } from "../types/PhaseTypes";

/**
 * 各フェーズの詳細設定
 */
export const PHASE_CONFIGS: Record<GamePhase, PhaseConfig> = {
	[GamePhase.PREPARATION]: {
		id: 0,
		phase: GamePhase.PREPARATION,
		name: "準備フェーズ",
		description: "ロール・ジョブ確認、マップ散策",
		duration: 600, // 10分
		allowedActions: ["move", "chat", "use_ui", "view_role", "view_job"],
		nextPhase: GamePhase.DAILY_LIFE,
	},

	[GamePhase.DAILY_LIFE]: {
		id: 1,
		phase: GamePhase.DAILY_LIFE,
		name: "生活フェーズ",
		description: "日常生活、タスク実行、事件発生可能",
		duration: 1200, // 20分
		allowedActions: [
			"move",
			"chat",
			"use_item",
			"break_block",
			"place_block",
			"interact",
			"task",
			"murder",
		],
		nextPhase: GamePhase.INVESTIGATION,
	},

	[GamePhase.INVESTIGATION]: {
		id: 2,
		phase: GamePhase.INVESTIGATION,
		name: "調査フェーズ",
		description: "証拠収集と分析",
		duration: 720, // 12分
		allowedActions: [
			"move",
			"chat",
			"collect_evidence",
			"use_skill",
			"analyze",
		],
		nextPhase: GamePhase.DISCUSSION,
	},

	[GamePhase.DISCUSSION]: {
		id: 3,
		phase: GamePhase.DISCUSSION,
		name: "会議フェーズ",
		description: "議論と情報共有",
		duration: 540, // 9分
		allowedActions: ["chat", "share_evidence", "use_ui"],
		nextPhase: GamePhase.REINVESTIGATION,
	},

	[GamePhase.REINVESTIGATION]: {
		id: 4,
		phase: GamePhase.REINVESTIGATION,
		name: "再調査・密談フェーズ",
		description: "追加調査と密談",
		duration: 540, // 9分
		allowedActions: [
			"move",
			"chat",
			"collect_evidence",
			"secret_talk",
			"trade",
		],
		nextPhase: GamePhase.DEDUCTION,
	},

	[GamePhase.DEDUCTION]: {
		id: 5,
		phase: GamePhase.DEDUCTION,
		name: "推理フェーズ",
		description: "推理発表",
		duration: 360, // 6分
		allowedActions: ["chat", "present_theory", "use_ui"],
		nextPhase: GamePhase.VOTING,
	},

	[GamePhase.VOTING]: {
		id: 6,
		phase: GamePhase.VOTING,
		name: "投票フェーズ",
		description: "犯人投票と目的達成処理",
		duration: 180, // 3分
		allowedActions: ["vote", "special_action", "use_ui"],
		nextPhase: GamePhase.ENDING,
	},

	[GamePhase.ENDING]: {
		id: 7,
		phase: GamePhase.ENDING,
		name: "終了フェーズ",
		description: "結果発表とスコア計算",
		duration: 120, // 2分
		allowedActions: ["view_results", "use_ui"],
		nextPhase: null,
	},
};

/**
 * 警告時間の設定（秒）
 */
export const WARNING_THRESHOLDS = {
	WARNING_TIME: 60, // 1分前から警告
	CRITICAL_TIME: 10, // 10秒前から緊急警告
} as const;

/**
 * プレイヤー数に応じたフェーズ時間調整
 */
export function getAdjustedPhaseConfig(
	phase: GamePhase,
	playerCount: number,
): PhaseConfig {
	const baseConfig = { ...PHASE_CONFIGS[phase] };

	// 3人以下の場合は時間を短縮
	if (playerCount <= 3) {
		const reductionFactor = 0.1; // 90%短縮
		baseConfig.duration = Math.floor(baseConfig.duration * reductionFactor);

		// 最小時間を保証
		switch (phase) {
			case GamePhase.PREPARATION:
				baseConfig.duration = Math.max(baseConfig.duration, 30); // 最低30秒
				break;
			case GamePhase.DAILY_LIFE:
				baseConfig.duration = Math.max(baseConfig.duration, 30); // 最低30秒
				break;
			case GamePhase.INVESTIGATION:
				baseConfig.duration = Math.max(baseConfig.duration, 30); // 最低30秒
				break;
			case GamePhase.DISCUSSION:
				baseConfig.duration = Math.max(baseConfig.duration, 30); // 最低30秒
				break;
			case GamePhase.REINVESTIGATION:
				baseConfig.duration = Math.max(baseConfig.duration, 30); // 最低30秒
				break;
			case GamePhase.DEDUCTION:
				baseConfig.duration = Math.max(baseConfig.duration, 30); // 最低30秒
				break;
			case GamePhase.VOTING:
				baseConfig.duration = Math.max(baseConfig.duration, 30); // 最低30秒
				break;
		}
	}

	return baseConfig;
}
