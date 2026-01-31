import Redis from 'ioredis';
import { FeatureSet, FeatureDefinition } from './types.js';
import { logger } from '../config/logger.js';

/**
 * Feature Store Service.
 * Backed by Redis (Online) with in-memory fallback.
 */
export class FeatureStoreService {
  private static instance: FeatureStoreService;
  private redis?: Redis;
  private memoryStore: Map<string, string>; // Fallback
  private featureDefinitions: Map<string, FeatureSet>;
  private useRedis: boolean = false;

  private constructor() {
    this.memoryStore = new Map();
    this.featureDefinitions = new Map();

    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL);
        this.useRedis = true;
        this.redis.on('error', (err: any) => {
          logger.error({ err }, 'Redis Feature Store connection error, falling back to memory');
          this.useRedis = false;
        });
      } catch (err: any) {
        logger.warn('Failed to initialize Redis for Feature Store, using memory fallback');
      }
    }
  }

  public static getInstance(): FeatureStoreService {
    if (!FeatureStoreService.instance) {
      FeatureStoreService.instance = new FeatureStoreService();
    }
    return FeatureStoreService.instance;
  }

  /**
   * Register a feature set definition.
   */
  async registerFeatureSet(featureSet: FeatureSet): Promise<void> {
    this.featureDefinitions.set(featureSet.name, featureSet);
    // In a real system, persist to metadata store (Postgres/Ledger)
    if (this.useRedis && this.redis) {
       await this.redis.hset('feature_sets', featureSet.name, JSON.stringify(featureSet));
    }
  }

  /**
   * Ingest feature values for a specific entity.
   */
  async ingestFeatures(
    featureSetName: string,
    entityId: string,
    values: Record<string, any>
  ): Promise<void> {
    const key = `fs:${featureSetName}:${entityId}`;
    const serialized = JSON.stringify(values);

    if (this.useRedis && this.redis) {
      await this.redis.set(key, serialized, 'EX', 3600); // 1 hour TTL default
    } else {
      this.memoryStore.set(key, serialized);
    }
  }

  /**
   * Retrieve features for online inference.
   */
  async getOnlineFeatures(
    featureSetName: string,
    entityId: string,
    featureNames: string[]
  ): Promise<Record<string, any> | null> {
    const key = `fs:${featureSetName}:${entityId}`;
    let allFeaturesStr: string | null = null;

    if (this.useRedis && this.redis) {
      allFeaturesStr = await this.redis.get(key);
    } else {
      allFeaturesStr = this.memoryStore.get(key) || null;
    }

    if (!allFeaturesStr) return null;

    try {
        const allFeatures = JSON.parse(allFeaturesStr);
        const result: Record<string, any> = {};
        featureNames.forEach(name => {
        if (name in allFeatures) {
            result[name] = allFeatures[name];
        }
        });
        return result;
    } catch (e: any) {
        logger.error('Error parsing features', e);
        return null;
    }
  }

  /**
   * Batch retrieval for multiple entities.
   */
  async getBatchOnlineFeatures(
    featureSetName: string,
    entityIds: string[],
    featureNames: string[]
  ): Promise<Record<string, Record<string, any>>> {
    const result: Record<string, Record<string, any>> = {};

    // Pipelining could be used here for Redis optimization
    for (const id of entityIds) {
      const features = await this.getOnlineFeatures(featureSetName, id, featureNames);
      if (features) {
        result[id] = features;
      }
    }
    return result;
  }
}

export const featureStore = FeatureStoreService.getInstance();
