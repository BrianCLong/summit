"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const key_builder_js_1 = require("../key-builder.js");
(0, vitest_1.describe)('CacheKeyBuilder', () => {
    (0, vitest_1.describe)('basic key building', () => {
        (0, vitest_1.it)('should build simple key with namespace', () => {
            const key = new key_builder_js_1.CacheKeyBuilder()
                .namespace('app')
                .build();
            (0, vitest_1.expect)(key).toBe('app');
        });
        (0, vitest_1.it)('should build key with multiple parts', () => {
            const key = new key_builder_js_1.CacheKeyBuilder()
                .namespace('app')
                .entity('user')
                .id('123')
                .build();
            (0, vitest_1.expect)(key).toBe('app:user:123');
        });
        (0, vitest_1.it)('should handle version', () => {
            const key = new key_builder_js_1.CacheKeyBuilder()
                .namespace('app')
                .entity('user')
                .version(2)
                .id('123')
                .build();
            (0, vitest_1.expect)(key).toBe('app:user:v2:123');
        });
        (0, vitest_1.it)('should handle action', () => {
            const key = new key_builder_js_1.CacheKeyBuilder()
                .namespace('app')
                .entity('user')
                .id('123')
                .action('profile')
                .build();
            (0, vitest_1.expect)(key).toBe('app:user:123:profile');
        });
    });
    (0, vitest_1.describe)('hash functionality', () => {
        (0, vitest_1.it)('should append hash for complex data', () => {
            const key = new key_builder_js_1.CacheKeyBuilder()
                .namespace('app')
                .action('search')
                .hash({ query: 'test', filters: { status: 'active' } })
                .build();
            (0, vitest_1.expect)(key).toMatch(/^app:search:[a-f0-9]{16}$/);
        });
        (0, vitest_1.it)('should produce consistent hashes for same data', () => {
            const key1 = new key_builder_js_1.CacheKeyBuilder()
                .namespace('app')
                .hash({ query: 'test' })
                .build();
            const key2 = new key_builder_js_1.CacheKeyBuilder()
                .namespace('app')
                .hash({ query: 'test' })
                .build();
            (0, vitest_1.expect)(key1).toBe(key2);
        });
        (0, vitest_1.it)('should produce different hashes for different data', () => {
            const key1 = new key_builder_js_1.CacheKeyBuilder()
                .namespace('app')
                .hash({ query: 'test1' })
                .build();
            const key2 = new key_builder_js_1.CacheKeyBuilder()
                .namespace('app')
                .hash({ query: 'test2' })
                .build();
            (0, vitest_1.expect)(key1).not.toBe(key2);
        });
    });
    (0, vitest_1.describe)('time bucket', () => {
        (0, vitest_1.it)('should add time bucket', () => {
            const key = new key_builder_js_1.CacheKeyBuilder()
                .namespace('app')
                .timeBucket(60)
                .build();
            (0, vitest_1.expect)(key).toMatch(/^app:t\d+$/);
        });
        (0, vitest_1.it)('should produce same bucket within interval', () => {
            const key1 = new key_builder_js_1.CacheKeyBuilder()
                .namespace('app')
                .timeBucket(3600) // 1 hour bucket
                .build();
            const key2 = new key_builder_js_1.CacheKeyBuilder()
                .namespace('app')
                .timeBucket(3600)
                .build();
            (0, vitest_1.expect)(key1).toBe(key2);
        });
    });
    (0, vitest_1.describe)('reset', () => {
        (0, vitest_1.it)('should reset builder state', () => {
            const builder = new key_builder_js_1.CacheKeyBuilder()
                .namespace('app')
                .entity('user')
                .id('123');
            builder.reset();
            const key = builder.namespace('other').build();
            (0, vitest_1.expect)(key).toBe('other');
        });
    });
    (0, vitest_1.describe)('withNamespace static method', () => {
        (0, vitest_1.it)('should create builder with preset namespace', () => {
            const key = key_builder_js_1.CacheKeyBuilder.withNamespace('myapp')
                .entity('item')
                .id('456')
                .build();
            (0, vitest_1.expect)(key).toBe('myapp:item:456');
        });
    });
});
(0, vitest_1.describe)('SummitKeys', () => {
    (0, vitest_1.describe)('entity', () => {
        (0, vitest_1.it)('should generate entity key', () => {
            const key = key_builder_js_1.SummitKeys.entity('ent-123');
            (0, vitest_1.expect)(key).toBe('summit:entity:ent-123');
        });
    });
    (0, vitest_1.describe)('investigation', () => {
        (0, vitest_1.it)('should generate investigation key', () => {
            const key = key_builder_js_1.SummitKeys.investigation('inv-456');
            (0, vitest_1.expect)(key).toBe('summit:investigation:inv-456');
        });
    });
    (0, vitest_1.describe)('relationships', () => {
        (0, vitest_1.it)('should generate relationships key with hash', () => {
            const key = key_builder_js_1.SummitKeys.relationships('ent-123', 3);
            (0, vitest_1.expect)(key).toMatch(/^summit:entity:ent-123:relationships:[a-f0-9]{16}$/);
        });
        (0, vitest_1.it)('should produce consistent keys for same params', () => {
            const key1 = key_builder_js_1.SummitKeys.relationships('ent-123', 3);
            const key2 = key_builder_js_1.SummitKeys.relationships('ent-123', 3);
            (0, vitest_1.expect)(key1).toBe(key2);
        });
        (0, vitest_1.it)('should produce different keys for different depth', () => {
            const key1 = key_builder_js_1.SummitKeys.relationships('ent-123', 2);
            const key2 = key_builder_js_1.SummitKeys.relationships('ent-123', 3);
            (0, vitest_1.expect)(key1).not.toBe(key2);
        });
    });
    (0, vitest_1.describe)('search', () => {
        (0, vitest_1.it)('should generate search key with hash', () => {
            const key = key_builder_js_1.SummitKeys.search('test query', { type: 'person' });
            (0, vitest_1.expect)(key).toMatch(/^summit:search:[a-f0-9]{16}$/);
        });
        (0, vitest_1.it)('should produce consistent keys for same search params', () => {
            const key1 = key_builder_js_1.SummitKeys.search('test', { a: 1, b: 2 });
            const key2 = key_builder_js_1.SummitKeys.search('test', { a: 1, b: 2 });
            (0, vitest_1.expect)(key1).toBe(key2);
        });
    });
    (0, vitest_1.describe)('session', () => {
        (0, vitest_1.it)('should generate session key with hashed token', () => {
            const key = key_builder_js_1.SummitKeys.session('abc123token');
            (0, vitest_1.expect)(key).toMatch(/^summit:session:[a-f0-9]{16}$/);
        });
    });
    (0, vitest_1.describe)('query', () => {
        (0, vitest_1.it)('should generate query key', () => {
            const key = key_builder_js_1.SummitKeys.query('hash123');
            (0, vitest_1.expect)(key).toBe('summit:query:hash123');
        });
    });
    (0, vitest_1.describe)('traversal', () => {
        (0, vitest_1.it)('should generate traversal key with hash', () => {
            const key = key_builder_js_1.SummitKeys.traversal('node-1', 'KNOWS>*', 5);
            (0, vitest_1.expect)(key).toMatch(/^summit:traversal:node-1:[a-f0-9]{16}$/);
        });
    });
});
