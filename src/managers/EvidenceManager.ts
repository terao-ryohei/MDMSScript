import type { GameState } from "src/types/GameTypes";
import type {
  Evidence,
  EvidenceAnalysis,
  EvidenceChain,
  EvidenceRelation,
} from "../types/EvidenceTypes";
import type { EvidenceAnalyzer } from "./EvidenceAnalyzer";
import { world, type Player } from "@minecraft/server";

/**
 * 証拠管理システム
 * 証拠の収集、保存、共有を管理します
 */
export class EvidenceManager {
  private static instance: EvidenceManager | null = null;
  private evidenceMap = new Map<string, Evidence>();
  private playerEvidenceMap = new Map<Player["id"], Set<string>>();
  private roleEvidenceMap = new Map<string, Set<string>>();
  private accessLevels = new Map<string, number>();

  private constructor(private readonly analyzer: EvidenceAnalyzer) {
    this.initializeAccessLevels();
  }

  public static getInstance(analyzer: EvidenceAnalyzer): EvidenceManager {
    if (!EvidenceManager.instance) {
      EvidenceManager.instance = new EvidenceManager(analyzer);
    }
    return EvidenceManager.instance;
  }

  private initializeAccessLevels(): void {
    this.accessLevels.set("detective", 3);
    this.accessLevels.set("police", 2);
    this.accessLevels.set("citizen", 1);
    this.accessLevels.set("murderer", 1);
    this.accessLevels.set("accomplice", 1);
  }

  /**
   * 証拠の取得
   */
  public getEvidence(evidenceId: string): Evidence | undefined {
    return this.evidenceMap.get(evidenceId);
  }

  /**
   * プレイヤーの所持している証拠一覧の取得
   */
  public getPlayerEvidence(player: Player): Evidence[] {
    const evidenceIds = this.playerEvidenceMap.get(player.id) || new Set();
    return Array.from(evidenceIds)
      .map((id) => this.evidenceMap.get(id))
      .filter((e): e is Evidence => e !== undefined);
  }

  /**
   * 証拠の共有
   */
  public shareEvidence(from: Player, to: Player, evidenceId: string): boolean {
    const evidence = this.evidenceMap.get(evidenceId);
    if (!evidence) return false;

    const fromPlayerEvidence = this.playerEvidenceMap.get(from.id);
    if (!fromPlayerEvidence || !fromPlayerEvidence.has(evidenceId)) {
      return false;
    }

    let toPlayerEvidence = this.playerEvidenceMap.get(to.id);
    if (!toPlayerEvidence) {
      toPlayerEvidence = new Set();
      this.playerEvidenceMap.set(to.id, toPlayerEvidence);
    }
    toPlayerEvidence.add(evidenceId);

    if (!evidence.relatedPlayers.includes(to)) {
      evidence.relatedPlayers.push(to);
    }

    world.sendMessage(
      `${from.name}が${to.name}に証拠を共有しました: ${evidence.description}`,
    );
    return true;
  }

  /**
   * 証拠の分析を実行
   */
  public async analyzeEvidence(
    evidenceId: string,
    analyzerId: string,
  ): Promise<EvidenceAnalysis> {
    const evidence = this.getEvidence(evidenceId);
    if (!evidence) {
      throw new Error(`Evidence not found: ${evidenceId}`);
    }
    return this.analyzer.performAnalysis(evidenceId, analyzerId);
  }

  /**
   * 証拠チェーンを作成
   */
  public createEvidenceChain(
    evidenceIds: string[],
    name: string,
    description: string,
    createdBy: string,
  ): EvidenceChain {
    return this.analyzer.createEvidenceChain(
      evidenceIds,
      name,
      description,
      createdBy,
    );
  }

  /**
   * 関連する証拠を検索
   */
  public findRelatedEvidence(evidenceId: string): Evidence[] {
    const evidence = this.getEvidence(evidenceId);
    if (!evidence) {
      return [];
    }
    return this.analyzer.findRelatedEvidence(evidenceId);
  }

  /**
   * 証拠の関連付けを作成
   */
  public createEvidenceRelation(
    sourceId: string,
    targetId: string,
    relation: Omit<EvidenceRelation, "relationId" | "timestamp">,
  ): EvidenceRelation {
    return this.analyzer.createRelation(sourceId, targetId, relation);
  }

  /**
   * 分析結果を取得
   */
  public getAnalysis(analysisId: string): EvidenceAnalysis | undefined {
    return this.analyzer.getAnalysis(analysisId);
  }

  /**
   * 証拠チェーンを取得
   */
  public getEvidenceChain(chainId: string): EvidenceChain | undefined {
    return this.analyzer.getEvidenceChain(chainId);
  }

  /**
   * すべての分析結果を取得
   */
  public getAllAnalyses(): EvidenceAnalysis[] {
    return this.analyzer.getAllAnalyses();
  }

  /**
   * 証拠の分析履歴を取得
   */
  public getAnalysisHistory(evidenceId: string): EvidenceAnalysis[] {
    return this.analyzer.getAnalysisHistory(evidenceId);
  }

  /**
   * リソースの解放
   */
  public dispose(): void {
    EvidenceManager.instance = null;
  }
}
