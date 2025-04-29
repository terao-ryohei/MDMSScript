/**
 * 役職の種類を定義する列挙型
 */
export enum RoleType {
  DETECTIVE = "detective",
  KILLER = "killer",
  ACCOMPLICE = "accomplice",
  CITIZEN = "citizen",
}

/**
 * 能力のターゲット型を定義する共用型
 */
export type AbilityTarget = {
  targetType: "player" | "evidence" | "location";
  targetId: string;
  additionalData?: Record<string, unknown>;
};

/**
 * 各役職の特殊能力を定義するインターフェース
 */
export interface IRoleAbility {
  roleType: RoleType;
  useAbility(target: AbilityTarget): Promise<boolean>;
  getCooldown(): number;
  isAvailable(): boolean;
}

/**
 * 証拠の信頼性を定義するインターフェース
 */
export interface IEvidenceReliability {
  score: number; // 信頼性スコア（0-100）
  conflicts: string[]; // 矛盾する証拠のID
  relevance: number; // 関連性スコア（0-100）
  priority: number; // 優先度（1-5）
  verificationStatus: EvidenceVerificationStatus;
}

/**
 * 証拠の検証状態を定義する列挙型
 */
export enum EvidenceVerificationStatus {
  UNVERIFIED = "unverified",
  VERIFIED = "verified",
  SUSPICIOUS = "suspicious",
  INVALID = "invalid",
}

/**
 * 統計分析結果を定義するインターフェース
 */
export interface IAnalyticsResult {
  playerBehavior: {
    movements: PlayerMovementPattern[];
    interactions: PlayerInteraction[];
    votingHistory: VoteData[];
  };
  evidenceStats: {
    totalEvidence: number;
    verifiedEvidence: number;
    suspiciousEvidence: number;
    reliabilityAverage: number;
  };
  alibiAnalysis: {
    consistencyScore: number;
    conflicts: AlibiConflict[];
  };
}

/**
 * プレイヤーの移動パターンを定義するインターフェース
 */
export interface PlayerMovementPattern {
  playerId: string;
  locations: Location[];
  timestamp: number;
  duration: number;
}

/**
 * プレイヤーのインタラクションを定義するインターフェース
 */
export interface PlayerInteraction {
  playerId: string;
  targetId: string;
  interactionType: string;
  timestamp: number;
  location: Location;
}

/**
 * 投票データを定義するインターフェース
 */
export interface VoteData {
  voterId: string;
  targetId: string;
  timestamp: number;
  phase: number;
}

/**
 * アリバイの矛盾を定義するインターフェース
 */
export interface AlibiConflict {
  playerId: string;
  conflictingPlayerIds: string[];
  timeRange: {
    start: number;
    end: number;
  };
  conflictType: string;
  description: string;
}

/**
 * 位置情報を定義するインターフェース
 */
export interface Location {
  x: number;
  y: number;
  z: number;
}
