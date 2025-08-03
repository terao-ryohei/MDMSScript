import type { ICommunicationManager } from "./interfaces/ICommunicationManager";
import type { Evidence } from "../types/EvidenceTypes";
import { MurderMysteryActions } from "../types/ActionTypes";
import type { GameState } from "src/types/GameTypes";
import type { Player } from "@minecraft/server";
import type { Role } from "src/types/RoleTypes";
import { getScore } from "src/utils/score";
import { ROLES } from "src/constants/abilities/RoleAbilities";
import { GamePhase } from "src/types/PhaseType";
import type { GameManager } from "./GameManager";

export class CommunicationManager implements ICommunicationManager {
  private static instance: CommunicationManager | null = null;
  private messageHistory: Map<Player, string[]>;
  private isVotingPhase: boolean;
  private votes: Map<Player, Player>;
  private voteCount: Map<Player, number>;

  constructor(
    private readonly logAction: GameManager["logAction"],
    private readonly gameState: GameState,
  ) {
    this.messageHistory = new Map();
    this.isVotingPhase = false;
    this.votes = new Map();
    this.voteCount = new Map();
  }

  public static getInstance(
    logAction: GameManager["logAction"],
    gameState: GameState,
  ): CommunicationManager {
    if (!CommunicationManager.instance) {
      CommunicationManager.instance = new CommunicationManager(
        logAction,
        gameState,
      );
    }
    return CommunicationManager.instance;
  }

  async sendNPCMessage(
    npcId: string,
    player: Player,
    message: string,
  ): Promise<boolean> {
    this.logAction({
      type: MurderMysteryActions.TALK_TO_NPC,
      player,
      details: {
        npcId,
        message,
      },
    });

    this.addToHistory(player, `NPC ${npcId}: ${message}`);
    return true;
  }

  // 情報共有機能実装
  async shareEvidence(
    from: Player,
    to: Player,
    evidence: Evidence,
  ): Promise<boolean> {
    if (!this.canShareEvidence(from, to, evidence)) {
      return false;
    }

    this.logAction({
      type: MurderMysteryActions.EVIDENCE_SHARE,
      player: from,
      details: {
        to,
        evidenceId: evidence.evidenceId,
      },
    });

    return true;
  }

  // 分析共有機能実装
  async shareInvestigationResult(
    from: Player,
    result: string,
  ): Promise<boolean> {
    this.logAction({
      type: MurderMysteryActions.ANALYZE_EVIDENCE,
      player: from,
      details: { result },
    });

    return true;
  }

  // アリバイ共有機能実装
  async shareAlibi(
    player: Player,
    alibi: string,
    timestamp: number,
  ): Promise<boolean> {
    this.logAction({
      type: MurderMysteryActions.CREATE_ALIBI,
      player,
      details: {
        alibi,
        timestamp,
      },
    });

    return true;
  }

  // 投票システム実装
  async startVoting(): Promise<boolean> {
    this.isVotingPhase = true;
    this.votes.clear();
    this.voteCount.clear();

    return true;
  }

  async castVote(from: Player, target: Player): Promise<boolean> {
    if (!this.canVote(from)) {
      return false;
    }

    this.votes.set(from, target);
    const currentCount = this.voteCount.get(target) || 0;
    this.voteCount.set(target, currentCount + 1);

    return true;
  }

  async endVoting(): Promise<{ suspect: Player | null; voteCount: number }> {
    this.isVotingPhase = false;
    let maxVotes = 0;
    let suspect: Player | null = null;

    this.voteCount.forEach((count, player) => {
      if (count > maxVotes) {
        maxVotes = count;
        suspect = player;
      }
    });

    return { suspect, voteCount: maxVotes };
  }

  // アクセス制御実装
  canCommunicate(fromRole: Role, toRole: Role): boolean {
    // 探偵は誰とでも会話可能
    if (fromRole.name === "detective") return true;

    // 殺人者と共犯者は互いに会話可能
    if (
      (fromRole.name === "killer" && toRole.name === "accomplice") ||
      (fromRole.name === "accomplice" && toRole.name === "killer")
    ) {
      return true;
    }

    // その他の組み合わせは、現在のフェーズに依存
    return this.gameState.phase !== "investigation";
  }

  canShareEvidence(from: Player, to: Player, evidence: Evidence): boolean {
    const fromPlayer = this.gameState.players.find(
      (player) => player.player === from,
    );
    const toPlayer = this.gameState.players.find(
      (player) => player.player === to,
    );

    if (!fromPlayer || !toPlayer) return false;
    if (!fromPlayer.collectedEvidence.includes(evidence.evidenceId))
      return false;

    // 探偵は常に証拠を共有可能
    const fromRole = Object.values(ROLES).find(
      (role) => role.id === getScore("role", from),
    );
    if (fromRole?.name === "detective") return true;

    // フェーズによる制限
    return (
      this.gameState.phase === GamePhase.DISCUSSION ||
      this.gameState.phase === GamePhase.FINAL_MEETING
    );
  }

  canVote(player: Player): boolean {
    if (
      !player ||
      !this.isVotingPhase
      //  || player.hasVoted
    )
      return false;
    return true;
  }

  // ステータス確認実装
  isVotingActive(): boolean {
    return this.isVotingPhase;
  }

  getVoteCount(player: Player): number {
    return this.voteCount.get(player) || 0;
  }

  async getCommunicationHistory(player: Player): Promise<string[]> {
    return this.messageHistory.get(player) || [];
  }

  // プライベートメソッド
  private addToHistory(player: Player, message: string): void {
    const history = this.messageHistory.get(player) || [];
    history.push(`[${new Date().toISOString()}] ${message}`);
    this.messageHistory.set(player, history);
  }

  /**
   * リソースの解放
   */
  public dispose(): void {
    CommunicationManager.instance = null;
  }
}
