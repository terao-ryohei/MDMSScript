# GameManager統合計画書 (2025-05-12)

## 1. 概要

本計画書は、役割と職業の分離システムを `GameManager` に統合するための詳細な手順を定義するものです。
`OccupationManager`、`OccupationUIManager`、および `UICoordinator` を `GameManager` に組み込み、役割と職業の割り当て、UI連携を実現します。

## 2. やること

### 2.1. `GameManager`のプロパティ追加

-   `OccupationManager` のインスタンスを保持するプロパティを追加します。
    ```typescript
    // src/managers/GameManager.ts
    import type { IOccupationManager } from "./interfaces/IOccupationManager";
    // ...
    private occupationManager: IOccupationManager;
    ```
-   `UICoordinator` のインスタンスを保持するプロパティを追加します。
    ```typescript
    // src/managers/GameManager.ts
    import type { IUICoordinator } from "../ui/interfaces/IUICoordinator";
    // ...
    private uiCoordinator: IUICoordinator;
    ```
-   既存の `roleUIManager` と、新しく作成した `occupationUIManager` の型をインターフェース型 (`IRoleUIManager`, `IOccupationUIManager`) に変更します。
    ```typescript
    // src/managers/GameManager.ts
    import type { IRoleUIManager } from "./interfaces/IRoleUIManager";
    import type { IOccupationUIManager } from "./interfaces/IOccupationUIManager";
    // ...
    private roleUIManager: IRoleUIManager;
    private occupationUIManager: IOccupationUIManager;
    ```

### 2.2. `GameManager`の初期化処理 (`initialize`メソッド) の更新

-   `OccupationManager` のインスタンスを生成し、プロパティにセットします。
    ```typescript
    // src/managers/GameManager.ts
    import { OccupationManager } from "./OccupationManager";
    // ...
    this.occupationManager = OccupationManager.getInstance(this);
    ```
-   `OccupationUIManager` のインスタンスを生成し、プロパティにセットします。
    ```typescript
    // src/managers/GameManager.ts
    import { OccupationUIManager } from "./OccupationUIManager";
    // ...
    this.occupationUIManager = OccupationUIManager.getInstance(this);
    ```
-   `UICoordinator` のインスタンスを生成し、プロパティにセットします。このとき、`RoleUIManager` と `OccupationUIManager` のインスタンスを渡します。
    ```typescript
    // src/managers/GameManager.ts
    import { UICoordinator } from "../ui/UICoordinator";
    // ...
    this.uiCoordinator = UICoordinator.getInstance(
      this,
      this.roleUIManager,
      this.occupationUIManager
    );
    ```

### 2.3. ゲーム開始処理 (`startGame`メソッド) の更新

-   役割割り当て後、職業割り当て処理を呼び出します。
    -   `OccupationManager.assignOccupations()` を使用します。
    -   割り当て結果を `GameState` に保存します。具体的には、各 `PlayerState` の `occupation` プロパティを更新し、`GameState.occupations` マップも更新します。
        ```typescript
        // src/managers/GameManager.ts
        // ...
        const occupationAssignmentsResult = await this.occupationManager.assignOccupations(
          this.gameState.players,
          config.occupationRules, // GameStartupConfigから渡される想定
          config.occupationBalance // GameStartupConfigから渡される想定
        );

        if (!occupationAssignmentsResult.success) {
          // エラーハンドリング
          console.error("職業の割り当てに失敗しました:", occupationAssignmentsResult.error);
          // 必要に応じてStartupResultを更新
          return {
            success: false,
            gameId: this.gameState.gameId,
            startTime: 0,
            initialPhase: GamePhase.PREPARATION,
            error: `職業割り当て失敗: ${occupationAssignmentsResult.error}`,
          };
        }

        // GameStateの更新
        occupationAssignmentsResult.assignments.forEach((occupation, playerId) => {
          const playerState = this.gameState.players.find(p => p.playerId === playerId);
          if (playerState) {
            playerState.occupation = occupation;
          }
          this.gameState.occupations.set(playerId, occupation); // GameState.occupationsも更新
        });
        // GameStateにoccupationRulesとoccupationBalanceも保存
        this.gameState.occupationRules = new Map(Object.entries(config.occupationRules) as [RoleType, any][]);
        this.gameState.occupationBalance = config.occupationBalance;
        // ...
        ```
-   職業割り当て後、各プレイヤーのUIを初期化するために `UICoordinator.setupInitialUI()` を呼び出します。
    ```typescript
    // src/managers/GameManager.ts
    // ...
    for (const player of this.gameState.players) {
      await this.uiCoordinator.setupInitialUI(player.playerId);
    }
    // ...
    ```

### 2.4. `GameState`の更新

-   `PlayerState` に `occupation?: OccupationType;` が既に追加されていることを確認します。（完了済み）
-   `GameState` に `occupationRules: Map<RoleType, { allowedOccupations: OccupationType[]; forbiddenOccupations: OccupationType[]; }>` が既に追加されていることを確認します。（完了済み）
-   `GameState` に `occupationBalance: OccupationBalanceRules` を追加します。これはゲーム設定から渡される想定です。
    ```typescript
    // src/types/GameTypes.ts
    export interface GameState {
      // ... existing properties
      occupationBalance: OccupationBalanceRules; // 追加
    }
    ```
    `GameStartupConfig` にも `occupationBalance` を追加します。
    ```typescript
    // src/types/GameTypes.ts
    export interface GameStartupConfig {
      // ... existing properties
      occupationBalance: OccupationBalanceRules; // 追加
    }
    ```

### 2.5. ログ処理の確認

-   `OccupationManager` や `UICoordinator` 内で `gameManager.logAction()` を呼び出している箇所が、正しく動作することを確認します。
-   `ActionType` に必要なアクション（例：`OCCUPATION_ASSIGNED`、`UI_UPDATE` など）が定義されていることを確認します。（完了済み）

## 3. やらないこと

-   新しいゲームフェーズ（`OCCUPATION_SELECTION`, `ABILITY_TRAINING`）の導入は、今回のスコープ外とします。まずは既存のゲームフローの中で職業システムを機能させることを優先します。
-   設計書に記載のあった `OccupationEvents` のような新しいイベントシステムの導入は見送ります。引き続き `ActionLoggerModule` ベースのログ記録を中心とします。
-   パフォーマンスに関する詳細な最適化は、基本的な機能実装後に行います。

## 4. 動作確認

-   [ ] `GameManager` の初期化時に、`OccupationManager` と `UICoordinator` が正しくインスタンス化されること。
-   [ ] `startGame` メソッド呼び出し時に、役割割り当てに続いて職業割り当てが実行されること。
-   [ ] 職業割り当て結果が、各プレイヤーの `PlayerState.occupation` と `GameState.occupations` に正しく反映されること。
-   [ ] `GameState` に `occupationRules` と `occupationBalance` が正しく保存されること。
-   [ ] 職業割り当て後、各プレイヤーのUIが `UICoordinator.setupInitialUI()` によって初期化されること。
-   [ ] 職業割り当てやUI更新に関するログが、`ActionLoggerModule` を通じて正しく記録されること。

## 5. Mermaid図 (更新版)

```mermaid
graph TB
    subgraph Core
        A[GameManager]
    end

    subgraph Managers
        B[RoleAssignmentManager]
        C[OccupationManager]
        P[PhaseManager]
        EV[EvidenceManager]
        COM[CommunicationManager]
    end

    subgraph UIManagers
        E[RoleUIManager]
        F[OccupationUIManager]
    end

    subgraph Coordinators
        D[UICoordinator]
    end

    subgraph Data
        GS[GameState]
        AL[ActionLoggerModule]
    end

    A --> B
    A --> C
    A --> P
    A --> EV
    A --> COM
    A --> D
    A --> GS
    A --> AL

    B --> GS
    C --> GS
    C --> AL

    D --> E
    D --> F
    D --> AL

    E --> GS
    F --> GS