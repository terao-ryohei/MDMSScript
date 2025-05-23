# タイマー型定義（TimerTypes）の設計

## 概要

ゲーム内のタイマー機能に関する型定義を管理するモジュールです。タイマーの表示状態と警告設定に関する型を定義し、時間管理機能の一貫性を確保します。

## 目的

1. タイマー関連の型を独立したモジュールとして分離
2. UI表示と警告設定の明確な定義
3. 時間管理機能の型安全性の向上

## インターフェース定義

### ITimerDisplay

タイマーの表示状態を管理するインターフェース

```typescript
interface ITimerDisplay {
  currentPhase: GamePhase;
  remainingTime: {
    minutes: number;
    seconds: number;
  };
  progress: number; // 0-100のパーセンテージ
}
```

#### 主要コンポーネント
- currentPhase: 現在のゲームフェーズ
- remainingTime: 残り時間（分、秒）
- progress: 進行度のパーセンテージ表示

### IWarningConfig

タイマーの警告表示設定を管理するインターフェース

```typescript
interface IWarningConfig {
  threshold: number;    // 警告を表示する残り時間（秒）
  blinkInterval: number; // 点滅の間隔（tick）
  messageColor: string;  // 警告メッセージの色
}
```

#### 設定項目
- threshold: 警告開始のタイミング
- blinkInterval: 視覚的警告の制御
- messageColor: UI表示の一貫性確保

## 依存関係

1. モジュール間の依存
   - GameTypesからGamePhase enumを参照
   - TimerManagerで主に使用

2. 影響を受けるコンポーネント
   - UIコンポーネント（タイマー表示）
   - 警告システム
   - フェーズ管理システム

## 設計上の考慮事項

### 分離の理由
1. 関心の分離
   - タイマー固有の型を独立したモジュールで管理
   - UI関連の型定義を明確に分類

2. 再利用性
   - 他のゲームモードでも利用可能な汎用的な定義
   - カスタマイズ可能な警告設定

3. 保守性
   - タイマー関連の変更を一箇所で管理
   - 型定義の変更影響を最小限に抑制

### UI/UX考慮事項
1. 表示形式
   - 直感的な残り時間表示
   - プログレスバーによる視覚的フィードバック

2. 警告システム
   - カスタマイズ可能な警告閾値
   - 柔軟な視覚的フィードバック設定

## 検証項目

- [ ] ITimerDisplayの全フィールドが正しく更新されることの確認
- [ ] IWarningConfigの設定が期待通りに適用されることの確認
- [ ] GamePhaseとの連携が正常に機能することの確認
- [ ] 警告表示システムの動作確認
- [ ] プログレス表示の正確性確認

## 今後の展開

1. 機能拡張の可能性
   - カスタムタイマーフォーマットの追加
   - 追加の警告オプションの導入
   - アニメーション設定の拡充

2. パフォーマンス最適化
   - 更新頻度の最適化
   - メモリ使用量の効率化

## 補足事項

- 型の明確な分離により、タイマー機能の管理が容易に
- UI/UX要件に柔軟に対応可能な設計
- 将来の機能拡張に対する準備が整備