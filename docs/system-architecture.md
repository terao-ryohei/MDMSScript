# マーダーミステリーゲーム システムアーキテクチャ設計書

## 1. システム概要

本システムは、Minecraft上で動作するマーダーミステリーゲームのアドオンとして実装されています。プレイヤー間の相互作用、証拠収集、分析、推理を通じて犯人を特定することを目的としています。

### 1.1 主要機能

- プレイヤーロール管理（探偵、殺人者、共犯者など）
- 証拠システム（物理的証拠、証言の収集と分析）
- ゲームフェーズ管理（準備、調査、議論、投票など）
- アクションログ記録
- 証拠分析と信頼性評価

## 2. アーキテクチャ概要

システムは以下のアーキテクチャパターンに基づいて設計されています：

### 2.1 アーキテクチャスタイル

- **マネージャーベースアーキテクチャ**
  - 各機能領域を独立したマネージャークラスとして実装
  - 疎結合な設計で拡張性と保守性を確保
  - インターフェースを通じた明確な責務の分離

### 2.2 設計原則

- **SOLID原則の適用**
  - 単一責任の原則：各マネージャーは明確に定義された責務を持つ
  - インターフェース分離：ILoggerManager, IEvidenceAnalyzerなど
  - 依存関係逆転：具象クラスではなくインターフェースに依存

### 2.3 パターン

- **シングルトン**：GameManagerの一元管理
- **オブザーバー**：ゲームイベントの監視と通知
- **ストラテジー**：証拠分析アルゴリズムの切り替え
- **ファクトリー**：証拠オブジェクトの生成管理

## 3. コンポーネント構成

### 3.1 コアコンポーネント

1. **GameManager**
   - ゲーム全体の状態管理
   - プレイヤーロールの管理
   - フェーズ制御
   ```mermaid
   classDiagram
     class GameManager {
       -gameState: GameState
       -config: GameConfig
       +getInstance()
       +getGameState()
       +logAction()
     }
     GameManager --|> IPhaseGameManager
     GameManager --|> ILoggerManager
   ```

2. **EvidenceAnalyzer**
   - 証拠の信頼性評価
   - 証拠間の関連性分析
   - 証拠チェーンの構築
   ```mermaid
   classDiagram
     class EvidenceAnalyzer {
       -analyses: Map
       -relations: Map
       +analyzeEvidence()
       +evaluateReliability()
       +findRelatedEvidence()
     }
     EvidenceAnalyzer --|> IEvidenceAnalyzer
   ```

3. **PhaseManager**
   - ゲームフェーズの制御
   - タイミング管理
   - フェーズ遷移ロジック

4. **LogManager**
   - アクションログの記録
   - ログフィルタリング
   - エクスポート機能

### 3.2 補助コンポーネント

1. **CommunicationManager**
   - プレイヤー間のコミュニケーション管理
   - メッセージング系統

2. **AdvancedFeaturesManager**
   - 拡張機能の管理
   - 追加コンテンツの制御

## 4. 依存関係図

```mermaid
graph TD
    A[GameManager] --> B[EvidenceAnalyzer]
    A --> C[PhaseManager]
    A --> D[LogManager]
    B --> E[EvidenceManager]
    C --> F[CommunicationManager]
    D --> G[ActionLoggerModule]
    A --> H[AdvancedFeaturesManager]
```

## 5. 主要インターフェース

### 5.1 ILoggerManager
```typescript
interface ILoggerManager {
  logAction(data: {
    type: string;
    playerId: string;
    details: unknown;
  }): Promise<void>;
}
```

### 5.2 IEvidenceAnalyzer
```typescript
interface IEvidenceAnalyzer {
  analyzeEvidence(evidence: Evidence): Promise<number>;
  evaluateReliability(evidence: Evidence): Promise<number>;
  findRelatedEvidence(evidenceId: string): Evidence[];
}
```

### 5.3 IPhaseManager
```typescript
interface IPhaseManager {
  getCurrentPhase(): GamePhase;
  transitionToPhase(phase: GamePhase): Promise<void>;
  isPhaseComplete(): boolean;
}
```

## 6. データフロー

### 6.1 証拠収集フロー
1. プレイヤーが証拠を発見
2. EvidenceManagerが証拠オブジェクトを生成
3. EvidenceAnalyzerが証拠を分析
4. GameManagerが証拠をゲーム状態に統合

### 6.2 アクションログフロー
1. ゲーム内アクションの発生
2. LogManagerがアクションをキャプチャ
3. フィルタリングとメタデータの追加
4. ストレージへの永続化

## 7. スケーラビリティと拡張性

### 7.1 拡張ポイント
- カスタム証拠タイプの追加
- 新しい分析アルゴリズムの実装
- フェーズカスタマイズ
- ログフィルターの拡張

### 7.2 設定による制御
- ゲーム設定の外部化
- プレイヤー数の柔軟な調整
- フェーズタイミングのカスタマイズ
- 証拠関連パラメータの調整

## 8. 技術スタック

- **言語**: TypeScript
- **プラットフォーム**: Minecraft Bedrock Edition
- **フレームワーク**: Minecraft Scripting API
- **外部依存**: ActionLoggerModule (サブモジュール)

## 9. 将来の拡張性

### 9.1 予定されている機能
- AIによる証拠分析の強化
- リアルタイムプレイヤーフィードバック
- 高度な証拠チェーン可視化
- カスタムシナリオエディタ

### 9.2 技術的負債への対応
- パフォーマンス最適化
- コードカバレッジの向上
- ドキュメンテーションの充実
- テスト自動化の拡充