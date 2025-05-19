import { OccupationName } from "../types/OccupationTypes";

// ゲーム開始設定
export const DEFAULT_CONFIG = {
  maxPlayers: 20,
  minPlayers: 4,
  evidenceSettings: {
    maxPhysicalEvidence: 10,
    maxTestimonies: 20,
    reliabilityThreshold: 0.7,
  },
  roleDistribution: {
    detective: 1,
    killer: 1,
    accomplice: 1,
    citizen: 5,
  },
  occupationRules: {
    detective: {
      allowedOccupations: [OccupationName.GUARD, OccupationName.PRIEST],
      forbiddenOccupations: [OccupationName.PRISONER],
    },
    killer: {
      allowedOccupations: [OccupationName.PRISONER],
      forbiddenOccupations: [OccupationName.GUARD, OccupationName.PRIEST],
    },
    accomplice: {
      allowedOccupations: [OccupationName.MERCHANT, OccupationName.PRISONER],
      forbiddenOccupations: [OccupationName.GUARD],
    },
    citizen: {
      allowedOccupations: [
        OccupationName.GUARD,
        OccupationName.MERCHANT,
        OccupationName.PRIEST,
        OccupationName.PRISONER,
      ],
      forbiddenOccupations: [],
    },
  },
  occupationBalance: {
    minOccupationDiversity: 2,
    maxSameOccupation: 2,
  },
};
