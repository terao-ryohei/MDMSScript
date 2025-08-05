import { Player, world, system, Vector3 } from "@minecraft/server";
import { ScoreboardManager } from "./ScoreboardManager";
import { RoleAssignmentManager } from "./RoleAssignmentManager";
import { JobAssignmentManager } from "./JobAssignmentManager";
import { PhaseManager } from "./PhaseManager";
import { ActionTrackingManager } from "./ActionTrackingManager";
import { EvidenceAnalyzer } from "./EvidenceAnalyzer";
import {
  AbilityType,
  AbilityStatus,
  AbilityTargetType,
  type AbilityDefinition,
  type AbilityUsage,
  type AbilityResult,
  type PlayerAbilityState,
  type AbilityInstanceState,
  type AbilityEffect,
  type AbilitySystemResult,
  type AbilityStatistics,
  DEFAULT_ABILITIES
} from "../types/AbilityTypes";
import { GamePhase } from "../types/PhaseTypes";
import { ActionType } from "../types/ActionTypes";

/**
 * 能力システム管理マネージャー
 */
export class AbilityManager {
  private static instance: AbilityManager;
  private scoreboardManager: ScoreboardManager;
  private roleAssignmentManager: RoleAssignmentManager;
  private jobAssignmentManager: JobAssignmentManager;
  private phaseManager: PhaseManager;
  private actionTrackingManager: ActionTrackingManager;
  private evidenceAnalyzer: EvidenceAnalyzer;

  private playerStates: Map<string, PlayerAbilityState> = new Map();
  private abilityUsages: AbilityUsage[] = [];
  private activeEffects: Map<string, AbilityEffect> = new Map();
  private usageCounter: number = 0;

  private constructor() {
    this.scoreboardManager = ScoreboardManager.getInstance();
    this.roleAssignmentManager = RoleAssignmentManager.getInstance();
    this.jobAssignmentManager = JobAssignmentManager.getInstance();
    this.phaseManager = PhaseManager.getInstance();
    this.actionTrackingManager = ActionTrackingManager.getInstance();
    this.evidenceAnalyzer = EvidenceAnalyzer.getInstance();
    this.setupEventListeners();
  }

  public static getInstance(): AbilityManager {
    if (!AbilityManager.instance) {
      AbilityManager.instance = new AbilityManager();
    }
    return AbilityManager.instance;
  }

  /**
   * プレイヤー能力を初期化
   */
  public initializePlayerAbilities(player: Player): void {
    try {
      const role = this.scoreboardManager.getRoleString(this.scoreboardManager.getPlayerRole(player));
      const job = this.scoreboardManager.getJobString(this.scoreboardManager.getPlayerJob(player));

      const playerState: PlayerAbilityState = {
        playerId: player.id,
        abilities: new Map(),
        activeEffects: new Map(),
        lastUsage: new Map(),
        usageCount: new Map()
      };

      // 役職・職業に応じた能力を付与
      for (const [abilityId, definition] of Object.entries(DEFAULT_ABILITIES)) {
        if (this.canPlayerUseAbility(role, job, definition)) {
          const abilityState: AbilityInstanceState = {
            abilityId,
            status: AbilityStatus.AVAILABLE,
            cooldownEnd: 0,
            usesRemaining: definition.usesPerGame,
            usesThisPhase: 0
          };
          playerState.abilities.set(abilityId, abilityState);
        }
      }

      this.playerStates.set(player.id, playerState);
      console.log(`Initialized abilities for ${player.name}: ${playerState.abilities.size} abilities`);

    } catch (error) {
      console.error(`Failed to initialize abilities for ${player.name}:`, error);
    }
  }

  /**
   * 能力を使用
   */
  public async useAbility(
    player: Player, 
    abilityId: string, 
    targetId?: string, 
    location?: Vector3
  ): Promise<AbilityResult> {
    try {
      const playerState = this.playerStates.get(player.id);
      const definition = DEFAULT_ABILITIES[abilityId];

      if (!playerState || !definition) {
        return {
          success: false,
          message: "能力が見つかりません",
          error: "Ability not found"
        };
      }

      const abilityState = playerState.abilities.get(abilityId);
      if (!abilityState) {
        return {
          success: false,
          message: "この能力は使用できません",
          error: "Ability not available"
        };
      }

      // 使用可能チェック
      const canUseResult = this.canUseAbility(player, abilityId);
      if (!canUseResult.success) {
        return canUseResult;
      }

      // 対象チェック
      let target: Player | undefined;
      if (definition.requiresTarget && targetId) {
        target = world.getAllPlayers().find(p => p.id === targetId);
        if (!target) {
          return {
            success: false,
            message: "対象プレイヤーが見つかりません",
            error: "Target not found"
          };
        }

        // 範囲チェック
        const distance = this.calculateDistance(player.location, target.location);
        if (distance > definition.range) {
          return {
            success: false,
            message: `対象が範囲外です（${Math.round(distance)}m > ${definition.range}m）`,
            error: "Target out of range"
          };
        }
      }

      // 能力実行
      const result = await this.executeAbility(player, definition, target, location);

      if (result.success) {
        // 使用記録
        this.recordAbilityUsage(player, definition, target, location, result);
        
        // 状態更新
        this.updateAbilityState(player.id, abilityId, definition);
        
        // 行動記録
        this.actionTrackingManager.recordAction(player, ActionType.ABILITY_USE, {
          abilityId,
          abilityType: definition.type,
          targetId: target?.id,
          location: location || player.location,
          result: result.success
        }, true);
      }

      return result;

    } catch (error) {
      console.error(`Failed to use ability ${abilityId} for ${player.name}:`, error);
      return {
        success: false,
        message: "能力使用エラーが発生しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * 能力使用可能チェック
   */
  public canUseAbility(player: Player, abilityId: string): AbilityResult {
    try {
      const definition = DEFAULT_ABILITIES[abilityId];
      if (!definition) {
        return {
          success: false,
          message: "能力が見つかりません",
          error: "Ability not found"
        };
      }

      const playerState = this.playerStates.get(player.id);
      if (!playerState) {
        return {
          success: false,
          message: "プレイヤー状態が見つかりません",
          error: "Player state not found"
        };
      }

      const abilityState = playerState.abilities.get(abilityId);
      if (!abilityState) {
        return {
          success: false,
          message: "この能力は使用できません",
          error: "Ability not available"
        };
      }

      // 生存チェック
      if (definition.requiresAlive && !this.scoreboardManager.isPlayerAlive(player)) {
        return {
          success: false,
          message: "死亡状態では使用できません",
          error: "Player is dead"
        };
      }

      // フェーズチェック
      const currentPhase = this.phaseManager.getCurrentPhase();
      const phaseString = this.getPhaseString(currentPhase);
      if (!definition.allowedPhases.includes(phaseString)) {
        return {
          success: false,
          message: `このフェーズでは使用できません（現在: ${phaseString}）`,
          error: "Phase not allowed"
        };
      }

      // ステータスチェック
      if (abilityState.status === AbilityStatus.COOLDOWN) {
        const remaining = Math.ceil((abilityState.cooldownEnd - Date.now()) / 1000);
        return {
          success: false,
          message: `クールダウン中です（残り${remaining}秒）`,
          error: "On cooldown"
        };
      }

      if (abilityState.status === AbilityStatus.DISABLED) {
        return {
          success: false,
          message: "能力が無効化されています",
          error: "Ability disabled"
        };
      }

      // 使用回数チェック
      if (abilityState.usesRemaining <= 0) {
        return {
          success: false,
          message: "使用回数制限に達しています",
          error: "No uses remaining"
        };
      }

      if (abilityState.usesThisPhase >= definition.usesPerPhase) {
        return {
          success: false,
          message: "このフェーズでの使用回数制限に達しています",
          error: "Phase limit reached"
        };
      }

      return {
        success: true,
        message: "使用可能です"
      };

    } catch (error) {
      console.error(`Failed to check ability ${abilityId} for ${player.name}:`, error);
      return {
        success: false,
        message: "チェックエラーが発生しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * 能力実行
   */
  private async executeAbility(
    player: Player,
    definition: AbilityDefinition,
    target?: Player,
    location?: Vector3
  ): Promise<AbilityResult> {
    try {
      switch (definition.type) {
        case AbilityType.INVESTIGATE:
          return this.executeInvestigate(player, target!);
        
        case AbilityType.SEARCH_EVIDENCE:
          return this.executeSearchEvidence(player, definition);
        
        case AbilityType.HEAL:
          return this.executeHeal(player, target!);
        
        case AbilityType.AUTOPSY:
          return this.executeAutopsy(player, target!);
        
        case AbilityType.GUARD:
          return this.executeGuard(player, target!, definition);
        
        case AbilityType.PATROL:
          return this.executePatrol(player, definition);
        
        case AbilityType.INTERVIEW:
          return this.executeInterview(player, target!);
        
        case AbilityType.BROADCAST:
          return this.executeBroadcast(player, definition);
        
        case AbilityType.MURDER:
          return this.executeMurder(player, target!);
        
        case AbilityType.SABOTAGE:
          return this.executeSabotage(player, target!, definition);
        
        case AbilityType.ASSIST:
          return this.executeAssist(player, target!, definition);
        
        case AbilityType.DISTRACT:
          return this.executeDistract(player, definition);
        
        default:
          return {
            success: false,
            message: "未実装の能力です",
            error: "Ability not implemented"
          };
      }

    } catch (error) {
      console.error(`Failed to execute ability ${definition.type}:`, error);
      return {
        success: false,
        message: "能力実行エラーが発生しました",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * 調査能力実行
   */
  private executeInvestigate(player: Player, target: Player): AbilityResult {
    const role = this.scoreboardManager.getRoleString(this.scoreboardManager.getPlayerRole(target));
    const job = this.scoreboardManager.getJobString(this.scoreboardManager.getPlayerJob(target));
    const isAlive = this.scoreboardManager.isPlayerAlive(target);
    
    // 証拠分析から追加情報を取得
    const playerActions = this.actionTrackingManager.getPlayerActions(target.id, 10);
    const recentActions = playerActions.slice(0, 3).map(action => 
      `${action.actionType} (${new Date(action.timestamp * 1000).toLocaleTimeString()})`
    ).join(", ");

    let investigationResult = 
      `§6=== ${target.name} の調査結果 ===\n\n` +
      `§7状態: ${isAlive ? "§a生存" : "§c死亡"}\n` +
      `§7最近の行動: §f${recentActions || "なし"}\n` +
      `§7行動パターン: §f${this.analyzePlayerBehavior(target)}\n\n` +
      `§7※ より詳細な情報は証拠分析を確認してください`;

    player.sendMessage(investigationResult);

    return {
      success: true,
      message: `${target.name}を調査しました`,
      data: {
        targetId: target.id,
        role: role,
        job: job,
        isAlive: isAlive,
        behaviorPattern: this.analyzePlayerBehavior(target)
      }
    };
  }

  /**
   * 証拠捜索能力実行
   */
  private executeSearchEvidence(player: Player, definition: AbilityDefinition): AbilityResult {
    // エリア内の証拠発見確率を向上させる効果を付与
    const effect: AbilityEffect = {
      id: `effect_${Date.now()}`,
      abilityId: definition.id,
      targetId: player.id,
      startTime: Date.now(),
      endTime: Date.now() + (definition.duration * 1000),
      effectType: "evidence_boost",
      data: { boost: 2.0 }, // 2倍の発見確率
      isActive: true
    };

    this.activeEffects.set(effect.id, effect);

    player.sendMessage(`§a証拠捜索モードが有効になりました（${Math.floor(definition.duration / 60)}分間）`);
    player.sendMessage("§7周囲での行動で証拠を発見しやすくなります");

    return {
      success: true,
      message: "証拠捜索能力を発動しました",
      effectDuration: definition.duration,
      data: { effectId: effect.id }
    };
  }

  /**
   * 治療能力実行
   */
  private executeHeal(player: Player, target: Player): AbilityResult {
    if (this.scoreboardManager.isPlayerAlive(target)) {
      return {
        success: false,
        message: "対象は既に健康です",
        error: "Target is already healthy"
      };
    }

    // 死亡プレイヤーの蘇生（特別な条件下でのみ）
    // 通常は重傷状態の回復として実装
    
    player.sendMessage(`§a${target.name}を治療しました`);
    target.sendMessage("§a医者によって治療されました");
    
    // 治療効果を全体に通知
    world.sendMessage(`§b${player.name}が${target.name}を治療しました`);

    return {
      success: true,
      message: `${target.name}を治療しました`,
      affectedPlayers: [target.id]
    };
  }

  /**
   * 検死能力実行
   */
  private executeAutopsy(player: Player, target: Player): AbilityResult {
    if (this.scoreboardManager.isPlayerAlive(target)) {
      return {
        success: false,
        message: "対象は生存しています",
        error: "Target is alive"
      };
    }

    // 死亡関連の行動記録を詳しく分析
    const deathActions = this.actionTrackingManager.getPlayerActions(target.id)
      .filter(action => action.actionType === "death" || action.actionType === "murder");

    let autopsyResult = `§6=== ${target.name} の検死結果 ===\n\n`;
    
    if (deathActions.length > 0) {
      const deathAction = deathActions[0];
      autopsyResult += `§7死亡時刻: §f${new Date(deathAction.timestamp * 1000).toLocaleString()}\n`;
      autopsyResult += `§7死因: §f${deathAction.data.method || "不明"}\n`;
      autopsyResult += `§7発見場所: §f${Math.round(deathAction.location.x)}, ${Math.round(deathAction.location.y)}, ${Math.round(deathAction.location.z)}\n`;
      
      if (deathAction.witnessIds.length > 0) {
        const witnesses = deathAction.witnessIds.map(id => {
          const witness = world.getAllPlayers().find(p => p.id === id);
          return witness ? witness.name : "不明";
        }).join(", ");
        autopsyResult += `§7目撃者: §f${witnesses}\n`;
      }
    } else {
      autopsyResult += "§7詳細な死因は特定できませんでした\n";
    }

    autopsyResult += "\n§7※ この情報は証拠として記録されました";

    player.sendMessage(autopsyResult);

    return {
      success: true,
      message: `${target.name}の検死を行いました`,
      discoveredEvidence: [`autopsy_${target.id}_${Date.now()}`],
      data: { deathActions }
    };
  }

  /**
   * 護衛能力実行
   */
  private executeGuard(player: Player, target: Player, definition: AbilityDefinition): AbilityResult {
    const effect: AbilityEffect = {
      id: `guard_${Date.now()}`,
      abilityId: definition.id,
      targetId: target.id,
      startTime: Date.now(),
      endTime: Date.now() + (definition.duration * 1000),
      effectType: "protection",
      data: { protectorId: player.id },
      isActive: true
    };

    this.activeEffects.set(effect.id, effect);

    player.sendMessage(`§a${target.name}を護衛しました（${Math.floor(definition.duration / 3600)}時間）`);
    target.sendMessage("§a警備員によって護衛されています");

    return {
      success: true,
      message: `${target.name}を護衛しました`,
      effectDuration: definition.duration,
      affectedPlayers: [target.id]
    };
  }

  /**
   * 巡回能力実行
   */
  private executePatrol(player: Player, definition: AbilityDefinition): AbilityResult {
    const effect: AbilityEffect = {
      id: `patrol_${Date.now()}`,
      abilityId: definition.id,
      targetId: player.id,
      startTime: Date.now(),
      endTime: Date.now() + (definition.duration * 1000),
      effectType: "detection",
      data: { range: definition.detectRange },
      isActive: true
    };

    this.activeEffects.set(effect.id, effect);

    player.sendMessage(`§a巡回モードが有効になりました（${Math.floor(definition.duration / 60)}分間）`);
    player.sendMessage("§7異常行動を検出しやすくなります");

    return {
      success: true,
      message: "巡回能力を発動しました",
      effectDuration: definition.duration
    };
  }

  /**
   * インタビュー能力実行
   */
  private executeInterview(player: Player, target: Player): AbilityResult {
    // 対象プレイヤーの最近の証言や行動から情報を抽出
    const recentActions = this.actionTrackingManager.getPlayerActions(target.id, 5);
    const suspicionLevel = this.evidenceAnalyzer.generateDeductionReport()
      .suspectRanking.find(s => s.playerId === target.id)?.suspicionScore || 0;

    let interviewResult = 
      `§6=== ${target.name} へのインタビュー結果 ===\n\n` +
      `§7協力度: §f${suspicionLevel < 0.3 ? "積極的" : suspicionLevel < 0.7 ? "普通" : "消極的"}\n` +
      `§7証言の信頼性: §f${this.calculateTestimonyReliability(target)}%\n` +
      `§7新しい情報: §f${this.generateInterviewInfo(target)}\n\n` +
      `§7※ この情報は証拠として記録されました`;

    player.sendMessage(interviewResult);
    target.sendMessage(`§b${player.name}からインタビューを受けました`);

    return {
      success: true,
      message: `${target.name}にインタビューしました`,
      discoveredEvidence: [`interview_${target.id}_${Date.now()}`],
      data: {
        suspicionLevel,
        reliability: this.calculateTestimonyReliability(target)
      }
    };
  }

  /**
   * 放送能力実行
   */
  private executeBroadcast(player: Player, definition: AbilityDefinition): AbilityResult {
    // 重要な推理情報を全プレイヤーに伝達
    const deductionReport = this.evidenceAnalyzer.generateDeductionReport();
    const topSuspect = deductionReport.suspectRanking[0];

    let broadcastMessage = 
      `§6=== 緊急報道 ===\n` +
      `§7記者 ${player.name} からの重要情報:\n\n`;

    if (topSuspect) {
      broadcastMessage += 
        `§7最も疑わしい人物: §c${topSuspect.playerName}\n` +
        `§7疑惑度: §f${Math.round(topSuspect.suspicionScore * 100)}%\n` +
        `§7主な理由: §f${topSuspect.reasons.slice(0, 2).join(", ")}\n`;
    } else {
      broadcastMessage += `§7現在、明確な容疑者は特定されていません\n`;
    }

    broadcastMessage += `§7証拠総数: §f${deductionReport.keyEvidence.length}件\n`;
    broadcastMessage += `§6========================`;

    world.sendMessage(broadcastMessage);

    return {
      success: true,
      message: "重要情報を放送しました",
      affectedPlayers: world.getAllPlayers().map(p => p.id)
    };
  }

  /**
   * 殺人能力実行
   */
  private executeMurder(player: Player, target: Player): AbilityResult {
    if (!this.scoreboardManager.isPlayerAlive(target)) {
      return {
        success: false,
        message: "対象は既に死亡しています",
        error: "Target is already dead"
      };
    }

    // 護衛効果チェック
    const protectionEffect = Array.from(this.activeEffects.values())
      .find(effect => effect.targetId === target.id && effect.effectType === "protection" && effect.isActive);

    if (protectionEffect) {
      // 護衛によって阻止
      this.activeEffects.delete(protectionEffect.id);
      
      const protector = world.getAllPlayers().find(p => p.id === protectionEffect.data.protectorId);
      if (protector) {
        protector.sendMessage(`§c${target.name}への攻撃を阻止しました！`);
        target.sendMessage("§a護衛によって攻撃が阻止されました！");
        player.sendMessage("§c攻撃が護衛によって阻止されました");
      }

      return {
        success: false,
        message: "攻撃が護衛によって阻止されました",
        error: "Attack blocked by guard"
      };
    }

    // 殺人実行
    this.scoreboardManager.setPlayerAlive(target, false);
    
    // 殺人イベントをトリガー
    system.run(() => {
      world.getDimension("overworld").runCommand(
        `scriptevent mdms:murder {"murdererId":"${player.id}","victimId":"${target.id}","method":"ability"}`
      );
    });

    world.sendMessage(`§c${target.name}が殺害されました！`);
    target.sendMessage("§c§lあなたは殺害されました");

    return {
      success: true,
      message: `${target.name}を殺害しました`,
      affectedPlayers: [target.id]
    };
  }

  /**
   * 妨害工作能力実行
   */
  private executeSabotage(player: Player, target: Player, definition: AbilityDefinition): AbilityResult {
    const effect: AbilityEffect = {
      id: `sabotage_${Date.now()}`,
      abilityId: definition.id,
      targetId: target.id,
      startTime: Date.now(),
      endTime: Date.now() + (definition.duration * 1000),
      effectType: "sabotage",
      data: { saboteurId: player.id },
      isActive: true
    };

    this.activeEffects.set(effect.id, effect);

    player.sendMessage(`§c${target.name}の行動を妨害しました（${Math.floor(definition.duration / 60)}分間）`);
    target.sendMessage("§c何者かによって行動が妨害されています");

    return {
      success: true,
      message: `${target.name}を妨害しました`,
      effectDuration: definition.duration,
      affectedPlayers: [target.id]
    };
  }

  /**
   * 協力能力実行
   */
  private executeAssist(player: Player, target: Player, definition: AbilityDefinition): AbilityResult {
    // 対象が犯人かチェック
    const targetRole = this.scoreboardManager.getPlayerRole(target);
    if (targetRole !== 1) { // 1 = MURDERER
      return {
        success: false,
        message: "対象は犯人ではありません",
        error: "Target is not murderer"
      };
    }

    const effect: AbilityEffect = {
      id: `assist_${Date.now()}`,
      abilityId: definition.id,
      targetId: target.id,
      startTime: Date.now(),
      endTime: Date.now() + (definition.duration * 1000),
      effectType: "assistance",
      data: { assistantId: player.id, boost: 1.5 },
      isActive: true
    };

    this.activeEffects.set(effect.id, effect);

    player.sendMessage(`§6${target.name}をサポートしました（${Math.floor(definition.duration / 60)}分間）`);
    target.sendMessage("§6共犯者からのサポートを受けています");

    return {
      success: true,
      message: `${target.name}をサポートしました`,
      effectDuration: definition.duration,
      affectedPlayers: [target.id]
    };
  }

  /**
   * 注意逸らし能力実行
   */
  private executeDistract(player: Player, definition: AbilityDefinition): AbilityResult {
    // 周囲のプレイヤーに影響を与える
    const nearbyPlayers = world.getAllPlayers().filter(p => {
      if (p.id === player.id) return false;
      const distance = this.calculateDistance(player.location, p.location);
      return distance <= definition.range;
    });

    for (const nearbyPlayer of nearbyPlayers) {
      const effect: AbilityEffect = {
        id: `distract_${Date.now()}_${nearbyPlayer.id}`,
        abilityId: definition.id,
        targetId: nearbyPlayer.id,
        startTime: Date.now(),
        endTime: Date.now() + (definition.duration * 1000),
        effectType: "distraction",
        data: { distractorId: player.id },
        isActive: true
      };

      this.activeEffects.set(effect.id, effect);
      nearbyPlayer.sendMessage("§7何かに気を取られています...");
    }

    player.sendMessage(`§6周囲の注意を逸らしました（${nearbyPlayers.length}人に影響）`);

    return {
      success: true,
      message: "注意逸らしを発動しました",
      effectDuration: definition.duration,
      affectedPlayers: nearbyPlayers.map(p => p.id)
    };
  }

  /**
   * プレイヤーが能力を使用可能かチェック
   */
  private canPlayerUseAbility(role: string, job: string, definition: AbilityDefinition): boolean {
    // 役職チェック
    if (definition.allowedRoles.length > 0 && !definition.allowedRoles.includes(role.toLowerCase())) {
      return false;
    }

    // 職業チェック
    if (definition.allowedJobs.length > 0 && !definition.allowedJobs.includes(job.toLowerCase())) {
      return false;
    }

    return true;
  }

  /**
   * 能力使用記録
   */
  private recordAbilityUsage(
    player: Player,
    definition: AbilityDefinition,
    target?: Player,
    location?: Vector3,
    result?: AbilityResult
  ): void {
    const usage: AbilityUsage = {
      id: `usage_${this.usageCounter++}`,
      userId: player.id,
      userName: player.name,
      abilityId: definition.id,
      abilityType: definition.type,
      targetId: target?.id,
      targetName: target?.name,
      location: location ? {
        x: Math.round(location.x * 100) / 100,
        y: Math.round(location.y * 100) / 100,
        z: Math.round(location.z * 100) / 100,
        dimension: player.dimension.id
      } : undefined,
      timestamp: Date.now(),
      phaseId: this.convertPhaseToId(this.phaseManager.getCurrentPhase()),
      result: result || { success: false, message: "No result" }
    };

    this.abilityUsages.push(usage);
  }

  /**
   * 能力状態更新
   */
  private updateAbilityState(playerId: string, abilityId: string, definition: AbilityDefinition): void {
    const playerState = this.playerStates.get(playerId);
    if (!playerState) return;

    const abilityState = playerState.abilities.get(abilityId);
    if (!abilityState) return;

    // 使用回数更新
    abilityState.usesRemaining--;
    abilityState.usesThisPhase++;

    // クールダウン設定
    if (definition.cooldownTime > 0) {
      abilityState.status = AbilityStatus.COOLDOWN;
      abilityState.cooldownEnd = Date.now() + (definition.cooldownTime * 1000);

      // クールダウン終了タイマー
      system.runTimeout(() => {
        if (abilityState.usesRemaining > 0) {
          abilityState.status = AbilityStatus.AVAILABLE;
        } else {
          abilityState.status = AbilityStatus.USED;
        }
      }, definition.cooldownTime * 20);
    } else if (abilityState.usesRemaining <= 0) {
      abilityState.status = AbilityStatus.USED;
    }

    // 使用記録更新
    playerState.lastUsage.set(abilityId, Date.now());
    playerState.usageCount.set(abilityId, (playerState.usageCount.get(abilityId) || 0) + 1);
  }

  /**
   * プレイヤーの能力一覧取得
   */
  public getPlayerAbilities(playerId: string): Map<string, AbilityInstanceState> {
    const playerState = this.playerStates.get(playerId);
    return playerState ? playerState.abilities : new Map();
  }

  /**
   * 能力統計取得
   */
  public getAbilityStatistics(): AbilityStatistics {
    const usagesByType = new Map<AbilityType, number>();
    const usagesByPlayer = new Map<string, number>();
    const usagesByPhase = new Map<number, number>();

    let totalSuccesses = 0;

    for (const usage of this.abilityUsages) {
      usagesByType.set(usage.abilityType, (usagesByType.get(usage.abilityType) || 0) + 1);
      usagesByPlayer.set(usage.userId, (usagesByPlayer.get(usage.userId) || 0) + 1);
      usagesByPhase.set(usage.phaseId, (usagesByPhase.get(usage.phaseId) || 0) + 1);

      if (usage.result.success) totalSuccesses++;
    }

    const mostUsedAbility = Array.from(usagesByType.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "";

    const mostActivePlayer = Array.from(usagesByPlayer.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "";

    return {
      totalUsages: this.abilityUsages.length,
      usagesByType,
      usagesByPlayer,
      usagesByPhase,
      successRate: this.abilityUsages.length > 0 ? (totalSuccesses / this.abilityUsages.length) * 100 : 0,
      mostUsedAbility,
      mostActivePlayer
    };
  }

  /**
   * イベントリスナー設定
   */
  private setupEventListeners(): void {
    // フェーズ変更時の処理
    system.afterEvents.scriptEventReceive.subscribe((event) => {
      if (event.id === "mdms:phase_changed") {
        this.onPhaseChanged();
      }
    });
  }

  /**
   * フェーズ変更時処理
   */
  private onPhaseChanged(): void {
    // 全プレイヤーのフェーズ使用回数をリセット
    for (const playerState of this.playerStates.values()) {
      for (const abilityState of playerState.abilities.values()) {
        abilityState.usesThisPhase = 0;
      }
    }

    console.log("Phase changed: Reset ability usage counts for all players");
  }

  /**
   * ヘルパーメソッド
   */
  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private getPhaseString(phase: GamePhase): string {
    switch (phase) {
      case GamePhase.PREPARATION: return "preparation";
      case GamePhase.DAILY_LIFE: return "daily_life";
      case GamePhase.INVESTIGATION: return "investigation";
      case GamePhase.DISCUSSION: return "discussion";
      case GamePhase.REINVESTIGATION: return "reinvestigation";
      case GamePhase.DEDUCTION: return "deduction";
      case GamePhase.VOTING: return "voting";
      case GamePhase.ENDING: return "ending";
      default: return "unknown";
    }
  }

  private convertPhaseToId(phase: GamePhase): number {
    // 文字列としてのフェーズ値も対応
    switch (phase) {
      case GamePhase.PREPARATION: return 0;
      case GamePhase.DAILY_LIFE: return 1;
      case GamePhase.INVESTIGATION: return 2;
      case GamePhase.DISCUSSION: return 3;
      case GamePhase.REINVESTIGATION: return 4;
      case GamePhase.DEDUCTION: return 5;
      case GamePhase.VOTING: return 6;
      case GamePhase.ENDING: return 7;
      default:
        console.warn(`Unknown phase in AbilityManager: ${phase}, defaulting to 0`);
        return 0;
    }
  }

  private analyzePlayerBehavior(player: Player): string {
    const actions = this.actionTrackingManager.getPlayerActions(player.id, 20);
    if (actions.length === 0) return "行動データなし";

    const actionTypes = actions.map(a => a.actionType);
    const uniqueTypes = new Set(actionTypes);
    
    if (uniqueTypes.has(ActionType.MURDER)) return "極めて危険";
    if (uniqueTypes.size > 5) return "活発";
    if (uniqueTypes.size > 3) return "普通";
    return "静観";
  }

  private calculateTestimonyReliability(player: Player): number {
    const suspicion = this.evidenceAnalyzer.generateDeductionReport()
      .suspectRanking.find(s => s.playerId === player.id)?.suspicionScore || 0;
    
    return Math.round((1 - suspicion) * 100);
  }

  private generateInterviewInfo(player: Player): string {
    const recentActions = this.actionTrackingManager.getPlayerActions(player.id, 3);
    if (recentActions.length === 0) return "特になし";
    
    const lastAction = recentActions[0];
    return `${lastAction.actionType}に関する証言を得た`;
  }

  /**
   * 全記録をクリア
   */
  public clearAllData(): void {
    this.playerStates.clear();
    this.abilityUsages = [];
    this.activeEffects.clear();
    this.usageCounter = 0;
    console.log("All ability data cleared");
  }

  /**
   * デバッグ用：能力システム状況出力
   */
  public debugAbilitySystem(): void {
    console.log("=== Ability System Debug ===");
    console.log(`Active players: ${this.playerStates.size}`);
    console.log(`Total usages: ${this.abilityUsages.length}`);
    console.log(`Active effects: ${this.activeEffects.size}`);

    const stats = this.getAbilityStatistics();
    console.log(`Success rate: ${Math.round(stats.successRate)}%`);
    console.log(`Most used ability: ${stats.mostUsedAbility}`);
    console.log(`Most active player: ${stats.mostActivePlayer}`);

    console.log("=== End Ability System Debug ===");
  }
}