import { Player, world, system, Vector3 } from "@minecraft/server";
import { ScoreboardManager } from "./ScoreboardManager";
import { PhaseManager } from "./PhaseManager";
import { 
  ActionType, 
  type ActionRecord, 
  type ActionFilter, 
  type EvidenceExtractionResult,
  type ActionStatistics,
  type EvidenceData,
  EvidenceCondition
} from "../types/ActionTypes";
import { GamePhase } from "../types/PhaseTypes";
import { getAreaFromCoordinates, getNearestLandmark } from "../constants/AreaConfigs";

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

      // 生活フェーズ中の証拠の場合、詳細データを生成
      if (isEvidence && this.isInDailyLifePhase()) {
        record.evidenceData = this.generateDetailedEvidenceData(player, actionType, data, timestamp);
      }

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

  /**
   * 現在が生活フェーズかどうかをチェック
   */
  private isInDailyLifePhase(): boolean {
    const currentPhase = this.phaseManager.getCurrentPhase();
    return currentPhase === GamePhase.DAILY_LIFE;
  }

  /**
   * 詳細証拠データを生成
   */
  private generateDetailedEvidenceData(
    player: Player, 
    actionType: ActionType, 
    data: Record<string, any>, 
    timestamp: number
  ): EvidenceData {
    const location = player.location;
    const gameDay = this.scoreboardManager.getGameDay();
    
    // 記録条件を判定
    const recordCondition = this.determineRecordCondition(actionType, data);
    
    // 信頼度を計算（目撃者数、プレイヤーの役職、行動タイプに基づく）
    const reliability = this.calculateEvidenceReliability(player, actionType, data);
    
    return {
      when: {
        gameTime: timestamp,
        realTime: this.formatGameTime(timestamp),
        gameDay: gameDay,
        timeOfDay: this.getTimeOfDay(timestamp)
      },
      where: {
        coordinates: {
          x: Math.round(location.x * 100) / 100,
          y: Math.round(location.y * 100) / 100,
          z: Math.round(location.z * 100) / 100
        },
        area: this.identifyArea(location),
        nearbyPlayers: this.getNearbyPlayerNames(player, location),
        landmark: this.findNearestLandmark(location)
      },
      what: {
        primaryAction: actionType,
        details: this.generateActionDescription(actionType, data),
        targetBlock: data.blockType || undefined,
        targetPlayer: data.targetPlayer || undefined,
        itemUsed: data.itemType || undefined,
        taskType: data.taskType || undefined
      },
      recordCondition,
      reliability
    };
  }

  /**
   * 証拠記録条件を判定
   */
  private determineRecordCondition(actionType: ActionType, data: Record<string, any>): EvidenceCondition {
    // タスク完了の場合
    if (actionType === ActionType.TASK_COMPLETE) {
      return EvidenceCondition.TASK_COMPLETION;
    }
    
    // 殺人事件の場合
    if (actionType === ActionType.MURDER || actionType === ActionType.DEATH) {
      return EvidenceCondition.INCIDENT_TIMING;
    }
    
    // エリア移動の場合
    if (actionType === ActionType.AREA_ENTER || actionType === ActionType.AREA_EXIT) {
      return EvidenceCondition.AREA_TRANSITION;
    }
    
    // プレイヤー交流の場合
    if (actionType === ActionType.ENTITY_INTERACT && data.targetPlayer) {
      return EvidenceCondition.INTERACTION;
    }
    
    // その他はランダムタイミング
    return EvidenceCondition.RANDOM_TIMING;
  }

  /**
   * 証拠の信頼度を計算
   */
  private calculateEvidenceReliability(player: Player, actionType: ActionType, data: Record<string, any>): number {
    let baseReliability = 70; // 基本信頼度
    
    // 行動タイプによる調整
    switch (actionType) {
      case ActionType.MURDER:
      case ActionType.DEATH:
        baseReliability = 95; // 殺人・死亡は高信頼度
        break;
      case ActionType.TASK_COMPLETE:
        baseReliability = 85; // タスク完了は高信頼度
        break;
      case ActionType.MOVEMENT:
        baseReliability = 50; // 移動は低信頼度
        break;
    }
    
    // 目撃者数による調整
    const witnessCount = data.witnessCount || 0;
    baseReliability += Math.min(witnessCount * 5, 20); // 最大+20
    
    // プレイヤーの役職による調整
    const role = this.scoreboardManager.getPlayerRole(player);
    if (role === 1) { // MURDERER
      baseReliability -= 10; // 犯人の証拠は信頼度下がる
    } else if (role === 3) { // CITIZEN
      baseReliability += 5; // 市民の証拠は信頼度上がる
    }
    
    return Math.max(0, Math.min(100, baseReliability));
  }

  /**
   * ゲーム時間をフォーマット
   */
  private formatGameTime(timestamp: number): string {
    const totalSeconds = Math.floor(timestamp);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * 時間帯を判定
   */
  private getTimeOfDay(timestamp: number): string {
    const dayProgress = (timestamp % 2400) / 2400; // 1日 = 2400秒と仮定
    
    if (dayProgress < 0.25) return "夜";
    if (dayProgress < 0.5) return "朝";
    if (dayProgress < 0.75) return "昼";
    return "夕";
  }

  /**
   * エリア名を特定
   */
  private identifyArea(location: Vector3): string {
    return getAreaFromCoordinates(location.x, location.z);
  }

  /**
   * 近くのプレイヤー名を取得
   */
  private getNearbyPlayerNames(player: Player, location: Vector3): string[] {
    return world.getAllPlayers()
      .filter(p => p.id !== player.id)
      .filter(p => this.calculateDistance(location, p.location) <= 10)
      .map(p => p.name);
  }

  /**
   * 最寄りのランドマークを検索
   */
  private findNearestLandmark(location: Vector3): string | null {
    return getNearestLandmark(location);
  }

  /**
   * 行動の詳細説明を生成
   */
  private generateActionDescription(actionType: ActionType, data: Record<string, any>): string {
    switch (actionType) {
      case ActionType.BLOCK_BREAK:
        return `${data.blockType || "ブロック"}を破壊した`;
      case ActionType.BLOCK_PLACE:
        return `${data.blockType || "ブロック"}を設置した`;
      case ActionType.ITEM_USE:
        return `${data.itemType || "アイテム"}を使用した`;
      case ActionType.ENTITY_INTERACT:
        return `${data.targetPlayer || "誰か"}と交流した`;
      case ActionType.TASK_COMPLETE:
        return `${data.taskType || "タスク"}を完了した`;
      case ActionType.MURDER:
        return `${data.victimName || "誰か"}を殺害した`;
      case ActionType.DEATH:
        return `${data.killerName || "誰か"}により死亡した`;
      case ActionType.MOVEMENT:
        return `${data.fromArea || ""}から移動した`;
      case ActionType.CHAT:
        return `チャットで発言した: "${data.message || ""}"`;
      case ActionType.ABILITY_USE:
        return `${data.abilityName || "特殊能力"}を使用した`;
      default:
        return `${actionType}を実行した`;
    }
  }

  /**
   * 距離計算（Vector3 | {x, y, z}両方に対応）
   */
  private calculateDistance(pos1: Vector3 | {x: number, y: number, z: number}, pos2: Vector3 | {x: number, y: number, z: number}): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}