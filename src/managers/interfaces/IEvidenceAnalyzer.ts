import type { Role } from "src/types/RoleTypes";
import type { Evidence } from "../../types/EvidenceTypes";

/**
 * 証拠分析機能を提供するインターフェース
 */
export interface IEvidenceAnalyzer {
  /**
   * 証拠を分析
   * @param evidence 分析する証拠
   * @returns 分析結果のスコア（0-100）
   */
  analyzeEvidence(evidence: Evidence): Promise<number>;

  /**
   * 証拠の信頼性を評価
   * @param evidence 評価する証拠
   * @returns 信頼性スコア（0-100）
   */
  evaluateReliability(evidence: Evidence): Promise<number>;

  /**
   * 証拠と役職の関連性を分析
   * @param evidence 分析する証拠
   * @param role 分析対象の役職
   * @returns 関連性スコア（0-100）
   */
  analyzeRoleRelevance(evidence: Evidence, role: Role): Promise<number>;

  /**
   * 複数の証拠間の整合性を検証
   * @param evidences 検証する証拠の配列
   * @returns 整合性スコア（0-100）と矛盾点の説明
   */
  verifyConsistency(evidences: Evidence[]): Promise<{
    score: number;
    inconsistencies: string[];
  }>;

  /**
   * 新しい証拠と既存の証拠との関連性を分析
   * @param newEvidence 新しい証拠
   * @param existingEvidence 既存の証拠配列
   * @returns 関連性の高い証拠のIDと関連度のマップ
   */
  findRelatedEvidence(
    newEvidence: Evidence,
    existingEvidence: Evidence[],
  ): Promise<Map<string, number>>;

  /**
   * 証拠の重要度を計算
   * @param evidence 評価する証拠
   * @param context 現在の文脈情報
   * @returns 重要度スコア（0-100）
   */
  calculateImportance(
    evidence: Evidence,
    context: {
      phase: string;
      discoveredEvidence: Evidence[];
      suspectRoles: Role[];
    },
  ): Promise<number>;
}
