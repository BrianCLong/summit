"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupInventoryService = void 0;
const redis_js_1 = require("../../cache/redis.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
class BackupInventoryService {
    static instance;
    targets = new Map();
    redis;
    REDIS_KEY = 'backup:inventory:targets';
    constructor() {
        this.redis = redis_js_1.RedisService.getInstance();
        this.loadFromRedis().catch(err => {
            logger_js_1.default.error('Failed to load backup inventory from Redis', err);
        });
    }
    static getInstance() {
        if (!BackupInventoryService.instance) {
            BackupInventoryService.instance = new BackupInventoryService();
        }
        return BackupInventoryService.instance;
    }
    async loadFromRedis() {
        try {
            const data = await this.redis.get(this.REDIS_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                this.targets = new Map(parsed.map((t) => [t.id, {
                        ...t,
                        createdAt: new Date(t.createdAt),
                        updatedAt: new Date(t.updatedAt),
                        lastSuccessAt: t.lastSuccessAt ? new Date(t.lastSuccessAt) : undefined,
                        lastFailureAt: t.lastFailureAt ? new Date(t.lastFailureAt) : undefined,
                    }]));
            }
        }
        catch (error) {
            logger_js_1.default.error('Error loading backup inventory from Redis', error);
        }
    }
    async saveToRedis() {
        try {
            const targetsArray = Array.from(this.targets.values());
            await this.redis.set(this.REDIS_KEY, JSON.stringify(targetsArray));
        }
        catch (error) {
            logger_js_1.default.error('Error saving backup inventory to Redis', error);
        }
    }
    async addTarget(target) {
        const now = new Date();
        const newTarget = {
            ...target,
            createdAt: now,
            updatedAt: now,
        };
        this.targets.set(target.id, newTarget);
        await this.saveToRedis();
        return newTarget;
    }
    async updateTarget(id, updates) {
        const existing = this.targets.get(id);
        if (!existing)
            return undefined;
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date(),
        };
        this.targets.set(id, updated);
        await this.saveToRedis();
        return updated;
    }
    getTarget(id) {
        return this.targets.get(id);
    }
    listTargets() {
        return Array.from(this.targets.values());
    }
    async reportStatus(id, success, timestamp = new Date()) {
        const target = this.targets.get(id);
        if (!target)
            return undefined;
        const updates = {};
        if (success) {
            updates.lastSuccessAt = timestamp;
        }
        else {
            updates.lastFailureAt = timestamp;
        }
        return this.updateTarget(id, updates);
    }
    // For testing
    async clear() {
        this.targets.clear();
        await this.redis.del(this.REDIS_KEY);
    }
}
exports.BackupInventoryService = BackupInventoryService;
