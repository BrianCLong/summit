// server/src/featureFlags/MemoryFlagRepository.ts
import { FeatureFlagRepository, FeatureFlag } from './types.js';

export class MemoryFlagRepository implements FeatureFlagRepository {
  private flags: Map<string, FeatureFlag>;
  private logger: typeof console;

  constructor(initialFlags?: FeatureFlag[]) {
    this.flags = new Map();
    this.logger = console;
    
    // Initialize with any provided flags
    if (initialFlags) {
      initialFlags.forEach(flag => {
        this.flags.set(flag.key, flag);
      });
    }
  }

  async getFlag(flagKey: string): Promise<FeatureFlag | null> {
    const flag = this.flags.get(flagKey);
    return flag || null;
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  async updateFlag(flag: FeatureFlag): Promise<void> {
    const existing = this.flags.get(flag.key);
    if (!existing) {
      throw new Error(`Feature flag with key "${flag.key}" does not exist.`);
    }

    // Preserve creation data but update other fields
    const updatedFlag: FeatureFlag = {
      ...flag,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy,
      updatedAt: new Date()
    };

    this.flags.set(flag.key, updatedFlag);
    this.logger.log(`Updated feature flag: ${flag.key}`);
  }

  async createFlag(flag: FeatureFlag): Promise<void> {
    const now = new Date();
    
    const newFlag: FeatureFlag = {
      ...flag,
      createdAt: flag.createdAt || now,
      createdBy: flag.createdBy || 'system',
      updatedAt: now
    };

    this.flags.set(flag.key, newFlag);
    this.logger.log(`Created feature flag: ${flag.key}`);
  }

  async deleteFlag(flagKey: string): Promise<void> {
    const deleted = this.flags.delete(flagKey);
    if (deleted) {
      this.logger.log(`Deleted feature flag: ${flagKey}`);
    } else {
      this.logger.warn(`Attempted to delete non-existent feature flag: ${flagKey}`);
    }
  }

  // Method to add multiple flags at once (useful for seeding)
  addFlags(flags: FeatureFlag[]): void {
    flags.forEach(flag => {
      this.flags.set(flag.key, {
        ...flag,
        createdAt: flag.createdAt || new Date(),
        createdBy: flag.createdBy || 'system',
        updatedAt: new Date()
      });
    });
  }

  // Method to get all flag keys (for debugging/monitoring)
  getAllFlagKeys(): string[] {
    return Array.from(this.flags.keys());
  }

  // Method to clear all flags (useful for testing)
  clear(): void {
    this.flags.clear();
  }
}