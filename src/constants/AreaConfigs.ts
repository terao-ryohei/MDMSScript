import type { Vector3 } from "@minecraft/server";

/**
 * エリア境界定義
 */
export interface AreaBounds {
	name: string; // エリア名
	minX: number; // X座標最小値
	maxX: number; // X座標最大値
	minZ: number; // Z座標最小値
	maxZ: number; // Z座標最大値
	priority: number; // 優先度（重複時の判定用、高いほど優先）
	description?: string; // エリアの説明
}

/**
 * ランドマーク定義
 */
export interface Landmark {
	name: string; // ランドマーク名
	x: number; // X座標
	y: number; // Y座標
	z: number; // Z座標
	detectionRadius: number; // 検出半径
	description?: string; // ランドマークの説明
}

/**
 * エリア境界設定
 * 座標を編集することで、マップに合わせたエリア分けが可能
 */
export const AREA_BOUNDS: AreaBounds[] = [
	// 中央広場（最高優先度）
	{
		name: "中央広場",
		minX: -25,
		maxX: 25,
		minZ: -25,
		maxZ: 25,
		priority: 100,
		description: "街の中心部。重要な建物が集まっている",
	},

	// 住宅地区
	{
		name: "住宅地区",
		minX: 25,
		maxX: 100,
		minZ: 25,
		maxZ: 100,
		priority: 80,
		description: "市民が住む静かな住宅街",
	},

	// 商業地区
	{
		name: "商業地区",
		minX: 100,
		maxX: 200,
		minZ: 100,
		maxZ: 200,
		priority: 80,
		description: "商店や市場が立ち並ぶ賑やかな地区",
	},

	// 工業地区
	{
		name: "工業地区",
		minX: -100,
		maxX: -25,
		minZ: -100,
		maxZ: -25,
		priority: 80,
		description: "工場や倉庫が集まる作業地帯",
	},

	// 港湾地区
	{
		name: "港湾地区",
		minX: -50,
		maxX: 50,
		minZ: 100,
		maxZ: 200,
		priority: 80,
		description: "船の発着場がある水辺の地区",
	},

	// 貴族区
	{
		name: "貴族区",
		minX: -200,
		maxX: -100,
		minZ: 25,
		maxZ: 100,
		priority: 80,
		description: "上流階級の豪華な邸宅が建つ高級住宅地",
	},

	// 農業地区
	{
		name: "農業地区",
		minX: 25,
		maxX: 100,
		minZ: -100,
		maxZ: -25,
		priority: 70,
		description: "畑や牧場が広がるのどかな農村地帯",
	},

	// 神殿地区
	{
		name: "神殿地区",
		minX: -25,
		maxX: 25,
		minZ: -100,
		maxZ: -50,
		priority: 90,
		description: "神聖な神殿や教会がある宗教地区",
	},

	// 郊外（デフォルト、最低優先度）
	{
		name: "郊外",
		minX: -1000,
		maxX: 1000,
		minZ: -1000,
		maxZ: 1000,
		priority: 1,
		description: "街の外れの自然豊かな地域",
	},
];

/**
 * ランドマーク設定
 * 座標を編集することで、マップに合わせたランドマーク配置が可能
 */
export const LANDMARKS: Landmark[] = [
	// 中央広場周辺
	{
		name: "市庁舎",
		x: 0,
		y: 64,
		z: 0,
		detectionRadius: 30,
		description: "街の行政の中心。重要な会議が開かれる",
	},
	{
		name: "中央噴水",
		x: 0,
		y: 64,
		z: 15,
		detectionRadius: 15,
		description: "美しい噴水。市民の憩いの場",
	},

	// 宗教施設
	{
		name: "大聖堂",
		x: 0,
		y: 64,
		z: -75,
		detectionRadius: 25,
		description: "荘厳な大聖堂。静寂に包まれた神聖な場所",
	},
	{
		name: "小教会",
		x: 60,
		y: 64,
		z: 60,
		detectionRadius: 20,
		description: "住宅街にある小さな教会",
	},

	// 商業施設
	{
		name: "中央市場",
		x: 150,
		y: 64,
		z: 150,
		detectionRadius: 40,
		description: "様々な商品が売買される大きな市場",
	},
	{
		name: "商人ギルド",
		x: 120,
		y: 64,
		z: 180,
		detectionRadius: 25,
		description: "商人たちが集まる重要な建物",
	},

	// 港湾施設
	{
		name: "大桟橋",
		x: 0,
		y: 64,
		z: 150,
		detectionRadius: 35,
		description: "大型船が停泊する主要な桟橋",
	},
	{
		name: "灯台",
		x: -30,
		y: 80,
		z: 180,
		detectionRadius: 20,
		description: "船を導く高い灯台",
	},

	// 工業施設
	{
		name: "鍛冶工房",
		x: -60,
		y: 64,
		z: -60,
		detectionRadius: 25,
		description: "武器や道具を作る大きな鍛冶場",
	},
	{
		name: "倉庫群",
		x: -80,
		y: 64,
		z: -40,
		detectionRadius: 30,
		description: "物資を保管する巨大な倉庫",
	},

	// 貴族区
	{
		name: "領主邸",
		x: -150,
		y: 64,
		z: 60,
		detectionRadius: 40,
		description: "街を治める領主の豪華な邸宅",
	},
	{
		name: "貴族庭園",
		x: -120,
		y: 64,
		z: 80,
		detectionRadius: 25,
		description: "美しく手入れされた庭園",
	},

	// その他の重要施設
	{
		name: "宿屋「月明かり」",
		x: 40,
		y: 64,
		z: 40,
		detectionRadius: 20,
		description: "旅人が泊まる有名な宿屋",
	},
	{
		name: "酒場「赤い竜」",
		x: 80,
		y: 64,
		z: 120,
		detectionRadius: 20,
		description: "情報交換の場として知られる酒場",
	},
	{
		name: "図書館",
		x: -15,
		y: 64,
		z: -15,
		detectionRadius: 20,
		description: "古い書物が保管された知識の宝庫",
	},
	{
		name: "監獄",
		x: -40,
		y: 60,
		z: -80,
		detectionRadius: 25,
		description: "犯罪者を収容する厳重な監獄",
	},

	// 農業地区
	{
		name: "農家の納屋",
		x: 60,
		y: 64,
		z: -60,
		detectionRadius: 20,
		description: "穀物を保管する大きな納屋",
	},
	{
		name: "風車小屋",
		x: 80,
		y: 70,
		z: -80,
		detectionRadius: 15,
		description: "穀物を挽く伝統的な風車",
	},
];

/**
 * 座標からエリア名を取得する関数
 */
export function getAreaFromCoordinates(x: number, z: number): string {
	// 優先度順にソート（高い順）
	const sortedAreas = [...AREA_BOUNDS].sort((a, b) => b.priority - a.priority);

	for (const area of sortedAreas) {
		if (x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ) {
			return area.name;
		}
	}

	// フォールバック（通常は郊外が該当するはず）
	return "未知の地域";
}

/**
 * 座標から最寄りのランドマークを取得する関数
 */
export function getNearestLandmark(location: Vector3): string | null {
	let nearestLandmark = null;
	let minDistance = Infinity;

	for (const landmark of LANDMARKS) {
		const distance = calculateDistance(location, landmark);
		if (distance <= landmark.detectionRadius && distance < minDistance) {
			minDistance = distance;
			nearestLandmark = landmark.name;
		}
	}

	return nearestLandmark;
}

/**
 * 指定範囲内のランドマークを全て取得する関数
 */
export function getLandmarksInRange(
	location: Vector3,
	maxDistance: number,
): Landmark[] {
	return LANDMARKS.filter((landmark) => {
		const distance = calculateDistance(location, landmark);
		return distance <= Math.min(landmark.detectionRadius, maxDistance);
	});
}

/**
 * エリアの説明を取得する関数
 */
export function getAreaDescription(areaName: string): string | null {
	const area = AREA_BOUNDS.find((a) => a.name === areaName);
	return area?.description || null;
}

/**
 * ランドマークの説明を取得する関数
 */
export function getLandmarkDescription(landmarkName: string): string | null {
	const landmark = LANDMARKS.find((l) => l.name === landmarkName);
	return landmark?.description || null;
}

/**
 * 距離計算のヘルパー関数
 */
function calculateDistance(
	pos1: Vector3 | { x: number; y: number; z: number },
	pos2: { x: number; y: number; z: number },
): number {
	const dx = pos1.x - pos2.x;
	const dy = pos1.y - pos2.y;
	const dz = pos1.z - pos2.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
