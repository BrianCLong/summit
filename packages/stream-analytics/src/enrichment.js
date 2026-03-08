"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrichmentEngine = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const axios_1 = __importDefault(require("axios"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'stream-enrichment' });
/**
 * Data enrichment engine for real-time streams
 */
class EnrichmentEngine {
    redis = null;
    cache = new Map();
    cacheTTL = 300000; // 5 minutes
    constructor(redisUrl) {
        if (redisUrl) {
            this.redis = new ioredis_1.default(redisUrl);
        }
    }
    /**
     * Lookup enrichment from cache or external source
     */
    async lookupEnrichment(key, fetcher, options) {
        const ttl = options?.ttl || this.cacheTTL;
        // Check in-memory cache first
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < ttl) {
            return cached.value;
        }
        // Check Redis cache
        if (this.redis) {
            const redisValue = await this.redis.get(`enrichment:${key}`);
            if (redisValue) {
                try {
                    const parsed = JSON.parse(redisValue);
                    this.cache.set(key, { value: parsed, timestamp: Date.now() });
                    return parsed;
                }
                catch (error) {
                    logger.warn({ error, key }, 'Failed to parse Redis value');
                }
            }
        }
        // Fetch from source
        const value = await fetcher();
        // Cache the result
        this.cache.set(key, { value, timestamp: Date.now() });
        if (this.redis) {
            await this.redis.setex(`enrichment:${key}`, Math.floor(ttl / 1000), JSON.stringify(value));
        }
        return value;
    }
    /**
     * Enrich with external API call
     */
    async enrichFromAPI(data, endpoint, transform) {
        try {
            const response = await axios_1.default.post(endpoint, data, {
                timeout: 5000,
            });
            if (transform) {
                return transform(response.data);
            }
            return response.data;
        }
        catch (error) {
            logger.error({ error, endpoint }, 'API enrichment failed');
            throw error;
        }
    }
    /**
     * Geolocation enrichment
     */
    async enrichGeolocation(ip) {
        const cacheKey = `geo:${ip}`;
        return this.lookupEnrichment(cacheKey, async () => {
            // In production, use a real geolocation API
            // For now, return mock data
            return {
                ip,
                country: 'US',
                region: 'California',
                city: 'San Francisco',
                latitude: 37.7749,
                longitude: -122.4194,
                timezone: 'America/Los_Angeles',
            };
        });
    }
    /**
     * Entity resolution enrichment
     */
    async enrichEntity(entityId) {
        const cacheKey = `entity:${entityId}`;
        return this.lookupEnrichment(cacheKey, async () => {
            // Fetch entity data from database or API
            return {
                id: entityId,
                type: 'person',
                attributes: {},
            };
        });
    }
    /**
     * Threat intelligence enrichment
     */
    async enrichThreatIntel(indicator) {
        const cacheKey = `threat:${indicator}`;
        return this.lookupEnrichment(cacheKey, async () => {
            // Query threat intelligence feeds
            return {
                indicator,
                severity: 'medium',
                categories: ['malware'],
                firstSeen: new Date(),
                lastSeen: new Date(),
            };
        }, { ttl: 600000 } // 10 minutes for threat intel
        );
    }
    /**
     * Historical context enrichment
     */
    async enrichHistoricalContext(key, current, windowSize = 10) {
        const historyKey = `history:${key}`;
        // Get historical values
        let history = [];
        if (this.redis) {
            const values = await this.redis.lrange(historyKey, 0, windowSize - 1);
            history = values.map((v) => JSON.parse(v));
            // Add current value
            await this.redis.lpush(historyKey, JSON.stringify(current));
            await this.redis.ltrim(historyKey, 0, windowSize - 1);
            await this.redis.expire(historyKey, 3600); // 1 hour
        }
        return {
            current,
            history,
            count: history.length + 1,
        };
    }
    /**
     * Multi-source data fusion
     */
    async enrichMultiSource(data, enrichers) {
        const enrichments = await Promise.allSettled(enrichers.map((enricher) => enricher(data)));
        const result = { ...data };
        enrichments.forEach((enrichment, index) => {
            if (enrichment.status === 'fulfilled') {
                Object.assign(result, enrichment.value);
            }
            else {
                logger.warn({ error: enrichment.reason, index }, 'Enrichment failed');
            }
        });
        return result;
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Disconnect
     */
    async disconnect() {
        if (this.redis) {
            await this.redis.quit();
        }
    }
}
exports.EnrichmentEngine = EnrichmentEngine;
