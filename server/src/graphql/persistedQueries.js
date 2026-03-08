"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistedQueryManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
class PersistedQueryManager {
    redis;
    logger;
    repository;
    allowlist = new Set();
    QUERY_PREFIX = 'pq:';
    ALLOWLIST_PREFIX = 'pq:allowlist:';
    QUERY_CACHE_TTL = 86400; // 24 hours
    ALLOWLIST_CACHE_TTL = 3600; // 1 hour
    ENFORCE_ALLOWLIST = process.env.ENFORCE_QUERY_ALLOWLIST === 'true';
    constructor(redis, repository, logger) {
        this.redis = redis;
        this.repository = repository;
        this.logger = logger;
        this.loadAllowlist();
    }
    /**
     * Generate SHA-256 hash for a query
     */
    generateQueryHash(query) {
        return crypto_1.default
            .createHash('sha256')
            .update(query)
            .digest('hex');
    }
    /**
     * Store a query in Redis for future retrieval
     */
    async persistQuery(queryHash, query) {
        try {
            const key = `${this.QUERY_PREFIX}${queryHash}`;
            await this.redis.setex(key, this.QUERY_CACHE_TTL, query);
            this.logger.debug(`Persisted query stored: ${queryHash.substring(0, 8)}...`);
        }
        catch (error) {
            this.logger.error(`Error persisting query ${queryHash}:`, error);
            throw error;
        }
    }
    /**
     * Retrieve a persisted query by hash
     */
    async getPersistedQuery(queryHash) {
        try {
            const key = `${this.QUERY_PREFIX}${queryHash}`;
            const query = await this.redis.get(key);
            if (query) {
                this.logger.debug(`Retrieved persisted query: ${queryHash.substring(0, 8)}...`);
            }
            return query;
        }
        catch (error) {
            this.logger.error(`Error retrieving persisted query ${queryHash}:`, error);
            return null;
        }
    }
    /**
     * Check if a query hash is in the allowlist
     */
    async isQueryAllowed(queryHash) {
        if (!this.ENFORCE_ALLOWLIST) {
            // If not enforcing, all queries are allowed (dev mode)
            this.logger.debug(`Allowlist enforcement disabled, allowing query: ${queryHash}`);
            return true;
        }
        // First check the memory cache
        if (this.allowlist.has(queryHash)) {
            return true;
        }
        // Then check the repository
        const isAllowed = await this.repository.isQueryAllowed(queryHash);
        if (isAllowed) {
            this.allowlist.add(queryHash); // Cache for future lookups
        }
        this.logger.debug(`Query ${queryHash} ${isAllowed ? 'ALLOWED' : 'BLOCKED'} by allowlist`);
        return isAllowed;
    }
    /**
     * Add a query to the allowlist
     */
    async addToAllowlist(queryHash, query, approvedBy, metadata) {
        try {
            // Add to repository
            const entry = {
                queryHash,
                query,
                createdAt: new Date(),
                approvedBy,
                environment: [process.env.NODE_ENV || 'development'],
                ...metadata
            };
            await this.repository.addQueryToAllowlist(queryHash, entry);
            // Update local cache
            this.allowlist.add(queryHash);
            this.logger.info(`Query added to allowlist: ${queryHash.substring(0, 8)}...`, {
                approvedBy,
                queryPreview: query.substring(0, 100)
            });
        }
        catch (error) {
            this.logger.error(`Error adding query to allowlist ${queryHash}:`, error);
            throw error;
        }
    }
    /**
     * Remove a query from the allowlist
     */
    async removeFromAllowlist(queryHash) {
        try {
            await this.repository.removeQueryFromAllowlist(queryHash);
            this.allowlist.delete(queryHash);
            this.logger.info(`Query removed from allowlist: ${queryHash}`);
        }
        catch (error) {
            this.logger.error(`Error removing query from allowlist ${queryHash}:`, error);
            throw error;
        }
    }
    /**
     * Load the allowlist from repository into memory
     */
    async loadAllowlist() {
        try {
            this.logger.info('Loading query allowlist from repository...');
            const allowlist = await this.repository.getAllowlist();
            // Clear current allowlist and populate with new values
            this.allowlist.clear();
            allowlist.forEach(hash => this.allowlist.add(hash));
            this.logger.info(`Loaded ${this.allowlist.size} queries into allowlist cache`);
        }
        catch (error) {
            this.logger.error('Error loading query allowlist:', error);
            // Don't throw - we can continue with empty allowlist
        }
    }
    /**
     * Get stats about persisted queries
     */
    async getStats() {
        return {
            totalCachedQueries: this.allowlist.size,
            allowlistedQueries: this.allowlist.size,
            enforceAllowlist: this.ENFORCE_ALLOWLIST
        };
    }
    /**
     * Verify a query against its hash
     */
    async verifyQueryHash(query, expectedHash) {
        const actualHash = this.generateQueryHash(query);
        return actualHash === expectedHash;
    }
    /**
     * Get the enforcement status
     */
    getEnforcementStatus() {
        return this.ENFORCE_ALLOWLIST;
    }
    /**
     * Warm up the allowlist cache (for high-availability scenarios)
     */
    async warmUpCache() {
        await this.loadAllowlist();
    }
    /**
     * Get all allowlisted query hashes
     */
    getAllowedQueries() {
        return Array.from(this.allowlist);
    }
    /**
     * Get query statistics for monitoring
     */
    async getQueryMetrics() {
        try {
            // Get metrics from Redis about query usage
            const keys = await this.redis.keys(`${this.QUERY_PREFIX}*`);
            const activeQueries = keys.length;
            return {
                activeQueries,
                allowlistedQueries: this.allowlist.size,
                allowlistEnabled: this.ENFORCE_ALLOWLIST ? 1 : 0
            };
        }
        catch (error) {
            this.logger.error('Error getting query metrics:', error);
            return {};
        }
    }
}
exports.PersistedQueryManager = PersistedQueryManager;
