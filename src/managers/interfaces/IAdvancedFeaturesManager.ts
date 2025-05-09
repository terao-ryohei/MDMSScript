import type {
  IRoleAbility,
  IEvidenceReliability,
  IAnalyticsResult,
  RoleType,
  AbilityTarget,
} from "../../types/AdvancedFeatureTypes";

/**
 * 高度な機能を管理するマネージャーのインターフェース
 */
export interface IAdvancedFeaturesManager {
  // 役職特殊能力システム
  /**
   * 指定された役職の特殊能力を取得
   */
  getRoleAbility(roleType: RoleType): IRoleAbility;

  /**
   * 特殊能力を使用
   */
  useRoleAbility(playerId: string, target: AbilityTarget): Promise<boolean>;

  /**
   * 特殊能力の使用可否を確認
   */
  isAbilityAvailable(playerId: string): boolean;

  // 証拠信頼性システム
  /**
   * 証拠の信頼性を評価
   */
  evaluateEvidence(evidenceId: string): Promise<IEvidenceReliability>;

  /**
   * 証拠間の矛盾を検出
   */
  detectEvidenceConflicts(evidenceIds: string[]): Promise<string[][]>;

  /**
   * 証拠の関連性を分析
   */
  analyzeEvidenceRelevance(
    evidenceId: string,
    contextEvidenceIds: string[],
  ): Promise<number>;

  /**
   * 証拠の優先度を設定
   */
  setEvidencePriority(evidenceId: string, priority: number): Promise<void>;

  // 統計・分析機能
  /**
   * プレイヤーの行動を分析
   */
  analyzePlayerBehavior(
    playerId: string,
  ): Promise<IAnalyticsResult["playerBehavior"]>;

  /**
   * 証拠の統計分析を実行
   */
  analyzeEvidenceStatistics(): Promise<IAnalyticsResult["evidenceStats"]>;

  /**
   * 投票パターンを分析
   */
  analyzeVotingPatterns(): Promise<VotingPatternAnalysis>;

  /**
   * アリバイの整合性を分析
   */
  analyzeAlibiConsistency(
    playerId: string,
  ): Promise<IAnalyticsResult["alibiAnalysis"]>;

  // イベントリスナー
  /**
   * 証拠の状態変更を監視
   */
  onEvidenceStateChange(
    callback: (evidenceId: string, newState: IEvidenceReliability) => void,
  ): void;

  /**
   * 特殊能力の使用を監視
   */
  onAbilityUse(
    callback: (
      playerId: string,
      ability: IRoleAbility,
      target: AbilityTarget,
    ) => void,
  ): void;

  /**
   * 分析結果の更新を監視
   */
  onAnalyticsUpdate(
    callback: (result: Partial<IAnalyticsResult>) => void,
  ): void;
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
