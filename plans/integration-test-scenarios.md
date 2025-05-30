# マーダーミステリー - 統合テストシナリオ

## 1. ゲーム開始フローのテスト

### 1.1 最小プレイヤー数での開始テスト
#### テスト条件
- プレイヤー数: 4人（最小プレイヤー数）
- アドオンが有効化されていること
- チュートリアル未表示状態

#### チェックポイント
- [ ] チュートリアルが自動的に表示されること
- [ ] 各役職（探偵1、殺人者1、共犯者1、市民1）が適切に割り当てられること
- [ ] PreparePhaseが正しく開始されること
- [ ] ゲーム開始ログが正しく記録されること

#### 確認方法
1. `GameManager.startGame()`を4人構成で実行
2. 返却されるStartupResultの内容を確認
3. ゲーム状態とログを検証

### 1.2 最大プレイヤー数での開始テスト
#### テスト条件
- プレイヤー数: 20人（最大プレイヤー数）
- アドオンが有効化されていること

#### チェックポイント
- [ ] 全プレイヤーに役職が割り当てられること
- [ ] ゲーム状態が正しく初期化されること
- [ ] システムリソースが適切に管理されること

#### 確認方法
1. `GameManager.startGame()`を20人構成で実行
2. メモリ使用量とパフォーマンスを監視
3. 役職分布を確認

### 1.3 プレイヤー数不足時の処理テスト
#### テスト条件
- プレイヤー数: 3人（最小要件未満）
- アドオンが有効化されていること

#### チェックポイント
- [ ] エラーメッセージが適切に表示されること
- [ ] ゲームが開始されないこと
- [ ] エラーログが正しく記録されること

#### 確認方法
1. `GameManager.startGame()`を3人構成で実行
2. エラーハンドリングの動作を確認
3. ログ内容を検証

### 1.4 アドオン未有効時の処理テスト
#### テスト条件
- プレイヤー数: 4人
- アドオンが無効化されている状態

#### チェックポイント
- [ ] 適切なエラーメッセージが表示されること
- [ ] システムログにエラーが記録されること
- [ ] クリーンアップ処理が正しく実行されること

#### 確認方法
1. アドオンを無効化した状態で起動
2. `GameManager.startGame()`を実行
3. エラー処理とログを確認

## 2. チュートリアル機能のテスト

### 2.1 自動表示の確認テスト
#### テスト条件
- 初回起動時
- チュートリアル未表示状態

#### チェックポイント
- [ ] ゲーム開始時に自動的にチュートリアルが表示されること
- [ ] チュートリアルの全ページが正しい順序で表示されること
- [ ] 表示内容が最新のものであること

#### 確認方法
1. 新規ゲーム開始
2. チュートリアル表示イベントを監視
3. 表示内容とタイミングを検証

### 2.2 ページ送り動作テスト
#### テスト条件
- チュートリアル表示中
- 各ページでの操作

#### チェックポイント
- [ ] プレイヤーのアクションでページ送りが可能なこと
- [ ] 自動送り（2秒）が正常に機能すること
- [ ] ページ番号が正しく更新されること

#### 確認方法
1. 各ページでのユーザー操作をシミュレート
2. タイマー動作を検証
3. ページ遷移の正確性を確認

### 2.3 プレイヤーの操作応答テスト
#### テスト条件
- チュートリアル表示中の各種プレイヤー操作

#### チェックポイント
- [ ] プレイヤーのアクションが正しく認識されること
- [ ] 不適切な操作が適切に無視されること
- [ ] 操作ログが正しく記録されること

#### 確認方法
1. 様々なプレイヤー操作をシミュレート
2. システムの応答を確認
3. ログエントリを検証

### 2.4 表示内容の正確性テスト
#### テスト条件
- 全チュートリアルページの表示

#### チェックポイント
- [ ] 各ページの内容が仕様通りであること
- [ ] テキストフォーマットが正しく適用されること
- [ ] 多言語対応が正常に機能すること

#### 確認方法
1. 各ページの内容を仕様と照合
2. フォーマット適用状態を確認
3. 必要に応じて異なる言語設定でテスト

## 3. フェーズ管理のテスト

### 3.1 準備フェーズからの遷移テスト
#### テスト条件
- ゲーム開始直後の準備フェーズ

#### チェックポイント
- [ ] 全プレイヤーの準備完了で次フェーズに移行すること
- [ ] フェーズ固有の初期化処理が実行されること
- [ ] フェーズ変更がログに記録されること

#### 確認方法
1. 準備フェーズの完了条件を満たす
2. フェーズ遷移をモニタリング
3. ログエントリを確認

### 3.2 タイマー連動テスト
#### テスト条件
- 各フェーズでのタイマー動作

#### チェックポイント
- [ ] フェーズごとの制限時間が正しく設定されること
- [ ] タイマー表示が正確に更新されること
- [ ] タイムアップ時の処理が正常に実行されること

#### 確認方法
1. 各フェーズでのタイマー動作を確認
2. 表示更新の正確性を検証
3. 時間切れ時の挙動を確認

### 3.3 役職割り当てテスト
#### テスト条件
- プレイヤー数が異なる複数のケース

#### チェックポイント
- [ ] 役職が仕様通りの比率で割り当てられること
- [ ] プレイヤーに役職が正しく通知されること
- [ ] 役職情報の機密性が保たれること

#### 確認方法
1. 複数の人数パターンでテスト
2. 役職分布を検証
3. 情報アクセス制御を確認

### 3.4 エラー時の処理テスト
#### テスト条件
- 様々なエラー発生シナリオ

#### チェックポイント
- [ ] フェーズ遷移エラーが適切に処理されること
- [ ] エラー状態からの回復が可能なこと
- [ ] エラーログが詳細に記録されること

#### 確認方法
1. 異常系シナリオを実行
2. エラーハンドリングを検証
3. ログとクリーンアップを確認

## テスト実施上の注意事項

### パフォーマンス要件
- フェーズ遷移の遅延: 100ms以内
- タイマー表示の更新遅延: 16ms以内
- メモリ使用量の監視

### セキュリティ要件
- プレイヤーの役職情報の保護
- 不正な遷移の防止
- ログデータの整合性確保