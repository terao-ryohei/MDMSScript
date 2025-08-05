import { Player } from "@minecraft/server";

/**
 * UI管理インターフェース
 */
export interface IUIManager {
  /**
   * プレイヤー情報UIを表示
   */
  showPlayerInfo(player: Player): Promise<void>;

  /**
   * ゲーム状態UIを表示
   */
  showGameState(player: Player): Promise<void>;

  /**
   * フェーズ情報UIを表示
   */
  showPhaseInfo(player: Player): Promise<void>;

  /**
   * 管理者向けデバッグUIを表示
   */
  showAdminMenu(player: Player): Promise<void>;

  /**
   * 証拠一覧UIを表示
   */
  showEvidenceList(player: Player): Promise<void>;

  /**
   * プレイヤー一覧UIを表示
   */
  showPlayerList(player: Player): Promise<void>;
}

/**
 * UI表示結果
 */
export interface UIResult {
  success: boolean;
  action?: string;
  data?: any;
  error?: string;
}