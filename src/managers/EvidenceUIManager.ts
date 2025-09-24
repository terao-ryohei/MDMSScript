/**
 * 証拠表示UI管理関数群（関数ベース版）
 */
import { type Player, world } from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";
import { createActionForm } from "../utils/UIHelpers";
import {
	getEvidenceData,
	getPlayerActions,
	getPlayerAlibi,
} from "./EvidenceAnalyzer";

/**
 * 証拠メインメニューを表示
 */
export async function showEvidenceMenu(player: Player): Promise<void> {
	try {
		const form = createActionForm("$1", "$2")
			.button("証拠一覧", "textures/ui/book_edit_default")
			.button("プレイヤー行動履歴", "textures/ui/friend_glyph")
			.button("アリバイ確認", "textures/ui/clock")
			.button("閉じる", "textures/ui/cancel");

		const response = await form.show(player);

		if (response.canceled) return;

		switch (response.selection) {
			case 0:
				await showEvidenceList(player);
				break;
			case 1:
				await showPlayerActionHistory(player);
				break;
			case 2:
				await showAlibiList(player);
				break;
		}
	} catch (error) {
		console.error(`Failed to show evidence menu for ${player.name}:`, error);
		player.sendMessage("§c証拠メニューの表示に失敗しました");
	}
}

/**
 * 証拠一覧を表示
 */
export async function showEvidenceList(player: Player): Promise<void> {
	try {
		const evidence = getEvidenceData();

		if (evidence.length === 0) {
			const form = new MessageFormData()
				.title("§c証拠一覧")
				.body("§7まだ証拠が見つかっていません。");
			await form.show(player);
			return;
		}

		let content = "§7発見された証拠：\n\n";
		evidence.forEach((record, index) => {
			const timeStr = new Date(record.timestamp * 1000).toLocaleTimeString(
				"ja-JP",
			);
			content += `§6${index + 1}. ${timeStr}\n`;
			content += `§7プレイヤー: §j${getPlayerName(record.playerId)}\n`;
			content += `§7行動: §j${record.actionType}\n`;
			content += `§7場所: §j(${Math.round(record.location.x)}, ${Math.round(record.location.y)}, ${Math.round(record.location.z)})\n`;
			if (record.witnessIds.length > 0) {
				content += `§7目撃者: §j${record.witnessIds.length}人\n`;
			}
			content += "\n";
		});

		const form = new MessageFormData()
			.title("§2証拠一覧")
			.body(content)
			.button1("戻る")
			.button2("閉じる");

		const response = await form.show(player);
		if (response.selection === 0) {
			await showEvidenceMenu(player);
		}
	} catch (error) {
		console.error(`Failed to show evidence list for ${player.name}:`, error);
		player.sendMessage("§c証拠一覧の表示に失敗しました");
	}
}

/**
 * プレイヤー行動履歴を表示
 */
export async function showPlayerActionHistory(player: Player): Promise<void> {
	try {
		const allPlayers = world.getAllPlayers();

		const form = createActionForm("$1", "$2");

		allPlayers.forEach((p) => {
			form.button(`§j${p.name}`, "textures/ui/friend_glyph");
		});
		form.button("戻る", "textures/ui/cancel");

		const response = await form.show(player);
		if (response.canceled) return;

		if (response.selection === allPlayers.length) {
			await showEvidenceMenu(player);
			return;
		}

		const selectedPlayer = allPlayers[response.selection!];
		const actions = getPlayerActions(selectedPlayer.id, 20);

		if (actions.length === 0) {
			const messageForm = new MessageFormData()
				.title(`§3${selectedPlayer.name}の行動履歴`)
				.body("§7行動履歴が見つかりませんでした。")
				.button1("戻る")
				.button2("閉じる");

			const messageResponse = await messageForm.show(player);
			if (messageResponse.selection === 0) {
				await showPlayerActionHistory(player);
			}
			return;
		}

		let content = `§7${selectedPlayer.name}の最近の行動：\n\n`;
		actions.forEach((action, index) => {
			const timeStr = new Date(action.timestamp * 1000).toLocaleTimeString(
				"ja-JP",
			);
			content += `§6${index + 1}. ${timeStr}\n`;
			content += `§7行動: §j${action.actionType}\n`;
			content += `§7場所: §j(${Math.round(action.location.x)}, ${Math.round(action.location.y)}, ${Math.round(action.location.z)})\n`;
			if (action.witnessIds.length > 0) {
				content += `§7目撃者: §j${action.witnessIds.length}人\n`;
			}
			content += "\n";
		});

		const messageForm = new MessageFormData()
			.title(`§3${selectedPlayer.name}の行動履歴`)
			.body(content)
			.button1("戻る")
			.button2("閉じる");

		const messageResponse = await messageForm.show(player);
		if (messageResponse.selection === 0) {
			await showPlayerActionHistory(player);
		}
	} catch (error) {
		console.error(
			`Failed to show player action history for ${player.name}:`,
			error,
		);
		player.sendMessage("§c行動履歴の表示に失敗しました");
	}
}

/**
 * アリバイ一覧を表示
 */
export async function showAlibiList(player: Player): Promise<void> {
	try {
		const allPlayers = world.getAllPlayers();

		const form = createActionForm("$1", "$2");

		allPlayers.forEach((p) => {
			form.button(`§j${p.name}`, "textures/ui/friend_glyph");
		});
		form.button("戻る", "textures/ui/cancel");

		const response = await form.show(player);
		if (response.canceled) return;

		if (response.selection === allPlayers.length) {
			await showEvidenceMenu(player);
			return;
		}

		const selectedPlayer = allPlayers[response.selection!];

		// 事件発生時刻の推定（簡易版）
		const evidence = getEvidenceData();
		const crimeTime =
			evidence.length > 0
				? evidence[0].timestamp
				: Math.floor(Date.now() / 1000);

		const alibiData = getPlayerAlibi(selectedPlayer.id, {
			start: crimeTime - 600, // 10分前から
			end: crimeTime + 600, // 10分後まで
		});

		if (alibiData.length === 0) {
			const messageForm = new MessageFormData()
				.title(`§6${selectedPlayer.name}のアリバイ`)
				.body("§7該当時間のアリバイが見つかりませんでした。")
				.button1("戻る")
				.button2("閉じる");

			const messageResponse = await messageForm.show(player);
			if (messageResponse.selection === 0) {
				await showAlibiList(player);
			}
			return;
		}

		let content = `§7${selectedPlayer.name}の事件時刻前後の行動：\n\n`;
		alibiData.forEach((action, index) => {
			const timeStr = new Date(action.timestamp * 1000).toLocaleTimeString(
				"ja-JP",
			);
			content += `§6${index + 1}. ${timeStr}\n`;
			content += `§7行動: §j${action.actionType}\n`;
			content += `§7場所: §j(${Math.round(action.location.x)}, ${Math.round(action.location.y)}, ${Math.round(action.location.z)})\n`;
			if (action.witnessIds.length > 0) {
				content += `§7目撃者: §j${action.witnessIds.length}人\n`;
			}
			content += "\n";
		});

		const messageForm = new MessageFormData()
			.title(`§6${selectedPlayer.name}のアリバイ`)
			.body(content)
			.button1("戻る")
			.button2("閉じる");

		const messageResponse = await messageForm.show(player);
		if (messageResponse.selection === 0) {
			await showAlibiList(player);
		}
	} catch (error) {
		console.error(`Failed to show alibi list for ${player.name}:`, error);
		player.sendMessage("§cアリバイの表示に失敗しました");
	}
}

/**
 * プレイヤー名を取得（IDから）
 */
function getPlayerName(playerId: string): string {
	const player = world.getAllPlayers().find((p) => p.id === playerId);
	return player ? player.name : "不明";
}
