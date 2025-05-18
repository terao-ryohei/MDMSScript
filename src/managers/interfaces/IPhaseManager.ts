import type { GamePhase } from "src/constants/main";
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
  getCurrentPhase(): GamePhase;

  /**
   * 新しいフェーズを開始し、制限時間を設定
   * @param phase 開始するフェーズ
   * @param duration フェーズの制限時間（秒）
   */
  startPhase(phase: GamePhase, duration: number): Promise<void>;

  /**
   * 指定されたアクションが現在のフェーズで許可されているかを判定
   * @param action チェックするアクション
   * @returns アクションが許可されているか
   */
  isActionAllowed(action: ExtendedActionType): boolean;

  /**
   * 現在のフェーズで投票が許可されているかを確認
   * @returns 投票が許可されているか
   */
  canVote(): boolean;

  /**
   * 現在のフェーズで証拠収集が許可されているかを確認
   * @returns 証拠収集が許可されているか
   */
  canCollectEvidence(): boolean;

  /**
   * 現在のフェーズでチャットが許可されているかを確認
   * @returns チャットが許可されているか
   */
  canChat(): boolean;

  /**
   * 現在のフェーズの経過時間を取得
   * @returns フェーズ開始からの経過時間（秒）
   */
  getElapsedTime(): number;

  /**
   * PhaseManagerのリソースを解放
   * タイマーやイベントリスナーなどのクリーンアップを行います
   */
  dispose(): Promise<void>;
}
