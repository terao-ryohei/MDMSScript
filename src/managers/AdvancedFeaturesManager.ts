import type {
  IAdvancedFeaturesManager,
  VotingPatternAnalysis,
} from "./interfaces/IAdvancedFeaturesManager";
import type { IGameManager } from "./interfaces/IGameManager";
import type { ICommunicationManager } from "./interfaces/ICommunicationManager";
import type { EvidenceManager } from "./EvidenceManager";
import type {
  IRoleAbility,
  IEvidenceReliability,
  IAnalyticsResult,
  AbilityTarget,
  PlayerMovementPattern,
  PlayerInteraction,
  VoteData,
  AlibiConflict,
} from "../types/AdvancedFeatureTypes";
import {
  RoleType,
  EvidenceVerificationStatus,
} from "../types/AdvancedFeatureTypes";
import { EvidenceType } from "../types/EvidenceTypes";
import type { Evidence } from "../types/EvidenceTypes";
import type { PlayerState } from "../types/GameTypes";

// Map from game roles to ability roles
const roleTypeMapping: { [key: string]: RoleType } = {
  detective: RoleType.DETECTIVE,
  murderer: RoleType.KILLER,
  accomplice: RoleType.ACCOMPLICE,
  villager: RoleType.CITIZEN,
};

export class AdvancedFeaturesManager implements IAdvancedFeaturesManager {
  private static _instance: AdvancedFeaturesManager | null = null;
  private roleAbilities = new Map<RoleType, IRoleAbility>();
  private evidenceReliability = new Map<string, IEvidenceReliability>();
  private abilityUsage = new Map<string, number>();
  private readonly eventListeners = {
    evidenceState: [] as Array<
      (evidenceId: string, newState: IEvidenceReliability) => void
    >,
    abilityUse: [] as Array<
      (playerId: string, ability: IRoleAbility, target: AbilityTarget) => void
    >,
    analyticsUpdate: [] as Array<(result: Partial<IAnalyticsResult>) => void>,
  };

  private constructor(
    private readonly gameManager: IGameManager,
    private readonly evidenceManager: EvidenceManager,
    private readonly communicationManager: ICommunicationManager,
  ) {
    this.initializeRoleAbilities();
  }

  private initializeRoleAbilities(): void {
    // Detective can investigate evidence
    this.roleAbilities.set(RoleType.DETECTIVE, {
      roleType: RoleType.DETECTIVE,
      useAbility: async (target: AbilityTarget): Promise<boolean> => {
        if (target.targetType !== "evidence") return false;
        return true;
      },
      getCoolDown: (): number => 30000,
      isAvailable: (): boolean => true,
    });

    // Killer can manipulate evidence
    this.roleAbilities.set(RoleType.KILLER, {
      roleType: RoleType.KILLER,
      useAbility: async (target: AbilityTarget): Promise<boolean> => {
        if (target.targetType !== "evidence") return false;
        return true;
      },
      getCoolDown: (): number => 60000,
      isAvailable: (): boolean => true,
    });

    // Accomplice can interact with players
    this.roleAbilities.set(RoleType.ACCOMPLICE, {
      roleType: RoleType.ACCOMPLICE,
      useAbility: async (target: AbilityTarget): Promise<boolean> => {
        if (target.targetType !== "player") return false;
        return true;
      },
      getCoolDown: (): number => 45000,
      isAvailable: (): boolean => true,
    });

    // Citizens and villagers have no special abilities
    this.roleAbilities.set(RoleType.CITIZEN, {
      roleType: RoleType.CITIZEN,
      useAbility: async (_target: AbilityTarget): Promise<boolean> => {
        return false;
      },
      getCoolDown: (): number => 0,
      isAvailable: (): boolean => false,
    });
  }

  public static create(
    gameManager: IGameManager,
    evidenceManager: EvidenceManager,
    communicationManager: ICommunicationManager,
  ): AdvancedFeaturesManager {
    if (!AdvancedFeaturesManager._instance) {
      AdvancedFeaturesManager._instance = new AdvancedFeaturesManager(
        gameManager,
        evidenceManager,
        communicationManager,
      );
    }
    return AdvancedFeaturesManager._instance;
  }

  public getRoleAbility(roleType: RoleType): IRoleAbility {
    const ability = this.roleAbilities.get(roleType);
    if (!ability) {
      throw new Error(`Role ability not found for role type: ${roleType}`);
    }
    return ability;
  }

  public async useRoleAbility(
    playerId: string,
    target: AbilityTarget,
  ): Promise<boolean> {
    const playerState = this.gameManager.getPlayerState(playerId) as
      | PlayerState
      | undefined;
    if (!playerState?.role) return false;

    const mappedRole = roleTypeMapping[playerState.role];
    const ability = this.getRoleAbility(mappedRole);
    if (!this.isAbilityAvailable(playerId)) return false;

    const success = await ability.useAbility(target);
    if (success) {
      this.abilityUsage.set(playerId, Date.now());
      this.notifyAbilityUse(playerId, ability, target);
    }
    return success;
  }

  public isAbilityAvailable(playerId: string): boolean {
    const lastUsage = this.abilityUsage.get(playerId);
    if (!lastUsage) return true;

    const playerState = this.gameManager.getPlayerState(playerId) as
      | PlayerState
      | undefined;
    if (!playerState?.role) return false;

    const mappedRole = roleTypeMapping[playerState.role];
    const ability = this.getRoleAbility(mappedRole);
    return Date.now() - lastUsage >= ability.getCoolDown();
  }

  public async evaluateEvidence(
    evidenceId: string,
  ): Promise<IEvidenceReliability> {
    const evidence = this.evidenceManager.getEvidence(evidenceId);
    if (!evidence) {
      throw new Error(`Evidence not found: ${evidenceId}`);
    }

    const reliability: IEvidenceReliability = {
      score: this.calculateEvidenceScore(evidence),
      conflicts: await this.detectEvidenceConflicts([evidenceId]).then(
        (conflicts) =>
          conflicts.reduce((acc: string[], curr) => acc.concat(curr), []),
      ),
      relevance: 0,
      priority: 1,
      verificationStatus: EvidenceVerificationStatus.UNVERIFIED,
    };

    const allEvidence = this.evidenceManager.getPlayerEvidence("all");
    const contextEvidenceIds = allEvidence
      .filter((e) => e.evidenceId !== evidenceId)
      .map((e) => e.evidenceId);
    reliability.relevance = await this.analyzeEvidenceRelevance(
      evidenceId,
      contextEvidenceIds,
    );

    this.evidenceReliability.set(evidenceId, reliability);
    this.notifyEvidenceStateChange(evidenceId, reliability);

    return reliability;
  }

  public async setEvidencePriority(
    evidenceId: string,
    priority: number,
  ): Promise<void> {
    const reliability = this.evidenceReliability.get(evidenceId);
    if (reliability) {
      reliability.priority = Math.min(5, Math.max(1, priority));
      this.notifyEvidenceStateChange(evidenceId, reliability);
    }
  }

  public async analyzePlayerBehavior(
    playerId: string,
  ): Promise<IAnalyticsResult["playerBehavior"]> {
    const [movements, interactions, votingHistory] = await Promise.all([
      this.getPlayerMovements(playerId),
      this.getPlayerInteractions(playerId),
      this.getPlayerVotingHistory(playerId),
    ]);

    const result: IAnalyticsResult["playerBehavior"] = {
      movements,
      interactions,
      votingHistory,
    };

    this.notifyAnalyticsUpdate({ playerBehavior: result });
    return result;
  }

  public async analyzeEvidenceStatistics(): Promise<
    IAnalyticsResult["evidenceStats"]
  > {
    const allEvidence = this.evidenceManager.getPlayerEvidence("all");
    const stats: IAnalyticsResult["evidenceStats"] = {
      totalEvidence: allEvidence.length,
      verifiedEvidence: 0,
      suspiciousEvidence: 0,
      reliabilityAverage: 0,
    };

    let totalReliability = 0;
    let verifiedCount = 0;
    let suspiciousCount = 0;

    for (const evidence of allEvidence) {
      const reliability = this.evidenceReliability.get(evidence.evidenceId);
      if (reliability) {
        if (
          reliability.verificationStatus === EvidenceVerificationStatus.VERIFIED
        ) {
          verifiedCount++;
        } else if (
          reliability.verificationStatus ===
          EvidenceVerificationStatus.SUSPICIOUS
        ) {
          suspiciousCount++;
        }
        totalReliability += reliability.score;
      }
    }

    stats.verifiedEvidence = verifiedCount;
    stats.suspiciousEvidence = suspiciousCount;
    stats.reliabilityAverage = totalReliability / (allEvidence.length || 1);

    this.notifyAnalyticsUpdate({ evidenceStats: stats });
    return stats;
  }

  public async analyzeVotingPatterns(): Promise<VotingPatternAnalysis> {
    const votingHistory = await this.getPlayerVotingHistory("all");
    const patterns: VotingPatternAnalysis = {
      patterns: this.analyzeVotingTrends(votingHistory),
      trends: this.identifyVotingPhases(votingHistory),
      suspiciousPatterns: this.detectSuspiciousVotingPatterns(votingHistory),
    };

    this.notifyAnalyticsUpdate({
      playerBehavior: {
        movements: [],
        interactions: [],
        votingHistory,
      },
    });
    return patterns;
  }

  public async analyzeAlibiConsistency(
    playerId: string,
  ): Promise<IAnalyticsResult["alibiAnalysis"]> {
    const movements = await this.getPlayerMovements(playerId);
    const playerState = this.gameManager.getPlayerState(playerId);
    if (!playerState) {
      return { consistencyScore: 0, conflicts: [] };
    }

    // Find other active players
    const otherPlayers = Array(16)
      .fill(null)
      .map((_, i) => `player${i + 1}`)
      .filter((pid) => pid !== playerId)
      .filter((pid) => this.gameManager.getPlayerState(pid));

    if (otherPlayers.length === 0) {
      return { consistencyScore: 0, conflicts: [] };
    }

    const otherPlayersMovements = await Promise.all(
      otherPlayers.map((p) => this.getPlayerMovements(p)),
    );

    const conflicts = this.detectAlibiConflicts(
      movements,
      otherPlayersMovements,
    );
    const analysis: IAnalyticsResult["alibiAnalysis"] = {
      consistencyScore: this.calculateAlibiConsistencyScore(conflicts),
      conflicts,
    };

    this.notifyAnalyticsUpdate({ alibiAnalysis: analysis });
    return analysis;
  }

  public async detectEvidenceConflicts(
    evidenceIds: string[],
  ): Promise<string[][]> {
    const evidences = await Promise.all(
      evidenceIds.map((id) => this.evidenceManager.getEvidence(id)),
    );
    const validEvidences = evidences.filter(
      (e): e is Evidence => e !== undefined,
    );
    const conflicts: string[][] = [];

    for (let i = 0; i < validEvidences.length; i++) {
      for (let j = i + 1; j < validEvidences.length; j++) {
        if (this.checkEvidenceConflict(validEvidences[i], validEvidences[j])) {
          conflicts.push([evidenceIds[i], evidenceIds[j]]);
        }
      }
    }

    return conflicts;
  }

  public async analyzeEvidenceRelevance(
    evidenceId: string,
    contextEvidenceIds: string[],
  ): Promise<number> {
    const evidence = this.evidenceManager.getEvidence(evidenceId);
    if (!evidence) return 0;

    const contextEvidences = await Promise.all(
      contextEvidenceIds.map((id) => this.evidenceManager.getEvidence(id)),
    );
    const validContextEvidences = contextEvidences.filter(
      (e): e is Evidence => e !== undefined,
    );

    return this.calculateRelevanceScore(evidence, validContextEvidences);
  }

  public onEvidenceStateChange(
    callback: (evidenceId: string, newState: IEvidenceReliability) => void,
  ): void {
    this.eventListeners.evidenceState.push(callback);
  }

  public onAbilityUse(
    callback: (
      playerId: string,
      ability: IRoleAbility,
      target: AbilityTarget,
    ) => void,
  ): void {
    this.eventListeners.abilityUse.push(callback);
  }

  public onAnalyticsUpdate(
    callback: (result: Partial<IAnalyticsResult>) => void,
  ): void {
    this.eventListeners.analyticsUpdate.push(callback);
  }

  private notifyEvidenceStateChange(
    evidenceId: string,
    newState: IEvidenceReliability,
  ): void {
    for (const callback of this.eventListeners.evidenceState) {
      callback(evidenceId, newState);
    }
  }

  private notifyAbilityUse(
    playerId: string,
    ability: IRoleAbility,
    target: AbilityTarget,
  ): void {
    for (const callback of this.eventListeners.abilityUse) {
      callback(playerId, ability, target);
    }
  }

  private notifyAnalyticsUpdate(result: Partial<IAnalyticsResult>): void {
    for (const callback of this.eventListeners.analyticsUpdate) {
      callback(result);
    }
  }

  private calculateEvidenceScore(evidence: Evidence): number {
    let score = 50;

    switch (evidence.type) {
      case EvidenceType.PHYSICAL:
        score += 20;
        break;
      case EvidenceType.TESTIMONY:
        score += 10;
        break;
      case EvidenceType.CIRCUMSTANTIAL:
        score += 5;
        break;
    }

    score += evidence.reliability * 30;
    score += evidence.isVerified ? 20 : 0;

    return Math.min(100, Math.max(0, score));
  }

  private checkEvidenceConflict(
    evidence1: Evidence,
    evidence2: Evidence,
  ): boolean {
    const timeConflict =
      Math.abs(evidence1.discoveryTime - evidence2.discoveryTime) < 300000;
    if (!timeConflict) return false;

    if (evidence1.location && evidence2.location) {
      const distance = Math.hypot(
        evidence1.location.x - evidence2.location.x,
        evidence1.location.y - evidence2.location.y,
        evidence1.location.z - evidence2.location.z,
      );
      if (distance > 100) return true;
    }

    return false;
  }

  private calculateRelevanceScore(
    evidence: Evidence,
    contextEvidence: Evidence[],
  ): number {
    if (contextEvidence.length === 0) return 0;

    let totalScore = 0;
    for (const other of contextEvidence) {
      let score = 0;

      // 時間的近接性
      const timeDiff = Math.abs(evidence.discoveryTime - other.discoveryTime);
      score += Math.max(0, 1 - timeDiff / 3600000) * 30;

      // 場所の近接性
      if (evidence.location && other.location) {
        const distance = Math.hypot(
          evidence.location.x - other.location.x,
          evidence.location.y - other.location.y,
          evidence.location.z - other.location.z,
        );
        score += Math.max(0, 1 - distance / 100) * 30;
      }

      // 関連プレイヤーの重複
      const commonPlayers = evidence.relatedPlayers.filter((p) =>
        other.relatedPlayers.includes(p),
      );
      score += commonPlayers.length * 10;

      totalScore += score;
    }

    return Math.min(100, totalScore / contextEvidence.length);
  }

  private async getPlayerMovements(
    playerId: string,
  ): Promise<PlayerMovementPattern[]> {
    // TODO: Implementation pending
    return [];
  }

  private async getPlayerInteractions(
    playerId: string,
  ): Promise<PlayerInteraction[]> {
    // TODO: Implementation pending
    return [];
  }

  private async getPlayerVotingHistory(playerId: string): Promise<VoteData[]> {
    // TODO: Implementation pending
    return [];
  }

  private analyzeVotingTrends(
    votingHistory: VoteData[],
  ): VotingPatternAnalysis["patterns"] {
    // TODO: Implementation pending
    return [];
  }

  private identifyVotingPhases(
    votingHistory: VoteData[],
  ): VotingPatternAnalysis["trends"] {
    // TODO: Implementation pending
    return [];
  }

  private detectSuspiciousVotingPatterns(
    votingHistory: VoteData[],
  ): VotingPatternAnalysis["suspiciousPatterns"] {
    // TODO: Implementation pending
    return [];
  }

  private detectAlibiConflicts(
    playerMovements: PlayerMovementPattern[],
    otherPlayersMovements: PlayerMovementPattern[][],
  ): AlibiConflict[] {
    // TODO: Implementation pending
    return [];
  }

  private calculateAlibiConsistencyScore(conflicts: AlibiConflict[]): number {
    return Math.max(0, 100 - conflicts.length * 10);
  }

  public dispose(): void {
    AdvancedFeaturesManager._instance = null;
  }
}
