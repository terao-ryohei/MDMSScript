/**
 * プレイヤー行動タイプ
 */
export enum ActionType {
	MOVEMENT = "movement", // 移動
	CHAT = "chat", // チャット
	BLOCK_BREAK = "block_break", // ブロック破壊
	BLOCK_PLACE = "block_place", // ブロック設置
	ITEM_USE = "item_use", // アイテム使用
	ENTITY_INTERACT = "entity_interact", // エンティティ交流
	BLOCK_INTERACT = "block_interact", // ブロック交流
	DEATH = "death", // 死亡
	MURDER = "murder", // 殺人
	SKILL_USE = "skill_use", // スキル使用
	TASK_COMPLETE = "task_complete", // タスク完了
	AREA_ENTER = "area_enter", // エリア進入
	AREA_EXIT = "area_exit", // エリア退出
}

/**
 * 証拠記録条件
 */
export enum EvidenceCondition {
	RANDOM_TIMING = "random_timing", // ランダムなタイミング
	TASK_COMPLETION = "task_completion", // 日常タスク達成時
	INCIDENT_TIMING = "incident_timing", // 事件発生タイミング
	AREA_TRANSITION = "area_transition", // エリア移動時
	INTERACTION = "interaction", // 他プレイヤーとの交流時
}

/**
 * 証拠データ（「いつ」「どこで」「何をした」の詳細情報）
 */
export interface EvidenceData {
	// 「いつ」の情報
	when: {
		gameTime: number; // ゲーム開始からの秒数
		realTime: string; // 実時間（HH:MM:SS形式）
		gameDay: number; // ゲーム内日数
		timeOfDay: string; // 時間帯（朝/昼/夕/夜）
	};

	// 「どこで」の情報
	where: {
		coordinates: {
			x: number;
			y: number;
			z: number;
		};
		area: string; // エリア名（自動判定）
		nearbyPlayers: string[]; // 近くにいたプレイヤー
		landmark: string | null; // 最寄りのランドマーク
	};

	// 「何をした」の情報
	what: {
		primaryAction: ActionType; // 主要行動
		details: string; // 行動の詳細説明
		targetBlock?: string; // 対象ブロック（あれば）
		targetPlayer?: string; // 対象プレイヤー（あれば）
		itemUsed?: string; // 使用アイテム（あれば）
		taskType?: string; // タスクタイプ（タスク完了時）
	};

	// 証拠記録条件
	recordCondition: EvidenceCondition;
	reliability: number; // 信頼度（0-100）
}

/**
 * 行動記録データ
 */
export interface ActionRecord {
	id: string; // ユニークID
	playerId: string; // プレイヤーID
	playerName: string; // プレイヤー名
	actionType: ActionType; // 行動タイプ
	timestamp: number; // タイムスタンプ（ゲーム開始からの秒数）
	phaseId: number; // フェーズID
	location: {
		x: number;
		y: number;
		z: number;
		dimension: string;
	};
	data: Record<string, any>; // 追加データ
	isEvidence: boolean; // 証拠として扱うか
	witnessIds: string[]; // 目撃者プレイヤーID
	evidenceData?: EvidenceData; // 詳細証拠データ（証拠の場合のみ）
}

/**
 * 行動フィルター条件
 */
export interface ActionFilter {
	playerId?: string;
	actionType?: ActionType;
	phaseId?: number;
	startTime?: number;
	endTime?: number;
	isEvidence?: boolean;
	location?: {
		x: number;
		y: number;
		z: number;
		radius: number;
	};
}

/**
 * 証拠抽出結果
 */
export interface EvidenceExtractionResult {
	success: boolean;
	evidence: ActionRecord[];
	totalActions: number;
	filteredActions: number;
	timeRange: {
		start: number;
		end: number;
	};
	error?: string;
}

/**
 * 行動統計
 */
export interface ActionStatistics {
	totalActions: number;
	actionsByType: Map<ActionType, number>;
	actionsByPlayer: Map<string, number>;
	actionsByPhase: Map<number, number>;
	evidenceCount: number;
	timeRange: {
		start: number;
		end: number;
	};
}
