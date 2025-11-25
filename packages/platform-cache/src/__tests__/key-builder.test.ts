import { describe, it, expect } from 'vitest';
import { CacheKeyBuilder, SummitKeys } from '../key-builder.js';

describe('CacheKeyBuilder', () => {
  describe('basic key building', () => {
    it('should build simple key with namespace', () => {
      const key = new CacheKeyBuilder()
        .namespace('app')
        .build();
      expect(key).toBe('app');
    });

    it('should build key with multiple parts', () => {
      const key = new CacheKeyBuilder()
        .namespace('app')
        .entity('user')
        .id('123')
        .build();
      expect(key).toBe('app:user:123');
    });

    it('should handle version', () => {
      const key = new CacheKeyBuilder()
        .namespace('app')
        .entity('user')
        .version(2)
        .id('123')
        .build();
      expect(key).toBe('app:user:v2:123');
    });

    it('should handle action', () => {
      const key = new CacheKeyBuilder()
        .namespace('app')
        .entity('user')
        .id('123')
        .action('profile')
        .build();
      expect(key).toBe('app:user:123:profile');
    });
  });

  describe('hash functionality', () => {
    it('should append hash for complex data', () => {
      const key = new CacheKeyBuilder()
        .namespace('app')
        .action('search')
        .hash({ query: 'test', filters: { status: 'active' } })
        .build();

      expect(key).toMatch(/^app:search:[a-f0-9]{16}$/);
    });

    it('should produce consistent hashes for same data', () => {
      const key1 = new CacheKeyBuilder()
        .namespace('app')
        .hash({ query: 'test' })
        .build();

      const key2 = new CacheKeyBuilder()
        .namespace('app')
        .hash({ query: 'test' })
        .build();

      expect(key1).toBe(key2);
    });

    it('should produce different hashes for different data', () => {
      const key1 = new CacheKeyBuilder()
        .namespace('app')
        .hash({ query: 'test1' })
        .build();

      const key2 = new CacheKeyBuilder()
        .namespace('app')
        .hash({ query: 'test2' })
        .build();

      expect(key1).not.toBe(key2);
    });
  });

  describe('time bucket', () => {
    it('should add time bucket', () => {
      const key = new CacheKeyBuilder()
        .namespace('app')
        .timeBucket(60)
        .build();

      expect(key).toMatch(/^app:t\d+$/);
    });

    it('should produce same bucket within interval', () => {
      const key1 = new CacheKeyBuilder()
        .namespace('app')
        .timeBucket(3600) // 1 hour bucket
        .build();

      const key2 = new CacheKeyBuilder()
        .namespace('app')
        .timeBucket(3600)
        .build();

      expect(key1).toBe(key2);
    });
  });

  describe('reset', () => {
    it('should reset builder state', () => {
      const builder = new CacheKeyBuilder()
        .namespace('app')
        .entity('user')
        .id('123');

      builder.reset();
      const key = builder.namespace('other').build();

      expect(key).toBe('other');
    });
  });

  describe('withNamespace static method', () => {
    it('should create builder with preset namespace', () => {
      const key = CacheKeyBuilder.withNamespace('myapp')
        .entity('item')
        .id('456')
        .build();

      expect(key).toBe('myapp:item:456');
    });
  });
});

describe('SummitKeys', () => {
  describe('entity', () => {
    it('should generate entity key', () => {
      const key = SummitKeys.entity('ent-123');
      expect(key).toBe('summit:entity:ent-123');
    });
  });

  describe('investigation', () => {
    it('should generate investigation key', () => {
      const key = SummitKeys.investigation('inv-456');
      expect(key).toBe('summit:investigation:inv-456');
    });
  });

  describe('relationships', () => {
    it('should generate relationships key with hash', () => {
      const key = SummitKeys.relationships('ent-123', 3);
      expect(key).toMatch(/^summit:entity:ent-123:relationships:[a-f0-9]{16}$/);
    });

    it('should produce consistent keys for same params', () => {
      const key1 = SummitKeys.relationships('ent-123', 3);
      const key2 = SummitKeys.relationships('ent-123', 3);
      expect(key1).toBe(key2);
    });

    it('should produce different keys for different depth', () => {
      const key1 = SummitKeys.relationships('ent-123', 2);
      const key2 = SummitKeys.relationships('ent-123', 3);
      expect(key1).not.toBe(key2);
    });
  });

  describe('search', () => {
    it('should generate search key with hash', () => {
      const key = SummitKeys.search('test query', { type: 'person' });
      expect(key).toMatch(/^summit:search:[a-f0-9]{16}$/);
    });

    it('should produce consistent keys for same search params', () => {
      const key1 = SummitKeys.search('test', { a: 1, b: 2 });
      const key2 = SummitKeys.search('test', { a: 1, b: 2 });
      expect(key1).toBe(key2);
    });
  });

  describe('session', () => {
    it('should generate session key with hashed token', () => {
      const key = SummitKeys.session('abc123token');
      expect(key).toMatch(/^summit:session:[a-f0-9]{16}$/);
    });
  });

  describe('query', () => {
    it('should generate query key', () => {
      const key = SummitKeys.query('hash123');
      expect(key).toBe('summit:query:hash123');
    });
  });

  describe('traversal', () => {
    it('should generate traversal key with hash', () => {
      const key = SummitKeys.traversal('node-1', 'KNOWS>*', 5);
      expect(key).toMatch(/^summit:traversal:node-1:[a-f0-9]{16}$/);
    });
  });
});
