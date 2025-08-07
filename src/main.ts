import type { ItemUseAfterEvent, Player } from "@minecraft/server";
import { system, world } from "@minecraft/server";
import { ScoreboardManager } from "./managers/ScoreboardManager";
import { PhaseManager } from "./managers/PhaseManager";
import { RoleAssignmentManager } from "./managers/RoleAssignmentManager";
import { JobAssignmentManager } from "./managers/JobAssignmentManager";
import { UIManager } from "./managers/UIManager";
import { RoleUIManager } from "./managers/RoleUIManager";
import { OccupationUIManager } from "./managers/OccupationUIManager";
import { ActionTrackingManager } from "./managers/ActionTrackingManager";
import { EvidenceAnalyzer } from "./managers/EvidenceAnalyzer";
import { EvidenceUIManager } from "./managers/EvidenceUIManager";
import { VotingManager } from "./managers/VotingManager";
import { VotingUIManager } from "./managers/VotingUIManager";
import { ScoringManager } from "./managers/ScoringManager";
import { AbilityManager } from "./managers/AbilityManager";
import { AbilityUIManager } from "./managers/AbilityUIManager";
import { AdminManager } from "./managers/AdminManager";
import { AdminUIManager } from "./managers/AdminUIManager";
import { GamePhase } from "./types/PhaseTypes";

// システム初期化
const scoreboardManager = ScoreboardManager.getInstance();
const phaseManager = PhaseManager.getInstance();
const roleAssignmentManager = RoleAssignmentManager.getInstance();
const jobAssignmentManager = JobAssignmentManager.getInstance();
const uiManager = UIManager.getInstance();
const roleUIManager = RoleUIManager.getInstance();
const occupationUIManager = OccupationUIManager.getInstance();
const actionTrackingManager = ActionTrackingManager.getInstance();
const evidenceAnalyzer = EvidenceAnalyzer.getInstance();
const evidenceUIManager = EvidenceUIManager.getInstance();
const votingManager = VotingManager.getInstance();
const votingUIManager = VotingUIManager.getInstance();
const scoringManager = ScoringManager.getInstance();
const abilityManager = AbilityManager.getInstance();
const abilityUIManager = AbilityUIManager.getInstance();
const adminManager = AdminManager.getInstance();
const adminUIManager = AdminUIManager.getInstance();

console.log("MDMS main initialized");

// 初期化処理
function initializeGame(): void {
  try {
    // Scoreboardオブジェクト初期化
    scoreboardManager.initializeObjectives();
    console.log("Game systems initialized successfully");
  } catch (error) {
    console.error("Failed to initialize game systems:", error);
  }
}

// ゲーム開始処理
async function startGame(): Promise<void> {
  try {
    const playerCount = world.getAllPlayers().length;
    
    // プレイヤー数チェック（3人推奨、1人からテスト可能）
    if (playerCount < 1) {
      world.sendMessage("§c最低1人のプレイヤーが必要です");
      return;
    }
    
    if (playerCount === 2) {
      world.sendMessage("§e2人でのプレイは実験的機能です。3人以上を推奨します。");
    } else if (playerCount >= 3) {
      world.sendMessage("§a3人以上での最適なゲーム体験をお楽しみください！");
    }
    
    if (playerCount > 20) {
      world.sendMessage("§cプレイヤー数が多すぎます（最大20人）");
      return;
    }
    
    // 現在のフェーズをチェック（すでにゲームが開始されているか）
    const currentPhase = scoreboardManager.getGamePhase();
    if (currentPhase !== 0) { // 0 = PREPARATION
      world.sendMessage("§cゲームはすでに開始されています");
      return;
    }
    
    // ゲーム開始
    world.sendMessage("§a============================");
    world.sendMessage("§l§6MDMS ゲーム開始準備中...");
    world.sendMessage(`§eプレイヤー数: ${playerCount}人`);
    world.sendMessage("§a============================");
    
    // システム初期化
    initializeGame();
    
    // ロール・ジョブ割り当て
    world.sendMessage("§eロール・ジョブを割り当て中...");
    
    const roleResult = roleAssignmentManager.assignRolesToAllPlayers();
    if (!roleResult.success) {
      world.sendMessage(`§cロール割り当てエラー: ${roleResult.error}`);
      return;
    }
    
    const jobResult = jobAssignmentManager.assignJobsToAllPlayers();
    if (!jobResult.success) {
      world.sendMessage(`§cジョブ割り当てエラー: ${jobResult.error}`);
      return;
    }
    
    world.sendMessage("§aロール・ジョブの割り当てが完了しました");
    world.sendMessage(`§7構成: 犯人${roleResult.composition.murderers}人, 共犯者${roleResult.composition.accomplices}人, 一般人${roleResult.composition.citizens}人`);
    
    // 行動追跡開始
    actionTrackingManager.startTracking();
    world.sendMessage("§b行動追跡システムが開始されました");
    
    // スコアリングシステム初期化
    scoringManager.initializeGame();
    world.sendMessage("§dスコアリングシステムが初期化されました");

    // 準備フェーズ開始
    const result = await phaseManager.startPhase(GamePhase.PREPARATION);
    
    if (result.success) {
      world.sendMessage("§a準備フェーズが開始されました！");
      world.sendMessage("§eロール・ジョブの確認とマップ散策を行ってください");
      
      // 全プレイヤーにロール・ジョブ情報を通知
      system.runTimeout(() => {
        roleAssignmentManager.notifyAllPlayersRoles();
        jobAssignmentManager.notifyAllPlayersJobs();
        
        // 能力システム初期化
        for (const player of world.getAllPlayers()) {
          abilityManager.initializePlayerAbilities(player);
        }
        
        // 管理者権限自動付与（最初のプレイヤー）
        const firstPlayer = world.getAllPlayers()[0];
        if (firstPlayer) {
          adminManager.addAdmin(firstPlayer.id);
          firstPlayer.sendMessage("§e管理者権限が自動付与されました");
        }
      }, 20); // 1秒後に通知（20 ticks = 1秒）
      
    } else {
      world.sendMessage(`§cゲーム開始エラー: ${result.error || "不明なエラー"}`);
    }
    
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラーが発生しました";
    world.sendMessage(`§c予期せぬエラー: ${message}`);
    console.error("Game start error:", error);
  }
}

// ゲーム強制終了・リセット処理
async function forceEndGame(playerName: string): Promise<void> {
  try {
    world.sendMessage("§c============================");
    world.sendMessage("§l§4ゲーム強制終了");
    world.sendMessage(`§7実行者: ${playerName}`);
    world.sendMessage("§c============================");
    
    // 各システムを停止・リセット
    phaseManager.dispose();
    actionTrackingManager.stopTracking();
    actionTrackingManager.clearAllRecords();
    votingManager.clearAllVotes();
    abilityManager.clearAllData();
    
    // スコアボードリセット
    scoreboardManager.initializeObjectives();
    
    // 全プレイヤーを生存状態に戻す
    for (const player of world.getAllPlayers()) {
      scoreboardManager.setPlayerAlive(player, true);
      scoreboardManager.setPlayerRole(player, 0);
      scoreboardManager.setPlayerJob(player, 0);
      scoreboardManager.setPlayerScore(player, 0);
      scoreboardManager.setBaseScore(player, 0);
      scoreboardManager.setObjectiveScore(player, 0);
      scoreboardManager.setEvidenceCount(player, 0);
      scoreboardManager.setPlayerVotes(player, 0);
      scoreboardManager.setAbilityUses(player, 0);
      scoreboardManager.setCooldownTimer(player, 0);
    }
    
    world.sendMessage("§a全システムがリセットされました");
    world.sendMessage("§e新しいゲームを開始するには時計を使用してください");
    
    console.log(`Game forcefully ended and reset by ${playerName}`);
    
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラーが発生しました";
    world.sendMessage(`§cリセットエラー: ${message}`);
    console.error("Force end game error:", error);
  }
}

// ゲーム強制終了確認UI
async function showForceEndConfirmation(player: Player): Promise<void> {
  try {
    const { MessageFormData } = await import("@minecraft/server-ui");
    
    const form = new MessageFormData()
      .title("§c§lゲーム強制終了")
      .body("§c警告: ゲームを強制終了してすべてをリセットします。\n\n" +
            "§7• 進行中のゲームが中断されます\n" +
            "§7• すべてのプレイヤーデータがリセットされます\n" +
            "§7• 行動記録・証拠がクリアされます\n" +
            "§7• この操作は取り消せません\n\n" +
            "§e本当に実行しますか？")
      .button1("§c強制終了")
      .button2("§7キャンセル");
      
    const response = await form.show(player);
    
    if (response.canceled || response.selection === 1) {
      player.sendMessage("§7ゲーム強制終了をキャンセルしました");
      return;
    }
    
    if (response.selection === 0) {
      await forceEndGame(player.name);
    }
    
  } catch (error) {
    console.error(`Failed to show force end confirmation for ${player.name}:`, error);
    player.sendMessage("§c強制終了確認画面の表示に失敗しました");
  }
}

// ゲーム結果表示
async function showGameResults(player: Player): Promise<void> {
  try {
    const { ActionFormData } = await import("@minecraft/server-ui");
    
    const form = new ActionFormData()
      .title("§l§6ゲーム結果")
      .body("§7結果表示メニューを選択してください")
      .button("§aスコアランキング", "textures/ui/creative_icon")
      .button("§eチーム結果", "textures/ui/friend_glyph")
      .button("§d詳細統計", "textures/ui/book_edit_default")
      .button("§bMVP発表", "textures/ui/trophy")
      .button("§c勝利条件チェック", "textures/ui/gear")
      .button("§7閉じる", "textures/ui/cancel");

    const response = await form.show(player);
    
    if (response.canceled) return;

    switch (response.selection) {
      case 0: // スコアランキング
        await showScoreRanking(player);
        break;
      case 1: // チーム結果
        await showTeamResults(player);
        break;
      case 2: // 詳細統計
        await showDetailedStats(player);
        break;
      case 3: // MVP発表
        await showMVPResults(player);
        break;
      case 4: // 勝利条件チェック
        await showVictoryStatus(player);
        break;
    }
  } catch (error) {
    console.error(`Failed to show game results for ${player.name}:`, error);
    player.sendMessage("§cゲーム結果の表示に失敗しました");
  }
}

// スコアランキング表示
async function showScoreRanking(player: Player): Promise<void> {
  try {
    const { MessageFormData } = await import("@minecraft/server-ui");
    
    const playerScores = scoringManager.calculateAllPlayerScores();
    
    if (playerScores.length === 0) {
      player.sendMessage("§cスコアデータがありません");
      return;
    }

    const rankingText = playerScores.slice(0, 10).map((score, index) => {
      const statusIcon = score.isAlive ? "§a●" : "§c●";
      return `§6${index + 1}位 ${statusIcon} §f${score.playerName}\n§7${score.role} (${score.job}) - §e${score.totalScore}点`;
    }).join('\n\n');

    const form = new MessageFormData()
      .title("§l§6スコアランキング")
      .body(
        `§6=== プレイヤースコア Top 10 ===\n\n` +
        rankingText + `\n\n` +
        `§7※ §a●§7生存 §c●§7死亡`
      )
      .button1("§a了解")
      .button2("§7閉じる");

    await form.show(player);

  } catch (error) {
    console.error(`Failed to show score ranking for ${player.name}:`, error);
    player.sendMessage("§cスコアランキングの表示に失敗しました");
  }
}

// チーム結果表示
async function showTeamResults(player: Player): Promise<void> {
  try {
    const { MessageFormData } = await import("@minecraft/server-ui");
    
    const playerScores = scoringManager.calculateAllPlayerScores();
    const teamScores = scoringManager.calculateTeamScores(playerScores);
    
    if (teamScores.length === 0) {
      player.sendMessage("§cチームデータがありません");
      return;
    }

    const teamText = teamScores.map((team, index) => {
      const winnerIcon = team.isWinner ? "§a👑" : "§7";
      return `§6${index + 1}位 ${winnerIcon} §f${team.teamName}\n§7メンバー: ${team.memberCount}人 - §e${team.totalScore}点\n§7平均: ${Math.round(team.averageScore)}点`;
    }).join('\n\n');

    const form = new MessageFormData()
      .title("§l§eチーム結果")
      .body(
        `§6=== チーム別結果 ===\n\n` +
        teamText + `\n\n` +
        `§7※ §a👑§7勝利チーム`
      )
      .button1("§a了解")
      .button2("§7閉じる");

    await form.show(player);

  } catch (error) {
    console.error(`Failed to show team results for ${player.name}:`, error);
    player.sendMessage("§cチーム結果の表示に失敗しました");
  }
}

// 詳細統計表示
async function showDetailedStats(player: Player): Promise<void> {
  try {
    const { MessageFormData } = await import("@minecraft/server-ui");
    
    const gameResult = scoringManager.getCurrentGameResult();
    
    if (!gameResult) {
      // リアルタイム統計を計算
      const votingStats = votingManager.getVotingStatistics();
      const evidenceCount = actionTrackingManager.getActionStatistics().evidenceCount;
      const playerCount = world.getAllPlayers().length;
      const aliveCount = world.getAllPlayers().filter(p => scoreboardManager.isPlayerAlive(p)).length;
      
      const form = new MessageFormData()
        .title("§l§dゲーム統計")
        .body(
          `§6=== ゲーム進行統計 ===\n\n` +
          `§7プレイヤー数: §f${playerCount}人\n` +
          `§7生存者数: §f${aliveCount}人\n` +
          `§7投票セッション: §f${votingStats.totalSessions}回\n` +
          `§7総投票数: §f${votingStats.totalVotes}票\n` +
          `§7平均参加率: §f${Math.round(votingStats.averageParticipation)}%\n` +
          `§7収集証拠数: §f${evidenceCount}件\n` +
          `§7現在フェーズ: §f${scoreboardManager.getPhaseString(scoreboardManager.getGamePhase())}`
        )
        .button1("§a了解")
        .button2("§7閉じる");

      await form.show(player);
      return;
    }

    const duration = Math.floor(gameResult.duration / 1000 / 60); // 分
    
    const form = new MessageFormData()
      .title("§l§dゲーム統計")
      .body(
        `§6=== 最終ゲーム統計 ===\n\n` +
        `§7ゲーム時間: §f${duration}分\n` +
        `§7最終フェーズ: §f${gameResult.finalPhase}\n` +
        `§7勝利条件: §f${gameResult.victoryCondition}\n` +
        `§7投票セッション: §f${gameResult.totalVotingSessions}回\n` +
        `§7収集証拠数: §f${gameResult.evidenceCollected}件\n` +
        `§7殺人事件数: §f${gameResult.murdersCommitted}件\n` +
        `§7参加プレイヤー: §f${gameResult.playerScores.length}人`
      )
      .button1("§a了解")
      .button2("§7閉じる");

    await form.show(player);

  } catch (error) {
    console.error(`Failed to show detailed stats for ${player.name}:`, error);
    player.sendMessage("§c詳細統計の表示に失敗しました");
  }
}

// MVP結果表示
async function showMVPResults(player: Player): Promise<void> {
  try {
    const { MessageFormData } = await import("@minecraft/server-ui");
    
    const gameResult = scoringManager.getCurrentGameResult();
    
    if (!gameResult) {
      player.sendMessage("§cゲーム結果がまだ生成されていません");
      return;
    }

    let mvpText = "";
    
    if (gameResult.mvpPlayer) {
      mvpText += `§6🏆 MVP: §f${gameResult.mvpPlayer.playerName}\n§7スコア: ${gameResult.mvpPlayer.totalScore}点 (${gameResult.mvpPlayer.role})\n\n`;
    }
    
    if (gameResult.bestDetective) {
      mvpText += `§b🔍 ベスト探偵: §f${gameResult.bestDetective.playerName}\n§7スコア: ${gameResult.bestDetective.totalScore}点\n\n`;
    }
    
    if (gameResult.bestMurderer) {
      mvpText += `§c🗡 ベスト犯人: §f${gameResult.bestMurderer.playerName}\n§7スコア: ${gameResult.bestMurderer.totalScore}点\n\n`;
    }

    if (mvpText === "") {
      mvpText = "§7該当者なし";
    }

    const form = new MessageFormData()
      .title("§l§bMVP発表")
      .body(
        `§6=== 特別賞発表 ===\n\n` +
        mvpText
      )
      .button1("§a了解")
      .button2("§7閉じる");

    await form.show(player);

  } catch (error) {
    console.error(`Failed to show MVP results for ${player.name}:`, error);
    player.sendMessage("§cMVP結果の表示に失敗しました");
  }
}

// 勝利状況表示
async function showVictoryStatus(player: Player): Promise<void> {
  try {
    const { MessageFormData } = await import("@minecraft/server-ui");
    
    const victoryResult = scoringManager.checkVictoryConditions();
    const alivePlayers = world.getAllPlayers().filter(p => scoreboardManager.isPlayerAlive(p));
    
    // 生存者の役職分析
    const aliveRoles = alivePlayers.map(p => {
      const role = scoreboardManager.getPlayerRole(p);
      return {
        name: p.name,
        role: scoreboardManager.getRoleString(role)
      };
    });

    const roleCount = {
      murderer: aliveRoles.filter(p => p.role === "murderer").length,
      accomplice: aliveRoles.filter(p => p.role === "accomplice").length,
      citizen: aliveRoles.filter(p => p.role === "citizen").length
    };

    const statusText = 
      `§7状況: §f${victoryResult.reason}\n\n` +
      `§6生存者構成:\n` +
      `§c犯人: ${roleCount.murderer}人\n` +
      `§6共犯者: ${roleCount.accomplice}人\n` +
      `§a市民: ${roleCount.citizen}人\n\n`;

    let resultText = "";
    if (victoryResult.isGameOver) {
      resultText = `§c🎯 ゲーム終了\n§7勝利条件: §f${victoryResult.victoryCondition}\n`;
      if (victoryResult.winningTeam) {
        resultText += `§a勝利チーム: §f${victoryResult.winningTeam}\n`;
      }
    } else {
      resultText = `§aゲーム継続中\n`;
    }

    const form = new MessageFormData()
      .title("§l§c勝利条件チェック")
      .body(statusText + resultText)
      .button1("§a了解")
      .button2("§7閉じる");

    await form.show(player);

  } catch (error) {
    console.error(`Failed to show victory status for ${player.name}:`, error);
    player.sendMessage("§c勝利状況の表示に失敗しました");
  }
}

// メインUIメニュー表示
async function showMainUIMenu(player: Player): Promise<void> {
  try {
    const { ActionFormData } = await import("@minecraft/server-ui");
    
    const form = new ActionFormData()
      .title("§l§6MDMS メインメニュー")
      .body("§7各種情報とメニューにアクセスできます")
      .button("§aプレイヤー情報", "textures/ui/person")
      .button("§eゲーム状態", "textures/ui/world_glyph")
      .button("§bフェーズ情報", "textures/ui/clock")
      .button("§cロール情報", "textures/ui/book_edit_default")
      .button("§6職業情報", "textures/ui/hammer")
      .button("§d証拠一覧", "textures/ui/magnifyingGlass")
      .button("§c投票システム", "textures/ui/vote")
      .button("§5特殊能力", "textures/ui/gear")
      .button("§6ゲーム結果", "textures/ui/creative_icon")
      .button("§7閉じる", "textures/ui/cancel");

    const response = await form.show(player);
    
    if (response.canceled) return;

    switch (response.selection) {
      case 0: // プレイヤー情報
        await uiManager.showPlayerInfo(player);
        break;
      case 1: // ゲーム状態
        await uiManager.showGameState(player);
        break;
      case 2: // フェーズ情報
        await uiManager.showPhaseInfo(player);
        break;
      case 3: // ロール情報
        await roleUIManager.showRoleHelpMenu(player);
        break;
      case 4: // 職業情報
        await occupationUIManager.showJobHelpMenu(player);
        break;
      case 5: // 証拠一覧
        await evidenceUIManager.showEvidenceMenu(player);
        break;
      case 6: // 投票システム
        await votingUIManager.showVotingMenu(player);
        break;
      case 7: // 特殊能力
        await abilityUIManager.showAbilityMenu(player);
        break;
      case 8: // ゲーム結果
        await showGameResults(player);
        break;
    }
  } catch (error) {
    console.error(`Failed to show main UI menu for ${player.name}:`, error);
    player.sendMessage("§cメインメニューの表示に失敗しました");
  }
}

// アイテム使用イベントハンドラ
world.afterEvents.itemUse.subscribe(async (event: ItemUseAfterEvent) => {
  const { itemStack, source: player } = event;

  // 時計アイテムでゲーム開始
  if (itemStack.typeId === "minecraft:clock") {
    await startGame();
  }

  // プリズマリンの欠片でプレイヤー状態表示（デバッグ用）
  if (itemStack.typeId === "minecraft:prismarine_shard") {
    try {
      const role = scoreboardManager.getPlayerRole(player);
      const job = scoreboardManager.getPlayerJob(player);
      const alive = scoreboardManager.isPlayerAlive(player);
      const phase = scoreboardManager.getGamePhase();
      
      player.sendMessage("§e=== プレイヤー状態 ===");
      player.sendMessage(`§7Role: ${scoreboardManager.getRoleString(role)}`);
      player.sendMessage(`§7Job: ${scoreboardManager.getJobString(job)}`);
      player.sendMessage(`§7Alive: ${alive}`);
      player.sendMessage(`§7Phase: ${scoreboardManager.getPhaseString(phase)}`);
    } catch (error) {
      player.sendMessage(`§cエラー: ${error}`);
    }
  }
  
  // エメラルドでデバッグ情報表示
  if (itemStack.typeId === "minecraft:emerald") {
    scoreboardManager.debugGameState();
    scoreboardManager.debugPlayerStates();
    roleAssignmentManager.debugRoleAssignments();
    jobAssignmentManager.debugJobAssignments();
    actionTrackingManager.debugActionRecords();
    votingManager.debugVotingStatus();
    scoringManager.debugScoring();
    abilityManager.debugAbilitySystem();
    adminManager.debugAdminSystem();
    player.sendMessage("§aデバッグ情報をコンソールに出力しました");
  }
  
  // 虫眼鏡（スパイグラス）で証拠メニュー表示
  if (itemStack.typeId === "minecraft:spyglass") {
    await evidenceUIManager.showEvidenceMenu(player);
  }
  
  // グロウストーンで推理レポート表示
  if (itemStack.typeId === "minecraft:glowstone") {
    await evidenceUIManager.showDeductionReport(player);
  }
  
  // ネザライトの欠片でロール・ジョブ再通知（デバッグ用）
  if (itemStack.typeId === "minecraft:netherite_scrap") {
    roleAssignmentManager.notifyPlayerRole(player);
    jobAssignmentManager.notifyPlayerJob(player);
  }
  
  // コンパスでメインUIメニュー表示
  if (itemStack.typeId === "minecraft:compass") {
    await showMainUIMenu(player);
  }
  
  // 地図でプレイヤー情報表示
  if (itemStack.typeId === "minecraft:map") {
    await uiManager.showPlayerInfo(player);
  }
  
  // 本でロールヘルプ表示
  if (itemStack.typeId === "minecraft:book") {
    await roleUIManager.showRoleHelpMenu(player);
  }
  
  // レンガで職業ヘルプ表示
  if (itemStack.typeId === "minecraft:brick") {
    await occupationUIManager.showJobHelpMenu(player);
  }
  
  // エンダーアイで管理者メニュー表示
  if (itemStack.typeId === "minecraft:ender_eye") {
    await adminUIManager.showAdminMenu(player);
  }
  
  // レッドストーンでテスト殺人事件（デバッグ用）
  if (itemStack.typeId === "minecraft:redstone") {
    const players = world.getAllPlayers();
    if (players.length >= 2) {
      const victim = players.find(p => p.id !== player.id);
      if (victim) {
        // 殺人イベントをトリガー
        system.run(() => {
          world.getDimension("overworld").runCommand(
            `scriptevent mdms:murder {"murdererId":"${player.id}","victimId":"${victim.id}","method":"test"}`
          );
        });
        player.sendMessage(`§cテスト殺人事件: ${victim.name}が犠牲に`);
        world.sendMessage(`§c${victim.name}が殺害されました！`);
      }
    } else {
      player.sendMessage("§cテストには最低2人のプレイヤーが必要です");
    }
  }
  
  // 投票用紙（紙）で投票画面表示
  if (itemStack.typeId === "minecraft:paper") {
    await votingUIManager.showVotingMenu(player);
  }
  
  // ブレイズロッド（杖）で能力メニュー表示
  if (itemStack.typeId === "minecraft:blaze_rod") {
    await abilityUIManager.showAbilityMenu(player);
  }
  
  // 金のリンゴでゲーム結果表示
  if (itemStack.typeId === "minecraft:golden_apple") {
    await showGameResults(player);
  }
  
  // ネザースターで勝利条件チェック（管理者用）
  if (itemStack.typeId === "minecraft:nether_star") {
    const victoryResult = scoringManager.checkVictoryConditions();
    player.sendMessage(`§6勝利条件チェック: ${victoryResult.reason}`);
    if (victoryResult.isGameOver) {
      player.sendMessage(`§c勝利条件: ${victoryResult.victoryCondition}`);
      if (victoryResult.winningTeam) {
        player.sendMessage(`§a勝利チーム: ${victoryResult.winningTeam}`);
      }
    }
  }
  
  // コマンドブロックでシステム統計表示（管理者用）
  if (itemStack.typeId === "minecraft:command_block") {
    const stats = adminManager.getSystemStatistics();
    const statusIcon = stats.health.systemStatus === "healthy" ? "§a●" : 
                      stats.health.systemStatus === "warning" ? "§e●" : "§c●";
    
    player.sendMessage(`${statusIcon} §6システム状態: §f${stats.health.systemStatus}`);
    player.sendMessage(`§6プレイヤー: §f${stats.gameInfo.playerCount}人 (生存: ${stats.gameInfo.aliveCount}人)`);
    player.sendMessage(`§6システム負荷: §f${stats.performance.systemLoad} ops/h`);
    player.sendMessage(`§6エラー数: §f${stats.health.errorCount}`);
  }
  
  // バリアブロックでゲーム強制終了（管理者用）
  if (itemStack.typeId === "minecraft:barrier") {
    await showForceEndConfirmation(player);
  }
  
  // ダイヤモンドでフェーズ強制変更（テスト用）
  if (itemStack.typeId === "minecraft:diamond") {
    const currentPhase = phaseManager.getCurrentPhase();
    let nextPhase: GamePhase;
    
    switch (currentPhase) {
      case GamePhase.PREPARATION:
        nextPhase = GamePhase.DAILY_LIFE;
        break;
      case GamePhase.DAILY_LIFE:
        nextPhase = GamePhase.INVESTIGATION;
        break;
      case GamePhase.INVESTIGATION:
        nextPhase = GamePhase.DISCUSSION;
        break;
      case GamePhase.DISCUSSION:
        nextPhase = GamePhase.REINVESTIGATION;
        break;
      case GamePhase.REINVESTIGATION:
        nextPhase = GamePhase.DEDUCTION;
        break;
      case GamePhase.DEDUCTION:
        nextPhase = GamePhase.VOTING;
        break;
      case GamePhase.VOTING:
        nextPhase = GamePhase.ENDING;
        break;
      default:
        nextPhase = GamePhase.PREPARATION;
        break;
    }
    
    const result = await phaseManager.forcePhaseChange(nextPhase);
    if (result.success) {
      player.sendMessage(`§aフェーズを ${nextPhase} に変更しました`);
    } else {
      player.sendMessage(`§cフェーズ変更エラー: ${result.error}`);
    }
  }
});


// ScriptEvent処理
system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === "mdms:shutdown") {
    phaseManager.dispose();
    scoreboardManager.dispose();
    console.log("MDMS systems shut down");
  }
  
  if (event.id === "mdms:reset") {
    try {
      phaseManager.dispose();
      actionTrackingManager.stopTracking();
      actionTrackingManager.clearAllRecords();
      votingManager.clearAllVotes();
      abilityManager.clearAllData();
      scoreboardManager.initializeObjectives();
      world.sendMessage("§aゲームがリセットされました");
    } catch (error) {
      world.sendMessage(`§cリセットエラー: ${error}`);
    }
  }
});

console.log("MDMS event handlers registered");