import type { Phase } from "src/types/PhaseType";
import type { ExtendedActionType } from "../../types/ActionTypes";

/**
 * ゲームのフェーズ管理を担当するインターフェース
 * フェーズの状態管理、遷移制御、および各フェーズでの制限事項を管理します
 */
export interface IPhaseManager {
  /**
   * 現在のゲームフェーズを取得
   * @returns 現在のGamePhase
   */
  getCurrentPhase(): Phase;

  /**
   * 新しいフェーズを開始し、制限時間を設定
   * @param phase 開始するフェーズ
   * @param duration フェーズの制限時間（秒）
   */
  startPhase(phase: Phase): Promise<void>;

  /**
   * 指定されたアクションが現在のフェーズで許可されているかを判定
   * @param action チェックするアクション
   * @returns アクションが許可されているか
   */
  isActionAllowed(action: ExtendedActionType): boolean;

  /**
   * PhaseManagerのリソースを解放
   * タイマーやイベントリスナーなどのクリーンアップを行います
   */
  dispose(): Promise<void>;
}
