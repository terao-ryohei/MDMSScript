1# PhaseManager クラス詳細設計書

## 1. クラスの責務と概要

PhaseManagerクラスは、マーダーミステリーゲームのフェーズ管理を担当する中核コンポーネントです。以下の主要な責務を持ちます：

- ゲームフェーズの状態管理と遷移制御
- フェーズごとの制限事項の管理
- タイマー管理とフェーズ自動遷移
- プレイヤー権限の制御
- GameManagerとの連携によるイベント管理

### 1.1 有効なフェーズ遷移の定義

```typescript
const VALID_PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  [GamePhase.PREPARATION]: [GamePhase.DAILY_LIFE],
  [GamePhase.DAILY_LIFE]: [GamePhase.INVESTIGATION],
  [GamePhase.INVESTIGATION]: [GamePhase.DISCUSSION],
  [GamePhase.DISCUSSION]: [GamePhase.PRIVATE_TALK],
  [GamePhase.PRIVATE_TALK]: [GamePhase.FINAL_MEETING],
  [GamePhase.FINAL_MEETING]: [GamePhase.REASONING],
  [GamePhase.REASONING]: [GamePhase.VOTING],
  [GamePhase.VOTING]: [GamePhase.ENDING],
  [GamePhase.ENDING]: [],
};
```

### 1.2 フェーズごとの制限事項

```typescript
interface PhaseRestrictions {
  allowedActions: ExtendedActionType[];
  allowedAreas?: { x: number; y: number; z: number; radius: number }[];
  canVote: boolean;
  canCollectEvidence: boolean;
  canChat: boolean;
}
```

## 2. 主要コンポーネント

### 2.1 エラー処理

```typescript
class PhaseManagerError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "PhaseManagerError";
  }
}
```

### 2.2 フェーズ管理のプロパティ

```typescript
private static instance: PhaseManager | null = null;
private currentPhase: GamePhase;
private phaseStartTime: number;
private timerManager: TimerManager;
```

## 3. 主要機能の実装

### 3.1 インスタンス作成

```typescript
public static create(gameManager: IPhaseGameManager): PhaseManager {
  if (!PhaseManager.instance) {
    PhaseManager.instance = new PhaseManager(gameManager);
  }
  return PhaseManager.instance;
}
```

### 3.2 フェーズ開始処理

```typescript
public startPhase(phase: GamePhase, duration: number): void {
  // フェーズ遷移の検証
  if (!this.validatePhaseTransition(phase)) {
    throw new PhaseManagerError(
      `無効なフェーズ遷移です: ${this.currentPhase} -> ${phase}`,
      "INVALID_PHASE_TRANSITION",
    );
  }

  const oldPhase = this.currentPhase;
  this.cleanupPhaseResources();
  this.currentPhase = phase;
  this.phaseStartTime = system.currentTick;

  // タイマーの開始
  this.timerManager.startTimer(phase, duration);

  // フェーズ変更の通知
  this.notifyPhaseChange(oldPhase, phase);
}
```

### 3.3 エラーハンドリング

#### フェーズ遷移の検証
```typescript
private validatePhaseTransition(newPhase: GamePhase): boolean {
  if (this.currentPhase === newPhase) return false;
  const validNextPhases = VALID_PHASE_TRANSITIONS[this.currentPhase];
  return validNextPhases.includes(newPhase);
}
```

#### リソースのクリーンアップ
```typescript
private cleanupPhaseResources(): void {
  this.timerManager.stopTimer();
  // その他のクリーンアップ処理をここに追加
}
```

### 3.4 アクション制御

```typescript
public isActionAllowed(action: ExtendedActionType): boolean {
  const restrictions = this.phaseRestrictions[this.currentPhase];
  return restrictions.allowedActions.includes(action);
}

public canVote(): boolean {
  return this.phaseRestrictions[this.currentPhase].canVote;
}

public canCollectEvidence(): boolean {
  return this.phaseRestrictions[this.currentPhase].canCollectEvidence;
}

public canChat(): boolean {
  return this.phaseRestrictions[this.currentPhase].canChat;
}
```

## 4. イベント管理

### 4.1 フェーズ変更通知

```typescript
private notifyPhaseChange(oldPhase: GamePhase, newPhase: GamePhase): void {
  const event = {
    type: "phase_change",
    oldPhase,
    newPhase,
    timestamp: system.currentTick,
  };
  this.gameManager.logSystemAction("PHASE_NOTIFICATION", event);
}
```

### 4.2 タイムアウト処理

```typescript
private onPhaseTimeout(): void {
  const currentPhase = this.currentPhase;
  const nextPhases = VALID_PHASE_TRANSITIONS[currentPhase];
  
  this.cleanupPhaseResources();

  if (nextPhases.length > 0) {
    system.runTimeout(() => {
      this.startPhase(nextPhases[0], this.getDefaultDuration(nextPhases[0]));
    }, 20); // 1秒の遅延
  }
}
```

## 5. パフォーマンスと安全性

### 5.1 エラー処理方針

- すべての公開メソッドでのエラーハンドリング
- エラー発生時のシステムログ記録
- ユーザーへのエラー通知
- グレースフルな回復処理

### 5.2 リソース管理

- タイマーリソースの適切な解放
- フェーズ切り替え時のクリーンアップ
- インスタンスの適切な破棄
- メモリリークの防止

## 6. 更新履歴

### Version 1.1.0 (2025-04-30)
- initializeTimer()メソッドの削除
- エラーハンドリングの強化
- フェーズ遷移のバリデーション改善
- タイムアウト処理の安定性向上

### Version 1.0.0 (2025-04-29)
- 初期実装
- 基本的なフェーズ管理機能
- タイマー連携機能
- アクション制限機能