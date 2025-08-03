import { ROLES } from "src/constants/abilities/RoleAbilities";
import {
  type EvidenceAnalysis,
  type EvidenceRelation,
  type EvidenceChain,
  ReliabilityFactor,
  type EvidenceAnalysisConfig,
  type Evidence,
} from "../types/EvidenceTypes";
import type { IEvidenceAnalyzer } from "./interfaces/IEvidenceAnalyzer";
import type { GameState } from "src/types/GameTypes";
import type { Role } from "src/types/RoleTypes";
import { getScore } from "src/utils/score";

/**
 * 証拠分析システム
 * 証拠の信頼性評価と関連性分析を行います
 */
export class EvidenceAnalyzer implements IEvidenceAnalyzer {
  private static instance: EvidenceAnalyzer | null = null;
  private analyses: Map<string, EvidenceAnalysis> = new Map();
  private relations: Map<string, EvidenceRelation> = new Map();
  private chains: Map<string, EvidenceChain> = new Map();

  private readonly config: EvidenceAnalysisConfig = {
    minReliabilityThreshold: 0.3,
    timeProximityWeight: 0.2,
    witnessCredibilityWeight: 0.25,
    physicalEvidenceWeight: 0.3,
    corroborationWeight: 0.15,
    expertiseWeight: 0.1,
    relationStrengthThreshold: 0.5,
  };

  constructor(private readonly gameState: GameState) {}

  public static getInstance(gameState: GameState): EvidenceAnalyzer {
    if (!EvidenceAnalyzer.instance) {
      EvidenceAnalyzer.instance = new EvidenceAnalyzer(gameState);
    }
    return EvidenceAnalyzer.instance;
  }

  // インターフェース実装
  public async analyzeEvidence(evidence: Evidence): Promise<number> {
    const factors = await this.calculateReliabilityFactors(evidence);
    return this.calculateWeightedAverage(factors);
  }

  // EvidenceManager用のオーバーロードメソッド
  public async performAnalysis(
    evidenceId: string,
    analyzerId: string,
  ): Promise<EvidenceAnalysis> {
    const evidence = this.gameState.evidenceList.find(
      (e) => e.evidenceId === evidenceId,
    );

    if (!evidence) {
      throw new Error(`Evidence not found: ${evidenceId}`);
    }

    const factors = await this.calculateReliabilityFactors(evidence);
    const conclusionStrength = this.calculateWeightedAverage(factors);

    const analysis: EvidenceAnalysis = {
      evidenceId,
      analysisId: crypto.randomUUID(),
      analyzedBy: analyzerId,
      timestamp: Date.now(),
      reliabilityFactors: factors,
      conclusionStrength,
      notes: "",
      linkedAnalyses: [],
    };

    this.analyses.set(analysis.analysisId, analysis);
    return analysis;
  }

  public async evaluateReliability(evidence: Evidence): Promise<number> {
    const factors = await this.calculateReliabilityFactors(evidence);
    return this.calculateWeightedAverage(factors);
  }

  public async analyzeRoleRelevance(
    evidence: Evidence,
    role: Role,
  ): Promise<number> {
    let relevance = 0.5;

    if (evidence.discoveredBy) {
      const discovererRole = Object.values(ROLES).find(
        (r) => r.id === getScore("role", evidence.discoveredBy),
      );
      if (discovererRole === role) {
        relevance += 0.2;
      }
    }

    if (evidence.type === "testimony" && role.name === "detective") {
      relevance += 0.3;
    }
    if (evidence.type === "physical" && role.name === "killer") {
      relevance += 0.4;
    }

    return Math.min(1.0, relevance) * 100;
  }

  public async verifyConsistency(evidences: Evidence[]): Promise<{
    score: number;
    inconsistencies: string[];
  }> {
    const inconsistencies: string[] = [];
    let consistencyScore = 1.0;

    for (let i = 0; i < evidences.length; i++) {
      for (let j = i + 1; j < evidences.length; j++) {
        if (this.hasTimeInconsistency(evidences[i], evidences[j])) {
          inconsistencies.push(
            `Time inconsistency between evidence ${evidences[i].evidenceId} and ${evidences[j].evidenceId}`,
          );
          consistencyScore *= 0.8;
        }
      }
    }

    return {
      score: consistencyScore * 100,
      inconsistencies,
    };
  }

  public async calculateImportance(
    evidence: Evidence,
    context: {
      phase: string;
      discoveredEvidence: Evidence[];
      suspectRoles: Role[];
    },
  ): Promise<number> {
    const baseScore = await this.evaluateReliability(evidence);
    let importance = baseScore;

    switch (context.phase) {
      case "investigation":
        if (evidence.type === "physical") importance *= 1.2;
        break;
      case "discussion":
        if (evidence.type === "testimony") importance *= 1.1;
        break;
    }

    const relatedScores = await this.findRelatedEvidence(
      evidence,
      context.discoveredEvidence,
    );
    const avgRelation =
      Array.from(relatedScores.values()).reduce(
        (sum, score) => sum + score,
        0,
      ) / (relatedScores.size || 1);
    importance *= 1 + avgRelation / 200;

    return Math.min(100, importance * 100);
  }

  // EvidenceManager用の追加メソッド
  public getAnalysis(analysisId: string): EvidenceAnalysis | undefined {
    return this.analyses.get(analysisId);
  }

  public getAllAnalyses(): EvidenceAnalysis[] {
    return Array.from(this.analyses.values());
  }

  public getAnalysisHistory(evidenceId: string): EvidenceAnalysis[] {
    return Array.from(this.analyses.values())
      .filter((analysis) => analysis.evidenceId === evidenceId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  public getEvidenceChain(chainId: string): EvidenceChain | undefined {
    return this.chains.get(chainId);
  }

  public createEvidenceChain(
    evidenceIds: string[],
    name: string,
    description: string,
    createdBy: string,
  ): EvidenceChain {
    const relations = Array.from(this.relations.values()).filter(
      (relation) =>
        evidenceIds.includes(relation.sourceEvidenceId) &&
        evidenceIds.includes(relation.targetEvidenceId),
    );

    const chain: EvidenceChain = {
      chainId: crypto.randomUUID(),
      name,
      description,
      evidenceIds,
      relations,
      createdBy,
      timestamp: Date.now(),
      reliability: 0,
      conclusionStrength: this.calculateWeightedAverage(
        new Map(
          relations.map((r) => [ReliabilityFactor.CORROBORATION, r.strength]),
        ),
      ),
    };

    this.chains.set(chain.chainId, chain);
    return chain;
  }

  public createRelation(
    sourceId: string,
    targetId: string,
    relation: Omit<EvidenceRelation, "relationId" | "timestamp">,
  ): EvidenceRelation {
    const newRelation: EvidenceRelation = {
      ...relation,
      relationId: crypto.randomUUID(),
      sourceEvidenceId: sourceId,
      targetEvidenceId: targetId,
      timestamp: Date.now(),
    };

    this.relations.set(newRelation.relationId, newRelation);
    return newRelation;
  }

  // findRelatedEvidenceのオーバーロード
  public findRelatedEvidence(evidenceId: string): Evidence[];
  public findRelatedEvidence(
    evidence: Evidence,
    existingEvidence: Evidence[],
  ): Promise<Map<string, number>>;
  public findRelatedEvidence(
    evidenceOrId: Evidence | string,
    existingEvidence?: Evidence[],
  ): Evidence[] | Promise<Map<string, number>> {
    if (typeof evidenceOrId === "string") {
      return this.findRelatedEvidenceById(evidenceOrId);
    }
    return this.calculateRelationScores(evidenceOrId, existingEvidence || []);
  }

  // プライベートヘルパーメソッド
  private findRelatedEvidenceById(evidenceId: string): Evidence[] {
    const relations = Array.from(this.relations.values()).filter(
      (relation) =>
        relation.sourceEvidenceId === evidenceId ||
        relation.targetEvidenceId === evidenceId,
    );

    const relatedIds = new Set(
      relations.flatMap((relation) => [
        relation.sourceEvidenceId,
        relation.targetEvidenceId,
      ]),
    );

    return Array.from(relatedIds)
      .map((id) => this.gameState.evidenceList.find((e) => e.evidenceId === id))
      .filter((e): e is Evidence => e !== undefined);
  }

  private async calculateRelationScores(
    evidence: Evidence,
    existingEvidence: Evidence[],
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>();

    for (const other of existingEvidence) {
      if (other.evidenceId === evidence.evidenceId) continue;

      let score = 0;
      const timeDiff = Math.abs(other.discoveryTime - evidence.discoveryTime);
      score += Math.max(0, 1 - timeDiff / 3600000);

      if (other.location && evidence.location) {
        const distance = Math.hypot(
          other.location.x - evidence.location.x,
          other.location.y - evidence.location.y,
          other.location.z - evidence.location.z,
        );
        score += Math.max(0, 1 - distance / 100);
      }

      if (other.type === evidence.type) score += 0.3;

      scores.set(other.evidenceId, score * 100);
    }

    return scores;
  }

  private async calculateReliabilityFactors(
    evidence: Evidence,
  ): Promise<Map<ReliabilityFactor, number>> {
    const factors = new Map<ReliabilityFactor, number>();

    factors.set(
      ReliabilityFactor.TIME_PROXIMITY,
      this.evaluateTimeProximity(evidence),
    );

    if (evidence.type === "testimony") {
      factors.set(
        ReliabilityFactor.WITNESS_CREDIBILITY,
        this.evaluateWitnessCredibility(evidence),
      );
    }

    if (evidence.type === "physical") {
      factors.set(
        ReliabilityFactor.PHYSICAL_EVIDENCE,
        this.evaluatePhysicalEvidence(evidence),
      );
    }

    const relatedScores = await this.calculateRelationScores(
      evidence,
      this.gameState.evidenceList,
    );
    const corroborationScore =
      Array.from(relatedScores.values()).reduce(
        (sum, score) => sum + score,
        0,
      ) /
        (relatedScores.size * 100) || 0.5;
    factors.set(ReliabilityFactor.CORROBORATION, corroborationScore);

    return factors;
  }

  private calculateWeightedAverage(
    factors: Map<ReliabilityFactor, number>,
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const [factor, value] of factors.entries()) {
      const weight =
        this.config[
          `${factor.toLowerCase()}Weight` as keyof EvidenceAnalysisConfig
        ] || 0;
      totalWeight += weight;
      weightedSum += value * weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  private evaluateTimeProximity(evidence: Evidence): number {
    const timeDiff = Date.now() - evidence.discoveryTime;
    if (timeDiff <= 1800000) return 0.8 + 0.2 * (1 - timeDiff / 1800000);
    if (timeDiff <= 7200000)
      return 0.5 + 0.3 * (1 - (timeDiff - 1800000) / 5400000);
    return Math.max(0.1, 0.5 * Math.exp(-timeDiff / 7200000));
  }

  private evaluateWitnessCredibility(evidence: Evidence): number {
    if (evidence.type !== "testimony") return 0;

    let credibility = 0.5;
    if (evidence.discoveredBy) {
      const role = Object.values(ROLES).find(
        (r) => r.id === getScore("role", evidence.discoveredBy),
      );
      if (role?.name === "detective") credibility += 0.3;
    }

    return Math.min(1.0, credibility);
  }

  private evaluatePhysicalEvidence(evidence: Evidence): number {
    if (evidence.type !== "physical") return 0;

    let quality = 0.7;
    if (evidence.isVerified) quality += 0.2;
    quality += Math.min(0.1, evidence.linkedEvidence.length * 0.02);

    return Math.min(1.0, quality);
  }

  private hasTimeInconsistency(
    evidence1: Evidence,
    evidence2: Evidence,
  ): boolean {
    return (
      Math.abs(evidence1.discoveryTime - evidence2.discoveryTime) > 3600000
    );
  }

  public dispose(): void {
    EvidenceAnalyzer.instance = null;
    this.analyses.clear();
    this.relations.clear();
    this.chains.clear();
  }
}
