# スコアリング・勝利判定システム詳細設計

## 1. システム概要

各プレイヤーの目的達成度を計算し、最終的な勝利者を決定するスコアリングシステム。

## 2. スコア計算システム

### 2.1 基本スコア構造

```typescript
interface PlayerScore {
  playerId: string;
  baseScore: number;           // 基本点（役職・職業）
  objectiveScores: ObjectiveScore[]; // 目的達成点
  bonusPoints: number;         // ボーナス点
  penaltyPoints: number;       // ペナルティ点
  totalScore: number;          // 合計点
  rank: number;                // 最終順位
}

interface ObjectiveScore {
  objectiveId: string;
  achieved: boolean;
  score: number;
  achievementRate: number;     // 達成率（0.0-1.0）
}
```

### 2.2 スコア計算式

```typescript
class ScoreCalculator {
  public calculatePlayerScore(player: Player, gameState: GameState): PlayerScore {
    const baseScore = this.calculateBaseScore(player);
    const objectiveScores = this.calculateObjectiveScores(player, gameState);
    const bonusPoints = this.calculateBonusPoints(player, gameState);
    const penaltyPoints = this.calculatePenaltyPoints(player, gameState);
    
    const totalScore = baseScore + 
      objectiveScores.reduce((sum, obj) => sum + obj.score, 0) + 
      bonusPoints - penaltyPoints;
    
    return {
      playerId: player.id,
      baseScore,
      objectiveScores,
      bonusPoints,
      penaltyPoints,
      totalScore,
      rank: 0 // 後で計算
    };
  }
  
  private calculateBaseScore(player: Player): number {
    // ロール基本点
    const roleScore = this.getRoleBaseScore(player.role);
    // ジョブ基本点
    const jobScore = this.getJobBaseScore(player.job);
    
    return roleScore + jobScore;
  }
  
  private getRoleBaseScore(role: Role): number {
    switch (role.type) {
      case RoleType.MURDERER: return 100;   // 犯人は高基本点
      case RoleType.ACCOMPLICE: return 80;  // 共犯者
      case RoleType.CITIZEN: return 60;     // 一般人
      default: return 50;
    }
  }
}
```

## 3. 目的達成システム

### 3.1 目的カテゴリー別評価

```typescript
enum ObjectiveCategory {
  SURVIVAL = "survival",       // 生存系
  INVESTIGATION = "investigation", // 捜査系
  SOCIAL = "social",          // 社会系
  ECONOMIC = "economic",      // 経済系
  HIDDEN = "hidden"           // 隠し目的
}

class ObjectiveEvaluator {
  public evaluateObjective(
    objective: Objective, 
    player: Player, 
    gameState: GameState
  ): ObjectiveScore {
    switch (objective.category) {
      case ObjectiveCategory.SURVIVAL:
        return this.evaluateSurvivalObjective(objective, player, gameState);
      case ObjectiveCategory.INVESTIGATION:
        return this.evaluateInvestigationObjective(objective, player, gameState);
      case ObjectiveCategory.SOCIAL:
        return this.evaluateSocialObjective(objective, player, gameState);
      case ObjectiveCategory.ECONOMIC:
        return this.evaluateEconomicObjective(objective, player, gameState);
      default:
        return this.evaluateGenericObjective(objective, player, gameState);
    }
  }
  
  private evaluateSurvivalObjective(
    objective: Objective, 
    player: Player, 
    gameState: GameState
  ): ObjectiveScore {
    // 例：「投票で一番にならない」
    if (objective.id === "avoid_top_vote") {
      const votes = gameState.votes.get(player.id) || 0;
      const maxVotes = Math.max(...Array.from(gameState.votes.values()));
      const achieved = votes < maxVotes;
      
      return {
        objectiveId: objective.id,
        achieved,
        score: achieved ? objective.rewards : objective.penalty,
        achievementRate: achieved ? 1.0 : 0.0
      };
    }
    
    return this.evaluateGenericObjective(objective, player, gameState);
  }
}
```

### 3.2 特殊目的の実装例

```typescript
interface SpecialObjectiveHandlers {
  "avoid_adultery_exposure": (player: Player, gameState: GameState) => ObjectiveScore;
  "earn_money": (player: Player, gameState: GameState) => ObjectiveScore;
  "collect_evidence": (player: Player, gameState: GameState) => ObjectiveScore;
  "gain_trust": (player: Player, gameState: GameState) => ObjectiveScore;
  "complete_research": (player: Player, gameState: GameState) => ObjectiveScore;
}

class SpecialObjectiveHandler {
  private handlers: SpecialObjectiveHandlers = {
    "avoid_adultery_exposure": (player, gameState) => {
      // 王の浮気が暴露されたかチェック
      const exposed = this.checkAdulteryExposure(player, gameState);
      return {
        objectiveId: "avoid_adultery_exposure",
        achieved: !exposed,
        score: exposed ? -200 : 150,
        achievementRate: exposed ? 0.0 : 1.0
      };
    },
    
    "earn_money": (player, gameState) => {
      // プレイヤーの獲得金額を計算
      const earnedMoney = this.calculateEarnedMoney(player, gameState);
      const targetMoney = 100000; // 10万円
      const achieved = earnedMoney >= targetMoney;
      const rate = Math.min(earnedMoney / targetMoney, 1.0);
      
      return {
        objectiveId: "earn_money",
        achieved,
        score: Math.floor(150 * rate),
        achievementRate: rate
      };
    },
    
    "collect_evidence": (player, gameState) => {
      // 収集した証拠数をチェック
      const playerState = gameState.players.find(p => p.player.id === player.id);
      const evidenceCount = playerState?.collectedEvidence.length || 0;
      const targetCount = 5;
      const achieved = evidenceCount >= targetCount;
      const rate = Math.min(evidenceCount / targetCount, 1.0);
      
      return {
        objectiveId: "collect_evidence",
        achieved,
        score: Math.floor(120 * rate),
        achievementRate: rate
      };
    }
  };
}
```

## 4. 投票システム

### 4.1 投票メカニズム

```typescript
interface VoteData {
  voterId: string;
  targetId: string;
  timestamp: number;
  confidence: number; // 確信度（1-10）
  reason?: string;    // 投票理由（任意）
}

class VotingSystem {
  private votes: Map<string, VoteData> = new Map();
  
  public castVote(voter: Player, target: Player, confidence: number): void {
    const voteData: VoteData = {
      voterId: voter.id,
      targetId: target.id,
      timestamp: system.currentTick,
      confidence
    };
    
    this.votes.set(voter.id, voteData);
    this.updateVoteCount(target.id);
  }
  
  public calculateVoteResults(): VoteResult[] {
    const voteCount = new Map<string, number>();
    const confidenceSum = new Map<string, number>();
    
    for (const vote of this.votes.values()) {
      const currentCount = voteCount.get(vote.targetId) || 0;
      const currentConfidence = confidenceSum.get(vote.targetId) || 0;
      
      voteCount.set(vote.targetId, currentCount + 1);
      confidenceSum.set(vote.targetId, currentConfidence + vote.confidence);
    }
    
    return Array.from(voteCount.entries())
      .map(([playerId, count]) => ({
        playerId,
        voteCount: count,
        averageConfidence: (confidenceSum.get(playerId) || 0) / count,
        percentage: count / this.votes.size * 100
      }))
      .sort((a, b) => b.voteCount - a.voteCount);
  }
}
```

### 4.2 投票UI実装

```typescript
class VotingUI {
  public showVotingForm(player: Player): void {
    const form = new ModalFormData()
      .title("§l§c犯人投票")
      .dropdown(
        "犯人だと思うプレイヤーを選択してください",
        this.getOtherPlayers(player).map(p => p.name)
      )
      .slider("確信度", 1, 10, 1, 5)
      .textField("投票理由（任意）", "理由を入力...");
    
    form.show(player).then(result => {
      if (result.formValues) {
        this.processVote(player, result.formValues);
      }
    });
  }
  
  private processVote(player: Player, formValues: any[]): void {
    const targetIndex = formValues[0] as number;
    const confidence = formValues[1] as number;
    const reason = formValues[2] as string;
    
    const target = this.getOtherPlayers(player)[targetIndex];
    
    VotingSystem.getInstance().castVote(player, target, confidence);
    player.sendMessage(`§a${target.name}に投票しました（確信度: ${confidence}/10）`);
  }
}
```

## 5. 特殊行動処理システム

### 5.1 投票フェーズでの特殊行動

```typescript
interface SpecialAction {
  id: string;
  name: string;
  description: string;
  availableToRoles: RoleType[];
  availableToJobs: string[];
  executionPhase: PhaseType;
  effect: ActionEffect;
}

class SpecialActionSystem {
  private specialActions: SpecialAction[] = [
    {
      id: "expose_adultery",
      name: "浮気の証拠提示",
      description: "王の浮気の証拠を提示する",
      availableToRoles: [RoleType.CITIZEN],
      availableToJobs: ["maid", "court_wizard"],
      executionPhase: PhaseType.VOTING,
      effect: {
        type: "expose_secret",
        target: "king",
        consequence: "objective_failure"
      }
    },
    {
      id: "present_evidence",
      name: "決定的証拠の提示",
      description: "収集した証拠を総合的に提示",
      availableToRoles: [RoleType.CITIZEN],
      availableToJobs: ["guild_receptionist"],
      executionPhase: PhaseType.VOTING,
      effect: {
        type: "evidence_boost",
        multiplier: 2.0
      }
    }
  ];
  
  public executeSpecialAction(
    player: Player, 
    actionId: string, 
    gameState: GameState
  ): ActionResult {
    const action = this.specialActions.find(a => a.id === actionId);
    if (!action) return { success: false, message: "無効な行動です" };
    
    // 実行権限チェック
    if (!this.hasPermission(player, action)) {
      return { success: false, message: "この行動を実行する権限がありません" };
    }
    
    // 行動実行
    return this.executeAction(action, player, gameState);
  }
}
```

## 6. 勝利判定システム

### 6.1 勝利条件評価

```typescript
class VictoryDetermination {
  public determineWinner(gameState: GameState, voteResults: VoteResult[]): GameResult {
    const playerScores = this.calculateAllPlayerScores(gameState);
    const sortedScores = playerScores.sort((a, b) => b.totalScore - a.totalScore);
    
    // 投票結果による追加評価
    const topVoted = voteResults[0];
    const actualMurderer = this.findMurderer(gameState);
    
    // 犯人が逮捕されたかチェック
    const murdererCaught = topVoted.playerId === actualMurderer.id;
    
    // 勝利判定
    const winner = this.determineWinnerByScore(sortedScores, murdererCaught);
    
    return {
      winner,
      finalScores: sortedScores,
      murdererCaught,
      voteResults,
      gameEndReason: murdererCaught ? "murderer_caught" : "murderer_escaped"
    };
  }
  
  private determineWinnerByScore(
    scores: PlayerScore[], 
    murdererCaught: boolean
  ): Player {
    // 基本的には最高得点者が勝利
    let winner = scores[0];
    
    // ただし、犯人が逮捕された場合は犯人サイドは大幅減点
    if (murdererCaught) {
      // 犯人・共犯者の得点を大幅減点
      scores.forEach(score => {
        const player = this.getPlayerById(score.playerId);
        if (player.role.type === RoleType.MURDERER || 
            player.role.type === RoleType.ACCOMPLICE) {
          score.totalScore -= 300; // 大幅減点
        }
      });
      
      // 再ソート
      scores.sort((a, b) => b.totalScore - a.totalScore);
      winner = scores[0];
    }
    
    return this.getPlayerById(winner.playerId);
  }
}
```

### 7. 結果表示システム

```typescript
class GameResultDisplay {
  public displayGameResult(result: GameResult): void {
    // 勝利者発表
    world.sendMessage("§l§6=== ゲーム終了 ===");
    world.sendMessage(`§a勝利者: §l${result.winner.name}`);
    world.sendMessage(`§e最終得点: ${result.finalScores[0].totalScore}点`);
    
    // 犯人発表
    const murderer = this.findMurderer(result);
    world.sendMessage(`§c真犯人: §l${murderer.name}`);
    world.sendMessage(result.murdererCaught ? "§a犯人は逮捕されました！" : "§c犯人は逃走しました...");
    
    // 詳細結果表示
    this.displayDetailedResults(result);
  }
  
  private displayDetailedResults(result: GameResult): void {
    world.sendMessage("§l§e=== 詳細結果 ===");
    
    result.finalScores.forEach((score, index) => {
      const player = this.getPlayerById(score.playerId);
      world.sendMessage(
        `§7${index + 1}位: §f${player.name} §7(${score.totalScore}点)`
      );
      
      // 目的達成状況
      score.objectiveScores.forEach(obj => {
        const status = obj.achieved ? "§a達成" : "§c未達成";
        world.sendMessage(`  §7- ${obj.objectiveId}: ${status} (${obj.score}点)`);
      });
    });
  }
  
  public showPersonalResult(player: Player, score: PlayerScore): void {
    const form = new ActionFormData()
      .title("§l§6あなたの結果")
      .body(this.generatePersonalResultText(player, score))
      .button("§a詳細を見る")
      .button("§7閉じる");
    
    form.show(player);
  }
}
```

### 8. 統計・分析システム

```typescript
interface GameStatistics {
  totalGames: number;
  winRateByRole: Map<RoleType, number>;
  winRateByJob: Map<string, number>;
  averageGameDuration: number;
  mostSuccessfulObjectives: string[];
  playerPerformanceHistory: Map<string, PlayerStats>;
}

class StatisticsTracker {
  public recordGameResult(result: GameResult): void {
    // 統計データの更新
    this.updateWinRates(result);
    this.updatePlayerStats(result);
    this.updateObjectiveStats(result);
  }
  
  private updateWinRates(result: GameResult): void {
    const winner = result.winner;
    const roleWins = this.getRoleWinCount(winner.role.type);
    const jobWins = this.getJobWinCount(winner.job.id);
    
    this.incrementWinCount(winner.role.type, roleWins + 1);
    this.incrementWinCount(winner.job.id, jobWins + 1);
  }
}
```

この設計により、プレイヤーの様々な目的達成度を総合的に評価し、公平で興味深い勝利判定システムが実現されます。