import { Redis } from 'ioredis';

export interface CacheConfig {
  l1?: L1CacheConfig;
  l2?: L2CacheConfig;
  l3?: L3CacheConfig;
  defaultTTL?: number;
  enableMetrics?: boolean;
  stampedePrevention?: boolean;
  versioningEnabled?: boolean;
}

export interface L1CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  updateAgeOnGet?: boolean;
}

export interface L2CacheConfig {
  enabled: boolean;
  redis: Redis;
  ttl: number;
  keyPrefix?: string;
  compressionThreshold?: number;
}

export interface L3CacheConfig {
  enabled: boolean;
  provider: 'cloudfront' | 'cloudflare' | 'fastly';
  distributionId?: string;
  apiKey?: string;
  zone?: string;
  ttl: number;
}

export interface CacheEntry<T = any> {
  value: T;
  version?: number;
  metadata?: CacheMetadata;
  createdAt: number;
  expiresAt: number;
}

export interface CacheMetadata {
  tags?: string[];
  dependencies?: string[];
  compressed?: boolean;
  size?: number;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  dependencies?: string[];
  version?: number;
  skipL1?: boolean;
  skipL2?: boolean;
  skipL3?: boolean;
}

export interface CacheStats {
  l1: TierStats;
  l2: TierStats;
  l3: TierStats;
  overall: {
    hitRate: number;
    missRate: number;
    avgLatency: number;
  };
}

export interface TierStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  avgLatency: number;
}

export interface InvalidationStrategy {
  type: 'immediate' | 'lazy' | 'scheduled';
  delay?: number;
  cascadeToTier?: 'l1' | 'l2' | 'l3' | 'all';
}

export interface WarmingStrategy {
  keys: string[];
  loader: (key: string) => Promise<any>;
  priority?: 'high' | 'normal' | 'low';
  schedule?: string; // Cron expression
  parallel?: number;
}

export interface StampedeConfig {
  lockTTL: number;
  lockRetryDelay: number;
  maxRetries: number;
}
