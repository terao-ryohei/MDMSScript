import type { AbilityTarget } from "../../types/AdvancedFeatureTypes";

/**
 * UI調整インターフェース
 */
export interface IUICoordinator {
  /**
   * プレイヤー情報（役割と職業）を表示する
   */
  showPlayerInfo(playerId: string): Promise<void>;

  /**
   * 能力UIを更新する
   */
  updateAbilityUI(playerId: string): Promise<void>;

  /**
   * 能力使用を処理する
   */
  handleAbilityUse(
    playerId: string,
    abilityId: string,
    source: "role" | "occupation",
    target: AbilityTarget,
  ): Promise<boolean>;

  /**
   * 全てのUIを非表示にする
   */
  hideAllDetails(playerId: string): Promise<void>;

  /**
   * 通知を表示する
   */
  showNotification(
    playerId: string,
    message: string,
    type: "info" | "warning" | "error" | "success",
    duration?: number,
  ): Promise<void>;

  /**
   * 初期UIを設定する
   */
  setupInitialUI(playerId: string): Promise<void>;

  /**
   * UIの状態を同期する
   */
  syncUIState(playerId: string): Promise<void>;

  /**
   * UI更新のイベントを処理する
   */
  handleUIEvent(
    playerId: string,
    eventType: string,
    data?: Record<string, unknown>,
  ): Promise<void>;

  /**
   * エラー状態を処理する
   */
  handleError(
    playerId: string,
    error: Error,
    context: "role" | "occupation" | "general",
  ): Promise<void>;
}
