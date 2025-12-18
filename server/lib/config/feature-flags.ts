import { createHash } from 'crypto';

export interface FeatureFlagDefinition {
  description?: string;
  enabled: boolean;
  environments?: Record<string, boolean>;
  rolloutPercentage?: number;
  salt?: string;
}

export interface FeatureFlagConfig {
  flags?: Record<string, FeatureFlagDefinition>;
}

export class FeatureFlagService {
  private environment: string;
  private flags: Record<string, FeatureFlagDefinition>;

  constructor(config: FeatureFlagConfig = {}, environment?: string) {
    this.environment = environment || process.env.APP_ENV || process.env.NODE_ENV || 'development';
    this.flags = config.flags || {};
  }

  isEnabled(flag: string, context?: { userId?: string; tenantId?: string }): boolean {
    const definition = this.flags[flag];
    if (!definition) return false;

    const envOverride = definition.environments?.[this.environment];
    const enabled = envOverride !== undefined ? envOverride : definition.enabled;

    if (!enabled) return false;

    if (definition.rolloutPercentage && definition.rolloutPercentage < 100) {
      const key = context?.userId || context?.tenantId || 'anonymous';
      const hash = createHash('sha256').update(`${flag}:${key}:${definition.salt || 'feature-flag'}`).digest('hex');
      const bucket = parseInt(hash.slice(0, 8), 16) % 100;
      return bucket < definition.rolloutPercentage;
    }

    return true;
  }

  all(): Record<string, FeatureFlagDefinition> {
    return this.flags;
  }
}
