import { system, world } from "@minecraft/server";
import type { ItemUseAfterEvent } from "@minecraft/server";
import { GameManager } from "./managers/GameManager";
import { DEFAULT_CONFIG, GamePhase } from "./constants/main";

// GameManagerを最優先で初期化
const gameManager = GameManager.getInstance();

// 時計使用イベントのハンドラ（GameManagerが排他的に制御）
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
        world.sendMessage(`§e現在のフェーズ: ${result.initialPhase}`);

        const getPhaseTime = (phase: GamePhase): number => {
          switch (phase) {
            case GamePhase.PREPARATION:
              return startupConfig.timeSettings.preparation;
            case GamePhase.DAILY_LIFE:
              return startupConfig.timeSettings.dailyLife;
            case GamePhase.INVESTIGATION:
              return startupConfig.timeSettings.investigation;
            case GamePhase.DISCUSSION:
              return startupConfig.timeSettings.discussion;
            case GamePhase.PRIVATE_TALK:
              return startupConfig.timeSettings.privateTalk;
            case GamePhase.FINAL_MEETING:
              return startupConfig.timeSettings.finalMeeting;
            case GamePhase.REASONING:
              return startupConfig.timeSettings.reasoning;
            case GamePhase.VOTING:
              return startupConfig.timeSettings.voting;
            default:
              return 0;
          }
        };

        const phaseTime = getPhaseTime(result.initialPhase);
        const minutes = Math.floor(phaseTime / 60);
        const seconds = phaseTime % 60;
        world.sendMessage(`§e制限時間: ${minutes}分${seconds}秒`);
        world.sendMessage("§a============================");

        // フェーズ変更をログに記録
        gameManager.logSystemAction("PHASE_CHANGE", {
          from: GamePhase.PREPARATION,
          to: result.initialPhase,
          timestamp: Date.now(),
        });
      } else {
        world.sendMessage(`§c開始エラー: ${result.error}`);
        gameManager.logSystemAction("GAME_START_ERROR", {
          error: result.error,
          context: "ゲーム開始処理でエラーが発生",
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました";
      world.sendMessage(`§c予期せぬエラー: ${message}`);
      gameManager.logSystemAction("GAME_START_ERROR", {
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now(),
      });
    }
  }
});

// シャットダウンイベントの制御（優先順位を明確化）
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === "mdms:shutdown") {
    gameManager.logSystemAction("GAME_SHUTDOWN", {
      timestamp: Date.now(),
    });
    gameManager.dispose();
  }
});
