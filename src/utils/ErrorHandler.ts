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
 * Function-based error creators (recommended approach)
 */

/**
 * バリデーションエラーの作成
 */
export interface ValidationErrorData {
	message: string;
	field: string;
	name: "ValidationError";
}

export const createValidationError = (
	message: string,
	field: string,
): ValidationErrorData => ({
	message,
	field,
	name: "ValidationError" as const,
});

/**
 * ゲーム状態エラーの作成
 */
export interface GameStateErrorData {
	message: string;
	state: string;
	name: "GameStateError";
}

export const createGameStateError = (
	message: string,
	state: string,
): GameStateErrorData => ({
	message,
	state,
	name: "GameStateError" as const,
});

/**
 * プレイヤー操作エラーの作成
 */
export interface PlayerActionErrorData {
	message: string;
	playerId: string;
	action: string;
	name: "PlayerActionError";
}

export const createPlayerActionError = (
	message: string,
	playerId: string,
	action: string,
): PlayerActionErrorData => ({
	message,
	playerId,
	action,
	name: "PlayerActionError" as const,
});

/**
 * エラーデータの判定関数
 */
export const isValidationError = (error: any): error is ValidationErrorData =>
	error && error.name === "ValidationError";

export const isGameStateError = (error: any): error is GameStateErrorData =>
	error && error.name === "GameStateError";

export const isPlayerActionError = (
	error: any,
): error is PlayerActionErrorData =>
	error && error.name === "PlayerActionError";

/**
 * エラーのログ出力（function-based errors用）
 */
export const logErrorData = (
	errorData: ValidationErrorData | GameStateErrorData | PlayerActionErrorData,
	severity: ErrorSeverity = ErrorSeverity.ERROR,
	context?: ErrorContext,
): void => {
	logError(errorData.message, undefined, severity, context);
};
