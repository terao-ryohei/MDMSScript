/**
 * ジョブタイプ（職業）
 */
export enum JobType {
  KING = "king",                        // 王
  CAPTAIN = "captain",                  // 近衛隊長
  WIZARD = "wizard",                    // 宮廷魔術師
  MERCHANT = "merchant",                // 行商人
  GUILD_RECEPTIONIST = "guild_receptionist", // ギルドの受付
  BLACKSMITH = "blacksmith",            // 鍛冶屋
  TAVERN_OWNER = "tavern_owner",        // 酒場の店主
  GARDENER = "gardener",                // 庭師
  MAID = "maid",                        // メイド
  ALCHEMIST = "alchemist"              // 錬金術師の弟子
}

/**
 * 社会階級
 */
export enum SocialStatus {
  NOBLE = "noble",        // 王族・貴族
  CITIZEN = "citizen",    // 市民・商人
  SERVANT = "servant"     // 使用人・労働者
}

/**
 * ジョブ定義
 */
export interface Job {
  type: JobType;
  name: string;
  description: string;
  socialStatus: SocialStatus;
  dailyTasks: string[];           // 日常タスクリスト
  abilityId: string;              // ジョブ固有能力ID
  objectiveId: string;            // ジョブ固有目的ID
  startingArea: string;           // 開始エリア
  accessibleAreas: string[];      // アクセス可能エリア
}

/**
 * ジョブ割り当て結果
 */
export interface JobAssignmentResult {
  success: boolean;
  assignments: Map<string, JobType>; // playerId -> job
  statusDistribution: Map<SocialStatus, number>;
  error?: string;
}