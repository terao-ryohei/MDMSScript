import type { Player } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";

/**
 * UI共通ヘルパー関数群（関数ベース版）
 */

/**
 * 基本的なActionFormを作成
 */
export const createActionForm = (
	title: string,
	body?: string,
): ActionFormData => {
	const form = new ActionFormData().title(title);
	if (body) {
		form.body(body);
	}
	return form;
};

/**
 * 基本的なMessageFormを作成
 */
export const createMessageForm = (
	title: string,
	body: string,
): MessageFormData => {
	return new MessageFormData().title(title).body(body);
};

/**
 * UIエラーハンドリング
 */
export const handleUIError = (player: Player, error: Error): void => {
	console.error(`UI Error for player ${player.name}: ${error.message}`);

	// プレイヤーにエラーメッセージを送信
	player.sendMessage(
		"§cUI操作中にエラーが発生しました。しばらくしてからもう一度お試しください。",
	);

	// デバッグ情報をログに出力
	if (error.stack) {
		console.error(`Stack trace: ${error.stack}`);
	}
};
