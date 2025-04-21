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

async function makeZip() {
  try {
    const sourcePath = "./dist";

    if (WIN_OUTPUT_DIR) {
      const outputPath = join(WIN_OUTPUT_DIR, "ActionLogger.zip");
      await zip(sourcePath, outputPath);
    }

    if (WIN_OUTPUT_DIR2) {
      const outputPath2 = join(WIN_OUTPUT_DIR2, "ActionLogger.zip");
      await zip(sourcePath, outputPath2);
    }

    console.log("Successfully created zip");
  } catch (error) {
    console.error("Error creating zip file:", error);
    process.exit(1);
  }
}

makeZip();
