import { zip } from "zip-a-folder";
import { join } from "node:path";
import { config } from "dotenv";

// .envファイルから環境変数を読み込む
config();

const { WIN_OUTPUT_DIR, WIN_OUTPUT_DIR2 } = process.env;

if (!WIN_OUTPUT_DIR && !WIN_OUTPUT_DIR2) {
  console.error(
    "必要な環境変数が設定されていません。.envファイルを確認してください。",
  );
  process.exit(1);
}

async function makeMcaddon() {
  try {
    const sourcePath = "./dist";

    if (WIN_OUTPUT_DIR) {
      const outputPath = join(WIN_OUTPUT_DIR, "ActionLogger.mcaddon");
      await zip(sourcePath, outputPath);
    }

    if (WIN_OUTPUT_DIR2) {
      const outputPath = join(WIN_OUTPUT_DIR2, "ActionLogger.mcaddon");
      await zip(sourcePath, outputPath);
    }

    console.log("Successfully created mcaddon file");
  } catch (error) {
    console.error("Error creating mcaddon file:", error);
    process.exit(1);
  }
}

makeMcaddon();
