/**
 * Feature Flag Management System
 * Provides runtime feature flag evaluation with rollout percentages and guardrails
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface FeatureFlag {
  default: boolean;
  description?: string;
  owners?: string[];
  rollout?: {
    dev?: number;
    staging?: number;
    prod?: number;
  };
  guardrails?: {
    requires?: string[];
    metrics?: string[];
    max_concurrent_jobs?: number;
    max_concurrent_users?: number;
    performance_budget?: string;
  };
  immutable?: boolean;
  created_at?: string;
}

interface FeatureFlags {
  features: Record<string, FeatureFlag>;
}

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flags: FeatureFlags;
  private environment: string;
  private userContext: Map<string, any> = new Map();

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.loadFlags();

    // Watch for flag file changes in development
    if (this.environment === 'development') {
      this.watchFlagChanges();
    }
  }

  public static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  private loadFlags(): void {
    try {
      const flagsPath = path.join(process.cwd(), 'feature-flags', 'flags.yaml');
      const fileContent = fs.readFileSync(flagsPath, 'utf8');
      this.flags = yaml.load(fileContent) as FeatureFlags;
    } catch (error) {
      console.error('Failed to load feature flags, using defaults:', error);
      this.flags = { features: {} };
    }
  }

  private watchFlagChanges(): void {
    const flagsPath = path.join(process.cwd(), 'feature-flags', 'flags.yaml');

    try {
      fs.watchFile(flagsPath, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          console.log('🏁 Feature flags updated, reloading...');
          this.loadFlags();
        }
      });
    } catch (error) {
      console.warn('Could not watch feature flag file:', error);
    }
  }

  /**
   * Check if a feature flag is enabled for the current context
   */
  public isEnabled(
    flagName: string,
    userId?: string,
    context?: Record<string, any>,
  ): boolean {
    const flag = this.flags.features[flagName];

    if (!flag) {
      console.warn(`Feature flag '${flagName}' not found, defaulting to false`);
      return false;
    }

    // Check guardrails first
    if (!this.checkGuardrails(flagName, flag)) {
      return false;
    }

    // If flag is globally disabled, respect that
    if (!flag.default) {
      return false;
    }

    // Check rollout percentage for current environment
    const rolloutPercentage = this.getRolloutPercentage(flag);

    if (rolloutPercentage === 0) {
      return false;
    }

    if (rolloutPercentage === 100) {
      return true;
    }

    // Use consistent hashing for rollout decisions
    const hashInput = `${flagName}:${userId || 'anonymous'}`;
    const hash = this.simpleHash(hashInput);
    const userPercentile = hash % 100;

    return userPercentile < rolloutPercentage;
  }

  /**
   * Get feature flag value with additional metadata
   */
  public getFlag(
    flagName: string,
    userId?: string,
    context?: Record<string, any>,
  ): {
    enabled: boolean;
    flag: FeatureFlag | null;
    reason: string;
  } {
    const flag = this.flags.features[flagName];

    if (!flag) {
      return {
        enabled: false,
        flag: null,
        reason: 'Flag not found',
      };
    }

    // Check guardrails
    const guardrailCheck = this.checkGuardrails(flagName, flag);
    if (!guardrailCheck) {
      return {
        enabled: false,
        flag,
        reason: 'Guardrails not satisfied',
      };
    }

    if (!flag.default) {
      return {
        enabled: false,
        flag,
        reason: 'Globally disabled',
      };
    }

    const rolloutPercentage = this.getRolloutPercentage(flag);

    if (rolloutPercentage === 0) {
      return {
        enabled: false,
        flag,
        reason: `Rollout disabled for ${this.environment}`,
      };
    }

    if (rolloutPercentage === 100) {
      return {
        enabled: true,
        flag,
        reason: `Full rollout in ${this.environment}`,
      };
    }

    const hashInput = `${flagName}:${userId || 'anonymous'}`;
    const hash = this.simpleHash(hashInput);
    const userPercentile = hash % 100;
    const enabled = userPercentile < rolloutPercentage;

    return {
      enabled,
      flag,
      reason: enabled
        ? `User in rollout (${userPercentile} < ${rolloutPercentage})`
        : `User not in rollout (${userPercentile} >= ${rolloutPercentage})`,
    };
  }

  /**
   * Check if feature flag requirements and guardrails are satisfied
   */
  private checkGuardrails(flagName: string, flag: FeatureFlag): boolean {
    if (!flag.guardrails) {
      return true;
    }

    // Check required flags
    if (flag.guardrails.requires) {
      for (const requiredFlag of flag.guardrails.requires) {
        if (!this.isEnabled(requiredFlag)) {
          console.warn(
            `Feature flag '${flagName}' requires '${requiredFlag}' to be enabled`,
          );
          return false;
        }
      }
    }

    // Additional guardrail checks can be added here
    // e.g., check metrics, resource limits, etc.

    return true;
  }

  private getRolloutPercentage(flag: FeatureFlag): number {
    if (!flag.rollout) {
      return flag.default ? 100 : 0;
    }

    const envMap = {
      development: 'dev',
      staging: 'staging',
      production: 'prod',
    };

    const envKey = envMap[this.environment as keyof typeof envMap] || 'dev';
    return flag.rollout[envKey as keyof typeof flag.rollout] || 0;
  }

  /**
   * Simple hash function for consistent rollout decisions
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get all enabled flags for a user
   */
  public getEnabledFlags(
    userId?: string,
    context?: Record<string, any>,
  ): Record<string, boolean> {
    const enabledFlags: Record<string, boolean> = {};

    Object.keys(this.flags.features).forEach((flagName) => {
      enabledFlags[flagName] = this.isEnabled(flagName, userId, context);
    });

    return enabledFlags;
  }

  /**
   * Set user context for personalized feature flag evaluation
   */
  public setUserContext(userId: string, context: any): void {
    this.userContext.set(userId, context);
  }

  /**
   * Clear user context
   */
  public clearUserContext(userId: string): void {
    this.userContext.delete(userId);
  }

  /**
   * Get all flags with their current status (for debugging)
   */
  public getAllFlags(): FeatureFlags {
    return this.flags;
  }

  /**
   * Emergency kill switch - disable all non-immutable flags
   */
  public emergencyKillSwitch(): void {
    console.warn(
      '🚨 EMERGENCY KILL SWITCH ACTIVATED - Disabling all mutable feature flags',
    );

    Object.entries(this.flags.features).forEach(([name, flag]) => {
      if (!flag.immutable) {
        flag.default = false;
        if (flag.rollout) {
          Object.keys(flag.rollout).forEach((env) => {
            (flag.rollout as any)[env] = 0;
          });
        }
        console.warn(`🔴 Disabled: ${name}`);
      }
    });
  }
}

// Singleton instance
export const featureFlags = FeatureFlagService.getInstance();

// Convenience functions
export const isFeatureEnabled = (
  flagName: string,
  userId?: string,
  context?: Record<string, any>,
): boolean => {
  return featureFlags.isEnabled(flagName, userId, context);
};

export const getFeatureFlag = (
  flagName: string,
  userId?: string,
  context?: Record<string, any>,
) => {
  return featureFlags.getFlag(flagName, userId, context);
};
