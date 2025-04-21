import { system } from "@minecraft/server";
import { ActionLoggerModule } from "../submodules/mc-action-logger/src/ActionLoggerModule";
import { LogLevel } from "../submodules/mc-action-logger/src/types";

// ActionLoggerModuleのインスタンスを作成
const logger = ActionLoggerModule.getInstance();
logger.initialize({
  filters: {
    minLogLevel: LogLevel.INFO,
  },
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
