import type { Role } from "src/types/RoleTypes";
import type { Evidence } from "../../types/EvidenceTypes";
import type { Player } from "@minecraft/server";

export interface ICommunicationManager {
  // 情報共有機能
  shareEvidence(from: Player, to: Player, evidence: Evidence): Promise<boolean>;
  shareInvestigationResult(from: Player, result: string): Promise<boolean>;
  shareAlibi(
    player: Player,
    alibi: string,
    timestamp: number,
  ): Promise<boolean>;

  // 投票システム
  startVoting(): Promise<boolean>;
  castVote(from: Player, target: Player): Promise<boolean>;
  endVoting(): Promise<{ suspect: Player | null; voteCount: number }>;

  // アクセス制御
  canCommunicate(fromRole: Role, toRole: Role): boolean;
  canShareEvidence(from: Player, to: Player, evidence: Evidence): boolean;
  canVote(player: Player): boolean;

  // ステータス確認
  isVotingActive(): boolean;
  getVoteCount(player: Player): number;
  getCommunicationHistory(player: Player): Promise<string[]>;
}
