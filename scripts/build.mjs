import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");

async function ensureDir(dir) {
	try {
		await mkdir(dir, { recursive: true });
	} catch (error) {
		if (error.code !== "EEXIST") throw error;
	}
}

async function buildNpmPackage() {
	console.log("Building npm package...");
	execSync("tsc -p tsconfig.json", { stdio: "inherit" });
}

async function buildMinecraftAddon() {
	console.log("Building Minecraft addon...");

	// Minecraftアドオン用のビルドディレクトリを作成
	const mcDir = join(ROOT_DIR, "dist");
	await ensureDir(mcDir);

	// マニフェストとアイコンをコピー
	await copyFile(join(ROOT_DIR, "pack_icon.png"), join(mcDir, "pack_icon.png"));
	await copyFile(join(ROOT_DIR, "manifest.json"), join(mcDir, "manifest.json"));

	// Minecraftアドオン用にTypeScriptをコンパイル
	execSync("tsc -p tsconfig.json", { stdio: "inherit" });

	console.log("Minecraft addon build completed!");
}

async function build() {
	try {
		// ビルドディレクトリをクリーン
		execSync("npm run clean", { stdio: "inherit" });

		// npm パッケージをビルド
		await buildNpmPackage();

		// Minecraft アドオンをビルド
		await buildMinecraftAddon();

		console.log("Build completed successfully!");
	} catch (error) {
		console.error("Build failed:", error);
		process.exit(1);
	}
}

build();
