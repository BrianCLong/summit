/**
 * Switchboard Local Quota Management (CLI)
 */

import Conf from 'conf';

export type PricingTier = 'community' | 'pro' | 'power' | 'white-label-starter' | 'white-label-team';

export interface TierLimits {
  runs: number;
  actions: number;
  retentionDays: number;
  allowExport: boolean;
}

export const TIER_LIMITS: Record<PricingTier, TierLimits> = {
  'community': { runs: 10, actions: 100, retentionDays: 7, allowExport: false },
  'pro': { runs: 100, actions: 1000, retentionDays: 90, allowExport: true },
  'power': { runs: 300, actions: 5000, retentionDays: 365, allowExport: true },
  'white-label-starter': { runs: 500, actions: 10000, retentionDays: 180, allowExport: true },
  'white-label-team': { runs: 2000, actions: 50000, retentionDays: 365, allowExport: true },
};

interface Usage {
  runs: number;
  actions: number;
  lastReset: string;
}

const quotaStore = new Conf<{ usage: Record<string, Usage> }>({
  projectName: 'intelgraph-switchboard-quota',
  defaults: {
    usage: {},
  },
});

export function getUsage(tenantId: string): Usage {
  const allUsage = quotaStore.get('usage');
  const usage = allUsage[tenantId] || {
    runs: 0,
    actions: 0,
    lastReset: new Date().toISOString(),
  };

  // Reset if it's a new day
  const lastReset = new Date(usage.lastReset);
  const now = new Date();
  if (
    now.getUTCDate() !== lastReset.getUTCDate() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCFullYear() !== lastReset.getUTCFullYear()
  ) {
    usage.runs = 0;
    usage.actions = 0;
    usage.lastReset = now.toISOString();
    saveUsage(tenantId, usage);
  }

  return usage;
}

function saveUsage(tenantId: string, usage: Usage): void {
  const allUsage = quotaStore.get('usage');
  allUsage[tenantId] = usage;
  quotaStore.set('usage', allUsage);
}

export function assertRun(tenantId: string, tier: PricingTier = 'community'): void {
  const limits = TIER_LIMITS[tier];
  const usage = getUsage(tenantId);

  if (usage.runs >= limits.runs) {
    throw new Error(`Daily run quota exceeded for tier ${tier} (${usage.runs}/${limits.runs}). Please upgrade for more capacity.`);
  }

  usage.runs += 1;
  saveUsage(tenantId, usage);
}

export function assertAction(tenantId: string, tier: PricingTier = 'community'): void {
  const limits = TIER_LIMITS[tier];
  const usage = getUsage(tenantId);

  if (usage.actions >= limits.actions) {
    throw new Error(`Daily action quota exceeded for tier ${tier} (${usage.actions}/${limits.actions}). Please upgrade for more capacity.`);
  }

  usage.actions += 1;
  saveUsage(tenantId, usage);
}

export function canExport(tier: PricingTier = 'community'): boolean {
  return TIER_LIMITS[tier].allowExport;
}
