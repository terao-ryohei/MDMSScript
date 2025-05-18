import type { Player } from "@minecraft/server";

/**
 * 証拠の種類を表すenum
 */
export enum EvidenceType {
  PHYSICAL = "physical", // 物理的証拠（凶器、血痕など）
  TESTIMONY = "testimony", // 証言
  ALIBI = "alibi", // アリバイ
  CIRCUMSTANTIAL = "circumstantial", // 状況証拠
  DIGITAL = "digital", // デジタル証拠（写真、録音など）
  ROLE_SPECIFIC = "role_specific", // 役職特有の証拠
}

/**
 * 基本の証拠インターフェース
 */
export interface Evidence {
  evidenceId: string;
  type: EvidenceType;
  description: string;
  discoveredBy: Player;
  discoveryTime: number;
  location: {
    x: number;
    y: number;
    z: number;
    dimension: string;
  };
  reliability: number;
  isVerified: boolean;
  relatedPlayers: Player[];
  linkedEvidence: string[];
  validate(): boolean;
}

/**
 * 物理的証拠のインターフェース
 */
export interface PhysicalEvidence extends Evidence {
  itemId: string;
  condition: string;
  fingerprints?: string[];
  degradationRate: number;
  analyzeDetails(): {
    conditionAnalysis: string;
    preservationStatus: string;
    matchProbability: number;
  };
}

/**
 * 証言証拠のインターフェース
 */
export interface TestimonyEvidence extends Evidence {
  witnessId: string;
  statement: string;
  emotionalState: string;
  consistencyScore: number;
  verifyCredibility(): {
    credibilityScore: number;
    consistencyAnalysis: string;
    emotionalAnalysis: string;
  };
}

/**
 * 役職特有の証拠のインターフェース
 */
export interface RoleSpecificEvidence extends Evidence {
  roleId: string;
  recordType: string;
  accessLevel: number;
  encryptionKey?: string;
  validateAccess(requesterId: string, requesterRole: string): boolean;
  decryptContent(key: string): string;
}

/**
 * 証拠の信頼性に影響を与える要因
 */
export enum ReliabilityFactor {
  TIME_PROXIMITY = "time_proximity", // 事件発生時刻との近さ
  WITNESS_CREDIBILITY = "witness_credibility", // 証言者の信頼性
  PHYSICAL_EVIDENCE = "physical_evidence", // 物的証拠の存在
  CORROBORATION = "corroboration", // 他の証拠との整合性
  EXPERTISE = "expertise", // 専門家による分析
}

/**
 * 証拠の分析結果
 */
export interface EvidenceAnalysis {
  evidenceId: string;
  analysisId: string;
  analyzedBy: string;
  timestamp: number;
  reliabilityFactors: Map<ReliabilityFactor, number>;
  conclusionStrength: number;
  notes: string;
  linkedAnalyses: string[];
}

/**
 * 証拠の関連性の種類
 */
export enum EvidenceRelationType {
  SUPPORTS = "supports", // 互いに裏付けあう
  CONTRADICTS = "contradicts", // 矛盾する
  SUPPLEMENTS = "supplements", // 補完する
  PRECEDES = "precedes", // 時系列で前に位置する
  FOLLOWS = "follows", // 時系列で後に位置する
}

/**
 * 証拠間の関連性
 */
export interface EvidenceRelation {
  relationId: string;
  sourceEvidenceId: string;
  targetEvidenceId: string;
  relationType: EvidenceRelationType;
  strength: number; // 関連の強さ（0-1）
  description: string;
  createdBy: string;
  timestamp: number;
}

/**
 * 証拠チェーン（関連する証拠のグループ）
 */
export interface EvidenceChain {
  chainId: string;
  name: string;
  description: string;
  evidenceIds: string[];
  relations: EvidenceRelation[];
  createdBy: string;
  timestamp: number;
  reliability: number;
  conclusionStrength: number;
}

/**
 * 証拠分析の設定
 */
export interface EvidenceAnalysisConfig {
  minReliabilityThreshold: number; // 最小信頼性閾値
  timeProximityWeight: number; // 時間近接性の重み
  witnessCredibilityWeight: number; // 証言の信頼性の重み
  physicalEvidenceWeight: number; // 物的証拠の重み
  corroborationWeight: number; // 整合性の重み
  expertiseWeight: number; // 専門性の重み
  relationStrengthThreshold: number; // 関連性の強さの閾値
}
