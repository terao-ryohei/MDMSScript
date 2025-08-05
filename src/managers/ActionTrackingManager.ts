import { Player, world, system, Vector3 } from "@minecraft/server";
import { ScoreboardManager } from "./ScoreboardManager";
import { PhaseManager } from "./PhaseManager";
import { 
  ActionType, 
  type ActionRecord, 
  type ActionFilter, 
  type EvidenceExtractionResult,
  type ActionStatistics 
} from "../types/ActionTypes";
import { GamePhase } from "../types/PhaseTypes";

/**
 * プレイヤー行動追跡マネージャー
 * ScriptEventベースで全プレイヤーの行動を記録・管理
 */
export class ActionTrackingManager {
  private static instance: ActionTrackingManager;
  private scoreboardManager: ScoreboardManager;
  private phaseManager: PhaseManager;
  
  private actionRecords: ActionRecord[] = [];
  private gameStartTime: number = 0;
  private isTracking: boolean = false;
  private recordCounter: number = 0;

  private constructor() {
    this.scoreboardManager = ScoreboardManager.getInstance();
    this.phaseManager = PhaseManager.getInstance();
    this.setupEventListeners();
  }

  public static getInstance(): ActionTrackingManager {
    if (!ActionTrackingManager.instance) {
      ActionTrackingManager.instance = new ActionTrackingManager();
    }
    return ActionTrackingManager.instance;
  }

  /**
   * 行動追跡を開始
   */
  public startTracking(): void {
    this.isTracking = true;
    this.gameStartTime = Date.now();
    this.actionRecords = [];
    this.recordCounter = 0;
    console.log("Action tracking started");
  }

  /**
   * 行動追跡を停止
   */
  public stopTracking(): void {
    this.isTracking = false;
    console.log(`Action tracking stopped. Total records: ${this.actionRecords.length}`);
  }

  /**
   * 行動記録を追加
   */
  public recordAction(
    player: Player,
    actionType: ActionType,
    data: Record<string, any> = {},
    isEvidence: boolean = true
  ): string | null {
    if (!this.isTracking) return null;

    try {
      const timestamp = this.getGameTime();
      const phaseId = this.convertPhaseToId(this.phaseManager.getCurrentPhase());
      const location = player.location;
      const witnessIds = this.findWitnesses(player, location);

      const record: ActionRecord = {
        id: `action_${this.recordCounter++}`,
        playerId: player.id,
        playerName: player.name,
        actionType,
        timestamp,
        phaseId,
        location: {
          x: Math.round(location.x * 100) / 100,
          y: Math.round(location.y * 100) / 100,
          z: Math.round(location.z * 100) / 100,
          dimension: player.dimension.id
        },
        data,
        isEvidence,
        witnessIds
      };

      this.actionRecords.push(record);

      // ScriptEventで他のシステムに通知
      system.run(() => {
        world.getDimension("overworld").runCommand(
          `scriptevent mdms:action_recorded {"actionId":"${record.id}","actionType":"${actionType}","playerId":"${player.id}"}`
        );
      });

      console.log(`Recorded action: ${actionType} by ${player.name} at ${timestamp}`);
      return record.id;

    } catch (error) {
      console.error("Failed to record action:", error);
      return null;
    }
  }

  /**
   * フェーズベース証拠抽出
   */
  public extractEvidenceFromPhase(phase: GamePhase): EvidenceExtractionResult {
    try {
      const phaseId = this.convertPhaseToId(phase);
      const phaseActions = this.actionRecords.filter(record => record.phaseId === phaseId);
      const evidence = phaseActions.filter(record => record.isEvidence);

      const timeRange = this.getPhaseTimeRange(phaseId);

      return {
        success: true,
        evidence,
        totalActions: phaseActions.length,
        filteredActions: evidence.length,
        timeRange
      };

    } catch (error) {
      console.error(`Failed to extract evidence from phase ${phase}:`, error);
      return {
        success: false,
        evidence: [],
        totalActions: 0,
        filteredActions: 0,
        timeRange: { start: 0, end: 0 },
        error: error instanceof Error ? error.message : "不明なエラー"
      };
    }
  }

  /**
   * 生活フェーズ内証拠抽出
   */
  public extractEvidenceFromDailyLife(): EvidenceExtractionResult {
    return this.extractEvidenceFromPhase(GamePhase.DAILY_LIFE);
  }

  /**
   * フィルター条件に基づく行動検索
   */
  public searchActions(filter: ActionFilter): ActionRecord[] {
    try {
      return this.actionRecords.filter(record => {
        // プレイヤーIDフィルター
        if (filter.playerId && record.playerId !== filter.playerId) {
          return false;
        }

        // 行動タイプフィルター
        if (filter.actionType && record.actionType !== filter.actionType) {
          return false;
        }

        // フェーズIDフィルター
        if (filter.phaseId !== undefined && record.phaseId !== filter.phaseId) {
          return false;
        }

        // 時間範囲フィルター
        if (filter.startTime !== undefined && record.timestamp < filter.startTime) {
          return false;
        }
        if (filter.endTime !== undefined && record.timestamp > filter.endTime) {
          return false;
        }

        // 証拠フィルター
        if (filter.isEvidence !== undefined && record.isEvidence !== filter.isEvidence) {
          return false;
        }

        // 位置フィルター
        if (filter.location) {
          const distance = this.calculateDistance(record.location, filter.location);
          if (distance > filter.location.radius) {
            return false;
          }
        }

        return true;
      });

    } catch (error) {
      console.error("Failed to search actions:", error);
      return [];
    }
  }

  /**
   * プレイヤーの行動履歴を取得
   */
  public getPlayerActions(playerId: string, limit?: number): ActionRecord[] {
    const playerActions = this.actionRecords
      .filter(record => record.playerId === playerId)
      .sort((a, b) => b.timestamp - a.timestamp);

    return limit ? playerActions.slice(0, limit) : playerActions;
  }

  /**
   * 行動統計を取得
   */
  public getActionStatistics(): ActionStatistics {
    const actionsByType = new Map<ActionType, number>();
    const actionsByPlayer = new Map<string, number>();
    const actionsByPhase = new Map<number, number>();

    let evidenceCount = 0;
    let minTime = Infinity;
    let maxTime = -Infinity;

    for (const record of this.actionRecords) {
      // タイプ別統計
      actionsByType.set(record.actionType, (actionsByType.get(record.actionType) || 0) + 1);
      
      // プレイヤー別統計
      actionsByPlayer.set(record.playerId, (actionsByPlayer.get(record.playerId) || 0) + 1);
      
      // フェーズ別統計
      actionsByPhase.set(record.phaseId, (actionsByPhase.get(record.phaseId) || 0) + 1);
      
      // 証拠カウント
      if (record.isEvidence) evidenceCount++;
      
      // 時間範囲
      minTime = Math.min(minTime, record.timestamp);
      maxTime = Math.max(maxTime, record.timestamp);
    }

    return {
      totalActions: this.actionRecords.length,
      actionsByType,
      actionsByPlayer,
      actionsByPhase,
      evidenceCount,
      timeRange: {
        start: minTime === Infinity ? 0 : minTime,
        end: maxTime === -Infinity ? 0 : maxTime
      }
    };
  }

  /**
   * 特定行動の目撃者を取得
   */
  public getActionWitnesses(actionId: string): Player[] {
    const record = this.actionRecords.find(r => r.id === actionId);
    if (!record) return [];

    return record.witnessIds
      .map(id => world.getAllPlayers().find(p => p.id === id))
      .filter(p => p !== undefined) as Player[];
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    // チャットイベント（APIに存在しない場合はコメントアウト）
    // world.beforeEvents.chatSend.subscribe((event: any) => {
    //   if (this.isTracking) {
    //     this.recordAction(event.sender, ActionType.CHAT, {
    //       message: event.message
    //     });
    //   }
    // });

    // ブロック破壊イベント
    world.beforeEvents.playerBreakBlock.subscribe((event: any) => {
      if (this.isTracking) {
        this.recordAction(event.player, ActionType.BLOCK_BREAK, {
          blockType: event.block.typeId,
          location: event.block.location
        });
      }
    });

    // ブロック設置イベント（イベントが存在しない場合はコメントアウト）
    // world.beforeEvents.playerPlaceBlock.subscribe((event: any) => {
    //   if (this.isTracking) {
    //     this.recordAction(event.player, ActionType.BLOCK_PLACE, {
    //       blockType: event.block.typeId,
    //       location: event.block.location
    //     });
    //   }
    // });

    // アイテム使用イベント
    world.afterEvents.itemUse.subscribe((event) => {
      if (this.isTracking) {
        this.recordAction(event.source, ActionType.ITEM_USE, {
          itemType: event.itemStack.typeId,
          amount: event.itemStack.amount
        });
      }
    });

    // エンティティヒットイベント（攻撃）
    world.afterEvents.entityHitEntity.subscribe((event) => {
      if (this.isTracking && event.damagingEntity?.typeId === "minecraft:player" && event.hitEntity?.typeId === "minecraft:player") {
        const attacker = event.damagingEntity as Player;
        const victim = event.hitEntity as Player;
        
        this.recordAction(attacker, ActionType.ENTITY_INTERACT, {
          targetId: victim.id,
          targetName: victim.name,
          interactionType: "attack"
        });
      }
    });

    // プレイヤー死亡イベント
    world.afterEvents.entityDie.subscribe((event) => {
      if (this.isTracking && event.deadEntity?.typeId === "minecraft:player") {
        const player = event.deadEntity as Player;
        this.recordAction(player, ActionType.DEATH, {
          cause: event.damageSource.cause
        });
      }
    });

    // カスタムScriptEvent処理
    system.afterEvents.scriptEventReceive.subscribe((event) => {
      if (!this.isTracking) return;

      if (event.id === "mdms:murder") {
        const data = JSON.parse(event.message || "{}");
        const murderer = world.getAllPlayers().find(p => p.id === data.murdererId);
        const victim = world.getAllPlayers().find(p => p.id === data.victimId);
        
        if (murderer && victim) {
          this.recordAction(murderer, ActionType.MURDER, {
            victimId: victim.id,
            victimName: victim.name,
            method: data.method || "unknown"
          }, true);
        }
      }

      if (event.id === "mdms:ability_use") {
        const data = JSON.parse(event.message || "{}");
        const player = world.getAllPlayers().find(p => p.id === data.playerId);
        
        if (player) {
          this.recordAction(player, ActionType.ABILITY_USE, {
            abilityId: data.abilityId,
            targetId: data.targetId,
            result: data.result
          }, true);
        }
      }

      if (event.id === "mdms:task_complete") {
        const data = JSON.parse(event.message || "{}");
        const player = world.getAllPlayers().find(p => p.id === data.playerId);
        
        if (player) {
          this.recordAction(player, ActionType.TASK_COMPLETE, {
            taskId: data.taskId,
            taskName: data.taskName,
            duration: data.duration
          });
        }
      }
    });
  }

  /**
   * 目撃者を検索
   */
  private findWitnesses(actor: Player, location: Vector3, radius: number = 10): string[] {
    try {
      return world.getAllPlayers()
        .filter(player => {
          if (player.id === actor.id) return false;
          
          const distance = this.calculateDistance(
            location,
            { x: player.location.x, y: player.location.y, z: player.location.z }
          );
          
          return distance <= radius;
        })
        .map(player => player.id);

    } catch (error) {
      console.error("Failed to find witnesses:", error);
      return [];
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
   * ゲーム時間を取得（開始からの秒数）
   */
  private getGameTime(): number {
    return Math.floor((Date.now() - this.gameStartTime) / 1000);
  }

  /**
   * フェーズの時間範囲を取得
   */
  private getPhaseTimeRange(phaseId: number): { start: number; end: number } {
    // 実装は簡略化。実際にはPhaseManagerと連携して正確な時間を取得
    const phaseActions = this.actionRecords.filter(record => record.phaseId === phaseId);
    
    if (phaseActions.length === 0) {
      return { start: 0, end: 0 };
    }

    const timestamps = phaseActions.map(action => action.timestamp);
    return {
      start: Math.min(...timestamps),
      end: Math.max(...timestamps)
    };
  }

  /**
   * 全記録をクリア
   */
  public clearAllRecords(): void {
    this.actionRecords = [];
    this.recordCounter = 0;
    console.log("All action records cleared");
  }

  /**
   * フェーズをIDに変換
   */
  private convertPhaseToId(phase: GamePhase): number {
    // 文字列としてのフェーズ値も対応
    switch (phase) {
      case GamePhase.PREPARATION:
        return 0;
      case GamePhase.DAILY_LIFE:
        return 1;
      case GamePhase.INVESTIGATION:
        return 2;
      case GamePhase.DISCUSSION:
        return 3;
      case GamePhase.REINVESTIGATION:
        return 4;
      case GamePhase.DEDUCTION:
        return 5;
      case GamePhase.VOTING:
        return 6;
      case GamePhase.ENDING:
        return 7;
      default:
        console.warn(`Unknown phase: ${phase}, defaulting to 0`);
        return 0;
    }
  }

  /**
   * デバッグ用：記録統計を出力
   */
  public debugActionRecords(): void {
    console.log("=== Action Records Debug ===");
    const stats = this.getActionStatistics();
    
    console.log(`Total actions: ${stats.totalActions}`);
    console.log(`Evidence count: ${stats.evidenceCount}`);
    console.log(`Time range: ${stats.timeRange.start} - ${stats.timeRange.end}`);
    
    console.log("Actions by type:");
    for (const [type, count] of stats.actionsByType.entries()) {
      console.log(`  ${type}: ${count}`);
    }
    
    console.log("Actions by player:");
    for (const [playerId, count] of stats.actionsByPlayer.entries()) {
      const player = world.getAllPlayers().find(p => p.id === playerId);
      const playerName = player ? player.name : "Unknown";
      console.log(`  ${playerName} (${playerId}): ${count}`);
    }
    
    console.log("=== End Action Records Debug ===");
  }
}