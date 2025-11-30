/**
 * Type definitions for Policy-Aware Cache
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

/**
 * User ABAC (Attribute-Based Access Control) attributes
 */
export interface UserABACAttributes {
  userId: string;
  roles: string[];
  clearanceLevel?: string;
  organizationId?: string;
  compartments?: string[];
  customAttributes?: Record<string, any>;
}

/**
 * Data snapshot identifier - tracks versioning of source data
 */
export interface DataSnapshot {
  /** Unique identifier for the data version */
  snapshotId: string;
  /** Timestamp of the snapshot */
  timestamp: string;
  /** Hash of the source data */
  dataHash: string;
  /** Optional source identifiers (database versions, file checksums, etc.) */
  sources?: Record<string, string>;
}

/**
 * Policy version information
 */
export interface PolicyVersion {
  /** Policy version identifier */
  version: string;
  /** Hash/digest of the policy document */
  digest: string;
  /** Timestamp when policy was activated */
  effectiveDate: string;
  /** Optional OPA bundle revision */
  bundleRevision?: string;
}

/**
 * Cache key components used to build the composite key
 */
export interface CacheKeyComponents {
  /** Hash of the query (GraphQL query, SQL, etc.) */
  queryHash: string;
  /** Hash of query parameters/variables */
  paramsHash: string;
  /** Policy version information */
  policyVersion: PolicyVersion;
  /** User ABAC attributes */
  userAttributes: UserABACAttributes;
  /** Data snapshot identifier */
  dataSnapshot: DataSnapshot;
}

/**
 * Cryptographic proof bundle proving cache validity
 */
export interface ProofBundle {
  /** Composite cache key */
  cacheKey: string;
  /** Hash of the query */
  queryHash: string;
  /** Hash of parameters */
  paramsHash: string;
  /** Policy digest at time of caching */
  policyDigest: string;
  /** Policy version */
  policyVersion: string;
  /** User ABAC snapshot */
  userSnapshot: {
    userId: string;
    rolesHash: string;
    attributesHash: string;
  };
  /** Data snapshot information */
  dataSnapshot: DataSnapshot;
  /** Timestamp when cached */
  cachedAt: string;
  /** Timestamp when retrieved (for cache hits) */
  retrievedAt: string;
  /** TTL in seconds */
  ttl: number;
  /** Signature of the proof bundle (HMAC or digital signature) */
  signature: string;
  /** Provenance chain (optional) */
  provenance?: {
    computedBy: string;
    computedAt: string;
    inputSources: string[];
  };
}

/**
 * Cached query result with proof
 */
export interface CachedResult<T = any> {
  /** The actual cached data */
  data: T;
  /** Proof bundle */
  proof: ProofBundle;
  /** Metadata */
  metadata?: {
    computationTimeMs?: number;
    sourceQueries?: string[];
    dependentCaches?: string[];
  };
}

/**
 * Cache entry stored in Redis
 */
export interface CacheEntry<T = any> {
  /** Cached result with proof */
  result: CachedResult<T>;
  /** Expiry timestamp */
  expiresAt: number;
}

/**
 * Cache invalidation event
 */
export interface InvalidationEvent {
  /** Type of invalidation */
  type: 'policy_change' | 'data_change' | 'manual' | 'ttl_expired';
  /** Timestamp of invalidation */
  timestamp: string;
  /** Reason/description */
  reason: string;
  /** Affected cache key patterns */
  keyPatterns: string[];
  /** Initiator (user ID, system, etc.) */
  initiatedBy: string;
  /** Old and new values (for policy/data changes) */
  changes?: {
    old: any;
    new: any;
  };
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  avgTTL: number;
  memoryUsage?: number;
  byPolicyVersion: Record<string, number>;
  byUser: Record<string, number>;
}

/**
 * Cache explain output - detailed breakdown of cache key
 */
export interface CacheExplain {
  /** The cache key */
  key: string;
  /** Whether the key exists in cache */
  exists: boolean;
  /** Key components breakdown */
  components: CacheKeyComponents;
  /** Proof bundle (if cached) */
  proof?: ProofBundle;
  /** Cached data metadata (not the data itself) */
  dataMetadata?: {
    size: number;
    type: string;
    cachedAt: string;
    expiresAt: string;
    ttl: number;
  };
  /** Invalidation history for this key */
  invalidationHistory?: InvalidationEvent[];
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const UserABACAttributesSchema = z.object({
  userId: z.string(),
  roles: z.array(z.string()),
  clearanceLevel: z.string().optional(),
  organizationId: z.string().optional(),
  compartments: z.array(z.string()).optional(),
  customAttributes: z.record(z.string(), z.any()).optional(),
});

export const DataSnapshotSchema = z.object({
  snapshotId: z.string(),
  timestamp: z.string().datetime(),
  dataHash: z.string(),
  sources: z.record(z.string(), z.string()).optional(),
});

export const PolicyVersionSchema = z.object({
  version: z.string(),
  digest: z.string(),
  effectiveDate: z.string().datetime(),
  bundleRevision: z.string().optional(),
});

export const CacheKeyComponentsSchema = z.object({
  queryHash: z.string(),
  paramsHash: z.string(),
  policyVersion: PolicyVersionSchema,
  userAttributes: UserABACAttributesSchema,
  dataSnapshot: DataSnapshotSchema,
});

export const ProofBundleSchema = z.object({
  cacheKey: z.string(),
  queryHash: z.string(),
  paramsHash: z.string(),
  policyDigest: z.string(),
  policyVersion: z.string(),
  userSnapshot: z.object({
    userId: z.string(),
    rolesHash: z.string(),
    attributesHash: z.string(),
  }),
  dataSnapshot: DataSnapshotSchema,
  cachedAt: z.string().datetime(),
  retrievedAt: z.string().datetime(),
  ttl: z.number(),
  signature: z.string(),
  provenance: z
    .object({
      computedBy: z.string(),
      computedAt: z.string().datetime(),
      inputSources: z.array(z.string()),
    })
    .optional(),
});

export const InvalidationEventSchema = z.object({
  type: z.enum(['policy_change', 'data_change', 'manual', 'ttl_expired']),
  timestamp: z.string().datetime(),
  reason: z.string(),
  keyPatterns: z.array(z.string()),
  initiatedBy: z.string(),
  changes: z
    .object({
      old: z.any(),
      new: z.any(),
    })
    .optional(),
});
