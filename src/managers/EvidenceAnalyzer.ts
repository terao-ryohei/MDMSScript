import { Player, world } from "@minecraft/server";
import { ActionTrackingManager } from "./ActionTrackingManager";
import { ScoreboardManager } from "./ScoreboardManager";
import { RoleAssignmentManager } from "./RoleAssignmentManager";
import { JobAssignmentManager } from "./JobAssignmentManager";
import { 
  ActionType, 
  type ActionRecord, 
  type ActionFilter,
  type EvidenceExtractionResult 
} from "../types/ActionTypes";
import { RoleType } from "../types/RoleTypes";
import { GamePhase } from "../types/PhaseTypes";

/**
 * 証拠分析マネージャー
 * ActionTrackingManagerと連携して証拠の信頼性分析と推理支援を提供
 */
export class EvidenceAnalyzer {
  private static instance: EvidenceAnalyzer;
  private actionTrackingManager: ActionTrackingManager;
  private scoreboardManager: ScoreboardManager;
  private roleAssignmentManager: RoleAssignmentManager;
  private jobAssignmentManager: JobAssignmentManager;

  private constructor() {
    this.actionTrackingManager = ActionTrackingManager.getInstance();
    this.scoreboardManager = ScoreboardManager.getInstance();
    this.roleAssignmentManager = RoleAssignmentManager.getInstance();
    this.jobAssignmentManager = JobAssignmentManager.getInstance();
  }

  public static getInstance(): EvidenceAnalyzer {
    if (!EvidenceAnalyzer.instance) {
      EvidenceAnalyzer.instance = new EvidenceAnalyzer();
    }
    return EvidenceAnalyzer.instance;
  }

  /**
   * プレイヤーの証拠信頼性を計算
   */
  public calculateEvidenceReliability(player: Player, evidence: ActionRecord): number {
    try {
      let reliability = 0.5; // ベース信頼性50%

      // ロールによる補正
      const role = this.roleAssignmentManager.getPlayerRole(player);
      if (role === RoleType.CITIZEN) {
        reliability += 0.1; // 一般人は信頼性+10%
      } else if (role === RoleType.ACCOMPLICE) {
        reliability -= 0.2; // 共犯者は信頼性-20%
      } else if (role === RoleType.MURDERER) {
        reliability -= 0.3; // 犯人は信頼性-30%
      }

      // ジョブによる補正
      const job = this.jobAssignmentManager.getPlayerJob(player);
      if (job) {
        const abilityId = this.jobAssignmentManager.getPlayerJobAbility(player);
        switch (abilityId) {
          case "appraisal": // 鍛冶屋の鑑定能力
            reliability += 0.15;
            break;
          case "divination": // 魔術師の占い能力
            reliability += 0.1;
            break;
          case "information_network": // ギルド受付の情報網
            reliability += 0.05;
            break;
        }
      }

      // 目撃者数による補正
      const witnessCount = evidence.witnessIds.length;
      reliability += Math.min(witnessCount * 0.05, 0.2); // 目撃者1人あたり+5%、最大+20%

      // 証拠タイプによる補正
      switch (evidence.actionType) {
        case ActionType.MURDER:
          reliability += 0.3; // 殺人は高い信頼性
          break;
        case ActionType.DEATH:
          reliability += 0.25;
          break;
        case ActionType.CHAT:
          reliability -= 0.1; // チャットは信頼性が低い
          break;
        case ActionType.MOVEMENT:
          reliability -= 0.15;
          break;
      }

      // 時間経過による補正（記憶の劣化）
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = currentTime - evidence.timestamp;
      const hoursPassed = timeDiff / 3600;
      reliability -= Math.min(hoursPassed * 0.02, 0.3); // 1時間あたり-2%、最大-30%

      return Math.max(0, Math.min(1, reliability));

    } catch (error) {
      console.error("Failed to calculate evidence reliability:", error);
      return 0.5; // エラー時はデフォルト値
    }
  }

  /**
   * 証拠の矛盾を検出
   */
  public detectContradictions(evidence: ActionRecord[]): Array<{
    evidence1: ActionRecord;
    evidence2: ActionRecord;
    contradictionType: string;
    severity: number;
  }> {
    const contradictions = [];

    for (let i = 0; i < evidence.length; i++) {
      for (let j = i + 1; j < evidence.length; j++) {
        const e1 = evidence[i];
        const e2 = evidence[j];

        // 同一プレイヤーの同時刻での異なる場所での行動
        if (e1.playerId === e2.playerId && 
            Math.abs(e1.timestamp - e2.timestamp) < 30 && // 30秒以内
            this.calculateDistance(e1.location, e2.location) > 50) { // 50ブロック以上離れている
          
          contradictions.push({
            evidence1: e1,
            evidence2: e2,
            contradictionType: "impossible_movement",
            severity: 0.8
          });
        }

        // 死亡後の行動
        if (e1.actionType === ActionType.DEATH && 
            e2.playerId === e1.playerId && 
            e2.timestamp > e1.timestamp) {
          
          contradictions.push({
            evidence1: e1,
            evidence2: e2,
            contradictionType: "action_after_death",
            severity: 1.0
          });
        }

        // 同一場所での異なる証言
        if (e1.actionType === ActionType.CHAT && 
            e2.actionType === ActionType.CHAT &&
            e1.playerId !== e2.playerId &&
            Math.abs(e1.timestamp - e2.timestamp) < 60 &&
            this.calculateDistance(e1.location, e2.location) < 10) {
          
          contradictions.push({
            evidence1: e1,
            evidence2: e2,
            contradictionType: "conflicting_testimony",
            severity: 0.6
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * プレイヤーのアリバイを分析
   */
  public analyzeAlibi(playerId: string, timeRange: { start: number; end: number }): {
    hasAlibi: boolean;
    alibiStrength: number;
    alibiDetails: ActionRecord[];
    witnesses: string[];
  } {
    try {
      const playerActions = this.actionTrackingManager.searchActions({
        playerId,
        startTime: timeRange.start,
        endTime: timeRange.end
      });

      if (playerActions.length === 0) {
        return {
          hasAlibi: false,
          alibiStrength: 0,
          alibiDetails: [],
          witnesses: []
        };
      }

      // 目撃者を収集
      const witnesses = new Set<string>();
      for (const action of playerActions) {
        action.witnessIds.forEach(id => witnesses.add(id));
      }

      // アリバイの強度を計算
      let alibiStrength = 0;
      
      // 継続的な活動の証拠
      const timeSpan = timeRange.end - timeRange.start;
      const coverageRatio = (playerActions[playerActions.length - 1].timestamp - playerActions[0].timestamp) / timeSpan;
      alibiStrength += coverageRatio * 0.4;

      // 目撃者数
      alibiStrength += Math.min(witnesses.size * 0.1, 0.3);

      // 行動の種類の多様性
      const actionTypes = new Set(playerActions.map(a => a.actionType));
      alibiStrength += Math.min(actionTypes.size * 0.05, 0.2);

      // 他のプレイヤーとの交流
      const interactions = playerActions.filter(a => 
        a.actionType === ActionType.CHAT || 
        a.actionType === ActionType.ENTITY_INTERACT
      );
      alibiStrength += Math.min(interactions.length * 0.02, 0.1);

      return {
        hasAlibi: alibiStrength > 0.3,
        alibiStrength: Math.min(alibiStrength, 1.0),
        alibiDetails: playerActions,
        witnesses: Array.from(witnesses)
      };

    } catch (error) {
      console.error("Failed to analyze alibi:", error);
      return {
        hasAlibi: false,
        alibiStrength: 0,
        alibiDetails: [],
        witnesses: []
      };
    }
  }

  /**
   * 容疑者スコアを計算
   */
  public calculateSuspicionScore(playerId: string): number {
    try {
      let suspicion = 0;

      // ロールによる基本スコア
      const player = this.getPlayerById(playerId);
      if (!player) return 0;

      const role = this.roleAssignmentManager.getPlayerRole(player);
      if (role === RoleType.MURDERER) {
        suspicion += 1.0; // 実際の犯人（デバッグ用）
      } else if (role === RoleType.ACCOMPLICE) {
        suspicion += 0.3; // 共犯者は多少怪しい
      }

      // 殺人現場付近での行動
      const murderActions = this.actionTrackingManager.searchActions({
        actionType: ActionType.MURDER
      });

      for (const murderAction of murderActions) {
        const nearbyActions = this.actionTrackingManager.searchActions({
          playerId,
          location: {
            x: murderAction.location.x,
            y: murderAction.location.y,
            z: murderAction.location.z,
            radius: 20
          },
          startTime: murderAction.timestamp - 300, // 5分前
          endTime: murderAction.timestamp + 300   // 5分後
        });

        if (nearbyActions.length > 0) {
          suspicion += 0.4;
        }
      }

      // 怪しい行動パターン
      const playerActions = this.actionTrackingManager.getPlayerActions(playerId);
      
      // 深夜の活動
      const nightActions = playerActions.filter(a => {
        const hour = (a.timestamp / 3600) % 24;
        return hour >= 22 || hour <= 6;
      });
      suspicion += Math.min(nightActions.length * 0.05, 0.2);

      // 孤立した行動（目撃者が少ない）
      const isolatedActions = playerActions.filter(a => a.witnessIds.length === 0);
      suspicion += Math.min(isolatedActions.length * 0.02, 0.15);

      // アリバイの弱さ
      const crimeTime = this.estimateCrimeTime();
      if (crimeTime) {
        const alibi = this.analyzeAlibi(playerId, {
          start: crimeTime - 300,
          end: crimeTime + 300
        });
        suspicion += (1 - alibi.alibiStrength) * 0.3;
      }

      return Math.min(suspicion, 1.0);

    } catch (error) {
      console.error("Failed to calculate suspicion score:", error);
      return 0;
    }
  }

  /**
   * 証拠に基づく推理レポートを生成
   */
  public generateDeductionReport(): {
    suspectRanking: Array<{
      playerId: string;
      playerName: string;
      suspicionScore: number;
      reasons: string[];
    }>;
    keyEvidence: ActionRecord[];
    contradictions: any[];
    summary: string;
  } {
    try {
      const allPlayers = this.getAllPlayers();
      const suspects = allPlayers.map(player => {
        const suspicionScore = this.calculateSuspicionScore(player.id);
        const reasons = this.getSuspicionReasons(player.id);
        
        return {
          playerId: player.id,
          playerName: player.name,
          suspicionScore,
          reasons
        };
      }).sort((a, b) => b.suspicionScore - a.suspicionScore);

      const evidence = this.actionTrackingManager.extractEvidenceFromDailyLife().evidence;
      const keyEvidence = evidence
        .filter(e => e.actionType === ActionType.MURDER || e.actionType === ActionType.DEATH)
        .slice(0, 10);

      const contradictions = this.detectContradictions(evidence);

      const topSuspect = suspects[0];
      const summary = `最有力容疑者: ${topSuspect.playerName} (疑惑度: ${Math.round(topSuspect.suspicionScore * 100)}%)。` +
                     `重要証拠 ${keyEvidence.length}件、矛盾 ${contradictions.length}件を発見。`;

      return {
        suspectRanking: suspects,
        keyEvidence,
        contradictions,
        summary
      };

    } catch (error) {
      console.error("Failed to generate deduction report:", error);
      return {
        suspectRanking: [],
        keyEvidence: [],
        contradictions: [],
        summary: "推理レポートの生成に失敗しました。"
      };
    }
  }

  /**
   * 距離計算
   */
  private calculateDistance(pos1: { x: number; y: number; z: number }, pos2: { x: number; y: number; z: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 事件発生時刻を推定
   */
  private estimateCrimeTime(): number | null {
    const murderActions = this.actionTrackingManager.searchActions({
      actionType: ActionType.MURDER
    });

    if (murderActions.length > 0) {
      return murderActions[0].timestamp;
    }

    const deathActions = this.actionTrackingManager.searchActions({
      actionType: ActionType.DEATH
    });

    if (deathActions.length > 0) {
      return deathActions[0].timestamp;
    }

    return null;
  }

  /**
   * プレイヤーIDからプレイヤーオブジェクトを取得
   */
  private getPlayerById(playerId: string): Player | null {
    return this.getAllPlayers().find(p => p.id === playerId) || null;
  }

  /**
   * 全プレイヤーを取得
   */
  private getAllPlayers(): Player[] {
    return Array.from(world.getAllPlayers());
  }

  /**
   * 疑惑の理由を取得
   */
  private getSuspicionReasons(playerId: string): string[] {
    const reasons: string[] = [];
    
    const player = this.getPlayerById(playerId);
    if (!player) return reasons;

    // 殺人現場付近での行動チェック
    const murderActions = this.actionTrackingManager.searchActions({
      actionType: ActionType.MURDER
    });

    for (const murderAction of murderActions) {
      const nearbyActions = this.actionTrackingManager.searchActions({
        playerId,
        location: {
          x: murderAction.location.x,
          y: murderAction.location.y,
          z: murderAction.location.z,
          radius: 20
        },
        startTime: murderAction.timestamp - 300,
        endTime: murderAction.timestamp + 300
      });

      if (nearbyActions.length > 0) {
        reasons.push("事件現場付近での行動を確認");
      }
    }

    // アリバイの弱さチェック
    const crimeTime = this.estimateCrimeTime();
    if (crimeTime) {
      const alibi = this.analyzeAlibi(playerId, {
        start: crimeTime - 300,
        end: crimeTime + 300
      });
      
      if (alibi.alibiStrength < 0.3) {
        reasons.push("事件時刻のアリバイが不十分");
      }
    }

    // 目撃者の少なさ
    const playerActions = this.actionTrackingManager.getPlayerActions(playerId, 20);
    const isolatedActions = playerActions.filter(a => a.witnessIds.length === 0);
    if (isolatedActions.length > playerActions.length * 0.5) {
      reasons.push("単独行動が多い");
    }

    return reasons;
  }
}