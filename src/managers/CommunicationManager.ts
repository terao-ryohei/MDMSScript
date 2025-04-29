import { system } from "@minecraft/server";
import type { ILoggerManager } from "./interfaces/ILoggerManager";
import type { ICommunicationManager } from "./interfaces/ICommunicationManager";
import type { RoleType, PlayerState, GameState } from "../types/GameTypes";
import type { Evidence } from "../types/EvidenceTypes";
import { MurderMysteryActions } from "../types/ActionTypes";

export class CommunicationManager implements ICommunicationManager {
  private gameState: GameState;
  private loggerManager: ILoggerManager;
  private messageHistory: Map<string, string[]>;
  private isVotingPhase: boolean;
  private votes: Map<string, string>;
  private voteCount: Map<string, number>;

  constructor(gameState: GameState, loggerManager: ILoggerManager) {
    this.gameState = gameState;
    this.loggerManager = loggerManager;
    this.messageHistory = new Map();
    this.isVotingPhase = false;
    this.votes = new Map();
    this.voteCount = new Map();
  }

  // チャットシステム実装
  async sendMessage(
    fromId: string,
    toId: string,
    message: string,
  ): Promise<boolean> {
    const fromPlayer = this.gameState.players.get(fromId);
    const toPlayer = this.gameState.players.get(toId);

    if (
      !fromPlayer ||
      !toPlayer ||
      !this.canCommunicate(fromPlayer.role, toPlayer.role)
    ) {
      return false;
    }

    await this.loggerManager.logAction({
      type: "chat",
      playerId: fromId,
      details: {
        toId,
        message,
      },
    });

    this.addToHistory(fromId, `To ${toId}: ${message}`);
    this.addToHistory(toId, `From ${fromId}: ${message}`);
    return true;
  }

  async broadcastMessage(fromId: string, message: string): Promise<boolean> {
    await this.loggerManager.logAction({
      type: "broadcast",
      playerId: fromId,
      details: { message },
    });

    this.gameState.players.forEach((_, playerId) => {
      this.addToHistory(playerId, `Broadcast from ${fromId}: ${message}`);
    });
    return true;
  }

  async sendNPCMessage(
    npcId: string,
    playerId: string,
    message: string,
  ): Promise<boolean> {
    await this.loggerManager.logAction({
      type: MurderMysteryActions.TALK_TO_NPC,
      playerId,
      details: {
        npcId,
        message,
      },
    });

    this.addToHistory(playerId, `NPC ${npcId}: ${message}`);
    return true;
  }

  // 情報共有機能実装
  async shareEvidence(
    fromId: string,
    toId: string,
    evidence: Evidence,
  ): Promise<boolean> {
    if (!this.canShareEvidence(fromId, toId, evidence)) {
      return false;
    }

    await this.loggerManager.logAction({
      type: MurderMysteryActions.EVIDENCE_SHARE,
      playerId: fromId,
      details: {
        toId,
        evidenceId: evidence.evidenceId,
      },
    });

    return true;
  }

  async shareInvestigationResult(
    fromId: string,
    result: string,
  ): Promise<boolean> {
    await this.loggerManager.logAction({
      type: MurderMysteryActions.ANALYZE_EVIDENCE,
      playerId: fromId,
      details: { result },
    });

    return true;
  }

  async shareAlibi(
    playerId: string,
    alibi: string,
    timestamp: number,
  ): Promise<boolean> {
    await this.loggerManager.logAction({
      type: MurderMysteryActions.CREATE_ALIBI,
      playerId,
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

    await this.loggerManager.logAction({
      type: MurderMysteryActions.PHASE_CHANGE,
      playerId: "system",
      details: {
        phase: "voting",
        status: "started",
      },
    });

    return true;
  }

  async castVote(fromId: string, targetId: string): Promise<boolean> {
    if (!this.canVote(fromId)) {
      return false;
    }

    this.votes.set(fromId, targetId);
    const currentCount = this.voteCount.get(targetId) || 0;
    this.voteCount.set(targetId, currentCount + 1);

    await this.loggerManager.logAction({
      type: MurderMysteryActions.VOTE_CAST,
      playerId: fromId,
      details: {
        targetId,
      },
    });

    return true;
  }

  async endVoting(): Promise<{ suspect: string; voteCount: number }> {
    this.isVotingPhase = false;
    let maxVotes = 0;
    let suspect = "";

    this.voteCount.forEach((count, playerId) => {
      if (count > maxVotes) {
        maxVotes = count;
        suspect = playerId;
      }
    });

    await this.loggerManager.logAction({
      type: MurderMysteryActions.PHASE_CHANGE,
      playerId: "system",
      details: {
        phase: "voting",
        status: "ended",
        result: {
          suspect,
          voteCount: maxVotes,
        },
      },
    });

    return { suspect, voteCount: maxVotes };
  }

  // アクセス制御実装
  canCommunicate(fromRole: RoleType, toRole: RoleType): boolean {
    // 探偵は誰とでも会話可能
    if (fromRole === "detective") return true;

    // 殺人者と共犯者は互いに会話可能
    if (
      (fromRole === "murderer" && toRole === "accomplice") ||
      (fromRole === "accomplice" && toRole === "murderer")
    ) {
      return true;
    }

    // その他の組み合わせは、現在のフェーズに依存
    return this.gameState.phase !== "investigation";
  }

  canShareEvidence(fromId: string, toId: string, evidence: Evidence): boolean {
    const fromPlayer = this.gameState.players.get(fromId);
    const toPlayer = this.gameState.players.get(toId);

    if (!fromPlayer || !toPlayer) return false;
    if (!fromPlayer.collectedEvidence.includes(evidence.evidenceId))
      return false;

    // 探偵は常に証拠を共有可能
    if (fromPlayer.role === "detective") return true;

    // フェーズによる制限
    return (
      this.gameState.phase === "discussion" ||
      this.gameState.phase === "final_discussion"
    );
  }

  canVote(playerId: string): boolean {
    const player = this.gameState.players.get(playerId);
    if (!player || !this.isVotingPhase || player.hasVoted) return false;
    return true;
  }

  // ステータス確認実装
  isVotingActive(): boolean {
    return this.isVotingPhase;
  }

  getVoteCount(playerId: string): number {
    return this.voteCount.get(playerId) || 0;
  }

  async getCommunicationHistory(playerId: string): Promise<string[]> {
    return this.messageHistory.get(playerId) || [];
  }

  // プライベートメソッド
  private addToHistory(playerId: string, message: string): void {
    const history = this.messageHistory.get(playerId) || [];
    history.push(`[${new Date().toISOString()}] ${message}`);
    this.messageHistory.set(playerId, history);
  }
}
