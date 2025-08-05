import { Player } from "@minecraft/server";

/**
 * プレイヤー行動タイプ
 */
export enum ActionType {
  MOVEMENT = "movement",           // 移動
  CHAT = "chat",                   // チャット
  BLOCK_BREAK = "block_break",     // ブロック破壊
  BLOCK_PLACE = "block_place",     // ブロック設置
  ITEM_USE = "item_use",           // アイテム使用
  ENTITY_INTERACT = "entity_interact", // エンティティ交流
  BLOCK_INTERACT = "block_interact",   // ブロック交流
  DEATH = "death",                 // 死亡
  MURDER = "murder",               // 殺人
  ABILITY_USE = "ability_use",     // 能力使用
  TASK_COMPLETE = "task_complete", // タスク完了
  AREA_ENTER = "area_enter",       // エリア進入
  AREA_EXIT = "area_exit"          // エリア退出
}

/**
 * 行動記録データ
 */
export interface ActionRecord {
  id: string;                      // ユニークID
  playerId: string;                // プレイヤーID
  playerName: string;              // プレイヤー名
  actionType: ActionType;          // 行動タイプ
  timestamp: number;               // タイムスタンプ（ゲーム開始からの秒数）
  phaseId: number;                 // フェーズID
  location: {
    x: number;
    y: number;
    z: number;
    dimension: string;
  };
  data: Record<string, any>;       // 追加データ
  isEvidence: boolean;             // 証拠として扱うか
  witnessIds: string[];            // 目撃者プレイヤーID
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