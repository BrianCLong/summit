/**
 * Comprehensive tests for Policy-Aware Cache Service
 */

import { PolicyAwareCacheService } from '../lib/PolicyAwareCacheService.js';
import type {
  CacheKeyComponents,
  PolicyVersion,
  DataSnapshot,
  UserABACAttributes,
} from '../types/index.js';

describe('PolicyAwareCacheService', () => {
  let cacheService: PolicyAwareCacheService;

  // Test fixtures
  const mockPolicyV1: PolicyVersion = {
    version: 'v1.0.0',
    digest: 'abc123def456789',
    effectiveDate: '2024-01-01T00:00:00Z',
  };

  const mockPolicyV2: PolicyVersion = {
    version: 'v1.1.0',
    digest: 'def456ghi789012',
    effectiveDate: '2024-02-01T00:00:00Z',
  };

  const mockDataSnapshot1: DataSnapshot = {
    snapshotId: 'snapshot-2024-01-01',
    timestamp: '2024-01-01T00:00:00Z',
    dataHash: 'data-hash-111',
    sources: {
      neo4j: 'version-5.0.1',
      postgres: 'version-15.2',
    },
  };

  const mockDataSnapshot2: DataSnapshot = {
    snapshotId: 'snapshot-2024-02-01',
    timestamp: '2024-02-01T00:00:00Z',
    dataHash: 'data-hash-222',
  };

  const mockUser1: UserABACAttributes = {
    userId: 'user-123',
    roles: ['analyst', 'viewer'],
    clearanceLevel: 'SECRET',
    organizationId: 'org-456',
  };

  const mockUser2: UserABACAttributes = {
    userId: 'user-789',
    roles: ['admin'],
    clearanceLevel: 'TOP_SECRET',
  };

  const mockComponents1: CacheKeyComponents = {
    queryHash: 'query-hash-aaa111',
    paramsHash: 'params-hash-bbb222',
    policyVersion: mockPolicyV1,
    userAttributes: mockUser1,
    dataSnapshot: mockDataSnapshot1,
  };

  beforeEach(() => {
    cacheService = new PolicyAwareCacheService({
      namespace: 'test-cache',
      defaultTTL: 300,
      secretKey: 'test-secret-key',
      enableAuditLog: false, // Disable for unit tests
    });
  });

  afterEach(async () => {
    // Clean up
    await cacheService.clear();
    await cacheService.close();
  });

  describe('buildCacheKey', () => {
    it('should build consistent cache keys from components', () => {
      const key1 = cacheService.buildCacheKey(mockComponents1);
      const key2 = cacheService.buildCacheKey(mockComponents1);

      expect(key1).toBe(key2);
      expect(key1).toContain('test-cache');
      expect(key1).toContain(mockComponents1.queryHash.substring(0, 16));
      expect(key1).toContain(`pol:${mockPolicyV1.version}`);
      expect(key1).toContain(`data:${mockDataSnapshot1.snapshotId}`);
    });

    it('should produce different keys for different policies', () => {
      const components2 = {
        ...mockComponents1,
        policyVersion: mockPolicyV2,
      };

      const key1 = cacheService.buildCacheKey(mockComponents1);
      const key2 = cacheService.buildCacheKey(components2);

      expect(key1).not.toBe(key2);
    });

    it('should produce different keys for different users', () => {
      const components2 = {
        ...mockComponents1,
        userAttributes: mockUser2,
      };

      const key1 = cacheService.buildCacheKey(mockComponents1);
      const key2 = cacheService.buildCacheKey(components2);

      expect(key1).not.toBe(key2);
    });

    it('should produce different keys for different data snapshots', () => {
      const components2 = {
        ...mockComponents1,
        dataSnapshot: mockDataSnapshot2,
      };

      const key1 = cacheService.buildCacheKey(mockComponents1);
      const key2 = cacheService.buildCacheKey(components2);

      expect(key1).not.toBe(key2);
    });

    it('should normalize role order for consistent keys', () => {
      const user1 = {
        ...mockUser1,
        roles: ['viewer', 'analyst'], // Different order
      };

      const components2 = {
        ...mockComponents1,
        userAttributes: user1,
      };

      const key1 = cacheService.buildCacheKey(mockComponents1);
      const key2 = cacheService.buildCacheKey(components2);

      // Should be the same because roles are sorted
      expect(key1).toBe(key2);
    });
  });

  describe('set and get', () => {
    it('should cache and retrieve data with proof', async () => {
      const testData = { result: 'test-value', count: 42 };

      // Set cache
      const setResult = await cacheService.set(mockComponents1, testData, {
        computedBy: 'test-suite',
        inputSources: ['source1', 'source2'],
      });

      // Verify set result
      expect(setResult.data).toEqual(testData);
      expect(setResult.proof).toBeDefined();
      expect(setResult.proof.queryHash).toBe(mockComponents1.queryHash);
      expect(setResult.proof.policyVersion).toBe(mockPolicyV1.version);
      expect(setResult.proof.signature).toBeDefined();

      // Get from cache
      const getResult = await cacheService.get(mockComponents1);

      expect(getResult).not.toBeNull();
      expect(getResult!.data).toEqual(testData);
      expect(getResult!.proof.queryHash).toBe(mockComponents1.queryHash);
      expect(getResult!.proof.signature).toBeDefined();
    });

    it('should return null for cache miss', async () => {
      const result = await cacheService.get(mockComponents1);
      expect(result).toBeNull();
    });

    it('should include provenance when provided', async () => {
      const testData = { test: 'data' };

      const result = await cacheService.set(mockComponents1, testData, {
        computedBy: 'analytics-engine',
        inputSources: ['neo4j://graph', 'postgres://table'],
      });

      expect(result.proof.provenance).toBeDefined();
      expect(result.proof.provenance!.computedBy).toBe('analytics-engine');
      expect(result.proof.provenance!.inputSources).toHaveLength(2);
    });

    it('should respect custom TTL', async () => {
      const testData = { test: 'data' };

      const result = await cacheService.set(mockComponents1, testData, {
        ttl: 600,
      });

      expect(result.proof.ttl).toBe(600);
    }, 10000);

    it('should generate different signatures for different data', async () => {
      const data1 = { value: 1 };
      const data2 = { value: 2 };

      const components2 = {
        ...mockComponents1,
        queryHash: 'query-hash-different',
      };

      const result1 = await cacheService.set(mockComponents1, data1);
      const result2 = await cacheService.set(components2, data2);

      expect(result1.proof.signature).not.toBe(result2.proof.signature);
    });
  });

  describe('invalidation', () => {
    beforeEach(async () => {
      // Seed cache with test data
      await cacheService.set(mockComponents1, { data: 'test1' });

      const components2 = {
        ...mockComponents1,
        userAttributes: mockUser2,
      };
      await cacheService.set(components2, { data: 'test2' });
    });

    it('should invalidate entries by policy version', async () => {
      const count = await cacheService.invalidateByPolicy(
        mockPolicyV1,
        mockPolicyV2,
        'test-admin',
      );

      expect(count).toBeGreaterThan(0);

      // Verify cache miss
      const result = await cacheService.get(mockComponents1);
      expect(result).toBeNull();
    });

    it('should invalidate entries by data snapshot', async () => {
      const count = await cacheService.invalidateByDataSnapshot(
        mockDataSnapshot1,
        mockDataSnapshot2,
        'system',
      );

      expect(count).toBeGreaterThan(0);

      // Verify cache miss
      const result = await cacheService.get(mockComponents1);
      expect(result).toBeNull();
    });

    it('should invalidate entries by pattern', async () => {
      const count = await cacheService.invalidate({
        type: 'manual',
        timestamp: new Date().toISOString(),
        reason: 'Test invalidation',
        keyPatterns: ['test-cache:*'],
        initiatedBy: 'test-user',
      });

      expect(count).toBeGreaterThan(0);
    });

    it('should not invalidate entries with different policy', async () => {
      const componentsV2 = {
        ...mockComponents1,
        policyVersion: mockPolicyV2,
      };

      await cacheService.set(componentsV2, { data: 'test-v2' });

      // Invalidate only v1
      await cacheService.invalidateByPolicy(
        mockPolicyV1,
        mockPolicyV2,
        'test-admin',
      );

      // V2 should still be cached
      const result = await cacheService.get(componentsV2);
      expect(result).not.toBeNull();
    });
  });

  describe('proof verification', () => {
    it('should verify valid proof signatures', async () => {
      const testData = { test: 'data' };
      const result = await cacheService.set(mockComponents1, testData);

      const isValid = cacheService.verifyProof(result.proof);
      expect(isValid).toBe(true);
    });

    it('should reject tampered proofs', async () => {
      const testData = { test: 'data' };
      const result = await cacheService.set(mockComponents1, testData);

      // Tamper with proof
      const tamperedProof = {
        ...result.proof,
        queryHash: 'tampered-hash',
      };

      const isValid = cacheService.verifyProof(tamperedProof);
      expect(isValid).toBe(false);
    });

    it('should reject proofs with wrong signature', async () => {
      const testData = { test: 'data' };
      const result = await cacheService.set(mockComponents1, testData);

      // Replace signature
      const tamperedProof = {
        ...result.proof,
        signature: 'invalid-signature',
      };

      const isValid = cacheService.verifyProof(tamperedProof);
      expect(isValid).toBe(false);
    });
  });

  describe('explain', () => {
    it('should explain non-existent cache key', async () => {
      const key = cacheService.buildCacheKey(mockComponents1);
      const explain = await cacheService.explain(key);

      expect(explain.key).toBe(key);
      expect(explain.exists).toBe(false);
      expect(explain.components).toBeDefined();
    });

    it('should explain cached key with metadata', async () => {
      const testData = { result: [1, 2, 3, 4, 5] };
      await cacheService.set(mockComponents1, testData);

      const key = cacheService.buildCacheKey(mockComponents1);
      const explain = await cacheService.explain(key);

      expect(explain.key).toBe(key);
      expect(explain.exists).toBe(true);
      expect(explain.proof).toBeDefined();
      expect(explain.dataMetadata).toBeDefined();
      expect(explain.dataMetadata!.size).toBeGreaterThan(0);
    });
  });

  describe('stats', () => {
    it('should return cache statistics', async () => {
      // Seed some cache entries
      await cacheService.set(mockComponents1, { data: 1 });

      const components2 = {
        ...mockComponents1,
        userAttributes: mockUser2,
      };
      await cacheService.set(components2, { data: 2 });

      const stats = await cacheService.getStats();

      expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.missRate).toBeGreaterThanOrEqual(0);
    });

    it('should track hits and misses', async () => {
      await cacheService.set(mockComponents1, { data: 'test' });

      // Hit
      await cacheService.get(mockComponents1);

      // Miss
      const components2 = {
        ...mockComponents1,
        queryHash: 'different-query',
      };
      await cacheService.get(components2);

      const stats = await cacheService.getStats();

      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      // Seed cache
      await cacheService.set(mockComponents1, { data: 1 });

      const components2 = {
        ...mockComponents1,
        userAttributes: mockUser2,
      };
      await cacheService.set(components2, { data: 2 });

      // Clear
      const count = await cacheService.clear();

      expect(count).toBeGreaterThan(0);

      // Verify empty
      const result = await cacheService.get(mockComponents1);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty user roles', async () => {
      const userNoRoles = {
        ...mockUser1,
        roles: [],
      };

      const components = {
        ...mockComponents1,
        userAttributes: userNoRoles,
      };

      const key = cacheService.buildCacheKey(components);
      expect(key).toBeDefined();
    });

    it('should handle special characters in data', async () => {
      const specialData = {
        text: 'Test with "quotes" and \\backslashes\\ and \nnewlines',
        emoji: '🔐🚀✅',
      };

      const result = await cacheService.set(mockComponents1, specialData);
      expect(result.data).toEqual(specialData);

      const retrieved = await cacheService.get(mockComponents1);
      expect(retrieved!.data).toEqual(specialData);
    });

    it('should handle large data payloads', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
        })),
      };

      const result = await cacheService.set(mockComponents1, largeData);
      expect(result.data.items).toHaveLength(1000);

      const retrieved = await cacheService.get(mockComponents1);
      expect(retrieved!.data.items).toHaveLength(1000);
    });

    it('should handle concurrent cache operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => {
        const components = {
          ...mockComponents1,
          queryHash: `query-${i}`,
        };
        return cacheService.set(components, { index: i });
      });

      await Promise.all(promises);

      const stats = await cacheService.getStats();
      expect(stats.totalEntries).toBeGreaterThanOrEqual(10);
    });
  });

  describe('one-byte input change propagation', () => {
    it('should propagate single-byte query changes to cache key', async () => {
      const components1 = {
        ...mockComponents1,
        queryHash: 'abcdef123456',
      };

      const components2 = {
        ...mockComponents1,
        queryHash: 'abcdef123457', // One char different
      };

      const key1 = cacheService.buildCacheKey(components1);
      const key2 = cacheService.buildCacheKey(components2);

      expect(key1).not.toBe(key2);
    });

    it('should produce different proofs for single-byte data changes', async () => {
      await cacheService.set(mockComponents1, { value: 'test1' });

      const components2 = {
        ...mockComponents1,
        queryHash: 'different-by-one-byte',
      };
      await cacheService.set(components2, { value: 'test2' });

      const result1 = await cacheService.get(mockComponents1);
      const result2 = await cacheService.get(components2);

      expect(result1!.proof.signature).not.toBe(result2!.proof.signature);
    });
  });
});
