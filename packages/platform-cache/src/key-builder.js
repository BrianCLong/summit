"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummitKeys = exports.CacheKeyBuilder = void 0;
const node_crypto_1 = require("node:crypto");
/**
 * Cache key builder for consistent key generation
 */
class CacheKeyBuilder {
    parts = [];
    hashData = [];
    /**
     * Add a namespace part
     */
    namespace(ns) {
        this.parts.push(ns);
        return this;
    }
    /**
     * Add an entity type
     */
    entity(type) {
        this.parts.push(type);
        return this;
    }
    /**
     * Add an ID
     */
    id(id) {
        this.parts.push(String(id));
        return this;
    }
    /**
     * Add a version
     */
    version(v) {
        this.parts.push(`v${v}`);
        return this;
    }
    /**
     * Add an action
     */
    action(action) {
        this.parts.push(action);
        return this;
    }
    /**
     * Add data to be hashed
     */
    hash(data) {
        this.hashData.push(data);
        return this;
    }
    /**
     * Add a timestamp bucket (for time-based invalidation)
     */
    timeBucket(intervalSeconds) {
        const bucket = Math.floor(Date.now() / 1000 / intervalSeconds);
        this.parts.push(`t${bucket}`);
        return this;
    }
    /**
     * Build the final key
     */
    build() {
        let key = this.parts.join(':');
        if (this.hashData.length > 0) {
            const dataStr = JSON.stringify(this.hashData);
            const hash = (0, node_crypto_1.createHash)('sha256')
                .update(dataStr)
                .digest('hex')
                .substring(0, 16);
            key += `:${hash}`;
        }
        return key;
    }
    /**
     * Reset the builder
     */
    reset() {
        this.parts = [];
        this.hashData = [];
        return this;
    }
    /**
     * Create a new builder with preset namespace
     */
    static withNamespace(namespace) {
        return new CacheKeyBuilder().namespace(namespace);
    }
}
exports.CacheKeyBuilder = CacheKeyBuilder;
/**
 * Predefined key patterns for Summit entities
 */
exports.SummitKeys = {
    /**
     * Entity cache key
     */
    entity: (id) => new CacheKeyBuilder()
        .namespace('summit')
        .entity('entity')
        .id(id)
        .build(),
    /**
     * Investigation cache key
     */
    investigation: (id) => new CacheKeyBuilder()
        .namespace('summit')
        .entity('investigation')
        .id(id)
        .build(),
    /**
     * Entity relationships cache key
     */
    relationships: (entityId, depth) => new CacheKeyBuilder()
        .namespace('summit')
        .entity('entity')
        .id(entityId)
        .action('relationships')
        .hash({ depth })
        .build(),
    /**
     * Search results cache key
     */
    search: (query, filters) => new CacheKeyBuilder()
        .namespace('summit')
        .action('search')
        .hash({ query, filters })
        .build(),
    /**
     * User session cache key
     */
    session: (token) => new CacheKeyBuilder()
        .namespace('summit')
        .entity('session')
        .hash(token)
        .build(),
    /**
     * Query result cache key
     */
    query: (queryHash) => new CacheKeyBuilder()
        .namespace('summit')
        .action('query')
        .id(queryHash)
        .build(),
    /**
     * Graph traversal cache key
     */
    traversal: (startNode, pattern, depth) => new CacheKeyBuilder()
        .namespace('summit')
        .action('traversal')
        .id(startNode)
        .hash({ pattern, depth })
        .build(),
};
