import { system, world } from "@minecraft/server";
import { GamePhase, type PhaseConfig, type PhaseTransitionResult, type TimerDisplay } from "../types/PhaseTypes";
import { PHASE_CONFIGS, WARNING_THRESHOLDS, getAdjustedPhaseConfig } from "../constants/PhaseConfigs";
import { ScoreboardManager } from "./ScoreboardManager";

/**
 * ゲームフェーズ管理システム
 * 7つのフェーズの進行、タイマー管理、フェーズ遷移を制御
 */
export class PhaseManager {
  private static instance: PhaseManager | null = null;
  private scoreboardManager: ScoreboardManager;
  private currentTimer: number | undefined;
  private displayTimer: number | undefined;
  private currentPhaseConfig: PhaseConfig;

  private constructor() {
    this.scoreboardManager = ScoreboardManager.getInstance();
    this.currentPhaseConfig = PHASE_CONFIGS[GamePhase.PREPARATION];
    console.log("PhaseManager initialized");
  }

  public static getInstance(): PhaseManager {
    if (!PhaseManager.instance) {
      PhaseManager.instance = new PhaseManager();
    }
    return PhaseManager.instance;
  }

  /**
   * 指定フェーズを開始
   */
  public async startPhase(phase: GamePhase): Promise<PhaseTransitionResult> {
    try {
      const playerCount = world.getAllPlayers().length;
      const phaseConfig = getAdjustedPhaseConfig(phase, playerCount);
      if (!phaseConfig) {
        return {
          success: false,
          previousPhase: this.currentPhaseConfig.phase,
          currentPhase: this.currentPhaseConfig.phase,
          error: `無効なフェーズ: ${phase}`
        };
      }

      const previousPhase = this.currentPhaseConfig.phase;
      
      // 現在のタイマーを停止
      this.stopCurrentTimer();
      
      // フェーズ設定更新
      this.currentPhaseConfig = phaseConfig;
      
      // Scoreboardに状態保存
      this.scoreboardManager.setGamePhase(phaseConfig.id);
      this.scoreboardManager.setPhaseTimer(phaseConfig.duration);
      
      // 特別なフェーズ処理
      await this.handlePhaseSpecialActions(phase);
      
      // タイマー開始
      this.startPhaseTimer(phaseConfig);
      
      // プレイヤーに通知
      this.notifyPhaseStart(phaseConfig);
      
      console.log(`Phase started: ${phase} (${phaseConfig.duration}s)`);
      
      return {
        success: true,
        previousPhase,
        currentPhase: phase
      };
      
    } catch (error) {
      console.error("Failed to start phase:", error);
      return {
        success: false,
        previousPhase: this.currentPhaseConfig.phase,
        currentPhase: this.currentPhaseConfig.phase,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * 現在のフェーズを取得
   */
  public getCurrentPhase(): GamePhase {
    return this.currentPhaseConfig.phase;
  }

  /**
   * 現在のフェーズ設定を取得
   */
  public getCurrentPhaseConfig(): PhaseConfig {
    return this.currentPhaseConfig;
  }

  /**
   * 次のフェーズに自動遷移
   */
  public async advanceToNextPhase(): Promise<PhaseTransitionResult> {
    const nextPhase = this.currentPhaseConfig.nextPhase;
    
    if (!nextPhase) {
      // ゲーム終了
      await this.endGame();
      return {
        success: true,
        previousPhase: this.currentPhaseConfig.phase,
        currentPhase: GamePhase.ENDING
      };
    }
    
    return await this.startPhase(nextPhase);
  }

  /**
   * アクションが現在のフェーズで許可されているかチェック
   */
  public isActionAllowed(action: string): boolean {
    return this.currentPhaseConfig.allowedActions.includes(action);
  }

  /**
   * フェーズタイマーを開始
   */
  private startPhaseTimer(config: PhaseConfig): void {
    // メインタイマー（フェーズ時間経過）
    this.currentTimer = system.runTimeout(() => {
      this.onPhaseTimeUp();
    }, config.duration * 20); // 秒 → tick変換

    // 表示更新タイマー（1秒間隔）
    this.displayTimer = system.runInterval(() => {
      this.updateTimerDisplay();
    }, 20);
    
    console.log(`Phase timer started: ${config.duration}s`);
  }

  /**
   * 現在のタイマーを停止
   */
  private stopCurrentTimer(): void {
    if (this.currentTimer !== undefined) {
      system.clearRun(this.currentTimer);
      this.currentTimer = undefined;
    }
    
    if (this.displayTimer !== undefined) {
      system.clearRun(this.displayTimer);
      this.displayTimer = undefined;
    }
  }

  /**
   * タイマー表示を更新
   */
  private updateTimerDisplay(): void {
    const remainingTime = this.scoreboardManager.getPhaseTimer();
    
    if (remainingTime <= 0) {
      return;
    }
    
    // 残り時間を1秒減算
    this.scoreboardManager.setPhaseTimer(remainingTime - 1);
    
    const display = this.createTimerDisplay(remainingTime - 1);
    this.showTimerToPlayers(display);
  }

  /**
   * タイマー表示情報を作成
   */
  private createTimerDisplay(remainingSeconds: number): TimerDisplay {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const totalDuration = this.currentPhaseConfig.duration;
    const elapsed = totalDuration - remainingSeconds;
    const progress = (elapsed / totalDuration) * 100;
    
    const isWarning = remainingSeconds <= WARNING_THRESHOLDS.WARNING_TIME;
    
    return {
      remainingTime: { minutes, seconds },
      progress,
      isWarning
    };
  }

  /**
   * プレイヤーにタイマーを表示
   */
  private showTimerToPlayers(display: TimerDisplay): void {
    const { minutes, seconds } = display.remainingTime;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // 警告レベルに応じて色を変更
    let color = "§a"; // 緑（通常）
    if (display.remainingTime.minutes === 0 && display.remainingTime.seconds <= WARNING_THRESHOLDS.CRITICAL_TIME) {
      color = "§c"; // 赤（緊急）
    } else if (display.isWarning) {
      color = "§e"; // 黄（警告）
    }
    
    const displayText = `§7[${this.currentPhaseConfig.name}] ${color}残り時間: ${timeString}`;
    
    // 全プレイヤーのActionBarに表示
    for (const player of world.getAllPlayers()) {
      player.onScreenDisplay.setActionBar(displayText);
    }
  }

  /**
   * フェーズ時間終了時の処理
   */
  private async onPhaseTimeUp(): Promise<void> {
    console.log(`Phase time up: ${this.currentPhaseConfig.phase}`);
    
    // フェーズ終了通知
    world.sendMessage(`§e${this.currentPhaseConfig.name}が終了しました`);
    
    // 次のフェーズに遷移
    await this.advanceToNextPhase();
  }

  /**
   * フェーズ固有の処理
   */
  private async handlePhaseSpecialActions(phase: GamePhase): Promise<void> {
    switch (phase) {
      case GamePhase.PREPARATION:
        // 準備フェーズ：プレイヤー初期化
        await this.initializePlayers();
        break;
        
      case GamePhase.DAILY_LIFE:
        // 生活フェーズ：開始時刻記録
        this.scoreboardManager.setDailyLifeStartTime(system.currentTick);
        this.scoreboardManager.setGameDay(1);
        break;
        
      case GamePhase.INVESTIGATION:
        // 調査フェーズ：証拠抽出開始
        await this.startEvidenceCollection();
        break;
        
      case GamePhase.VOTING:
        // 投票フェーズ：投票システム開始
        await this.startVotingSystem();
        break;
        
      case GamePhase.ENDING:
        // 終了フェーズ：結果計算
        await this.calculateFinalResults();
        break;
    }
  }

  /**
   * フェーズ開始をプレイヤーに通知
   */
  private notifyPhaseStart(config: PhaseConfig): void {
    world.sendMessage("§l§6============================");
    world.sendMessage(`§l§e${config.name}が開始されました！`);
    world.sendMessage(`§7${config.description}`);
    
    const minutes = Math.floor(config.duration / 60);
    const seconds = config.duration % 60;
    let timeText = "";
    if (minutes > 0) {
      timeText = `${minutes}分`;
      if (seconds > 0) {
        timeText += `${seconds}秒`;
      }
    } else {
      timeText = `${seconds}秒`;
    }
    world.sendMessage(`§e制限時間: ${timeText}`);
    world.sendMessage("§l§6============================");
  }

  /**
   * プレイヤー初期化（準備フェーズ）
   */
  private async initializePlayers(): Promise<void> {
    for (const player of world.getAllPlayers()) {
      // プレイヤー状態をリセット
      this.scoreboardManager.setPlayerAlive(player, true);
      this.scoreboardManager.setPlayerVotes(player, 0);
      this.scoreboardManager.setEvidenceCount(player, 0);
      this.scoreboardManager.setAbilityUses(player, 0);
      this.scoreboardManager.setCooldownTimer(player, 0);
      this.scoreboardManager.setPlayerScore(player, 0);
    }
    console.log("Players initialized for new game");
  }

  /**
   * 証拠収集開始（調査フェーズ）
   */
  private async startEvidenceCollection(): Promise<void> {
    // 証拠抽出処理は後で実装
    console.log("Evidence collection started");
  }

  /**
   * 投票システム開始（投票フェーズ）
   */
  private async startVotingSystem(): Promise<void> {
    // 投票システムは後で実装
    console.log("Voting system started");
  }

  /**
   * 最終結果計算（終了フェーズ）
   */
  private async calculateFinalResults(): Promise<void> {
    // 結果計算は後で実装
    console.log("Final results calculated");
  }

  /**
   * ゲーム終了処理
   */
  private async endGame(): Promise<void> {
    this.stopCurrentTimer();
    
    // 全プレイヤーに終了通知
    world.sendMessage("§l§6============================");
    world.sendMessage("§l§aマーダーミステリーゲーム終了！");
    world.sendMessage("§eお疲れ様でした！");
    world.sendMessage("§l§6============================");
    
    console.log("Game ended");
  }

  /**
   * 緊急フェーズ変更（管理者用）
   */
  public async forcePhaseChange(phase: GamePhase): Promise<PhaseTransitionResult> {
    console.log(`Force phase change to: ${phase}`);
    return await this.startPhase(phase);
  }

  /**
   * 残り時間を取得
   */
  public getRemainingTime(): number {
    return this.scoreboardManager.getPhaseTimer();
  }

  /**
   * 残り時間を設定（管理者用）
   */
  public setRemainingTime(seconds: number): void {
    this.scoreboardManager.setPhaseTimer(seconds);
    console.log(`Phase timer set to: ${seconds}s`);
  }

  /**
   * リソースの解放
   */
  public dispose(): void {
    this.stopCurrentTimer();
    console.log("PhaseManager disposed");
    PhaseManager.instance = null;
  }
}