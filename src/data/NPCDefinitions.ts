import type { Vector3 } from "@minecraft/server";

/**
 * NPC定義データ
 * 殺害対象となるNPCの設定
 */

export interface NPCDefinition {
	id: string;
	name: string;
	description: string;
	entityType: string; // Minecraftエンティティタイプ
	spawnAreas: string[]; // スポーン可能エリア
	personality: string; // 性格・特徴
	relationships: string[]; // 他のNPCや職業との関係
	secretInfo?: string; // 隠された情報
	evidenceClues?: string[]; // 殺害時に残る証拠ヒント
}

export interface NPCSpawnLocation {
	area: string;
	coordinates: Vector3;
	description: string;
	isSecluded: boolean; // 人目につかない場所か
	nearbyLandmarks: string[]; // 近くのランドマーク
}

/**
 * 殺害対象NPC定義
 */
export const NPC_DEFINITIONS: Record<string, NPCDefinition> = {
	merchant_npc: {
		id: "merchant_npc",
		name: "商人アルバート",
		description: "各地を旅する老練な商人。多くの秘密を知っている",
		entityType: "minecraft:villager",
		spawnAreas: ["中央広場", "商業地区", "港湾地区"],
		personality: "用心深く、金銭に執着する。情報を金で売買する",
		relationships: [
			"商人ギルドとのコネクション",
			"貴族との秘密取引",
			"過去の借金問題",
		],
		secretInfo: "王室の財政問題を知っている",
		evidenceClues: ["散らばった金貨", "破れた商取引書", "血痕の付いた計算書"],
	},

	scholar_npc: {
		id: "scholar_npc",
		name: "学者エリザベス",
		description: "古い書物を研究する知識豊富な学者",
		entityType: "minecraft:villager",
		spawnAreas: ["図書館", "神殿地区", "魔術師の塔"],
		personality: "知的で冷静、秘密主義。古い知識を独占したがる",
		relationships: [
			"宮廷魔術師との学術論争",
			"古代遺跡の発見",
			"禁断の魔術研究",
		],
		secretInfo: "危険な魔術の存在を知っている",
		evidenceClues: [
			"インクの付いた羽ペン",
			"破れた古書のページ",
			"魔法陣の痕跡",
		],
	},

	servant_npc: {
		id: "servant_npc",
		name: "使用人マーガレット",
		description: "王宮に仕える忠実な使用人。多くの内部情報を持つ",
		entityType: "minecraft:villager",
		spawnAreas: ["王宮", "使用人居住区", "厨房"],
		personality: "忠実だが噂好き。主人の秘密を知りすぎている",
		relationships: [
			"王室メンバーとの信頼関係",
			"他の使用人との情報ネットワーク",
			"過去の不祥事の目撃",
		],
		secretInfo: "王室の不倫関係を目撃している",
		evidenceClues: ["王室の紋章付きハンカチ", "こぼれた食事", "掃除道具の散乱"],
	},

	guard_npc: {
		id: "guard_npc",
		name: "警備兵トーマス",
		description: "城の警備を担当する若い兵士",
		entityType: "minecraft:villager",
		spawnAreas: ["城門", "見張り台", "兵舎"],
		personality: "真面目で正義感が強い。しかし経験不足",
		relationships: ["近衛隊長への忠誠", "同僚兵士との友情", "市民からの信頼"],
		secretInfo: "不審な人物の出入りを目撃している",
		evidenceClues: ["落ちた剣", "警備日誌のページ", "制服のボタン"],
	},

	innkeeper_npc: {
		id: "innkeeper_npc",
		name: "宿屋の主人ジョン",
		description: "旅人宿を経営する人当たりの良い中年男性",
		entityType: "minecraft:villager",
		spawnAreas: ["宿屋", "酒場", "厩舎"],
		personality: "社交的で情報通。しかし金のためなら秘密も売る",
		relationships: [
			"旅人からの情報収集",
			"地元住民との交流",
			"密輸業者との関係",
		],
		secretInfo: "怪しい客の宿泊記録を持っている",
		evidenceClues: ["宿帳のページ", "割れた酒瓶", "客室の鍵"],
	},

	priest_npc: {
		id: "priest_npc",
		name: "司祭フランシス",
		description: "神に仕える敬虔な聖職者",
		entityType: "minecraft:villager",
		spawnAreas: ["大聖堂", "小教会", "墓地"],
		personality: "慈悲深いが頑固。宗教的信念が強い",
		relationships: [
			"信者からの信頼",
			"教会組織とのつながり",
			"罪の告白を聞く立場",
		],
		secretInfo: "誰かの罪の告白を聞いている",
		evidenceClues: ["聖書のページ", "蝋燭の残骸", "十字架のペンダント"],
	},
};

/**
 * スポーン可能場所定義
 */
export const NPC_SPAWN_LOCATIONS: NPCSpawnLocation[] = [
	// 中央広場周辺
	{
		area: "中央広場",
		coordinates: { x: 5, y: 64, z: 5 },
		description: "噴水の近く",
		isSecluded: false,
		nearbyLandmarks: ["中央噴水", "市庁舎"],
	},
	{
		area: "中央広場",
		coordinates: { x: -10, y: 64, z: 10 },
		description: "市庁舎の影",
		isSecluded: true,
		nearbyLandmarks: ["市庁舎"],
	},

	// 商業地区
	{
		area: "商業地区",
		coordinates: { x: 50, y: 64, z: 30 },
		description: "市場の路地",
		isSecluded: true,
		nearbyLandmarks: ["中央市場"],
	},
	{
		area: "商業地区",
		coordinates: { x: 30, y: 64, z: 35 },
		description: "商人ギルド前",
		isSecluded: false,
		nearbyLandmarks: ["商人ギルド"],
	},

	// 神殿地区
	{
		area: "神殿地区",
		coordinates: { x: -5, y: 64, z: -75 },
		description: "大聖堂の祭壇",
		isSecluded: true,
		nearbyLandmarks: ["大聖堂"],
	},
	{
		area: "神殿地区",
		coordinates: { x: 20, y: 64, z: -60 },
		description: "墓地の奥",
		isSecluded: true,
		nearbyLandmarks: ["大聖堂"],
	},

	// 港湾地区
	{
		area: "港湾地区",
		coordinates: { x: 15, y: 64, z: 20 },
		description: "桟橋の端",
		isSecluded: true,
		nearbyLandmarks: ["大桟橋"],
	},
	{
		area: "港湾地区",
		coordinates: { x: -20, y: 64, z: 25 },
		description: "灯台の下",
		isSecluded: true,
		nearbyLandmarks: ["灯台"],
	},

	// 住宅地区
	{
		area: "住宅地区",
		coordinates: { x: 60, y: 64, z: 40 },
		description: "宿屋の裏手",
		isSecluded: true,
		nearbyLandmarks: ["宿屋「月明かり」"],
	},
	{
		area: "住宅地区",
		coordinates: { x: 70, y: 64, z: 80 },
		description: "教会の庭",
		isSecluded: false,
		nearbyLandmarks: ["小教会"],
	},

	// 貴族区
	{
		area: "貴族区",
		coordinates: { x: -30, y: 64, z: 20 },
		description: "庭園の東屋",
		isSecluded: true,
		nearbyLandmarks: ["貴族庭園"],
	},

	// 工業地区
	{
		area: "工業地区",
		coordinates: { x: -60, y: 64, z: -40 },
		description: "鍛冶工房の裏",
		isSecluded: true,
		nearbyLandmarks: ["鍛冶工房"],
	},
	{
		area: "工業地区",
		coordinates: { x: -80, y: 64, z: -20 },
		description: "倉庫の間",
		isSecluded: true,
		nearbyLandmarks: ["倉庫群"],
	},
];

/**
 * スポーンエリア定義
 */
export const SPAWN_AREAS = {
	// 中心部 - 人通りが多い
	CENTRAL: {
		name: "中央広場",
		weight: 10,
		description: "町の中心部。人通りが多く目撃されやすい",
		riskLevel: "高",
		locations: ["中央広場"],
	},

	// 商業地区 - 昼間は賑やか
	COMMERCIAL: {
		name: "商業地区",
		weight: 8,
		description: "市場や商店が集まるエリア。昼間は賑やか",
		riskLevel: "中",
		locations: ["商業地区"],
	},

	// 宗教地区 - 静かで人目につかない
	RELIGIOUS: {
		name: "神殿地区",
		weight: 12,
		description: "神聖な場所。静かで人目につかない",
		riskLevel: "低",
		locations: ["神殿地区"],
	},

	// 港湾地区 - 外部からの人が多い
	HARBOR: {
		name: "港湾地区",
		weight: 7,
		description: "商船や旅人が行き交う港。外部の人が多い",
		riskLevel: "中",
		locations: ["港湾地区"],
	},

	// 住宅地区 - 住民の生活エリア
	RESIDENTIAL: {
		name: "住宅地区",
		weight: 9,
		description: "一般住民の居住エリア。地元の人が多い",
		riskLevel: "中",
		locations: ["住宅地区"],
	},

	// 貴族区 - 警備が厳重
	NOBLE: {
		name: "貴族区",
		weight: 6,
		description: "上流階級の居住区。警備が厳重",
		riskLevel: "高",
		locations: ["貴族区"],
	},

	// 工業地区 - 人目につかない作業場所
	INDUSTRIAL: {
		name: "工業地区",
		weight: 5,
		description: "職人の作業場。人目につかない場所が多い",
		riskLevel: "低",
		locations: ["工業地区"],
	},
} as const;

/**
 * NPC選択設定
 */
export const NPC_SPAWN_SETTINGS = {
	// 同時スポーン数
	MAX_SPAWNED_NPCS: 1,

	// スポーン条件
	MIN_DISTANCE_FROM_PLAYERS: 20, // プレイヤーからの最小距離
	MAX_SPAWN_ATTEMPTS: 10, // スポーン試行回数

	// 人目につかない場所の優先度倍率
	SECLUDED_LOCATION_MULTIPLIER: 1.5,

	// エリア選択方式
	AREA_SELECTION_MODE: "weighted_random" as
		| "random"
		| "weighted_random"
		| "preset_order",
};

/**
 * ランダムなNPCを選択
 */
export function getRandomNPC(): NPCDefinition {
	const npcIds = Object.keys(NPC_DEFINITIONS);
	const randomId = npcIds[Math.floor(Math.random() * npcIds.length)];
	return NPC_DEFINITIONS[randomId];
}

/**
 * エリアを選択する（重み付きランダム）
 */
export function selectSpawnArea(): string {
	const areas = Object.values(SPAWN_AREAS);
	const totalWeight = areas.reduce((sum, area) => sum + area.weight, 0);
	let randomValue = Math.random() * totalWeight;

	for (const area of areas) {
		randomValue -= area.weight;
		if (randomValue <= 0) {
			return area.name;
		}
	}

	// フォールバック
	return areas[0].name;
}

/**
 * NPCに適したスポーン場所を選択
 * エリア選択方式に基づいてスポーン場所を決定
 */
export function getRandomSpawnLocationForNPC(
	npc: NPCDefinition,
): NPCSpawnLocation | null {
	let selectedArea: string;

	switch (NPC_SPAWN_SETTINGS.AREA_SELECTION_MODE) {
		case "random": {
			// 完全ランダム選択
			const allAreas = Object.values(SPAWN_AREAS).map((area) => area.name);
			selectedArea = allAreas[Math.floor(Math.random() * allAreas.length)];
			break;
		}

		case "weighted_random":
			// 重み付きランダム選択（デフォルト）
			selectedArea = selectSpawnArea();
			break;

		case "preset_order":
			// NPCのspawnAreasから最初のエリアを選択
			selectedArea = npc.spawnAreas[0];
			break;

		default:
			selectedArea = selectSpawnArea();
	}

	// 選択されたエリア内の場所をフィルタリング
	const areaLocations = NPC_SPAWN_LOCATIONS.filter(
		(location) => location.area === selectedArea,
	);

	if (areaLocations.length === 0) {
		// フォールバック：NPCが指定したエリアから選択
		const validLocations = NPC_SPAWN_LOCATIONS.filter((location) =>
			npc.spawnAreas.includes(location.area),
		);

		if (validLocations.length === 0) {
			console.warn(`No valid locations found for NPC ${npc.name}`);
			return NPC_SPAWN_LOCATIONS[0];
		}

		return validLocations[Math.floor(Math.random() * validLocations.length)];
	}

	// エリア内の場所から重み付き選択（人目につかない場所を優先）
	const weights = areaLocations.map((location) =>
		location.isSecluded ? NPC_SPAWN_SETTINGS.SECLUDED_LOCATION_MULTIPLIER : 1,
	);

	const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
	let randomValue = Math.random() * totalWeight;

	for (let i = 0; i < areaLocations.length; i++) {
		randomValue -= weights[i];
		if (randomValue <= 0) {
			return areaLocations[i];
		}
	}

	// フォールバック
	return areaLocations[0];
}

/**
 * エリア情報を取得
 */
export function getAreaInfo(areaName: string) {
	const area = Object.values(SPAWN_AREAS).find(
		(area) => area.name === areaName,
	);
	return area || null;
}

/**
 * エリアの危険度を取得
 */
export function getAreaRiskLevel(areaName: string): string {
	const area = getAreaInfo(areaName);
	return area?.riskLevel || "不明";
}

/**
 * 利用可能な全エリア名を取得
 */
export function getAvailableAreas(): string[] {
	return Object.values(SPAWN_AREAS).map((area) => area.name);
}

/**
 * プレイヤーから十分離れた場所かチェック
 */
export function isValidSpawnDistance(
	location: Vector3,
	playerLocations: Vector3[],
): boolean {
	const minDistance = NPC_SPAWN_SETTINGS.MIN_DISTANCE_FROM_PLAYERS;

	return playerLocations.every((playerLoc) => {
		const distance = Math.sqrt(
			(location.x - playerLoc.x) ** 2 +
				(location.y - playerLoc.y) ** 2 +
				(location.z - playerLoc.z) ** 2,
		);
		return distance >= minDistance;
	});
}
