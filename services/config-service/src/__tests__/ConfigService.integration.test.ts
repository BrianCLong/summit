/**
 * Integration tests for ConfigService multi-tenant scenarios.
 * These tests require a running database instance.
 *
 * Run with: pnpm test:integration
 */

import { jest } from '@jest/globals';

// Mock the database modules for unit testing
// In real integration tests, these would connect to actual databases

const mockQuery = jest.fn();
const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();
const mockCacheDelete = jest.fn();
const mockPublishInvalidation = jest.fn();

jest.unstable_mockModule('../db/postgres.js', () => ({
  query: mockQuery,
  transaction: jest.fn((fn: any) => fn({ query: mockQuery })),
  getClient: jest.fn(),
  initializePool: jest.fn(),
  closePool: jest.fn(),
  getPool: jest.fn(),
}));

jest.unstable_mockModule('../db/redis.js', () => ({
  cacheGet: mockCacheGet,
  cacheSet: mockCacheSet,
  cacheDelete: mockCacheDelete,
  cacheDeletePattern: jest.fn(),
  publishInvalidation: mockPublishInvalidation,
  configCacheKey: (key: string, tenantId?: string, env?: string, userId?: string) =>
    `config:${key}:${env || ''}:${tenantId || ''}:${userId || ''}`,
  initializeRedis: jest.fn(),
  closeRedis: jest.fn(),
  getRedis: jest.fn(),
}));

describe('ConfigService Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Multi-tenant config resolution', () => {
    it('should resolve tenant-specific config over global', async () => {
      // Import after mocking
      const { ConfigRepository } = await import('../db/repositories/ConfigRepository.js');
      const repo = new ConfigRepository();

      // Setup mock to return both global and tenant configs
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'tenant-config-id',
            key: 'feature.limit',
            value: 100,
            value_type: 'integer',
            level: 'tenant',
            environment: null,
            tenant_id: 'tenant-1',
            user_id: null,
            description: null,
            is_secret: false,
            is_governance_protected: false,
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'admin',
            updated_by: 'admin',
          },
          {
            id: 'global-config-id',
            key: 'feature.limit',
            value: 50,
            value_type: 'integer',
            level: 'global',
            environment: null,
            tenant_id: null,
            user_id: null,
            description: null,
            is_secret: false,
            is_governance_protected: false,
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'admin',
            updated_by: 'admin',
          },
        ],
      });
      mockCacheGet.mockResolvedValueOnce(null);

      const result = await repo.resolveValue('feature.limit', {
        tenantId: 'tenant-1',
      });

      expect(result.value).toBe(100);
      expect(result.item?.tenantId).toBe('tenant-1');
    });

    it('should fall back to global when no tenant config exists', async () => {
      const { ConfigRepository } = await import('../db/repositories/ConfigRepository.js');
      const repo = new ConfigRepository();

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'global-config-id',
            key: 'feature.limit',
            value: 50,
            value_type: 'integer',
            level: 'global',
            environment: null,
            tenant_id: null,
            user_id: null,
            description: null,
            is_secret: false,
            is_governance_protected: false,
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'admin',
            updated_by: 'admin',
          },
        ],
      });
      mockCacheGet.mockResolvedValueOnce(null);

      const result = await repo.resolveValue('feature.limit', {
        tenantId: 'tenant-2',
      });

      expect(result.value).toBe(50);
      expect(result.item?.level).toBe('global');
    });

    it('should respect user-level override', async () => {
      const { ConfigRepository } = await import('../db/repositories/ConfigRepository.js');
      const repo = new ConfigRepository();

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-config-id',
            key: 'feature.limit',
            value: 200,
            value_type: 'integer',
            level: 'user',
            environment: null,
            tenant_id: 'tenant-1',
            user_id: 'user-123',
            description: null,
            is_secret: false,
            is_governance_protected: false,
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'admin',
            updated_by: 'admin',
          },
          {
            id: 'tenant-config-id',
            key: 'feature.limit',
            value: 100,
            value_type: 'integer',
            level: 'tenant',
            environment: null,
            tenant_id: 'tenant-1',
            user_id: null,
            description: null,
            is_secret: false,
            is_governance_protected: false,
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'admin',
            updated_by: 'admin',
          },
        ],
      });
      mockCacheGet.mockResolvedValueOnce(null);

      const result = await repo.resolveValue('feature.limit', {
        tenantId: 'tenant-1',
        userId: 'user-123',
      });

      expect(result.value).toBe(200);
      expect(result.item?.level).toBe('user');
    });
  });

  describe('Cache behavior', () => {
    it('should return cached value when available', async () => {
      const { ConfigRepository } = await import('../db/repositories/ConfigRepository.js');
      const repo = new ConfigRepository();

      const cachedItem = {
        id: 'cached-id',
        key: 'cached.key',
        value: 'cached-value',
        valueType: 'string',
        level: 'global',
        environment: null,
        tenantId: null,
        userId: null,
        description: null,
        isSecret: false,
        isGovernanceProtected: false,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        updatedBy: 'admin',
      };

      mockCacheGet.mockResolvedValueOnce(cachedItem);

      const result = await repo.resolveValue('cached.key', {});

      expect(result.value).toBe('cached-value');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should cache resolved values', async () => {
      const { ConfigRepository } = await import('../db/repositories/ConfigRepository.js');
      const repo = new ConfigRepository();

      mockCacheGet.mockResolvedValueOnce(null);
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'config-id',
            key: 'new.key',
            value: 'new-value',
            value_type: 'string',
            level: 'global',
            environment: null,
            tenant_id: null,
            user_id: null,
            description: null,
            is_secret: false,
            is_governance_protected: false,
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'admin',
            updated_by: 'admin',
          },
        ],
      });

      await repo.resolveValue('new.key', {});

      expect(mockCacheSet).toHaveBeenCalled();
    });
  });

  describe('Tenant isolation', () => {
    it('should not leak configs between tenants', async () => {
      const { ConfigRepository } = await import('../db/repositories/ConfigRepository.js');
      const repo = new ConfigRepository();

      // Query for tenant-1 should only return tenant-1 configs
      mockCacheGet.mockResolvedValueOnce(null);
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'tenant1-config',
            key: 'secret.key',
            value: 'tenant1-secret',
            value_type: 'string',
            level: 'tenant',
            environment: null,
            tenant_id: 'tenant-1',
            user_id: null,
            description: null,
            is_secret: true,
            is_governance_protected: false,
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'admin',
            updated_by: 'admin',
          },
        ],
      });

      const result1 = await repo.resolveValue('secret.key', { tenantId: 'tenant-1' });
      expect(result1.value).toBe('tenant1-secret');

      // Query for tenant-2 should not see tenant-1's config
      mockCacheGet.mockResolvedValueOnce(null);
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result2 = await repo.resolveValue('secret.key', { tenantId: 'tenant-2' });
      expect(result2.value).toBeUndefined();
    });
  });
});

describe('FeatureFlag Multi-tenant Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should evaluate tenant-specific flags', async () => {
    const { FeatureFlagRepository } = await import(
      '../db/repositories/FeatureFlagRepository.js'
    );
    const repo = new FeatureFlagRepository();

    mockCacheGet.mockResolvedValueOnce(null);
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'tenant-flag-id',
            key: 'new-ui',
            name: 'New UI',
            description: null,
            tenant_id: 'tenant-1',
            enabled: true,
            default_value: true,
            value_type: 'boolean',
            allowlist: [],
            blocklist: [],
            is_governance_protected: false,
            stale_after_days: null,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'admin',
            updated_by: 'admin',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }); // targeting rules

    const flag = await repo.findByKey('new-ui', 'tenant-1');

    expect(flag).not.toBeNull();
    expect(flag?.tenantId).toBe('tenant-1');
    expect(flag?.enabled).toBe(true);
  });

  it('should fall back to global flag for unknown tenant', async () => {
    const { FeatureFlagRepository } = await import(
      '../db/repositories/FeatureFlagRepository.js'
    );
    const repo = new FeatureFlagRepository();

    mockCacheGet.mockResolvedValueOnce(null);
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // No tenant-specific flag
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'global-flag-id',
            key: 'new-ui',
            name: 'New UI',
            description: null,
            tenant_id: null,
            enabled: false,
            default_value: false,
            value_type: 'boolean',
            allowlist: [],
            blocklist: [],
            is_governance_protected: false,
            stale_after_days: null,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: 'admin',
            updated_by: 'admin',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }); // targeting rules

    const flag = await repo.findByKey('new-ui', 'unknown-tenant');

    expect(flag).not.toBeNull();
    expect(flag?.tenantId).toBeNull();
    expect(flag?.enabled).toBe(false);
  });
});

describe('Experiment Bucket Assignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should consistently assign same user to same variant', async () => {
    const { selectVariant } = await import('../utils/hash.js');

    const variants = [
      { id: 'v1', weight: 50 },
      { id: 'v2', weight: 50 },
    ];

    const assignment1 = selectVariant('exp:test:bucket:user-123', variants);
    const assignment2 = selectVariant('exp:test:bucket:user-123', variants);
    const assignment3 = selectVariant('exp:test:bucket:user-123', variants);

    expect(assignment1).toBe(assignment2);
    expect(assignment2).toBe(assignment3);
  });

  it('should distribute users across variants according to weights', async () => {
    const { selectVariant } = await import('../utils/hash.js');

    const variants = [
      { id: 'control', weight: 20 },
      { id: 'treatment-a', weight: 40 },
      { id: 'treatment-b', weight: 40 },
    ];

    const counts = [0, 0, 0];
    const samples = 10000;

    for (let i = 0; i < samples; i++) {
      const index = selectVariant(`exp:distribution-test:bucket:user-${i}`, variants);
      counts[index]++;
    }

    // Allow 3% tolerance
    expect(counts[0] / samples).toBeGreaterThan(0.17);
    expect(counts[0] / samples).toBeLessThan(0.23);
    expect(counts[1] / samples).toBeGreaterThan(0.37);
    expect(counts[1] / samples).toBeLessThan(0.43);
    expect(counts[2] / samples).toBeGreaterThan(0.37);
    expect(counts[2] / samples).toBeLessThan(0.43);
  });
});
