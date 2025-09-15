import type { Player } from "@minecraft/server";

/**
 * 統一エラーハンドリングシステム
 */

export enum ErrorSeverity {
	INFO = "info",
	WARNING = "warning",
	ERROR = "error",
	CRITICAL = "critical",
}

export interface ErrorContext {
	playerId?: string;
	playerName?: string;
	action?: string;
	phase?: string;
	manager?: string;
	data?: Record<string, unknown>;
}

/**
 * エラーログ出力
 */
export const logError = (
	message: string,
	error?: Error,
	severity: ErrorSeverity = ErrorSeverity.ERROR,
	context?: ErrorContext,
): void => {
	const timestamp = new Date().toISOString();
	const contextStr = context ? ` [${JSON.stringify(context)}]` : "";

	console.error(
		`[${timestamp}] ${severity.toUpperCase()}: ${message}${contextStr}`,
	);

	if (error?.stack) {
		console.error(`Stack trace: ${error.stack}`);
	}
};

/**
 * プレイヤーへのエラー通知
 */
export const notifyPlayerError = (
	player: Player,
	userMessage: string,
	logMessage?: string,
	error?: Error,
): void => {
	// プレイヤーに分かりやすいメッセージを送信
	player.sendMessage(`§c${userMessage}`);

	// ログに詳細情報を記録
	logError(logMessage || userMessage, error, ErrorSeverity.ERROR, {
		playerId: player.id,
		playerName: player.name,
	});
};

/**
 * UI操作エラーハンドリング
 */
export const handleUIError = (
	player: Player,
	error: Error,
	action: string = "UI操作",
	manager?: string,
): void => {
	notifyPlayerError(
		player,
		"UI操作中にエラーが発生しました。しばらくしてからもう一度お試しください。",
		`UI Error in ${action}`,
		error,
	);

	logError(`UI operation failed: ${action}`, error, ErrorSeverity.ERROR, {
		playerId: player.id,
		playerName: player.name,
		action,
		manager,
	});
};

/**
 * ゲームロジックエラーハンドリング
 */
export const handleGameError = (
	message: string,
	error?: Error,
	context?: ErrorContext,
	severity: ErrorSeverity = ErrorSeverity.ERROR,
): void => {
	logError(message, error, severity, context);

	// クリティカルエラーの場合は管理者にも通知
	if (severity === ErrorSeverity.CRITICAL) {
		console.error(`CRITICAL ERROR: ${message} - Game may be unstable`);
	}
};

/**
 * 非同期操作のエラーハンドリング
 */
export const safeAsync = async <T>(
	operation: () => Promise<T>,
	fallback: T,
	errorMessage: string,
	context?: ErrorContext,
): Promise<T> => {
	try {
		return await operation();
	} catch (error) {
		handleGameError(errorMessage, error as Error, context);
		return fallback;
	}
};

/**
 * バリデーションエラー
 */
export class ValidationError extends Error {
	constructor(
		message: string,
		public field: string,
	) {
		super(message);
		this.name = "ValidationError";
	}
}

/**
 * ゲーム状態エラー
 */
export class GameStateError extends Error {
	constructor(
		message: string,
		public state: string,
	) {
		super(message);
		this.name = "GameStateError";
	}
}

/**
 * プレイヤー操作エラー
 */
export class PlayerActionError extends Error {
	constructor(
		message: string,
		public playerId: string,
		public action: string,
	) {
		super(message);
		this.name = "PlayerActionError";
	}
}
