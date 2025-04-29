import { system } from "@minecraft/server";
import { ActionLoggerModule } from "../submodules/mc-action-logger/src/ActionLoggerModule";
import {
  ActionType,
  ActionTypeFilter,
  LogLevel,
  TimeRangeFilter,
} from "../submodules/mc-action-logger/src/types";

// ActionLoggerModuleのインスタンスを作成
const logger = ActionLoggerModule.getInstance();

// カスタムフィルターの作成
const actionFilter = new ActionTypeFilter([
  ActionType.BLOCK_BROKEN,
  ActionType.BLOCK_PLACED,
  ActionType.PLAYER_HEALTH_CHANGE,
]);

const timeFilter = new TimeRangeFilter(
  Date.now(),
  Date.now() + 3600000, // 1時間
);

logger.initialize({
  gameTime: {
    initialTime: 3600000, // 1時間（ミリ秒）
    timeScale: 2, // 2倍速
    dayLength: 1200000, // 20分（ミリ秒）
  },
  filters: {
    minLogLevel: LogLevel.ACTIVITY,
    includedActionTypes: [ActionType.BLOCK_BROKEN, ActionType.BLOCK_PLACED],
    excludedActionTypes: [
      ActionType.MOVE, // 移動は記録しない
      ActionType.JUMP, // ジャンプも記録しない
    ],
    customFilters: [actionFilter, timeFilter],
  },
  displayItems: {
    showTimestamp: true,
    showPlayerName: true,
    showActionType: true,
    showDetails: true,
  },
  startItems: [
    {
      itemId: "minecraft:clock",
      displayName: "ゲーム開始アイテム",
      canBeUsedByNonOp: true,
    },
  ],
});

// エクスポート設定の初期化
logger.initializeExporter({
  format: "json",
  includeMetadata: true,
  timestampFormat: "ISO",
  outputPath: "./logs",
});

// クリーンアップ
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === "mdms:shutdown") {
    logger.dispose();
  }
});
