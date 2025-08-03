import type { ItemUseAfterEvent } from "@minecraft/server";
import { system, world } from "@minecraft/server";
import { DEFAULT_CONFIG } from "./constants/main";
import { GameManager } from "./managers/GameManager";

// GameManagerを最優先で初期化
const gameManager = GameManager.getInstance();

console.log("main initialized");

// アイテム使用イベントのハンドラ（GameManagerが排他的に制御）
world.afterEvents.itemUse.subscribe(async (event: ItemUseAfterEvent) => {
  const { itemStack } = event;

  if (itemStack.typeId === "minecraft:clock") {
    try {
      const playerCount = world.getAllPlayers().length;

      // ゲーム開始設定
      const startupConfig = {
        ...DEFAULT_CONFIG,
        playerCount,
      };

      // ゲーム開始
      const result = await gameManager.startGame(startupConfig);

      if (result.success) {
        world.sendMessage("§a============================");
        world.sendMessage("§l§6マーダーミステリーが開始されました！");
        world.sendMessage(`§e現在のフェーズ: ${result.initialPhase.name}`);

        const minutes = Math.floor(result.initialPhase.duration / 60);
        const seconds = result.initialPhase.duration % 60;
        world.sendMessage(`§e制限時間: ${minutes}分${seconds}秒`);
        world.sendMessage("§a============================");
      } else {
        world.sendMessage(`§c開始エラー: ${result.error}`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました";
      world.sendMessage(`§c予期せぬエラー: ${message}`);
    }
  }

  if (itemStack.typeId === "minecraft:prismarine_shard") {
    await gameManager.showUI(event.source, "role");
  }
});

// シャットダウンイベントの制御（優先順位を明確化）
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === "mdms:shutdown") {
    gameManager.dispose();
  }
});
