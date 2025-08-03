# 高度機能型定義（AdvancedFeatureTypes）の設計

## 概要

ゲーム内の高度な機能に関連する型定義を管理するモジュールです。役職、能力、証拠分析、および投票パターン分析などの機能に関する型を定義します。

## 主要な変更点

### RoleTypeの統一化

- GameTypesからAdvancedFeatureTypesへRoleType enumを移動
- 役職関連の型定義を一箇所に集中化
- より論理的な型の組織化を実現

#### 移動の理由と利点
1. 関心の分離
   - 役職は高度機能（特殊能力など）と密接に関連
   - GameTypesでは基本的なゲームの流れに関する型のみを管理

2. 保守性の向上
   - 役職関連の変更が必要な場合、一箇所での修正で済む
   - 役職と特殊能力の関連性がコード上で明確

3. 型の一貫性
   - IRoleAbilityインターフェースとRoleTypeが同じファイルに存在
   - 関連する型定義の参照が容易

### VotingPatternAnalysisインターフェースの配置

- 投票パターン分析機能を高度機能として位置づけ
- IAnalyticsResultインターフェースと関連付け

#### 設計上の考慮事項
1. 分析機能との統合
   - プレイヤーの行動パターン分析
   - 投票履歴の統計的分析
   - 不審な投票パターンの検出

2. データの整合性
   - 投票データとプレイヤーの行動データの相関分析
   - 証拠の信頼性評価との連携

## インターフェース構成

### 役職関連
- `RoleType`: 基本的な役職を定義するenum
- `IRoleAbility`: 役職固有の特殊能力を定義するインターフェース
- `AbilityTarget`: 能力のターゲットを表す型

### 分析関連
- `IEvidenceReliability`: 証拠の信頼性を評価する指標
- `IAnalyticsResult`: 総合的な分析結果を表現
- `VotingPatternAnalysis`: 投票行動の分析結果を構造化

## 依存関係

- 他のモジュールはRoleTypeをこのモジュールから参照
- 分析関連のインターフェースはAdvancedFeaturesManagerで使用

## 影響範囲

1. GameTypesモジュール
   - RoleType enumの参照元変更
   - PlayerState, GameStateでの型参照の更新

2. ManagerModules
   - AdvancedFeaturesManagerでの型利用
   - 分析機能の実装との整合性確保

## 検証項目

- [ ] RoleType enumの移動による参照の更新確認
- [ ] VotingPatternAnalysis関連機能の動作確認
- [ ] 役職能力システムとの整合性チェック
- [ ] 分析機能の正常動作確認