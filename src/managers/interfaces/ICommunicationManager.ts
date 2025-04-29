import type { RoleType, PlayerState } from "../../types/GameTypes";
import type { Evidence } from "../../types/EvidenceTypes";

export interface ICommunicationManager {
  // チャットシステム
  sendMessage(fromId: string, toId: string, message: string): Promise<boolean>;
  broadcastMessage(fromId: string, message: string): Promise<boolean>;
  sendNPCMessage(
    npcId: string,
    playerId: string,
    message: string,
  ): Promise<boolean>;

  // 情報共有機能
  shareEvidence(
    fromId: string,
    toId: string,
    evidence: Evidence,
  ): Promise<boolean>;
  shareInvestigationResult(fromId: string, result: string): Promise<boolean>;
  shareAlibi(
    playerId: string,
    alibi: string,
    timestamp: number,
  ): Promise<boolean>;

  // 投票システム
  startVoting(): Promise<boolean>;
  castVote(fromId: string, targetId: string): Promise<boolean>;
  endVoting(): Promise<{ suspect: string; voteCount: number }>;

  // アクセス制御
  canCommunicate(fromRole: RoleType, toRole: RoleType): boolean;
  canShareEvidence(fromId: string, toId: string, evidence: Evidence): boolean;
  canVote(playerId: string): boolean;

  // ステータス確認
  isVotingActive(): boolean;
  getVoteCount(playerId: string): number;
  getCommunicationHistory(playerId: string): Promise<string[]>;
}
