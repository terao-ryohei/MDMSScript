# GameManager クラス詳細設計書

## 1. クラスの責務と概要

GameManagerクラスは、マーダーミステリーゲームの中核となるコンポーネントで、以下の主要な責務を持ちます：

- ゲーム全体の状態管理と制御
- 各種マネージャーの統括と連携
- ゲーム内時間の管理
- プレイヤー状態の追跡
- アクションのロギング

### 1.1 インターフェースの実装

```mermaid
classDiagram
    class GameManager {
        -static instance: GameManager
        -gameState: GameState
        -config: GameConfig
        -actionLogger: ActionLoggerModule
        -logManager: LogManager
        -evidenceManager: EvidenceManager
        -tickCallback: number
        +getInstance(): GameManager
        +getGameState(): GameState
        +logAction(data: ActionData): Promise~void~
        +dispose(): void
    }
    class IGameManager {
        <<interface>>
        +getGameState(): IGameState
        +getTimerManager(): ITimerManager
        +getPlayerState(): PlayerState
    }
    class IPhaseGameManager {
        <<interface>>
    }
    class ILoggerManager {
        <<interface>>
    }
    GameManager ..|> IGameManager
    GameManager ..|> IPhaseGameManager
    GameManager ..|> ILoggerManager
```

### 1.2 シングルトンパターンの実装

- 単一インスタンスの保証
- スレッドセーフな初期化
- 適切なリソース管理

### 1.3 状態管理の方針

- イミュータブルな状態管理
- 状態更新の一元化
- イベントベースの状態同期
- メモリ効率を考慮したデータ構造

## 2. クラス構造

### 2.1 プロパティ

```typescript
private static instance: GameManager | null;
private gameState: GameState;
private config: GameConfig;
private actionLogger: ActionLoggerModule;
private logManager: LogManager;
private evidenceManager: EvidenceManager;
private tickCallback: number | undefined;
```

| プロパティ名 | 型 | 目的 |
|------------|-----|------|
| instance | static GameManager | シングルトンインスタンスの保持 |
| gameState | GameState | ゲームの現在の状態を保持 |
| config | GameConfig | ゲーム設定の保持 |
| actionLogger | ActionLoggerModule | アクションログの記録 |
| logManager | LogManager | ログ管理の統括 |
| evidenceManager | EvidenceManager | 証拠管理の統括 |
| tickCallback | number | ゲーム更新用タイマーID |

### 2.2 メソッド実装詳細

#### 2.2.1 コンストラクタとインスタンス管理

```typescript
private constructor()
public static getInstance(): GameManager
```

- コンストラクタはprivateで、getInstance経由でのみインスタンス化可能
- 初期化時に各種マネージャーを生成
- リソースの適切な初期化を保証

#### 2.2.2 状態管理メソッド

```typescript
private createInitialGameState(): GameState
private createDefaultConfig(): GameConfig
public getGameState(): GameState
```

- イミュータブルな状態オブジェクトの生成
- デフォルト設定の提供
- 状態のディープコピーによる安全な参照

#### 2.2.3 ゲーム制御メソッド

```typescript
public startGame(): void
public pauseGame(): void
public resumeGame(): void
public endGame(): void
```

- ゲームのライフサイクル管理
- 状態遷移の制御
- リソースの適切な管理

#### 2.2.4 プレイヤー管理メソッド

```typescript
public getPlayerRole(playerId: string): RoleType | undefined
public getPlayerState(playerId: string): PlayerState | undefined
public updatePlayerState(playerId: string, updates: Partial<PlayerState>): void
```

- プレイヤー情報の取得と更新
- ロールベースのアクセス制御
- 状態更新の検証

### 2.3 プライベートヘルパーメソッド

```typescript
private initializeActionLogger(): void
private validateGameState(): boolean
private handleStateUpdate(newState: Partial<GameState>): void
```

- 内部状態の整合性チェック
- 設定の検証
- エラー状態のハンドリング

### 2.4 イベントハンドラ

```typescript
private onTick(): void
private onPlayerJoin(player: Player): void
private onPlayerLeave(player: Player): void
private onPhaseChange(phase: GamePhase): void
```

- システムイベントの処理
- プレイヤーイベントの処理
- フェーズ遷移の管理

## 3. 他のマネージャーとの連携

### 3.1 依存性の注入

```mermaid
graph TD
    A[GameManager] --> B[ActionLoggerModule]
    A --> C[LogManager]
    A --> D[EvidenceManager]
    A --> E[PhaseManager]
    B --> F[System Events]
    C --> G[Game Logs]
    D --> H[Evidence Data]
    E --> I[Phase States]
```

### 3.2 イベントの発行と購読

| イベント名 | 発行タイミング | 購読者 |
|-----------|--------------|--------|
| gameStateChanged | 状態更新時 | UI, Logger |
| phaseChanged | フェーズ遷移時 | All Managers |
| playerStateUpdated | プレイヤー状態変更時 | Logger, Evidence |
| evidenceCollected | 証拠収集時 | Evidence, Logger |

### 3.3 状態の同期方法

- イベントベースの非同期通知
- 定期的な状態同期
- 差分更新の最適化

## 4. 実装上の注意点

### 4.1 スレッドセーフティ

```typescript
private synchronizedUpdate(operation: () => void): void {
    // クリティカルセクションの保護
    this.lock.acquire();
    try {
        operation();
    } finally {
        this.lock.release();
    }
}
```

### 4.2 エラーハンドリング

```typescript
class GameManagerError extends Error {
    constructor(message: string, public code: ErrorCode) {
        super(message);
    }
}

private handleError(error: GameManagerError): void {
    this.logManager.logError(error);
    // エラー復旧処理
}
```

### 4.3 パフォーマンス最適化

- 状態更新の最適化
- メモリ使用量の制御
- イベント発行の効率化

### 4.4 メモリ管理

- リソースの適切な解放
- 循環参照の防止
- キャッシュの最適化

## 5. テスト方針

### 5.1 ユニットテスト

```typescript
describe('GameManager', () => {
    let gameManager: GameManager;
    
    beforeEach(() => {
        gameManager = GameManager.getInstance();
    });

    it('should maintain singleton instance', () => {
        // シングルトンテスト
    });

    it('should handle state updates correctly', () => {
        // 状態更新テスト
    });
});
```

### 5.2 モックの使用方法

```typescript
class MockLogManager implements ILoggerManager {
    // モックの実装
}

class MockEvidenceManager implements IEvidenceManager {
    // モックの実装
}
```

### 5.3 テストシナリオ

1. 初期化テスト
2. 状態管理テスト
3. イベントハンドリングテスト
4. エラー処理テスト
5. パフォーマンステスト

## 6. 設計の根拠と代替案の検討

### 6.1 採用した設計パターンの理由

1. **シングルトンパターン**
   - ゲーム状態の一元管理が必要
   - リソースの効率的な共有
   - グローバルアクセスポイントの提供

2. **イベントベース・アーキテクチャ**
   - 疎結合な設計
   - 拡張性の確保
   - 非同期処理の効率化

### 6.2 検討した代替案

1. **Factory Pattern + DI Container**
   - メリット: テスト容易性向上
   - デメリット: 実装の複雑化

2. **State Pattern for Game Phases**
   - メリット: フェーズ遷移の明確化
   - デメリット: ボイラープレート増加

### 6.3 トレードオフの分析

| 設計選択 | メリット | デメリット | 採用理由 |
|---------|---------|------------|----------|
| シングルトン | 状態管理の一元化 | テスト難度上昇 | ゲーム状態の整合性確保 |
| イベントベース | 疎結合化 | デバッグ難度上昇 | スケーラビリティ確保 |
| イミュータブル状態 | 予測可能性向上 | メモリ使用量増加 | バグ防止と追跡容易性 |