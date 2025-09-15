import type { Player } from "@minecraft/server";
import {
	ActionFormData,
	MessageFormData,
	ModalFormData,
} from "@minecraft/server-ui";

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
 * 確認ダイアログを表示
 */
export const showConfirmationDialog = async (
	player: Player,
	title: string,
	message: string,
	confirmText: string = "確認",
	cancelText: string = "キャンセル",
): Promise<boolean> => {
	try {
		const form = createMessageForm(title, message)
			.button1(confirmText)
			.button2(cancelText);

		const response = await form.show(player);
		return response.selection === 0;
	} catch (error) {
		handleUIError(player, error as Error);
		return false;
	}
};

/**
 * エラー表示ダイアログ
 */
export const showErrorDialog = async (
	player: Player,
	title: string,
	message: string,
): Promise<void> => {
	try {
		const form = createMessageForm(title, `§c${message}`).button1("確認");

		await form.show(player);
	} catch (error) {
		console.error(`Failed to show error dialog: ${error}`);
	}
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

/**
 * UIレスポンスの共通処理
 */
export const handleFormResponse = async <T>(
	player: Player,
	formPromise: Promise<T>,
	errorMessage: string = "フォームの表示に失敗しました",
): Promise<T | null> => {
	try {
		return await formPromise;
	} catch (error) {
		handleUIError(player, new Error(`${errorMessage}: ${error}`));
		return null;
	}
};

/**
 * 標準的なメニュー項目作成
 */
export const addMenuButton = (
	form: ActionFormData,
	text: string,
	icon?: string,
	description?: string,
): ActionFormData => {
	const buttonText = description ? `${text}\n§7${description}` : text;
	return form.button(buttonText, icon);
};

/**
 * ステータス表示用のテキスト作成
 */
export const createStatusText = (
	label: string,
	value: string,
	good: boolean = true,
): string => {
	const color = good ? "§2" : "§c";
	return `§7${label}: ${color}${value}`;
};

/**
 * 基本的なModalFormを作成
 */
export const createModalForm = (title: string): ModalFormData => {
	return new ModalFormData().title(title);
};

/**
 * プレイヤーリストを文字列配列に変換
 */
export const formatPlayerList = (players: Player[]): string[] => {
	return players.map((p) => p.name);
};

/**
 * プレイヤー選択UI作成
 */
export const createPlayerSelectionForm = (
	title: string,
	players: Player[],
	body?: string,
): ActionFormData => {
	const form = createActionForm(title, body);

	players.forEach((player) => {
		form.button(`${player.name}`, "textures/ui/permissions_member_star");
	});

	return form;
};

/**
 * ページネーション付きリスト作成
 */
export const createPaginatedList = <T>(
	items: T[],
	pageSize: number,
	currentPage: number = 0,
): { items: T[]; hasNext: boolean; hasPrev: boolean; totalPages: number } => {
	const totalPages = Math.ceil(items.length / pageSize);
	const startIndex = currentPage * pageSize;
	const endIndex = Math.min(startIndex + pageSize, items.length);

	return {
		items: items.slice(startIndex, endIndex),
		hasNext: currentPage < totalPages - 1,
		hasPrev: currentPage > 0,
		totalPages,
	};
};

/**
 * 情報表示ダイアログ
 */
export const showInfoDialog = async (
	player: Player,
	title: string,
	message: string,
): Promise<void> => {
	try {
		const form = createMessageForm(title, message).button1("確認");

		await form.show(player);
	} catch (error) {
		handleUIError(player, error as Error);
	}
};
