import { TenantConfig } from './types';

export interface PilotConfig {
  /**
   * Whether the pilot program is active for this tenant
   */
  active: boolean;

  /**
   * The specific cohort or phase of the pilot
   */
  cohort: 'alpha' | 'beta' | 'design-partner' | 'internal';

  /**
   * Start date of the pilot engagement
   */
  startDate: string; // ISO Date string

  /**
   * Scheduled end date
   */
  endDate?: string; // ISO Date string

  /**
   * List of specific feature flags enabled for this pilot
   */
  enabledFeatures: string[];

  /**
   * Success criteria overrides or specifics for this pilot
   */
  successCriteria?: {
    minDailyActiveUsers?: number;
    customGoals?: string[];
  };
}

export const DEFAULT_PILOT_CONFIG: PilotConfig = {
  active: false,
  cohort: 'internal',
  startDate: new Date().toISOString(),
  enabledFeatures: [],
};

/**
 * Check if a specific feature is enabled for a pilot tenant
 */
export function isPilotFeatureEnabled(config: TenantConfig, featureKey: string): boolean {
  if (!config.pilotProgram || !config.pilotProgram.active) {
    return false;
  }
  return config.pilotProgram.enabledFeatures.includes(featureKey);
}
