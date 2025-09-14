import type { Player } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";

/**
 * UIマネージャーの基底クラス
 * 共通のUIパターンとエラーハンドリングを提供
 */
export abstract class BaseUIManager {
  
  /**
   * 基本的なActionFormを作成
   */
  protected createActionForm(title: string, body?: string): ActionFormData {
    const form = new ActionFormData().title(title);
    if (body) {
      form.body(body);
    }
    return form;
  }

  /**
   * 基本的なMessageFormを作成
   */
  protected createMessageForm(title: string, body: string): MessageFormData {
    return new MessageFormData()
      .title(title)
      .body(body);
  }

  /**
   * 基本的なModalFormを作成
   */
  protected createModalForm(title: string): ModalFormData {
    return new ModalFormData().title(title);
  }

  /**
   * 確認ダイアログを表示
   */
  protected async showConfirmationDialog(
    player: Player, 
    title: string, 
    message: string, 
    confirmText: string = "確認", 
    cancelText: string = "キャンセル"
  ): Promise<boolean> {
    try {
      const form = this.createMessageForm(title, message)
        .button1(confirmText)
        .button2(cancelText);

      const response = await form.show(player);
      return response.selection === 0;
    } catch (error) {
      this.handleUIError(player, error as Error);
      return false;
    }
  }

  /**
   * エラー表示ダイアログ
   */
  protected async showErrorDialog(player: Player, title: string, message: string): Promise<void> {
    try {
      const form = this.createMessageForm(title, `§c${message}`)
        .button1("確認");
      
      await form.show(player);
    } catch (error) {
      console.error(`Failed to show error dialog: ${error}`);
    }
  }

  /**
   * 情報表示ダイアログ
   */
  protected async showInfoDialog(player: Player, title: string, message: string): Promise<void> {
    try {
      const form = this.createMessageForm(title, message)
        .button1("確認");
      
      await form.show(player);
    } catch (error) {
      this.handleUIError(player, error as Error);
    }
  }

  /**
   * プレイヤーリストを文字列配列に変換
   */
  protected formatPlayerList(players: Player[]): string[] {
    return players.map(p => p.name);
  }

  /**
   * プレイヤー選択UI作成
   */
  protected createPlayerSelectionForm(
    title: string, 
    players: Player[], 
    body?: string
  ): ActionFormData {
    const form = this.createActionForm(title, body);
    
    players.forEach(player => {
      form.button(`${player.name}`, "textures/ui/permissions_member_star");
    });

    return form;
  }

  /**
   * ページネーション付きリスト作成
   */
  protected createPaginatedList<T>(
    items: T[], 
    pageSize: number, 
    currentPage: number = 0
  ): { items: T[], hasNext: boolean, hasPrev: boolean, totalPages: number } {
    const totalPages = Math.ceil(items.length / pageSize);
    const startIndex = currentPage * pageSize;
    const endIndex = Math.min(startIndex + pageSize, items.length);
    
    return {
      items: items.slice(startIndex, endIndex),
      hasNext: currentPage < totalPages - 1,
      hasPrev: currentPage > 0,
      totalPages
    };
  }

  /**
   * UIエラーハンドリング
   */
  protected handleUIError(player: Player, error: Error): void {
    console.error(`UI Error for player ${player.name}: ${error.message}`);
    
    // プレイヤーにエラーメッセージを送信
    player.sendMessage("§cUI操作中にエラーが発生しました。しばらくしてからもう一度お試しください。");
    
    // デバッグ情報をログに出力
    if (error.stack) {
      console.error(`Stack trace: ${error.stack}`);
    }
  }

  /**
   * UIレスポンスの共通処理
   */
  protected async handleFormResponse<T>(
    player: Player,
    formPromise: Promise<T>,
    errorMessage: string = "フォームの表示に失敗しました"
  ): Promise<T | null> {
    try {
      return await formPromise;
    } catch (error) {
      this.handleUIError(player, new Error(`${errorMessage}: ${error}`));
      return null;
    }
  }

  /**
   * 標準的なメニュー項目作成
   */
  protected addMenuButton(
    form: ActionFormData, 
    text: string, 
    icon?: string, 
    description?: string
  ): ActionFormData {
    const buttonText = description ? `${text}\n§7${description}` : text;
    return form.button(buttonText, icon);
  }

  /**
   * ステータス表示用のテキスト作成
   */
  protected createStatusText(label: string, value: string, good: boolean = true): string {
    const color = good ? "§a" : "§c";
    return `§7${label}: ${color}${value}`;
  }
}