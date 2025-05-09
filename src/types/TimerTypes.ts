import type { GamePhase } from "src/constants/main";

/**
 * タイマー表示の状態を表すインターフェース
 */
export interface TimerDisplay {
  currentPhase: GamePhase;
  remainingTime: {
    minutes: number;
    seconds: number;
  };
  progress: number; // 0-100のパーセンテージ
}

/**
 * 警告表示の設定を定義するインターフェース
 */
export interface WarningConfig {
  threshold: number; // 警告を表示する残り時間（秒）
  blinkInterval: number; // 点滅の間隔（tick）
  messageColor: string; // 警告メッセージの色
}
