import { system, world } from "@minecraft/server";
import { PHASES } from "src/constants/phaseManger";
import { WARNING_CONFIG } from "src/constants/timeManager";
import { GamePhase, type Phase } from "src/types/PhaseType";
import type { TimerDisplay } from "src/types/TimerTypes";
import { PhaseManager } from "./PhaseManager";

/**
 * タイマーマネージャークラス
 * ごとのタイマー管理と表示を担当
 */
export class TimerManager {
  private static instance: TimerManager | null = null;
  private currentTimer: number | undefined;
  private startTime = 0;
  private duration = 0;
  private currentPhase = PHASES.preparation;
  private updateCallback: number | undefined;
  private warningCallback: number | undefined;
  private warningShown = false;
  private isBlinking = false;
  private phaseManager: PhaseManager;

  private constructor() {
    this.phaseManager = PhaseManager.getInstance();
    // 1秒ごとの表示更新を設定（より正確な間隔で）
    this.updateCallback = system.runInterval(() => {
      try {
        this.updateDisplay();
      } catch (error) {
        console.error("タイマー更新中にエラーが発生しました:", error);
        // エラーが発生しても更新は継続
      }
    }, 20); // 20 ticks = 1秒
  }

  /**
   * シングルトンインスタンスの取得
   */
  public static getInstance(): TimerManager {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager();
    }
    return TimerManager.instance;
  }

  /**
   * タイマーの開始
   */
  public startTimer(phase: Phase): void {
    this.startTime = system.currentTick;
    this.warningShown = false;

    // 既存のタイマーをクリア
    if (this.currentTimer !== undefined) {
      system.clearRun(this.currentTimer);
    }

    // 新しいタイマーを設定
    this.currentTimer = system.runTimeout(() => {
      this.onTimerComplete();
    }, phase.duration * 20);
  }

  /**
   * タイマーの停止
   */
  public stopTimer(): void {
    if (this.currentTimer !== undefined) {
      system.clearRun(this.currentTimer);
      this.currentTimer = undefined;
    }
  }

  /**
   * 現在のタイマー状態の取得
   */
  private getTimerState(): TimerDisplay {
    const elapsedTicks = system.currentTick - this.startTime;
    const remainingSeconds = Math.max(
      0,
      this.duration - Math.floor(elapsedTicks / 20),
    );
    const progress = ((this.duration - remainingSeconds) / this.duration) * 100;

    return {
      currentPhase: this.currentPhase,
      remainingTime: {
        minutes: Math.floor(remainingSeconds / 60),
        seconds: remainingSeconds % 60,
      },
      progress,
    };
  }

  /**
   * タイマー表示の更新
   */
  private updateDisplay(): void {
    if (this.currentTimer === undefined) {
      return; // タイマーが動作していない場合は更新しない
    }

    try {
      const state = this.getTimerState();
      const { minutes, seconds } = state.remainingTime;
      const phaseName = this.currentPhase.name;
      const totalSeconds = minutes * 60 + seconds;

      // 残り時間文字列の生成
      const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      // 警告表示の処理
      if (
        totalSeconds <= WARNING_CONFIG.threshold &&
        !this.warningShown &&
        totalSeconds > 0
      ) {
        this.startWarningDisplay(phaseName, totalSeconds);
      }

      // 表示色の設定（警告時は点滅効果）
      const isWarningTime = totalSeconds <= WARNING_CONFIG.threshold;
      const color = this.getDisplayColor(isWarningTime);

      // タイマー表示テキストの生成
      const displayText = `§7[${phaseName}] ${color}残り時間: ${timeString}`;

      // 全プレイヤーに表示
      for (const player of world.getAllPlayers()) {
        player.onScreenDisplay.setActionBar(displayText);
      }
    } catch (error) {
      console.error("タイマー表示の更新中にエラーが発生しました:", error);
      // エラーメッセージも全プレイヤーに表示
      for (const player of world.getAllPlayers()) {
        player.onScreenDisplay.setActionBar(
          "§cタイマー表示の更新中にエラーが発生しました",
        );
      }
    }
  }

  /**
   * タイマー完了時の処理
   */
  private onTimerComplete(): void {
    const message = `§e${this.currentPhase.name}が終了しました`;
    // 全プレイヤーに表示
    for (const player of world.getAllPlayers()) {
      player.onScreenDisplay.setActionBar(message);
    }
    this.currentTimer = undefined;

    if (this.currentPhase.name !== GamePhase.ENDING) {
      const nextPhase = Object.values(PHASES).find(
        (phase) => phase.id === this.currentPhase.id + 1,
      );
      if (nextPhase) {
        this.phaseManager.startPhase(nextPhase); // 次のフェーズを開始
      }
    }
  }

  /**
   * 残り時間の取得（秒）
   */
  private getRemainingTime(): number {
    const elapsedTicks = system.currentTick - this.startTime;
    return Math.max(0, this.duration - Math.floor(elapsedTicks / 20));
  }

  /**
   * リソースの解放
   */
  public dispose(): void {
    try {
      if (this.currentTimer !== undefined) {
        system.clearRun(this.currentTimer);
      }
      if (this.updateCallback !== undefined) {
        system.clearRun(this.updateCallback);
      }
      if (this.warningCallback !== undefined) {
        system.clearRun(this.warningCallback);
      }
      TimerManager.instance = null;
    } catch (error) {
      console.error("TimerManagerの破棄中にエラーが発生しました:", error);
    }
  }

  /**
   * 警告表示の開始
   */
  private startWarningDisplay(phaseName: string, totalSeconds: number): void {
    this.warningShown = true;

    // 警告メッセージの生成（ActionBarに合わせてシンプルに）
    const warningMessage = `§l${WARNING_CONFIG.messageColor}警告: ${phaseName}終了まであと${totalSeconds}秒`;

    // 全プレイヤーに表示
    for (const player of world.getAllPlayers()) {
      player.onScreenDisplay.setActionBar(warningMessage);
    }

    // 点滅効果の開始（より正確な間隔で）
    this.isBlinking = true;
    this.warningCallback = system.runInterval(() => {
      try {
        this.isBlinking = !this.isBlinking;
      } catch (error) {
        console.error("警告表示の更新中にエラーが発生しました:", error);
      }
    }, WARNING_CONFIG.blinkInterval);
  }

  /**
   * 表示色を取得
   */
  private getDisplayColor(isWarningTime: boolean): string {
    if (!isWarningTime) return "§e";
    if (!this.isBlinking) return "§e";

    const remainingTime = this.getRemainingTime();
    if (remainingTime <= 10) return "§c"; // 残り10秒以下は赤色
    return WARNING_CONFIG.messageColor;
  }
}
