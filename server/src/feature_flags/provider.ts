import { DEFAULT_FLAGS, FeatureFlag, FeatureFlags } from './registry.js';

export interface FlagContext {
  userId?: string;
  tenantId?: string;
  role?: string;
}

export class FeatureFlagProvider {
  private static instance: FeatureFlagProvider;
  private overrides: Map<string, boolean> = new Map();

  private constructor() {
    this.loadEnvOverrides();
  }

  public static getInstance(): FeatureFlagProvider {
    if (!FeatureFlagProvider.instance) {
      FeatureFlagProvider.instance = new FeatureFlagProvider();
    }
    return FeatureFlagProvider.instance;
  }

  private loadEnvOverrides() {
    // Load from process.env, looking for FLAG_ prefix
    // e.g. FLAG_NEW_SEARCH_ALGORITHM=true
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('FLAG_')) {
        const flagName = key.replace('FLAG_', '').toLowerCase();
        // Match against known flags if strictly required, or allow dynamic
        // For now, we map back to the registry values if possible
        const knownFlag = Object.values(FeatureFlags).find(
          (f) => f.replace(/_/g, '').toLowerCase() === flagName.replace(/_/g, '').toLowerCase()
        );

        if (knownFlag) {
          this.overrides.set(knownFlag, process.env[key] === 'true');
        }
      }
    }
  }

  public isEnabled(flag: FeatureFlag, context?: FlagContext): boolean {
    // 1. Runtime/Env overrides
    if (this.overrides.has(flag)) {
      return this.overrides.get(flag)!;
    }

    // 2. Config overrides (could be injected, skipping for now as per minimal scope)

    // 3. Defaults
    return DEFAULT_FLAGS[flag] ?? false;
  }

  // Helper to set overrides programmatically (useful for tests)
  public setOverride(flag: FeatureFlag, value: boolean) {
    this.overrides.set(flag, value);
  }

  public clearOverrides() {
    this.overrides.clear();
    this.loadEnvOverrides();
  }
}
