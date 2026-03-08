"use strict";
/**
 * QueryBus - Handle and route queries with caching
 *
 * Query bus with automatic caching and optimization
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBus = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
class QueryBus extends events_1.EventEmitter {
    handlers = new Map();
    redis;
    logger;
    defaultCacheTTL = 300; // 5 minutes
    constructor(redis) {
        super();
        this.redis = redis;
        this.logger = (0, pino_1.default)({ name: 'QueryBus' });
    }
    /**
     * Register a query handler
     */
    register(registration) {
        if (this.handlers.has(registration.queryType)) {
            throw new Error(`Handler already registered for query type: ${registration.queryType}`);
        }
        this.handlers.set(registration.queryType, registration);
        this.logger.debug({ queryType: registration.queryType }, 'Query handler registered');
    }
    /**
     * Execute a query
     */
    async execute(queryType, parameters, metadata) {
        const query = {
            queryId: (0, uuid_1.v4)(),
            queryType,
            parameters,
            metadata,
            timestamp: new Date()
        };
        return this.send(query);
    }
    /**
     * Send a query for processing
     */
    async send(query) {
        this.logger.debug({ queryId: query.queryId, queryType: query.queryType }, 'Processing query');
        this.emit('query:received', query);
        const startTime = Date.now();
        try {
            // Get handler
            const registration = this.handlers.get(query.queryType);
            if (!registration) {
                const error = `No handler registered for query type: ${query.queryType}`;
                this.emit('query:no-handler', query);
                return {
                    success: false,
                    error,
                    executionTime: Date.now() - startTime
                };
            }
            // Check cache if enabled
            if (registration.cacheable && this.redis) {
                const cacheKey = this.getCacheKey(query);
                const cached = await this.redis.get(cacheKey);
                if (cached) {
                    this.logger.debug({ queryId: query.queryId }, 'Cache hit');
                    this.emit('query:cache-hit', query);
                    return {
                        success: true,
                        data: JSON.parse(cached),
                        cached: true,
                        fromCache: true,
                        executionTime: Date.now() - startTime
                    };
                }
            }
            // Execute query
            const result = await registration.handler(query);
            result.executionTime = Date.now() - startTime;
            // Cache result if cacheable
            if (registration.cacheable &&
                this.redis &&
                result.success &&
                result.data) {
                const cacheKey = this.getCacheKey(query);
                const ttl = registration.cacheTTL || this.defaultCacheTTL;
                await this.redis.setex(cacheKey, ttl, JSON.stringify(result.data));
                this.logger.debug({ queryId: query.queryId, ttl }, 'Result cached');
            }
            if (result.success) {
                this.emit('query:succeeded', { query, result });
            }
            else {
                this.emit('query:failed', { query, result });
            }
            return result;
        }
        catch (err) {
            this.logger.error({ err, queryId: query.queryId }, 'Query execution error');
            this.emit('query:error', { query, error: err });
            return {
                success: false,
                error: err.message || 'Query execution failed',
                executionTime: Date.now() - startTime
            };
        }
    }
    /**
     * Invalidate cache for query type
     */
    async invalidateCache(queryType, parameters) {
        if (!this.redis)
            return;
        if (!this.redis) {
            return;
        }
        if (parameters) {
            // Invalidate specific query
            const query = {
                queryId: '',
                queryType,
                parameters,
                timestamp: new Date()
            };
            const cacheKey = this.getCacheKey(query);
            await this.redis.del(cacheKey);
        }
        else {
            // Invalidate all queries of this type
            const pattern = `query:${queryType}:*`;
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        this.logger.debug({ queryType }, 'Cache invalidated');
    }
    /**
     * Generate cache key for query
     */
    getCacheKey(query) {
        const paramsHash = JSON.stringify(query.parameters);
        return `query:${query.queryType}:${paramsHash}`;
    }
    /**
     * Check if handler exists
     */
    hasHandler(queryType) {
        return this.handlers.has(queryType);
    }
    /**
     * Get all registered query types
     */
    getQueryTypes() {
        return Array.from(this.handlers.keys());
    }
}
exports.QueryBus = QueryBus;
