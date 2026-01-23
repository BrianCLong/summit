import type { FeatureFlagService } from '@intelgraph/feature-flags';
import { logger } from './logger.js';

const GLOBAL_KILL_SWITCH_FLAG_KEY = 'platform.kill-switch.global';
const SAFE_MODE_FLAG_KEY = 'platform.safe-mode';

let cachedFeatureFlagService: FeatureFlagService | null | undefined;

const truthy = (value?: string): boolean => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(normalized);
};

export async function getCachedFeatureFlagService(): Promise<FeatureFlagService | undefined> {
  if (cachedFeatureFlagService !== undefined) {
    return cachedFeatureFlagService || undefined;
  }

  return import('../feature-flags/setup.js')
    .then((module) => {
      const service = module.getFeatureFlagService();
      cachedFeatureFlagService = service;
      return service;
    })
    .catch((error) => {
      const msg = 'Feature flag service unavailable for safety checks';
      if (logger && typeof logger.debug === 'function') {
        logger.debug({ err: error }, msg);
      } else {
        console.warn(`[safety.ts] ${msg}:`, error?.message || error);
      }
      cachedFeatureFlagService = null;
      return undefined;
    });
}

async function evaluateFlag(
  flagService: FeatureFlagService | undefined,
  key: string,
): Promise<boolean> {
  if (!flagService) return false;
  try {
    // Cast to any for method compatibility across different FeatureFlagService implementations
    return await (flagService as any).isEnabled(key, { key: 'system' }, false);
  } catch (error: any) {
    logger.warn({ err: error, flag: key }, 'Feature flag evaluation failed');
    return false;
  }
}

export async function isGlobalKillSwitchEnabled(
  flagService?: FeatureFlagService,
): Promise<boolean> {
  if (truthy(process.env.KILL_SWITCH_GLOBAL)) {
    return true;
  }

  const key = process.env.KILL_SWITCH_FLAG_KEY || GLOBAL_KILL_SWITCH_FLAG_KEY;
  return evaluateFlag(flagService, key);
}

export async function isSafeModeEnabled(
  flagService?: FeatureFlagService,
): Promise<boolean> {
  if (truthy(process.env.SAFE_MODE)) {
    return true;
  }

  const key = process.env.SAFE_MODE_FLAG_KEY || SAFE_MODE_FLAG_KEY;
  return evaluateFlag(flagService, key);
}

export async function getSafetyState(flagService?: FeatureFlagService) {
  const service = flagService ?? (await getCachedFeatureFlagService());
  const [killSwitch, safeMode] = await Promise.all([
    isGlobalKillSwitchEnabled(service),
    isSafeModeEnabled(service),
  ]);
  return { killSwitch, safeMode };
}
