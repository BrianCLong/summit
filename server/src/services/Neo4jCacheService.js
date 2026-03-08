"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jCacheService = void 0;
// @ts-nocheck
const cacheHelper_js_1 = require("../utils/cacheHelper.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class Neo4jCacheService {
    /**
     * Caches a generic Neo4j query result.
     * @param key Unique cache key (include tenantId, params)
     * @param ttlSeconds Time to live in seconds
     * @param queryFn Async function that executes the Cypher query
     */
    static async getCachedResult(key, ttlSeconds, queryFn) {
        try {
            return await (0, cacheHelper_js_1.withCache)(key, ttlSeconds, queryFn);
        }
        catch (error) {
            logger_js_1.default.error(`Cache failed for key ${key}, falling back to direct query`, error);
            return queryFn();
        }
    }
    /**
     * Generates a standardized cache key for graph queries
     */
    static generateKey(prefix, tenantId, params) {
        const paramStr = Object.entries(params)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${v}`)
            .join('_');
        return `graph:${prefix}:${tenantId}:${paramStr}`;
    }
}
exports.Neo4jCacheService = Neo4jCacheService;
