/**
 * Unit Tests for Neo4j Configuration and Optimization
 *
 * @group unit
 * @group database
 * @group neo4j
 */

import {
  Neo4jQueryCache,
  Neo4jConfigError,
  Neo4jQueryError,
  createOptimizedNeo4jDriver,
  defaultNeo4jConfig,
  applyIndexes,
  applyConstraints,
  ENTITY_INDEXES,
  RECOMMENDED_CONSTRAINTS,
} from '../neo4j';

describe('Neo4jQueryCache', () => {
  let cache: Neo4jQueryCache;

  beforeEach(() => {
    cache = new Neo4jQueryCache(100, 60000); // 100 items, 1 min TTL
  });

  describe('constructor', () => {
    it('should create cache with valid parameters', () => {
      const testCache = new Neo4jQueryCache(50, 30000);
      expect(testCache).toBeInstanceOf(Neo4jQueryCache);
    });

    it('should throw error if maxSize < 1', () => {
      expect(() => new Neo4jQueryCache(0, 60000)).toThrow('Cache maxSize must be at least 1');
    });

    it('should throw error if defaultTTL is negative', () => {
      expect(() => new Neo4jQueryCache(100, -1)).toThrow('Cache defaultTTL cannot be negative');
    });
  });

  describe('get and set', () => {
    it('should cache and retrieve query results', () => {
      const cypher = 'MATCH (n:Entity) RETURN n';
      const params = { id: '123' };
      const result = { records: [{ id: '123', name: 'Test' }] };

      cache.set(cypher, params, result);
      const cached = cache.get(cypher, params);

      expect(cached).toEqual(result);
    });

    it('should return null for cache miss', () => {
      const cypher = 'MATCH (n:Entity) RETURN n';
      const params = { id: '456' };

      const cached = cache.get(cypher, params);
      expect(cached).toBeNull();
    });

    it('should handle null/undefined params', () => {
      const cypher = 'MATCH (n:Entity) RETURN n';
      const result = { records: [] };

      cache.set(cypher, null, result);
      expect(cache.get(cypher, null)).toEqual(result);

      cache.set(cypher, undefined, result);
      expect(cache.get(cypher, undefined)).toEqual(result);
    });

    it('should return null for expired entries', () => {
      jest.useFakeTimers();
      const shortTTLCache = new Neo4jQueryCache(100, 100); // 100ms TTL
      const cypher = 'MATCH (n:Entity) RETURN n';
      const result = { records: [] };

      shortTTLCache.set(cypher, {}, result);

      // Advance time past expiration using fake timers
      jest.advanceTimersByTime(150);

      const cached = shortTTLCache.get(cypher, {});
      expect(cached).toBeNull();
      jest.useRealTimers();
    });

    it('should handle custom TTL', () => {
      jest.useFakeTimers();
      const cypher = 'MATCH (n:Entity) RETURN n';
      const result = { records: [] };

      // Set with 50ms TTL
      cache.set(cypher, {}, result, 50);

      // Should be available immediately
      expect(cache.get(cypher, {})).toEqual(result);

      // Advance time past expiration using fake timers
      jest.advanceTimersByTime(100);

      // Should be expired
      expect(cache.get(cypher, {})).toBeNull();
      jest.useRealTimers();
    });

    it('should handle errors gracefully when caching', () => {
      const cypher = 'MATCH (n:Entity) RETURN n';
      // Create an object with circular reference
      const circular: any = { a: 1 };
      circular.self = circular;

      // Should not throw, but log error
      expect(() => cache.set(cypher, circular, {})).not.toThrow();
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when cache is full', () => {
      const smallCache = new Neo4jQueryCache(3, 60000); // Max 3 items

      // Fill cache
      smallCache.set('query1', {}, { data: 1 });
      smallCache.set('query2', {}, { data: 2 });
      smallCache.set('query3', {}, { data: 3 });

      // All should be cached
      expect(smallCache.get('query1', {})).toEqual({ data: 1 });
      expect(smallCache.get('query2', {})).toEqual({ data: 2 });
      expect(smallCache.get('query3', {})).toEqual({ data: 3 });

      // Add 4th item - should evict query1
      smallCache.set('query4', {}, { data: 4 });

      expect(smallCache.get('query1', {})).toBeNull();
      expect(smallCache.get('query2', {})).toEqual({ data: 2 });
      expect(smallCache.get('query3', {})).toEqual({ data: 3 });
      expect(smallCache.get('query4', {})).toEqual({ data: 4 });
    });

    it('should not evict when updating existing entry', () => {
      const smallCache = new Neo4jQueryCache(2, 60000);

      smallCache.set('query1', {}, { data: 1 });
      smallCache.set('query2', {}, { data: 2 });

      // Update query1
      smallCache.set('query1', {}, { data: 1.1 });

      // Both should still be present
      expect(smallCache.get('query1', {})).toEqual({ data: 1.1 });
      expect(smallCache.get('query2', {})).toEqual({ data: 2 });
    });
  });

  describe('invalidate', () => {
    beforeEach(() => {
      cache.set('MATCH (e:Entity) RETURN e', {}, { data: 1 });
      cache.set('MATCH (r:Relationship) RETURN r', {}, { data: 2 });
      cache.set('MATCH (i:Investigation) RETURN i', {}, { data: 3 });
    });

    it('should clear all cache when no pattern provided', () => {
      const count = cache.invalidate();

      expect(count).toBe(3);
      expect(cache.getStats().size).toBe(0);
    });

    it('should invalidate entries matching pattern', () => {
      const count = cache.invalidate('.*Entity.*');

      expect(count).toBe(1);
      expect(cache.get('MATCH (e:Entity) RETURN e', {})).toBeNull();
      expect(cache.get('MATCH (r:Relationship) RETURN r', {})).not.toBeNull();
    });

    it('should handle invalid regex patterns', () => {
      // Invalid regex should be caught
      const count = cache.invalidate('[invalid');

      // Should log error but not throw
      expect(count).toBe(0);
    });

    it('should return 0 when no matches found', () => {
      const count = cache.invalidate('.*NonExistent.*');
      expect(count).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      // Perform some cache operations
      cache.set('query1', {}, { data: 1 });
      cache.set('query2', {}, { data: 2 });

      cache.get('query1', {}); // hit
      cache.get('query2', {}); // hit
      cache.get('query3', {}); // miss
      cache.get('query4', {}); // miss

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.maxSize).toBe(100);
      expect(stats.utilization).toBe(0.02); // 2/100
    });

    it('should handle zero total queries', () => {
      const stats = cache.getStats();

      expect(stats.hitRate).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.utilization).toBe(0);
    });
  });

  describe('resetStats', () => {
    it('should reset hit/miss counters but not cache', () => {
      cache.set('query1', {}, { data: 1 });
      cache.get('query1', {}); // hit
      cache.get('query2', {}); // miss

      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(1);

      cache.resetStats();

      expect(cache.getStats().hits).toBe(0);
      expect(cache.getStats().misses).toBe(0);
      expect(cache.getStats().size).toBe(1); // Cache not cleared
    });
  });
});

describe('createOptimizedNeo4jDriver', () => {
  it('should throw Neo4jConfigError for missing URI', () => {
    expect(() => createOptimizedNeo4jDriver({
      uri: '',
      username: 'neo4j',
      password: 'password',
    })).toThrow(Neo4jConfigError);
  });

  it('should throw Neo4jConfigError for missing credentials', () => {
    expect(() => createOptimizedNeo4jDriver({
      uri: 'bolt://localhost:7687',
      username: '',
      password: 'password',
    })).toThrow(Neo4jConfigError);

    expect(() => createOptimizedNeo4jDriver({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: '',
    })).toThrow(Neo4jConfigError);
  });

  it('should throw Neo4jConfigError for invalid URI format', () => {
    expect(() => createOptimizedNeo4jDriver({
      uri: 'http://localhost:7687',
      username: 'neo4j',
      password: 'password',
    })).toThrow(Neo4jConfigError);
    expect(() => createOptimizedNeo4jDriver({
      uri: 'http://localhost:7687',
      username: 'neo4j',
      password: 'password',
    })).toThrow(/Invalid Neo4j URI format/);
  });

  it('should accept valid bolt URIs', () => {
    const validUris = [
      'bolt://localhost:7687',
      'neo4j://localhost:7687',
      'bolt+s://localhost:7687',
      'neo4j+s://localhost:7687',
      'bolt+ssc://localhost:7687',
      'neo4j+ssc://localhost:7687',
    ];

    validUris.forEach(uri => {
      expect(() => createOptimizedNeo4jDriver({
        uri,
        username: 'neo4j',
        password: 'password',
      })).not.toThrow(Neo4jConfigError);
    });
  });

  it('should throw for negative maxConnectionPoolSize', () => {
    expect(() => createOptimizedNeo4jDriver({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password',
      maxConnectionPoolSize: 0,
    })).toThrow(Neo4jConfigError);
  });

  it('should throw for negative connectionTimeout', () => {
    expect(() => createOptimizedNeo4jDriver({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password',
      connectionTimeout: -1,
    })).toThrow(Neo4jConfigError);
  });

  it('should throw for negative slowQueryThreshold', () => {
    expect(() => createOptimizedNeo4jDriver({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password',
      slowQueryThreshold: -1,
    })).toThrow(Neo4jConfigError);
  });

  it('should merge config with defaults', () => {
    const driver = createOptimizedNeo4jDriver({
      uri: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password',
    });

    expect(driver).toBeDefined();
    // Note: In real tests, you'd mock the driver to verify config
  });
});

describe('applyIndexes', () => {
  let mockSession: any;

  beforeEach(() => {
    mockSession = {
      run: jest.fn().mockResolvedValue({}),
    };
  });

  it('should successfully create all indexes', async () => {
    const indexes = [
      { label: 'Entity', properties: ['id'] },
      { label: 'Entity', properties: ['type'] },
    ];

    const result = await applyIndexes(mockSession, indexes);

    expect(result.success).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(mockSession.run).toHaveBeenCalledTimes(2);
  });

  it('should handle index creation errors', async () => {
    mockSession.run = jest.fn()
      .mockResolvedValueOnce({}) // First succeeds
      .mockRejectedValueOnce(new Error('Index creation failed')); // Second fails

    const indexes = [
      { label: 'Entity', properties: ['id'] },
      { label: 'Entity', properties: ['type'] },
    ];

    const result = await applyIndexes(mockSession, indexes);

    expect(result.success).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe('Index creation failed');
  });

  it('should skip existing indexes when skipExisting is true', async () => {
    mockSession.run = jest.fn()
      .mockRejectedValue(new Error('Index already exists'));

    const indexes = [
      { label: 'Entity', properties: ['id'] },
    ];

    const result = await applyIndexes(mockSession, indexes, { skipExisting: true });

    expect(result.success).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail on existing indexes when skipExisting is false', async () => {
    mockSession.run = jest.fn()
      .mockRejectedValue(new Error('Index already exists'));

    const indexes = [
      { label: 'Entity', properties: ['id'] },
    ];

    const result = await applyIndexes(mockSession, indexes, { skipExisting: false });

    expect(result.success).toBe(0);
    expect(result.errors).toHaveLength(1);
  });

  it('should validate index definitions', async () => {
    const invalidIndexes = [
      { label: '', properties: ['id'] }, // Empty label
      { label: 'Entity', properties: [] }, // Empty properties
    ];

    for (const index of invalidIndexes) {
      const result = await applyIndexes(mockSession, [index as any]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Invalid index definition');
    }
  });

  it('should create fulltext indexes with correct syntax', async () => {
    const indexes = [
      { label: 'Entity', properties: ['name'], type: 'FULLTEXT' as const },
    ];

    await applyIndexes(mockSession, indexes);

    expect(mockSession.run).toHaveBeenCalledWith(
      expect.stringContaining('CREATE FULLTEXT INDEX')
    );
  });

  it('should create composite indexes', async () => {
    const indexes = [
      { label: 'Entity', properties: ['tenantId', 'type'] },
    ];

    await applyIndexes(mockSession, indexes);

    expect(mockSession.run).toHaveBeenCalledWith(
      expect.stringContaining('idx_entity_tenantid_type')
    );
  });
});

describe('applyConstraints', () => {
  let mockSession: any;

  beforeEach(() => {
    mockSession = {
      run: jest.fn().mockResolvedValue({}),
    };
  });

  it('should successfully create all constraints', async () => {
    const constraints = [
      { label: 'Entity', properties: ['id'], type: 'UNIQUE' as const },
      { label: 'User', properties: ['email', 'tenantId'], type: 'UNIQUE' as const },
    ];

    const result = await applyConstraints(mockSession, constraints);

    expect(result.success).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(mockSession.run).toHaveBeenCalledTimes(2);
  });

  it('should handle constraint creation errors', async () => {
    mockSession.run = jest.fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Constraint creation failed'));

    const constraints = [
      { label: 'Entity', properties: ['id'], type: 'UNIQUE' as const },
      { label: 'User', properties: ['email'], type: 'UNIQUE' as const },
    ];

    const result = await applyConstraints(mockSession, constraints);

    expect(result.success).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it('should create unique constraints', async () => {
    const constraints = [
      { label: 'Entity', properties: ['id'], type: 'UNIQUE' as const },
    ];

    await applyConstraints(mockSession, constraints);

    expect(mockSession.run).toHaveBeenCalledWith(
      expect.stringContaining('IS UNIQUE')
    );
  });

  it('should create node key constraints', async () => {
    const constraints = [
      { label: 'Entity', properties: ['id', 'tenantId'], type: 'NODE_KEY' as const },
    ];

    await applyConstraints(mockSession, constraints);

    expect(mockSession.run).toHaveBeenCalledWith(
      expect.stringContaining('IS NODE KEY')
    );
  });

  it('should create existence constraints', async () => {
    const constraints = [
      { label: 'Entity', properties: ['tenantId'], type: 'EXISTS' as const },
    ];

    await applyConstraints(mockSession, constraints);

    expect(mockSession.run).toHaveBeenCalledWith(
      expect.stringContaining('IS NOT NULL')
    );
  });

  it('should validate constraint definitions', async () => {
    const invalidConstraints = [
      { label: '', properties: ['id'], type: 'UNIQUE' as const },
      { label: 'Entity', properties: [], type: 'UNIQUE' as const },
    ];

    for (const constraint of invalidConstraints) {
      const result = await applyConstraints(mockSession, [constraint as any]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Invalid constraint definition');
    }
  });
});

describe('Neo4jConfigError', () => {
  it('should create error with correct name', () => {
    const error = new Neo4jConfigError('Test error');
    expect(error.name).toBe('Neo4jConfigError');
    expect(error.message).toBe('Test error');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('Neo4jQueryError', () => {
  it('should create error with query and original error', () => {
    const originalError = new Error('Original');
    const error = new Neo4jQueryError('Test error', 'MATCH (n) RETURN n', originalError);

    expect(error.name).toBe('Neo4jQueryError');
    expect(error.message).toBe('Test error');
    expect(error.query).toBe('MATCH (n) RETURN n');
    expect(error.originalError).toBe(originalError);
  });

  it('should work without optional parameters', () => {
    const error = new Neo4jQueryError('Test error');

    expect(error.name).toBe('Neo4jQueryError');
    expect(error.message).toBe('Test error');
    expect(error.query).toBeUndefined();
    expect(error.originalError).toBeUndefined();
  });
});

describe('defaultNeo4jConfig', () => {
  it('should have sensible defaults', () => {
    expect(defaultNeo4jConfig.maxConnectionPoolSize).toBe(50);
    expect(defaultNeo4jConfig.connectionAcquisitionTimeout).toBe(60000);
    expect(defaultNeo4jConfig.maxTransactionRetryTime).toBe(30000);
    expect(defaultNeo4jConfig.connectionTimeout).toBe(30000);
    expect(defaultNeo4jConfig.enableQueryCache).toBe(true);
    expect(defaultNeo4jConfig.queryCacheTTL).toBe(300000);
    expect(defaultNeo4jConfig.slowQueryThreshold).toBe(100);
  });
});

describe('Index and Constraint Definitions', () => {
  it('should export ENTITY_INDEXES', () => {
    expect(ENTITY_INDEXES).toBeDefined();
    expect(Array.isArray(ENTITY_INDEXES)).toBe(true);
    expect(ENTITY_INDEXES.length).toBeGreaterThan(0);
  });

  it('should export RECOMMENDED_CONSTRAINTS', () => {
    expect(RECOMMENDED_CONSTRAINTS).toBeDefined();
    expect(Array.isArray(RECOMMENDED_CONSTRAINTS)).toBe(true);
    expect(RECOMMENDED_CONSTRAINTS.length).toBeGreaterThan(0);
  });

  it('should have valid index definitions', () => {
    ENTITY_INDEXES.forEach(index => {
      expect(index.label).toBeDefined();
      expect(index.properties).toBeDefined();
      expect(Array.isArray(index.properties)).toBe(true);
      expect(index.properties.length).toBeGreaterThan(0);
    });
  });

  it('should have valid constraint definitions', () => {
    RECOMMENDED_CONSTRAINTS.forEach(constraint => {
      expect(constraint.label).toBeDefined();
      expect(constraint.properties).toBeDefined();
      expect(constraint.type).toBeDefined();
      expect(['UNIQUE', 'NODE_KEY', 'EXISTS']).toContain(constraint.type);
    });
  });
});
