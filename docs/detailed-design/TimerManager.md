# TimerManager クラス詳細設計書

## 1. クラスの責務と概要

TimerManagerクラスは、マーダーミステリーゲームにおけるフェーズごとのタイマー管理と表示を担当する中核コンポーネントです。以下の主要な責務を持ちます：

- フェーズごとのタイマー管理
- 残り時間の表示制御
- プログレスバーの表示
- 警告通知の強調表示
- PhaseManagerとの連携

## 2. 主要コンポーネント

### 2.1 TimerDisplay インターフェース

```typescript
interface TimerDisplay {
  currentPhase: GamePhase;
  remainingTime: {
    minutes: number;
    seconds: number;
  };
  progress: number; // 0-100のパーセンテージ
}
```

### 2.2 WarningConfig インターフェース

```typescript
interface WarningConfig {
  threshold: number; // 警告を表示する残り時間（秒）
  blinkInterval: number; // 点滅の間隔（tick）
  messageColor: string; // 警告メッセージの色
}
```

### 2.3 フェーズ名マッピング

```typescript
public static readonly PHASE_NAMES: Record<GamePhase, string> = {
  [GamePhase.PREPARATION]: "準備",
  [GamePhase.DAILY_LIFE]: "日常生活",
  [GamePhase.INVESTIGATION]: "調査",
  [GamePhase.DISCUSSION]: "会議",
  [GamePhase.PRIVATE_TALK]: "密談",
  [GamePhase.FINAL_MEETING]: "最終会議",
  [GamePhase.REASONING]: "推理披露",
  [GamePhase.VOTING]: "投票",
  [GamePhase.ENDING]: "エンディング",
};
```

## 3. 主要機能

### 3.1 タイマー管理

- タイマーの開始、停止、一時停止機能
- 残り時間の計算と管理
- フェーズごとの制限時間設定
- シングルトンパターンによるインスタンス管理

### 3.2 表示制御

#### プログレスバー表示
```typescript
private generateProgressBar(progress: number): string {
  const barLength = 20;
  const filledLength = Math.floor((progress / 100) * barLength);
  const emptyLength = barLength - filledLength;
  return `§8[${"§a▮".repeat(filledLength)}${"§7▯".repeat(emptyLength)}§8]`;
}
```

#### 警告通知
- 残り時間30秒でのカラー変更
- テキストの点滅効果
- 強調表示されたメッセージフレーム
- 残り10秒での赤色表示

### 3.3 エラーハンドリング

- タイマー操作時の例外処理
- リソース解放時の安全性確保
- エラーメッセージのログ記録
- ユーザーへのエラー通知

## 4. 最適化と性能

### 4.1 表示更新の最適化

- 5秒ごとの通常更新
- 警告時は毎秒更新
- 残り10秒以内は毎秒更新
- 条件付き表示更新による負荷軽減

### 4.2 メモリ管理

- シングルトンインスタンスの適切な管理
- タイマーIDの追跡と解放
- 警告表示用リソースの管理
- メモリリークの防止

## 5. 制限事項

### 5.1 現在の制限

- 同時に1つのタイマーのみ管理可能
- 表示更新は条件付き（5秒間隔/警告時/残り10秒以内）
- 警告通知は30秒固定（カスタマイズ不可）

### 5.2 今後の課題

- 複数タイマーの同時管理
- カスタマイズ可能な警告閾値
- より柔軟な表示更新間隔

## 6. 更新履歴

### Version 1.1.0 (2025-04-30)
- プログレスバー表示機能の追加
- 警告表示の強調機能の強化
- PHASE_NAMESのアクセス修飾子をpublicに変更
- エラーハンドリングの詳細化

### Version 1.0.0 (2025-04-29)
- 初期実装
- 基本的なタイマー機能
- フェーズ管理との統合
- 警告通知システム