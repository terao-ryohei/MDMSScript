/**
 * 役職の種類を定義する列挙型
 */
/**
 * 役割の種類を定義する列挙型
 */
export enum RoleType {
  DETECTIVE = "detective",
  KILLER = "killer",
  ACCOMPLICE = "accomplice",
  CITIZEN = "citizen",
}

/**
 * 役割の文字列とRoleType enumのマッピング
 * 文字列から対応するRoleType値への変換を提供する
 */
export const roleTypeMapping: Record<string, RoleType> = {
  detective: RoleType.DETECTIVE,
  murderer: RoleType.KILLER,
  accomplice: RoleType.ACCOMPLICE,
  villager: RoleType.CITIZEN,
} as const;

/**
 * 能力のターゲット型を定義する共用型
 */
// 能力のターゲットタイプ
export type AbilityTargetType = "player" | "evidence" | "location";

// 能力のターゲット
export interface AbilityTarget {
  targetType: AbilityTargetType;
  targetId: string;
  additionalData?: Record<string, unknown>;
}

/**
 * 各役職の特殊能力を定義するインターフェース
 */
export interface IRoleAbility {
  roleType: RoleType;
  useAbility(target: AbilityTarget): Promise<boolean>;
  getCoolDown(): number;
  isAvailable(): boolean;
  targetType: AbilityTargetType;
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
 * 投票パターン分析の結果インターフェース
 */
export interface VotingPatternAnalysis {
  patterns: {
    voterId: string;
    commonTargets: string[];
    frequency: number;
  }[];
  trends: {
    phase: number;
    mostVotedPlayer: string;
    voteCount: number;
  }[];
  suspiciousPatterns: {
    players: string[];
    patternType: string;
    description: string;
  }[];
}
