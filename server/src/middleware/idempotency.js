"use strict";
/**
 * Idempotency middleware for safe network retries and batch operations
 * Prevents duplicate mutations using Redis-backed idempotency keys
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.idempotencyMiddleware = void 0;
exports.createIdempotencyMiddleware = createIdempotencyMiddleware;
exports.getIdempotencyManager = getIdempotencyManager;
const crypto_1 = require("crypto");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class IdempotencyManager {
    redis;
    options;
    constructor(options = {}) {
        this.options = {
            redisClient: options.redisClient || this.createDefaultRedisClient(),
            ttlMs: options.ttlMs || 10 * 60 * 1000, // 10 minutes
            includeBody: options.includeBody ?? true,
            includeQuery: options.includeQuery ?? true,
            includeHeaders: options.includeHeaders || [
                'authorization',
                'x-tenant-id',
            ],
            maxBodySize: options.maxBodySize || 1024 * 1024, // 1MB
            enabled: options.enabled ?? process.env.ENABLE_IDEMPOTENCY === 'true',
        };
        this.redis = this.options.redisClient;
    }
    createDefaultRedisClient() {
        const client = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
            reconnectOnError: (err) => {
                logger_js_1.default.error('Redis client error in idempotency middleware', {
                    error: err,
                });
                return true;
            },
            retryStrategy: (times) => Math.min(times * 50, 500),
        });
        return client;
    }
    /**
     * Generate deterministic hash for request signature
     */
    generateRequestSignature(req) {
        const components = [req.method, req.originalUrl || req.url];
        // Include query parameters
        if (this.options.includeQuery && Object.keys(req.query).length > 0) {
            const sortedQuery = Object.keys(req.query)
                .sort()
                .map((key) => `${key}=${req.query[key]}`)
                .join('&');
            components.push(`query:${sortedQuery}`);
        }
        // Include specific headers
        for (const headerName of this.options.includeHeaders) {
            const headerValue = req.get(headerName);
            if (headerValue) {
                components.push(`${headerName}:${headerValue}`);
            }
        }
        // Include request body
        if (this.options.includeBody && req.body) {
            const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            if (bodyString.length <= this.options.maxBodySize) {
                components.push(`body:${bodyString}`);
            }
            else {
                // For large bodies, include size and hash of first/last chunks
                const firstChunk = bodyString.slice(0, 1000);
                const lastChunk = bodyString.slice(-1000);
                const sizeHash = (0, crypto_1.createHash)('md5')
                    .update(bodyString.length.toString())
                    .digest('hex');
                components.push(`body:large:${firstChunk}:${lastChunk}:${sizeHash}`);
            }
        }
        return (0, crypto_1.createHash)('sha256').update(components.join('|')).digest('hex');
    }
    /**
     * Check if request is a duplicate and handle accordingly
     */
    async processRequest(req, res, next) {
        try {
            if (!this.options.enabled) {
                return next();
            }
            const idempotencyKey = req.get('Idempotency-Key');
            if (!idempotencyKey) {
                // No idempotency key provided - allow request
                return next();
            }
            if (!this.isValidIdempotencyKey(idempotencyKey)) {
                res.status(400).json({
                    error: 'Invalid idempotency key format',
                    code: 'INVALID_IDEMPOTENCY_KEY',
                });
                return;
            }
            const requestSignature = this.generateRequestSignature(req);
            const redisKey = `idempotency:${idempotencyKey}:${requestSignature}`;
            // Extract metadata for logging
            const tenantId = req.get('x-tenant-id') ||
                req.user?.tenantId ||
                req.body?.tenantId;
            const operationName = req.body?.operationName;
            // Try to acquire idempotency lock
            const lockResult = await this.redis.set(redisKey, JSON.stringify({
                requestHash: requestSignature,
                createdAt: new Date().toISOString(),
                tenantId,
                operationName,
                completed: false,
            }), {
                NX: true, // Only set if key doesn't exist
                PX: this.options.ttlMs, // Set expiration in milliseconds
            });
            if (!lockResult) {
                // Key already exists - this is a duplicate request
                const existingRecord = await this.redis.get(redisKey);
                if (existingRecord) {
                    try {
                        const record = JSON.parse(existingRecord);
                        if (record.completed &&
                            record.responseStatus &&
                            record.responseBody) {
                            // Return cached response
                            res.status(record.responseStatus);
                            res.set('X-Idempotency', 'hit');
                            res.json(JSON.parse(record.responseBody));
                            logger_js_1.default.info('Idempotency hit - returning cached response', {
                                idempotencyKey,
                                requestSignature,
                                tenantId,
                                operationName,
                                cachedStatus: record.responseStatus,
                            });
                            return;
                        }
                    }
                    catch (parseError) {
                        logger_js_1.default.warn('Failed to parse existing idempotency record', {
                            idempotencyKey,
                            error: parseError,
                        });
                    }
                }
                // Duplicate in progress
                res.status(409).json({
                    error: 'Duplicate request detected',
                    code: 'IDEMPOTENCY_CONFLICT',
                    message: 'A request with this idempotency key is already being processed',
                });
                logger_js_1.default.warn('Idempotency conflict detected', {
                    idempotencyKey,
                    requestSignature,
                    tenantId,
                    operationName,
                });
                return;
            }
            // Request is unique - proceed with processing
            res.set('X-Idempotency', 'accepted');
            // Hook response completion to cache result
            this.hookResponseCompletion(req, res, redisKey);
            logger_js_1.default.debug('Idempotency key accepted', {
                idempotencyKey,
                requestSignature,
                tenantId,
                operationName,
            });
            next();
        }
        catch (error) {
            logger_js_1.default.error('Idempotency middleware error', {
                error,
                idempotencyKey: req.get('Idempotency-Key'),
            });
            // Fail open - allow request to proceed
            next();
        }
    }
    /**
     * Hook into response to cache successful results
     */
    hookResponseCompletion(req, res, redisKey) {
        const originalSend = res.json;
        const self = this;
        let responseCaptured = false;
        res.json = function (body) {
            if (!responseCaptured) {
                responseCaptured = true;
                // Cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const record = {
                        requestHash: redisKey.split(':')[2],
                        createdAt: new Date().toISOString(),
                        tenantId: req.get('x-tenant-id'),
                        operationName: req.body?.operationName,
                        completed: true,
                        responseStatus: res.statusCode,
                        responseBody: JSON.stringify(body),
                    };
                    self.redis
                        .set(redisKey, JSON.stringify(record), {
                        PX: self.options.ttlMs,
                    })
                        .catch((error) => {
                        logger_js_1.default.error('Failed to cache idempotency response', {
                            error,
                            redisKey,
                        });
                    });
                }
            }
            return originalSend.call(this, body);
        };
    }
    /**
     * Validate idempotency key format
     */
    isValidIdempotencyKey(key) {
        // Must be 6-255 characters, alphanumeric + hyphens/underscores
        const regex = /^[a-zA-Z0-9_-]{6,255}$/;
        return regex.test(key);
    }
    /**
     * Clean up expired idempotency records (called by background job)
     */
    async cleanup() {
        try {
            const pattern = 'idempotency:*';
            let cursor = 0;
            let deletedCount = 0;
            do {
                const scanResult = await this.redis.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100,
                });
                cursor = scanResult.cursor;
                const keys = scanResult.keys;
                if (keys.length > 0) {
                    const deleted = await this.redis.del(keys);
                    deletedCount += deleted;
                }
            } while (cursor !== 0);
            logger_js_1.default.info('Idempotency cleanup completed', { deletedCount });
            return deletedCount;
        }
        catch (error) {
            logger_js_1.default.error('Idempotency cleanup failed', { error });
            return 0;
        }
    }
    /**
     * Get statistics for monitoring
     */
    async getStats() {
        try {
            const pattern = 'idempotency:*';
            let cursor = 0;
            let activeKeys = 0;
            let completedKeys = 0;
            do {
                const scanResult = await this.redis.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100,
                });
                cursor = scanResult.cursor;
                for (const key of scanResult.keys) {
                    const record = await this.redis.get(key);
                    if (record) {
                        try {
                            const parsed = JSON.parse(record);
                            if (parsed.completed) {
                                completedKeys++;
                            }
                            else {
                                activeKeys++;
                            }
                        }
                        catch {
                            // Invalid record
                        }
                    }
                }
            } while (cursor !== 0);
            return {
                activeKeys,
                completedKeys,
                errorRate: 0, // TODO: Track error rate in metrics
            };
        }
        catch (error) {
            logger_js_1.default.error('Failed to get idempotency stats', { error });
            return { activeKeys: -1, completedKeys: -1, errorRate: -1 };
        }
    }
}
// Global manager instance
let globalIdempotencyManager = null;
/**
 * Express middleware factory
 */
function createIdempotencyMiddleware(options) {
    if (!globalIdempotencyManager) {
        globalIdempotencyManager = new IdempotencyManager(options);
    }
    return (req, res, next) => {
        return globalIdempotencyManager.processRequest(req, res, next);
    };
}
/**
 * Get global manager for stats/cleanup
 */
function getIdempotencyManager() {
    if (!globalIdempotencyManager) {
        globalIdempotencyManager = new IdempotencyManager();
    }
    return globalIdempotencyManager;
}
/**
 * Middleware with default configuration
 */
exports.idempotencyMiddleware = createIdempotencyMiddleware();
