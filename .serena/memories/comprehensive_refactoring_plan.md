# MDMS 包括的リファクタリングプラン

## Phase 1: 共通ユーティリティの統合 (最優先)

### 1.1 共通ユーティリティファイルの作成
**新規作成**: `src/utils/CommonUtils.ts`

**内容**:
- `calculateDistance(pos1: Vector3, pos2: Vector3): number`
- `formatTime(seconds: number): string`
- `clamp(value: number, min: number, max: number): number`

**置換対象**: 5つのファイルから重複するcalculateDistance関数を削除

### 1.2 プレイヤー状態キャッシングシステム
**新規作成**: `src/utils/PlayerStateCache.ts`

**機能**:
- プレイヤーの役職、職業、生存状態をキャッシュ
- 自動的な無効化メカニズム
- `getCachedPlayerRole`, `getCachedPlayerJob`, `getCachedPlayerAlive`

**利点**: 頻繁な状態チェックのパフォーマンス向上

## Phase 2: UIシステムの統合・標準化

### 2.1 UIベースクラスの作成
**新規作成**: `src/managers/ui/BaseUIManager.ts`

**提供機能**:
```typescript
abstract class BaseUIManager {
  protected createActionForm(title: string, body: string): ActionFormData
  protected createMessageForm(title: string, body: string): MessageFormData
  protected showConfirmationDialog(player: Player, message: string): Promise<boolean>
  protected handleUIError(player: Player, error: Error): void
  protected formatPlayerList(players: Player[]): string[]
}
```

### 2.2 UI共通パターンファクトリー
**新規作成**: `src/utils/UIPatterns.ts`

**機能**:
- プレイヤー選択UI
- 確認ダイアログ
- 一覧表示UI
- エラー表示UI

### 2.3 既存UIManagerの継承リファクタリング
**対象ファイル**: 8つのUIManagerファイル
- BaseUIManagerからの継承
- 重複コードの削除
- 統一された命名規則の適用

## Phase 3: アーキテクチャの最適化

### 3.1 Manager間の依存関係整理
**問題**: 循環依存の可能性
**解決**: 
- 依存関係グラフの作成
- インターフェースベースの依存注入
- EventBusパターンの導入検討

### 3.2 型定義の統合
**新規作成**: `src/types/CommonTypes.ts`
- 共通で使用される基本型
- ユーティリティ型の定義

### 3.3 エラーハンドリングの標準化
**新規作成**: `src/utils/ErrorHandler.ts`
- 統一されたエラー処理
- ログ出力の標準化
- プレイヤーへの通知システム

## Phase 4: パフォーマンス最適化

### 4.1 関数の実行頻度最適化
- 重い処理のキャッシング
- 不要な再計算の削除
- イベントドリブンな更新

### 4.2 メモリ使用量の最適化
- 使用されていないオブジェクトの解放
- イベントリスナーの適切な管理

## 実装スケジュール

### Week 1: Phase 1 (共通ユーティリティ)
- Day 1-2: CommonUtils.tsの作成と既存関数の移行
- Day 3-4: PlayerStateCacheの実装
- Day 5: テストと統合

### Week 2: Phase 2 (UIシステム統合)
- Day 1-3: BaseUIManager設計と実装
- Day 4-5: UIManagersのリファクタリング

### Week 3: Phase 3 (アーキテクチャ最適化)
- Day 1-2: 依存関係分析と整理
- Day 3-4: ErrorHandlerの実装
- Day 5: 統合テスト

### Week 4: Phase 4 (最終最適化)
- Day 1-3: パフォーマンス測定と改善
- Day 4-5: 最終テストと文書化

## 期待される効果

### コード削減量
- **行数削減**: 約500-800行（重複の20-30%削減）
- **ファイル数整理**: UIパターンの統合により実質的な複雑性軽減

### 保守性向上
- 統一されたパターンによる理解しやすさ
- 変更時の影響範囲の限定
- テストの容易性向上

### パフォーマンス改善
- プレイヤー状態チェックの高速化
- UIレスポンスの向上
- メモリ使用量の削減

## リスク管理
- 段階的な実装でリスクを分散
- 各段階でのテスト実施
- ロールバック可能な設計
- 既存機能への影響を最小化

## 必要リソース
- 開発工数: 約3-4週間
- テスト工数: 各段階で1-2日
- レビュー工数: 週1回のコードレビュー