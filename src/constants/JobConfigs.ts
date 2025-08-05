import { JobType, SocialStatus, type Job } from "../types/JobTypes";

/**
 * ジョブ定義
 */
export const JOBS: Record<JobType, Job> = {
  [JobType.KING]: {
    type: JobType.KING,
    name: "王",
    description: "王国を統治する最高権力者",
    socialStatus: SocialStatus.NOBLE,
    dailyTasks: ["謁見を行う", "政務を処理する", "城内を巡回する"],
    abilityId: "royal_summon",
    objectiveId: "hide_adultery",
    startingArea: "throne_room",
    accessibleAreas: ["throne_room", "royal_chambers", "courtyard", "garden"]
  },

  [JobType.CAPTAIN]: {
    type: JobType.CAPTAIN,
    name: "近衛隊長",
    description: "王の護衛と城の警備を担当",
    socialStatus: SocialStatus.NOBLE,
    dailyTasks: ["警備巡回", "兵士指導", "城門の監視"],
    abilityId: "protection",
    objectiveId: "maintain_order",
    startingArea: "guard_post",
    accessibleAreas: ["guard_post", "courtyard", "gate", "barracks", "throne_room"]
  },

  [JobType.WIZARD]: {
    type: JobType.WIZARD,
    name: "宮廷魔術師",
    description: "魔術の研究と王室への助言を行う",
    socialStatus: SocialStatus.NOBLE,
    dailyTasks: ["魔術研究", "薬草採取", "占いの実施"],
    abilityId: "divination",
    objectiveId: "complete_research",
    startingArea: "wizard_tower",
    accessibleAreas: ["wizard_tower", "library", "garden", "laboratory"]
  },

  [JobType.MERCHANT]: {
    type: JobType.MERCHANT,
    name: "行商人",
    description: "各地を旅して商売を行う商人",
    socialStatus: SocialStatus.CITIZEN,
    dailyTasks: ["商品仕入れ", "価格交渉", "販売活動"],
    abilityId: "negotiation",
    objectiveId: "earn_profit",
    startingArea: "marketplace",
    accessibleAreas: ["marketplace", "warehouse", "inn", "town_square"]
  },

  [JobType.GUILD_RECEPTIONIST]: {
    type: JobType.GUILD_RECEPTIONIST,
    name: "ギルドの受付",
    description: "冒険者ギルドで依頼の管理を行う",
    socialStatus: SocialStatus.CITIZEN,
    dailyTasks: ["依頼受付", "報告書作成", "ギルド管理"],
    abilityId: "information_network",
    objectiveId: "guild_reputation",
    startingArea: "guild_hall",
    accessibleAreas: ["guild_hall", "town_square", "marketplace", "inn"]
  },

  [JobType.BLACKSMITH]: {
    type: JobType.BLACKSMITH,
    name: "鍛冶屋",
    description: "武器や道具の製作・修理を行う職人",
    socialStatus: SocialStatus.CITIZEN,
    dailyTasks: ["武器製作", "修理作業", "材料調達"],
    abilityId: "appraisal",
    objectiveId: "legendary_weapon",
    startingArea: "smithy",
    accessibleAreas: ["smithy", "marketplace", "warehouse", "mine"]
  },

  [JobType.TAVERN_OWNER]: {
    type: JobType.TAVERN_OWNER,
    name: "酒場の店主",
    description: "酒場を経営し、情報収集の拠点を提供",
    socialStatus: SocialStatus.CITIZEN,
    dailyTasks: ["料理提供", "客対応", "情報収集"],
    abilityId: "eavesdrop",
    objectiveId: "tavern_prosperity",
    startingArea: "tavern",
    accessibleAreas: ["tavern", "kitchen", "cellar", "town_square"]
  },

  [JobType.GARDENER]: {
    type: JobType.GARDENER,
    name: "庭師",
    description: "城の庭園を美しく維持する職人",
    socialStatus: SocialStatus.SERVANT,
    dailyTasks: ["植物手入れ", "庭園管理", "花の世話"],
    abilityId: "concealment",
    objectiveId: "perfect_garden",
    startingArea: "garden",
    accessibleAreas: ["garden", "greenhouse", "tool_shed", "courtyard"]
  },

  [JobType.MAID]: {
    type: JobType.MAID,
    name: "メイド",
    description: "城内の清掃と給仕を担当",
    socialStatus: SocialStatus.SERVANT,
    dailyTasks: ["部屋掃除", "給仕", "洗濯"],
    abilityId: "surveillance",
    objectiveId: "perfect_service",
    startingArea: "servants_quarters",
    accessibleAreas: ["servants_quarters", "kitchen", "royal_chambers", "dining_hall"]
  },

  [JobType.ALCHEMIST]: {
    type: JobType.ALCHEMIST,
    name: "錬金術師の弟子",
    description: "師匠の下で錬金術を学ぶ見習い",
    socialStatus: SocialStatus.SERVANT,
    dailyTasks: ["薬草調合", "実験補助", "材料整理"],
    abilityId: "teleportation",
    objectiveId: "surpass_master",
    startingArea: "laboratory",
    accessibleAreas: ["laboratory", "herb_garden", "storage", "library"]
  }
};

/**
 * 社会階級別ジョブリスト
 */
export const JOBS_BY_STATUS: Record<SocialStatus, JobType[]> = {
  [SocialStatus.NOBLE]: [JobType.KING, JobType.CAPTAIN, JobType.WIZARD],
  [SocialStatus.CITIZEN]: [JobType.MERCHANT, JobType.GUILD_RECEPTIONIST, JobType.BLACKSMITH, JobType.TAVERN_OWNER],
  [SocialStatus.SERVANT]: [JobType.GARDENER, JobType.MAID, JobType.ALCHEMIST]
};

/**
 * バランスの取れたジョブ配布を生成
 */
export function generateBalancedJobDistribution(playerCount: number): JobType[] {
  const jobs: JobType[] = [];
  const statusCounts = {
    [SocialStatus.NOBLE]: Math.min(3, Math.ceil(playerCount * 0.2)),      // 20%を貴族に
    [SocialStatus.CITIZEN]: Math.ceil(playerCount * 0.5),                 // 50%を市民に
    [SocialStatus.SERVANT]: 0                                             // 残りを使用人に
  };
  
  statusCounts[SocialStatus.SERVANT] = playerCount - statusCounts[SocialStatus.NOBLE] - statusCounts[SocialStatus.CITIZEN];
  
  // 各階級からジョブを選択
  for (const [status, count] of Object.entries(statusCounts)) {
    const availableJobs = [...JOBS_BY_STATUS[status as SocialStatus]];
    
    for (let i = 0; i < count; i++) {
      if (availableJobs.length === 0) {
        // ジョブが足りない場合は他の階級から補完
        const allJobs = Object.values(JobType);
        const unusedJobs = allJobs.filter(job => !jobs.includes(job));
        if (unusedJobs.length > 0) {
          jobs.push(unusedJobs[Math.floor(Math.random() * unusedJobs.length)]);
        }
      } else {
        const randomIndex = Math.floor(Math.random() * availableJobs.length);
        jobs.push(availableJobs.splice(randomIndex, 1)[0]);
      }
    }
  }
  
  return jobs;
}

/**
 * ジョブの社会階級を取得
 */
export function getJobSocialStatus(jobType: JobType): SocialStatus {
  return JOBS[jobType].socialStatus;
}