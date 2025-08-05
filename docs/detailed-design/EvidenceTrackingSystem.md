# 証拠記録・調査システム詳細設計

## 1. システム概要

生活フェーズ中のプレイヤー行動をScriptEventで自動記録し、事件発覚時に証拠として提供するシステム。

## 2. 証拠記録システム（ScriptEvent基盤）

### 2.1 記録対象行動

```typescript
enum TrackableAction {
  MOVEMENT = "movement",           // 移動
  ITEM_USE = "item_use",          // アイテム使用
  BLOCK_BREAK = "block_break",    // ブロック破壊
  BLOCK_PLACE = "block_place",    // ブロック設置
  ENTITY_INTERACT = "entity_interact", // エンティティ操作
  CHAT_MESSAGE = "chat_message",  // チャット発言
  ABILITY_USE = "ability_use",    // 能力使用
  TASK_COMPLETE = "task_complete", // タスク完了
  AREA_ENTER = "area_enter",      // エリア侵入
  AREA_EXIT = "area_exit"         // エリア退出
}
```

### 2.2 ScriptEvent実装

```typescript
interface EvidenceEvent {
  eventId: string;
  playerId: string;
  action: TrackableAction;
  timestamp: number;
  gameDay: number;
  gameTime: string; // "morning", "afternoon", "evening", "night"
  location: Vector3;
  details: ActionDetails;
  witnesses: string[]; // 目撃者リスト（半径10ブロック内）
}

class EvidenceTracker {
  private events: EvidenceEvent[] = [];
  
  public trackAction(
    player: Player, 
    action: TrackableAction, 
    details: ActionDetails
  ): void {
    // ScriptEventを発火
    system.run(() => {
      world.getDimension("overworld").runCommand(
        `scriptevent mdms:evidence_log ${JSON.stringify({
          playerId: player.id,
          action,
          timestamp: system.currentTick,
          location: player.location,
          details
        })}`
      );
    });
  }
}
```

### 2.3 証拠データ構造

```typescript
interface Evidence {
  id: string;
  type: EvidenceType;
  source: EvidenceSource;
  timestamp: number;
  location: Vector3;
  involvedPlayers: string[];
  description: string;
  reliability: number; // 0.0-1.0
  isPhysical: boolean; // 物理的証拠かどうか
  discoverable: boolean; // 調査フェーズで発見可能か
  metadata: EvidenceMetadata;
}

enum EvidenceType {
  WITNESS_TESTIMONY = "witness",    // 目撃証言
  PHYSICAL_OBJECT = "physical",     // 物理的証拠
  TRACE_EVIDENCE = "trace",         // 痕跡証拠
  BEHAVIORAL = "behavioral",        // 行動パターン
  COMMUNICATION = "communication"   // 会話記録
}

enum EvidenceSource {
  AUTOMATIC_LOG = "auto",      // 自動記録
  PLAYER_REPORT = "player",    // プレイヤー報告
  INVESTIGATION = "investigate", // 調査で発見
  ABILITY_REVEALED = "ability"  // 能力で発見
}
```

## 3. 3日間生活サイクル管理

### 3.1 時間管理システム

```typescript
interface GameTimeSystem {
  currentDay: number; // 1-3
  currentTime: TimeOfDay;
  timeScale: number; // 実時間に対するゲーム時間の倍率
}

enum TimeOfDay {
  MORNING = "morning",     // 6:00-12:00
  AFTERNOON = "afternoon", // 12:00-18:00
  EVENING = "evening",     // 18:00-22:00
  NIGHT = "night"          // 22:00-6:00
}

class DayNightCycle {
  private currentGameTime: number = 0;
  private readonly DAY_LENGTH = 24000; // マイクラの1日
  private readonly REAL_DAY_LENGTH = 300; // 実際の5分を1日に
  
  public getCurrentTimeOfDay(): TimeOfDay {
    const timePercent = (this.currentGameTime % this.DAY_LENGTH) / this.DAY_LENGTH;
    if (timePercent < 0.25) return TimeOfDay.MORNING;
    if (timePercent < 0.5) return TimeOfDay.AFTERNOON;
    if (timePercent < 0.75) return TimeOfDay.EVENING;
    return TimeOfDay.NIGHT;
  }
}
```

### 3.2 タスクシステム

```typescript
interface JobTask {
  id: string;
  jobId: string;
  name: string;
  description: string;
  requiredTime: TimeOfDay[];
  location: string;
  completionConditions: TaskCondition[];
  rewards: TaskReward[];
}

interface TaskCondition {
  type: "item_use" | "location_visit" | "player_interact" | "time_spent";
  parameters: Record<string, any>;
}

class TaskManager {
  public generateDailyTasks(job: Job, day: number): JobTask[] {
    const baseTasks = job.dailyTasks;
    return baseTasks.map(task => ({
      ...task,
      id: `${job.id}_day${day}_${task.id}`,
      requiredTime: this.adjustTaskTiming(task.requiredTime, day)
    }));
  }
}
```

## 4. 事件発生システム

### 4.1 犯行実行メカニズム

```typescript
class MurderSystem {
  public executeMurder(murderer: Player, target: Player): MurderResult {
    // 距離チェック（半径4ブロック）
    if (this.getDistance(murderer.location, target.location) > 4) {
      return { success: false, reason: "Target too far" };
    }
    
    // 証拠生成
    this.generateMurderEvidence(murderer, target);
    
    // 目撃者チェック
    const witnesses = this.findWitnesses(murderer.location);
    
    // 事件記録
    this.recordMurderEvent({
      murderer: murderer.id,
      victim: target.id,
      timestamp: system.currentTick,
      location: target.location,
      witnesses: witnesses.map(w => w.id),
      method: "unknown" // プレイヤーが後で推理
    });
    
    return { success: true, eventId: this.generateEventId() };
  }
  
  private generateMurderEvidence(murderer: Player, victim: Player): void {
    // 物理的証拠をマップに配置
    this.placePhysicalEvidence([
      { type: "blood_stain", location: victim.location },
      { type: "weapon_trace", location: murderer.location },
      { type: "struggle_marks", location: this.getMidpoint(murderer.location, victim.location) }
    ]);
  }
}
```

### 4.2 事件報告システム

```typescript
interface CrimeReportItem {
  typeId: "mdms:crime_report_bell";
  name: "事件報告の鐘";
  description: "事件を発見した時に使用";
}

class CrimeReportHandler {
  public handleCrimeReport(reporter: Player): void {
    // 現在時刻で生活フェーズ終了
    this.endDailyLifePhase();
    
    // 証拠抽出（それまでの生活フェーズ内）
    const relevantEvidence = this.extractRelevantEvidence(
      this.dailyLifePhaseStartTime, 
      this.currentCrimeTime
    );
    
    // 各プレイヤーに個人証拠配布
    this.distributePersonalEvidence(relevantEvidence);
    
    // 調査フェーズ開始
    this.startInvestigationPhase();
  }
}
```

## 5. 証拠抽出・配布システム

### 5.1 個人証拠抽出

```typescript
class PersonalEvidenceExtractor {
  public extractPlayerEvidence(
    playerId: string, 
    phaseStartTime: number,
    crimeTime: number
  ): PersonalEvidence {
    const playerEvents = this.getPlayerEvents(playerId);
    
    // 生活フェーズ開始から事件発生までの期間を対象
    const relevantEvents = playerEvents.filter(event => 
      event.timestamp >= phaseStartTime && event.timestamp <= crimeTime
    );
    
    return {
      playerId,
      timelineEvents: this.createTimeline(relevantEvents),
      locationHistory: this.extractLocationHistory(relevantEvents),
      interactions: this.extractInteractions(relevantEvents),
      suspiciousActivities: this.detectSuspiciousActivities(relevantEvents)
    };
  }
  
  private detectSuspiciousActivities(events: EvidenceEvent[]): SuspiciousActivity[] {
    return events
      .filter(event => this.isSuspicious(event))
      .map(event => ({
        type: this.categorizeActivity(event),
        timestamp: event.timestamp,
        description: this.generateDescription(event),
        severity: this.calculateSeverity(event)
      }));
  }
}
```

### 5.2 証拠UI表示

```typescript
interface EvidenceUI {
  displayPersonalTimeline(player: Player, evidence: PersonalEvidence): void;
  displayPhysicalEvidence(player: Player, evidence: PhysicalEvidence[]): void;
  displayWitnessAccounts(player: Player, accounts: WitnessAccount[]): void;
}

class EvidenceUIManager {
  public showEvidenceToPlayer(player: Player): void {
    const form = new ActionFormData()
      .title("§l§6あなたの証拠資料")
      .body("事件発生時刻周辺のあなたの行動記録です");
    
    const evidence = this.getPlayerEvidence(player.id);
    
    form.button("§e行動履歴", "textures/items/clock");
    form.button("§a目撃情報", "textures/items/ender_eye");
    form.button("§c所持品記録", "textures/items/chest");
    
    form.show(player).then(result => {
      if (result.selection === 0) this.showActionHistory(player, evidence);
      if (result.selection === 1) this.showWitnessInfo(player, evidence);
      if (result.selection === 2) this.showInventoryHistory(player, evidence);
    });
  }
}
```

## 6. 物理的証拠システム

### 6.1 証拠アイテム配置

```typescript
interface PhysicalEvidenceItem {
  id: string;
  typeId: string;
  location: Vector3;
  discoverable: boolean;
  requiresAbility: boolean;
  abilityType?: string;
  description: string;
  clues: string[];
}

class PhysicalEvidenceManager {
  private evidenceItems: Map<string, PhysicalEvidenceItem> = new Map();
  
  public placeEvidenceItem(evidence: PhysicalEvidenceItem): void {
    const location = evidence.location;
    
    // カスタムアイテムとして配置
    world.getDimension("overworld").runCommand(
      `give @a[x=${location.x},y=${location.y},z=${location.z},r=1] ${evidence.typeId}`
    );
    
    // 発見時のイベントハンドラ登録
    this.registerDiscoveryHandler(evidence);
  }
  
  private registerDiscoveryHandler(evidence: PhysicalEvidenceItem): void {
    world.afterEvents.itemUse.subscribe(event => {
      if (event.itemStack.typeId === evidence.typeId) {
        this.handleEvidenceDiscovery(event.source, evidence);
      }
    });
  }
}
```

### 6.2 証拠発見メカニズム

```typescript
class EvidenceDiscoverySystem {
  public handleEvidenceDiscovery(
    player: Player, 
    evidence: PhysicalEvidenceItem
  ): void {
    // 能力要求チェック
    if (evidence.requiresAbility && !this.hasRequiredAbility(player, evidence.abilityType)) {
      player.sendMessage("§cこの証拠を解析するには特別な能力が必要です");
      return;
    }
    
    // 証拠情報を追加
    this.addEvidenceToPlayer(player, evidence);
    
    // 発見通知
    this.notifyEvidenceDiscovery(player, evidence);
    
    // ゲーム状態更新
    this.updateGameState(evidence.id, player.id);
  }
  
  private addEvidenceToPlayer(player: Player, evidence: PhysicalEvidenceItem): void {
    const playerState = GameManager.getInstance().getPlayerState(player);
    if (playerState) {
      playerState.collectedEvidence.push(evidence.id);
    }
  }
}
```

## 7. 証拠分析・推理支援

### 7.1 証拠関連性分析

```typescript
class EvidenceAnalysisEngine {
  public analyzeEvidenceCorrelation(
    evidenceList: Evidence[]
  ): CorrelationAnalysis {
    const timeCorrelations = this.findTimeCorrelations(evidenceList);
    const locationCorrelations = this.findLocationCorrelations(evidenceList);
    const playerCorrelations = this.findPlayerCorrelations(evidenceList);
    
    return {
      suspiciousPatterns: this.identifySuspiciousPatterns(evidenceList),
      timelineGaps: this.findTimelineGaps(evidenceList),
      contradictions: this.findContradictions(evidenceList),
      confirmations: this.findConfirmations(evidenceList)
    };
  }
  
  private identifySuspiciousPatterns(evidenceList: Evidence[]): SuspiciousPattern[] {
    return evidenceList
      .filter(evidence => this.calculateSuspicionLevel(evidence) > 0.7)
      .map(evidence => ({
        type: this.classifyPattern(evidence),
        description: this.generatePatternDescription(evidence),
        suspicionLevel: this.calculateSuspicionLevel(evidence),
        relatedEvidence: this.findRelatedEvidence(evidence, evidenceList)
      }));
  }
}
```

### 7.2 推理支援UI

```typescript
class DeductionSupportUI {
  public showEvidenceAnalysis(player: Player): void {
    const playerEvidence = this.getPlayerEvidence(player.id);
    const analysis = this.analyzeEvidence(playerEvidence);
    
    const form = new ModalFormData()
      .title("§l§6証拠分析結果")
      .dropdown("疑わしいパターン", analysis.suspiciousPatterns.map(p => p.description))
      .dropdown("時系列の矛盾", analysis.contradictions.map(c => c.description))
      .toggle("自動推理を有効にする", false);
    
    form.show(player).then(result => {
      if (result.formValues) {
        this.processAnalysisRequest(player, result.formValues);
      }
    });
  }
}
```

## 8. データ永続化とパフォーマンス

### 8.1 効率的なデータ管理

```typescript
class EvidenceDataManager {
  private evidenceCache: Map<string, Evidence[]> = new Map();
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CLEANUP_INTERVAL = 20 * 60 * 5; // 5分間隔
  
  public storeEvidence(evidence: Evidence): void {
    // メモリ効率を考慮したストレージ
    const compressed = this.compressEvidence(evidence);
    this.evidenceCache.set(evidence.id, compressed);
    
    // 定期的なクリーンアップ
    if (this.evidenceCache.size > this.MAX_CACHE_SIZE) {
      this.cleanupOldEvidence();
    }
  }
  
  private compressEvidence(evidence: Evidence): Evidence {
    // 不要なデータを除去してメモリ使用量を削減
    return {
      ...evidence,
      metadata: this.compressMetadata(evidence.metadata)
    };
  }
}
```

### 8.2 リアルタイム更新システム

```typescript
class RealTimeEvidenceUpdater {
  private updateInterval: number;
  
  constructor() {
    // 1秒間隔で証拠状態を更新
    this.updateInterval = system.runInterval(() => {
      this.updateEvidenceState();
    }, 20);
  }
  
  private updateEvidenceState(): void {
    // アクティブプレイヤーの行動を監視
    for (const player of world.getAllPlayers()) {
      this.trackPlayerAction(player);
    }
    
    // 証拠の時間経過による変化
    this.updateEvidenceQuality();
  }
}
```

この設計により、プレイヤーの行動が自動的に証拠として記録され、事件発覚時に適切に抽出・配布される包括的な証拠システムが実現されます。