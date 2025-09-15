import type { Vector3 } from "@minecraft/server";

/**
 * 共通ユーティリティ関数
 */

/**
 * 2つの3D座標間の距離を計算
 */
export const calculateDistance = (pos1: Vector3, pos2: Vector3): number => {
	const dx = pos1.x - pos2.x;
	const dy = pos1.y - pos2.y;
	const dz = pos1.z - pos2.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * 秒数を分:秒の形式にフォーマット
 */
export const formatTime = (seconds: number): string => {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * 値を最小値と最大値の間にクランプ
 */
export const clamp = (value: number, min: number, max: number): number => {
	return Math.min(Math.max(value, min), max);
};

/**
 * 配列をランダムにシャッフル
 */
export const shuffleArray = <T>(array: T[]): T[] => {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
};

/**
 * 数値を指定桁数で四捨五入
 */
export const roundToDecimal = (value: number, decimals: number): number => {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
};
