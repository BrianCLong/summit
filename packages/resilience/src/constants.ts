import { Tier, TierTargets } from './types';

export const TIER_TARGETS: Record<Tier, TierTargets> = {
  T0: {
    rpoMinutes: 5,
    rtoMinutes: 15,
    restoreVerificationCadenceDays: 90,
    drillCadenceDays: 90,
  },
  T1: {
    rpoMinutes: 30,
    rtoMinutes: 60,
    restoreVerificationCadenceDays: 90,
    drillCadenceDays: 90,
  },
  T2: {
    rpoMinutes: 240,
    rtoMinutes: 480,
    restoreVerificationCadenceDays: 30,
    drillCadenceDays: 30,
  },
  T3: {
    rpoMinutes: 1440,
    rtoMinutes: 1440,
    restoreVerificationCadenceDays: 180,
    drillCadenceDays: 180,
  },
};

export const MAX_CHAOS_SCORE = 100;
