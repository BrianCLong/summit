"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureStore = exports.FeatureStoreService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = require("../config/logger.js");
/**
 * Feature Store Service.
 * Backed by Redis (Online) with in-memory fallback.
 */
class FeatureStoreService {
    static instance;
    redis;
    memoryStore; // Fallback
    featureDefinitions;
    useRedis = false;
    constructor() {
        this.memoryStore = new Map();
        this.featureDefinitions = new Map();
        if (process.env.REDIS_URL) {
            try {
                this.redis = new ioredis_1.default(process.env.REDIS_URL);
                this.useRedis = true;
                this.redis.on('error', (err) => {
                    logger_js_1.logger.error({ err }, 'Redis Feature Store connection error, falling back to memory');
                    this.useRedis = false;
                });
            }
            catch (err) {
                logger_js_1.logger.warn('Failed to initialize Redis for Feature Store, using memory fallback');
            }
        }
    }
    static getInstance() {
        if (!FeatureStoreService.instance) {
            FeatureStoreService.instance = new FeatureStoreService();
        }
        return FeatureStoreService.instance;
    }
    /**
     * Register a feature set definition.
     */
    async registerFeatureSet(featureSet) {
        this.featureDefinitions.set(featureSet.name, featureSet);
        // In a real system, persist to metadata store (Postgres/Ledger)
        if (this.useRedis && this.redis) {
            await this.redis.hset('feature_sets', featureSet.name, JSON.stringify(featureSet));
        }
    }
    /**
     * Ingest feature values for a specific entity.
     */
    async ingestFeatures(featureSetName, entityId, values) {
        const key = `fs:${featureSetName}:${entityId}`;
        const serialized = JSON.stringify(values);
        if (this.useRedis && this.redis) {
            await this.redis.set(key, serialized, 'EX', 3600); // 1 hour TTL default
        }
        else {
            this.memoryStore.set(key, serialized);
        }
    }
    /**
     * Retrieve features for online inference.
     */
    async getOnlineFeatures(featureSetName, entityId, featureNames) {
        const key = `fs:${featureSetName}:${entityId}`;
        let allFeaturesStr = null;
        if (this.useRedis && this.redis) {
            allFeaturesStr = await this.redis.get(key);
        }
        else {
            allFeaturesStr = this.memoryStore.get(key) || null;
        }
        if (!allFeaturesStr)
            return null;
        try {
            const allFeatures = JSON.parse(allFeaturesStr);
            const result = {};
            featureNames.forEach(name => {
                if (name in allFeatures) {
                    result[name] = allFeatures[name];
                }
            });
            return result;
        }
        catch (e) {
            logger_js_1.logger.error('Error parsing features', e);
            return null;
        }
    }
    /**
     * Batch retrieval for multiple entities.
     */
    async getBatchOnlineFeatures(featureSetName, entityIds, featureNames) {
        const result = {};
        // Pipelining could be used here for Redis optimization
        for (const id of entityIds) {
            const features = await this.getOnlineFeatures(featureSetName, id, featureNames);
            if (features) {
                result[id] = features;
            }
        }
        return result;
    }
}
exports.FeatureStoreService = FeatureStoreService;
exports.featureStore = FeatureStoreService.getInstance();
