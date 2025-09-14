import type { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

/**
 * 共通UIパターンファクトリー
 */

/**
 * プレイヤー選択UIパターン
 */
export const createPlayerSelectionUI = (
  title: string, 
  players: Player[], 
  includeAll: boolean = false
): ActionFormData => {
  const form = new ActionFormData().title(title);
  
  if (includeAll && players.length > 1) {
    form.button("§b全プレイヤー", "textures/ui/permissions_op_crown");
  }
  
  players.forEach(player => {
    form.button(`${player.name}`, "textures/ui/permissions_member_star");
  });
  
  return form;
};

/**
 * 管理者メニューパターン
 */
export const createAdminMenuUI = (title: string): ActionFormData => {
  return new ActionFormData()
    .title(title)
    .button("§cゲーム管理", "textures/ui/gear")
    .button("§eプレイヤー管理", "textures/ui/permissions_member_star")
    .button("§b設定変更", "textures/ui/settings_glyph_color_2x")
    .button("§a統計情報", "textures/ui/book_metatag_default")
    .button("§7戻る", "textures/ui/arrow_left");
};

/**
 * ページネーション付きメニュー
 */
export const createPaginatedMenu = (
  title: string, 
  items: { name: string, icon?: string }[], 
  currentPage: number = 0,
  pageSize: number = 8
): { form: ActionFormData, pagination: { hasNext: boolean, hasPrev: boolean, totalPages: number } } => {
  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);
  
  const form = new ActionFormData().title(`${title} (${currentPage + 1}/${totalPages})`);
  
  // 現在のページのアイテムを追加
  items.slice(startIndex, endIndex).forEach(item => {
    form.button(item.name, item.icon || "textures/ui/book_metatag_default");
  });
  
  // ページネーションボタン
  if (currentPage > 0) {
    form.button("§7◀ 前のページ", "textures/ui/arrow_left");
  }
  if (currentPage < totalPages - 1) {
    form.button("§7次のページ ▶", "textures/ui/arrow_right");
  }
  
  return {
    form,
    pagination: {
      hasNext: currentPage < totalPages - 1,
      hasPrev: currentPage > 0,
      totalPages
    }
  };
};

/**
 * ステータス表示UI
 */
export const createStatusDisplayUI = (
  title: string, 
  statusItems: { label: string, value: string, isGood?: boolean }[]
): ActionFormData => {
  const form = new ActionFormData().title(title);
  
  const body = statusItems
    .map(item => {
      const color = item.isGood !== false ? "§a" : "§c";
      return `§7${item.label}: ${color}${item.value}`;
    })
    .join("\n");
  
  form.body(body);
  form.button("§7閉じる", "textures/ui/cancel");
  
  return form;
};

/**
 * 詳細情報表示UI
 */
export const createDetailViewUI = (
  title: string, 
  sections: { title: string, content: string }[]
): ActionFormData => {
  const form = new ActionFormData().title(title);
  
  const body = sections
    .map(section => `§6${section.title}§r\n${section.content}`)
    .join("\n\n");
  
  form.body(body);
  form.button("§7戻る", "textures/ui/arrow_left");
  
  return form;
};