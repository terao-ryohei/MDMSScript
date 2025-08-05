# フェーズベース証拠システム詳細設計

## 1. 変更概要

「事件時間±30分」から「それまでの生活フェーズ内」への変更により、証拠抽出範囲をより論理的で実装しやすくしました。

## 2. フェーズベース証拠抽出システム

### 2.1 生活フェーズ時間管理

```typescript
interface DailyLifePhaseTimer {
  phaseStartTime: number;        // 生活フェーズ開始時刻
  currentTime: number;           // 現在時刻
  crimeTime: number | null;      // 事件発生時刻
  phaseEndTime: number;          // フェーズ終了時刻
}

class PhaseBasedEvidenceTracker {
  private dailyLifeTimer: DailyLifePhaseTimer;
  private evidenceBuffer: EvidenceEvent[] = [];

  public startDailyLifePhase(): void {
    this.dailyLifeTimer = {
      phaseStartTime: system.currentTick,
      currentTime: system.currentTick,
      crimeTime: null,
      phaseEndTime: 0
    };
    
    // 証拠記録開始
    this.startEvidenceRecording();
  }

  public recordCrimeTime(): void {
    this.dailyLifeTimer.crimeTime = system.currentTick;
    this.dailyLifeTimer.phaseEndTime = system.currentTick;
    
    // 証拠抽出開始
    this.extractPhaseEvidence();
  }
}
```

### 2.2 フェーズ内証拠抽出

```typescript
class PhaseEvidenceExtractor {
  public extractPhaseEvidence(timer: DailyLifePhaseTimer): PhaseEvidenceData {
    const phaseEvidence = this.evidenceBuffer.filter(event => 
      event.timestamp >= timer.phaseStartTime && 
      event.timestamp <= (timer.crimeTime || timer.phaseEndTime)
    );

    return {
      phaseStartTime: timer.phaseStartTime,
      phaseEndTime: timer.crimeTime || timer.phaseEndTime,
      totalEvents: phaseEvidence.length,
      playerEvidence: this.groupByPlayer(phaseEvidence),
      timelineEvents: this.createPhaseTimeline(phaseEvidence),
      suspiciousActivities: this.analyzeSuspiciousPatterns(phaseEvidence)
    };
  }

  private groupByPlayer(events: EvidenceEvent[]): Map<string, PlayerPhaseEvidence> {
    const grouped = new Map<string, PlayerPhaseEvidence>();
    
    for (const event of events) {
      if (!grouped.has(event.playerId)) {
        grouped.set(event.playerId, {
          playerId: event.playerId,
          events: [],
          locationHistory: [],
          interactions: [],
          taskCompletions: [],
          suspiciousActions: []
        });
      }
      
      const playerData = grouped.get(event.playerId)!;
      playerData.events.push(event);
      
      // 位置履歴の記録
      if (event.action === TrackableAction.MOVEMENT) {
        playerData.locationHistory.push({
          timestamp: event.timestamp,
          location: event.location,
          area: this.getAreaName(event.location)
        });
      }
      
      // 相互作用の記録
      if (event.action === TrackableAction.ENTITY_INTERACT && event.witnesses.length > 0) {
        playerData.interactions.push({
          timestamp: event.timestamp,
          type: event.action,
          witnesses: event.witnesses,
          details: event.details
        });
      }
    }
    
    return grouped;
  }
}
```

### 2.3 時間的信頼性評価の改善

```typescript
class PhaseBasedReliabilityEvaluator {
  public evaluateTemporalReliability(
    evidence: Evidence, 
    phaseData: PhaseEvidenceData
  ): number {
    const phaseDuration = phaseData.phaseEndTime - phaseData.phaseStartTime;
    const evidenceTime = evidence.timestamp - phaseData.phaseStartTime;
    const timeProgress = evidenceTime / phaseDuration; // 0.0-1.0

    // フェーズ進行に応じた信頼性評価
    if (timeProgress > 0.8) {
      // 事件直前（フェーズの最後20%）
      return 0.9 + (timeProgress - 0.8) * 0.5; // 0.9-1.0
    } else if (timeProgress > 0.5) {
      // フェーズ後半（50-80%）
      return 0.7 + (timeProgress - 0.5) * 0.67; // 0.7-0.9
    } else if (timeProgress > 0.2) {
      // フェーズ中盤（20-50%）
      return 0.5 + (timeProgress - 0.2) * 0.67; // 0.5-0.7
    } else {
      // フェーズ前半（0-20%）
      return 0.3 + timeProgress * 2.5; // 0.3-0.5
    }
  }

  public evaluateActionContext(
    evidence: Evidence,
    playerData: PlayerPhaseEvidence
  ): number {
    let contextScore = 0.5; // 基準値

    // 行動パターンの一貫性
    const actionPattern = this.analyzeActionPattern(playerData.events);
    if (actionPattern.isConsistent) {
      contextScore += 0.2;
    }

    // 目撃者の存在
    const witnessCount = evidence.metadata?.witnesses?.length || 0;
    contextScore += Math.min(witnessCount * 0.1, 0.3);

    // タスク実行との関連性
    if (this.isRelatedToTask(evidence, playerData.taskCompletions)) {
      contextScore += 0.2;
    }

    return Math.min(contextScore, 1.0);
  }
}
```

### 2.4 フェーズベース証拠配布

```typescript
class PhaseEvidenceDistributor {
  public distributePhaseEvidence(phaseData: PhaseEvidenceData): void {
    for (const [playerId, playerData] of phaseData.playerEvidence) {
      const player = world.getPlayers().find(p => p.id === playerId);
      if (!player) continue;

      const personalEvidence = this.createPersonalEvidencePackage(
        playerData,
        phaseData
      );

      this.showPersonalEvidenceUI(player, personalEvidence);
    }
  }

  private createPersonalEvidencePackage(
    playerData: PlayerPhaseEvidence,
    phaseData: PhaseEvidenceData
  ): PersonalEvidencePackage {
    return {
      timeframe: {
        start: phaseData.phaseStartTime,
        end: phaseData.phaseEndTime,
        duration: phaseData.phaseEndTime - phaseData.phaseStartTime
      },
      yourActions: {
        totalActions: playerData.events.length,
        movementHistory: playerData.locationHistory,
        interactions: playerData.interactions,
        taskProgress: playerData.taskCompletions
      },
      observations: {
        witnessedEvents: this.getWitnessedEvents(playerData, phaseData),
        nearbyPlayers: this.getNearbyPlayerHistory(playerData, phaseData),
        suspiciousActivities: this.getRelevantSuspiciousActivities(playerData, phaseData)
      },
      analysis: {
        yourSuspicionLevel: this.calculatePlayerSuspicion(playerData),
        reliabilityScore: this.calculatePlayerReliability(playerData),
        timelineGaps: this.findTimelineGaps(playerData)
      }
    };
  }

  private showPersonalEvidenceUI(player: Player, evidence: PersonalEvidencePackage): void {
    const form = new ActionFormData()
      .title("§l§6生活フェーズ証拠資料")
      .body(this.formatEvidenceBody(evidence))
      .button("§e行動履歴を見る", "textures/items/clock")
      .button("§a目撃情報を見る", "textures/items/ender_eye")
      .button("§c周辺プレイヤー", "textures/items/player_head")
      .button("§7分析結果", "textures/items/enchanted_book");

    form.show(player).then(result => {
      if (result.canceled) return;
      
      switch (result.selection) {
        case 0: this.showActionHistory(player, evidence.yourActions); break;
        case 1: this.showObservations(player, evidence.observations); break;
        case 2: this.showNearbyPlayers(player, evidence.observations.nearbyPlayers); break;
        case 3: this.showAnalysis(player, evidence.analysis); break;
      }
    });
  }
}
```

### 2.5 Scoreboardベースタイミング管理

```typescript
class ScoreboardPhaseManager {
  private readonly OBJECTIVES = {
    DAILY_LIFE_START: "mdms_dl_start",    // 生活フェーズ開始時刻
    CRIME_TIME: "mdms_crime_time",        // 事件発生時刻
    PHASE_DURATION: "mdms_phase_dur",     // フェーズ継続時間
    EVIDENCE_RECORDED: "mdms_evidence_count" // 記録済み証拠数
  } as const;

  public startDailyLifePhase(): void {
    const startTime = system.currentTick;
    world.scoreboard.getObjective(this.OBJECTIVES.DAILY_LIFE_START)
      ?.setScore("global", startTime);
    
    // 証拠カウンターリセット
    world.scoreboard.getObjective(this.OBJECTIVES.EVIDENCE_RECORDED)
      ?.setScore("global", 0);
  }

  public recordCrimeTime(): void {
    const crimeTime = system.currentTick;
    const startTime = world.scoreboard.getObjective(this.OBJECTIVES.DAILY_LIFE_START)
      ?.getScore("global") ?? 0;
    
    world.scoreboard.getObjective(this.OBJECTIVES.CRIME_TIME)
      ?.setScore("global", crimeTime);
    
    world.scoreboard.getObjective(this.OBJECTIVES.PHASE_DURATION)
      ?.setScore("global", crimeTime - startTime);
  }

  public getPhaseTimeframe(): { start: number, end: number, duration: number } {
    const start = world.scoreboard.getObjective(this.OBJECTIVES.DAILY_LIFE_START)
      ?.getScore("global") ?? 0;
    const end = world.scoreboard.getObjective(this.OBJECTIVES.CRIME_TIME)
      ?.getScore("global") ?? system.currentTick;
    
    return {
      start,
      end,
      duration: end - start
    };
  }
}
```

### 2.6 実装上の利点

#### より論理的な証拠範囲
- 生活フェーズ全体が証拠対象となり、ゲーム的に自然
- 固定時間窓ではなく、実際のゲーム進行に合わせた証拠収集

#### 実装の簡素化
- 複雑な時間窓計算が不要
- フェーズ開始/終了時刻の単純な比較で済む

#### パフォーマンス向上
- 明確な開始/終了点により効率的なデータフィルタリング
- Scoreboardベースの時刻管理で高速アクセス

#### ゲームバランス改善
- フェーズ前半の行動も重要な証拠として扱われる
- 事件タイミングによる不公平さの削減

この変更により、証拠システムがよりゲーム的に自然で、実装も簡素化されます。