/**
 * ゲームフェーズの定義
 */
export enum GamePhase {
	PREPARATION = "preparation", // 準備フェーズ
	DAILY_LIFE = "daily_life", // 生活フェーズ
	INVESTIGATION = "investigation", // 調査フェーズ
	DISCUSSION = "discussion", // 会議フェーズ
	REINVESTIGATION = "reinvestigation", // 再調査・密談フェーズ
	DEDUCTION = "deduction", // 推理フェーズ
	VOTING = "voting", // 投票フェーズ
	ENDING = "ending", // 終了フェーズ
}

/**
 * フェーズ設定情報
 */
export interface PhaseConfig {
	id: number;
	phase: GamePhase;
	name: string;
	description: string;
	duration: number; // 制限時間（秒）
	allowedActions: string[]; // 許可されるアクション
	nextPhase: GamePhase | null; // 次のフェーズ
}

/**
 * フェーズ遷移結果
 */
export interface PhaseTransitionResult {
	success: boolean;
	previousPhase: GamePhase;
	currentPhase: GamePhase;
	error?: string;
}

/**
 * タイマー表示情報
 */
export interface TimerDisplay {
	remainingTime: {
		minutes: number;
		seconds: number;
	};
	progress: number; // 進行率（0-100）
	isWarning: boolean; // 警告時間かどうか
}
