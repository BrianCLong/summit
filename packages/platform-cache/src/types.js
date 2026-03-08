"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheConfigSchema = void 0;
const zod_1 = require("zod");
/**
 * Cache configuration schema
 */
exports.CacheConfigSchema = zod_1.z.object({
    /** Cache namespace for key prefixing */
    namespace: zod_1.z.string().default('summit'),
    /** Default TTL in seconds */
    defaultTtl: zod_1.z.number().positive().default(300),
    /** Maximum TTL in seconds */
    maxTtl: zod_1.z.number().positive().default(86400),
    /** Enable metrics collection */
    enableMetrics: zod_1.z.boolean().default(true),
    /** Local cache configuration */
    local: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        maxSize: zod_1.z.number().positive().default(1000),
        ttl: zod_1.z.number().positive().default(60),
    }).default({}),
    /** Redis configuration */
    redis: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        url: zod_1.z.string().optional(),
        host: zod_1.z.string().default('localhost'),
        port: zod_1.z.number().default(6379),
        password: zod_1.z.string().optional(),
        db: zod_1.z.number().default(0),
        keyPrefix: zod_1.z.string().default('cache:'),
        maxRetriesPerRequest: zod_1.z.number().default(3),
        /** Array of Redis URLs for partitioning */
        nodes: zod_1.z.array(zod_1.z.string()).optional(),
        /** Partitioning strategy */
        partitionStrategy: zod_1.z.enum(['hash', 'ring']).default('hash'),
    }).default({}),
});
