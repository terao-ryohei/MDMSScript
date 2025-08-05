import { world } from "@minecraft/server";

/**
 * Scoreboardベースのデータ管理システム
 * ゲーム状態とプレイヤー情報をMinecraftのscoreboard機能で永続管理
 */
export class ScoreboardManager {
  private static instance: ScoreboardManager | null = null;

  // ゲーム状態管理用オブジェクト
  private readonly GAME_OBJECTIVES = {
    // ゲーム進行状態
    GAME_PHASE: "mdms_phase",           // 0=準備, 1=生活, 2=調査, 3=会議, 4=再調査, 5=推理, 6=投票
    GAME_DAY: "mdms_day",               // 1-3 (生活フェーズの日数)
    GAME_TIME: "mdms_time",             // 0=朝, 1=昼, 2=夕, 3=夜
    PHASE_TIMER: "mdms_timer",          // 残り時間（秒）
    MURDER_OCCURRED: "mdms_murder",     // 0=未発生, 1=発生済み
    DAILY_LIFE_START: "mdms_dl_start",  // 生活フェーズ開始時刻
    CRIME_TIME: "mdms_crime_time",      // 事件発生時刻
    
    // プレイヤー基本状態
    PLAYER_ROLE: "mdms_role",           // 0=市民, 1=犯人, 2=共犯者
    PLAYER_JOB: "mdms_job",             // 0-9の職業ID
    PLAYER_ALIVE: "mdms_alive",         // 0=死亡, 1=生存
    PLAYER_VOTES: "mdms_votes",         // 受けた投票数
    
    // 証拠・能力関連
    EVIDENCE_COUNT: "mdms_evidence",     // 収集証拠数
    ABILITY_USES: "mdms_ability_uses",   // 能力使用回数
    COOLDOWN_TIMER: "mdms_cooldown",     // クールダウン残り時間
    
    // スコアリング
    PLAYER_SCORE: "mdms_score",         // 総得点
    BASE_SCORE: "mdms_base",            // 基礎点
    OBJECTIVE_SCORE: "mdms_obj",        // 目的達成点
  } as const;

  // ロール・ジョブ・能力のマッピング
  private readonly ROLE_IDS = {
    CITIZEN: 0,
    MURDERER: 1,
    ACCOMPLICE: 2
  } as const;

  private readonly JOB_IDS = {
    KING: 0,
    CAPTAIN: 1,
    WIZARD: 2,
    MERCHANT: 3,
    GUILD_RECEPTIONIST: 4,
    BLACKSMITH: 5,
    TAVERN_OWNER: 6,
    GARDENER: 7,
    MAID: 8,
    ALCHEMIST: 9
  } as const;

  private readonly PHASE_IDS = {
    PREPARATION: 0,
    DAILY_LIFE: 1,
    INVESTIGATION: 2,
    DISCUSSION: 3,
    REINVESTIGATION: 4,
    DEDUCTION: 5,
    VOTING: 6,
    ENDING: 7
  } as const;

  private constructor() {
    console.log("ScoreboardManager initialized");
  }

  public static getInstance(): ScoreboardManager {
    if (!ScoreboardManager.instance) {
      ScoreboardManager.instance = new ScoreboardManager();
    }
    return ScoreboardManager.instance;
  }

  /**
   * 全Scoreboardオブジェクトを初期化
   */
  public initializeObjectives(): void {
    console.log("Initializing MDMS scoreboard objectives...");
    
    for (const [name, objectiveName] of Object.entries(this.GAME_OBJECTIVES)) {
      try {
        // 既存のオブジェクトを削除
        const existing = world.scoreboard.getObjective(objectiveName);
        if (existing) {
          world.scoreboard.removeObjective(objectiveName);
        }
        
        // 新しいオブジェクトを作成
        world.scoreboard.addObjective(objectiveName, objectiveName);
        console.log(`Created objective: ${objectiveName}`);
      } catch (error) {
        console.error(`Failed to create objective ${objectiveName}:`, error);
      }
    }
    
    // 初期値設定
    this.setDefaultValues();
    console.log("Scoreboard objectives initialized successfully");
  }

  /**
   * デフォルト値を設定
   */
  private setDefaultValues(): void {
    // ゲーム状態の初期化
    this.setGamePhase(this.PHASE_IDS.PREPARATION);
    this.setGameDay(1);
    this.setGameTime(0); // 朝
    this.setMurderOccurred(false);
    
    // 全プレイヤーの初期状態設定
    for (const player of world.getAllPlayers()) {
      this.setPlayerRole(player, this.ROLE_IDS.CITIZEN);
      this.setPlayerJob(player, 0);
      this.setPlayerAlive(player, true);
      this.setPlayerVotes(player, 0);
      this.setEvidenceCount(player, 0);
      this.setAbilityUses(player, 0);
      this.setCooldownTimer(player, 0);
      this.setPlayerScore(player, 0);
      this.setBaseScore(player, 0);
      this.setObjectiveScore(player, 0);
    }
  }

  // === ゲーム状態管理メソッド ===

  public setGamePhase(phase: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.GAME_PHASE)?.setScore("global", phase);
  }

  public getGamePhase(): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.GAME_PHASE)?.getScore("global") ?? 0;
  }

  public setGameDay(day: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.GAME_DAY)?.setScore("global", day);
  }

  public getGameDay(): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.GAME_DAY)?.getScore("global") ?? 1;
  }

  public setGameTime(time: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.GAME_TIME)?.setScore("global", time);
  }

  public getGameTime(): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.GAME_TIME)?.getScore("global") ?? 0;
  }

  public setPhaseTimer(seconds: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.PHASE_TIMER)?.setScore("global", seconds);
  }

  public getPhaseTimer(): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.PHASE_TIMER)?.getScore("global") ?? 0;
  }

  public setMurderOccurred(occurred: boolean): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.MURDER_OCCURRED)?.setScore("global", occurred ? 1 : 0);
  }

  public getMurderOccurred(): boolean {
    return (world.scoreboard.getObjective(this.GAME_OBJECTIVES.MURDER_OCCURRED)?.getScore("global") ?? 0) === 1;
  }

  public setDailyLifeStartTime(timestamp: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.DAILY_LIFE_START)?.setScore("global", timestamp);
  }

  public getDailyLifeStartTime(): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.DAILY_LIFE_START)?.getScore("global") ?? 0;
  }

  public setCrimeTime(timestamp: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.CRIME_TIME)?.setScore("global", timestamp);
  }

  public getCrimeTime(): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.CRIME_TIME)?.getScore("global") ?? 0;
  }

  // === プレイヤー状態管理メソッド ===

  public setPlayerRole(player: any, roleId: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.PLAYER_ROLE)?.setScore(player, roleId);
  }

  public getPlayerRole(player: any): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.PLAYER_ROLE)?.getScore(player) ?? 0;
  }

  public setPlayerJob(player: any, jobId: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.PLAYER_JOB)?.setScore(player, jobId);
  }

  public getPlayerJob(player: any): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.PLAYER_JOB)?.getScore(player) ?? 0;
  }

  public setPlayerAlive(player: any, alive: boolean): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.PLAYER_ALIVE)?.setScore(player, alive ? 1 : 0);
  }

  public isPlayerAlive(player: any): boolean {
    return (world.scoreboard.getObjective(this.GAME_OBJECTIVES.PLAYER_ALIVE)?.getScore(player) ?? 1) === 1;
  }

  public setPlayerVotes(player: any, votes: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.PLAYER_VOTES)?.setScore(player, votes);
  }

  public getPlayerVotes(player: any): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.PLAYER_VOTES)?.getScore(player) ?? 0;
  }

  public setEvidenceCount(player: any, count: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.EVIDENCE_COUNT)?.setScore(player, count);
  }

  public getEvidenceCount(player: any): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.EVIDENCE_COUNT)?.getScore(player) ?? 0;
  }

  public setAbilityUses(player: any, uses: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.ABILITY_USES)?.setScore(player, uses);
  }

  public getAbilityUses(player: any): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.ABILITY_USES)?.getScore(player) ?? 0;
  }

  public setCooldownTimer(player: any, seconds: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.COOLDOWN_TIMER)?.setScore(player, seconds);
  }

  public getCooldownTimer(player: any): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.COOLDOWN_TIMER)?.getScore(player) ?? 0;
  }

  public setPlayerScore(player: any, score: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.PLAYER_SCORE)?.setScore(player, score);
  }

  public getPlayerScore(player: any): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.PLAYER_SCORE)?.getScore(player) ?? 0;
  }

  public setBaseScore(player: any, score: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.BASE_SCORE)?.setScore(player, score);
  }

  public getBaseScore(player: any): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.BASE_SCORE)?.getScore(player) ?? 0;
  }

  public setObjectiveScore(player: any, score: number): void {
    world.scoreboard.getObjective(this.GAME_OBJECTIVES.OBJECTIVE_SCORE)?.setScore(player, score);
  }

  public getObjectiveScore(player: any): number {
    return world.scoreboard.getObjective(this.GAME_OBJECTIVES.OBJECTIVE_SCORE)?.getScore(player) ?? 0;
  }

  // === ユーティリティメソッド ===

  /**
   * ロールIDから文字列に変換
   */
  public getRoleString(roleId: number): string {
    const entries = Object.entries(this.ROLE_IDS);
    return entries.find(([_, id]) => id === roleId)?.[0].toLowerCase() ?? "citizen";
  }

  /**
   * ジョブIDから文字列に変換
   */
  public getJobString(jobId: number): string {
    const entries = Object.entries(this.JOB_IDS);
    return entries.find(([_, id]) => id === jobId)?.[0].toLowerCase() ?? "king";
  }

  /**
   * フェーズIDから文字列に変換
   */
  public getPhaseString(phaseId: number): string {
    const entries = Object.entries(this.PHASE_IDS);
    return entries.find(([_, id]) => id === phaseId)?.[0].toLowerCase() ?? "preparation";
  }

  /**
   * 全プレイヤーの状態をコンソールに出力（デバッグ用）
   */
  public debugPlayerStates(): void {
    console.log("=== MDMS Player States ===");
    for (const player of world.getAllPlayers()) {
      const role = this.getPlayerRole(player);
      const job = this.getPlayerJob(player);
      const alive = this.isPlayerAlive(player);
      const score = this.getPlayerScore(player);
      const evidence = this.getEvidenceCount(player);
      
      console.log(`${player.name}: Role=${this.getRoleString(role)}, Job=${this.getJobString(job)}, Alive=${alive}, Score=${score}, Evidence=${evidence}`);
    }
  }

  /**
   * ゲーム状態をコンソールに出力（デバッグ用）
   */
  public debugGameState(): void {
    console.log("=== MDMS Game State ===");
    console.log(`Phase: ${this.getPhaseString(this.getGamePhase())}`);
    console.log(`Day: ${this.getGameDay()}`);
    console.log(`Timer: ${this.getPhaseTimer()}s`);
    console.log(`Murder Occurred: ${this.getMurderOccurred()}`);
    console.log(`Daily Life Start: ${this.getDailyLifeStartTime()}`);
    console.log(`Crime Time: ${this.getCrimeTime()}`);
  }

  /**
   * リソースの解放
   */
  public dispose(): void {
    console.log("ScoreboardManager disposed");
    ScoreboardManager.instance = null;
  }
}