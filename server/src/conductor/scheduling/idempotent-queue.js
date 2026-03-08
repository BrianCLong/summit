"use strict";
// server/src/conductor/scheduling/idempotent-queue.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotentQueue = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const prometheus_js_1 = require("../observability/prometheus.js");
class IdempotentQueue {
    redis;
    queueName;
    poisonPillRules;
    dedupeWindowMs;
    constructor(queueName, dedupeWindowMs = 300000) {
        // 5 min default
        this.redis = new ioredis_1.default(process.env.REDIS_URL);
        this.queueName = queueName;
        this.dedupeWindowMs = dedupeWindowMs;
        this.poisonPillRules = this.initializePoisonPillRules();
    }
    async connect() {
        await this.redis.connect();
    }
    /**
     * Enqueue item with idempotency protection
     */
    async enqueue(item) {
        try {
            const queueItem = {
                ...item,
                id: (0, crypto_1.randomUUID)(),
                retryCount: 0,
                createdAt: new Date(),
            };
            // Check for duplicates using idempotency key
            if (item.idempotencyKey) {
                const dupCheck = await this.checkDuplicate(item.idempotencyKey);
                if (dupCheck) {
                    prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('queue_duplicate_ignored', { success: true });
                    return { success: true, duplicate: true, id: dupCheck };
                }
            }
            // Run poison pill checks
            const poisonCheck = await this.checkPoisonPill(queueItem);
            if (poisonCheck.quarantine) {
                await this.quarantineItem(queueItem, poisonCheck.reason || 'unknown_poison_pill');
                prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('queue_item_quarantined', { success: false });
                return { success: false, quarantined: true, id: queueItem.id };
            }
            // Add to queue with priority
            const score = this.calculateScore(queueItem);
            await this.redis.zAdd(`queue:${this.queueName}`, {
                score,
                value: JSON.stringify(queueItem),
            });
            // Set idempotency key with TTL
            if (item.idempotencyKey) {
                await this.redis.setEx(`idem:${this.queueName}:${item.idempotencyKey}`, Math.ceil(this.dedupeWindowMs / 1000), queueItem.id);
            }
            // Update metrics
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('queue_depth', await this.getDepth());
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('queue_item_enqueued', { success: true });
            logger_js_1.default.debug('Item enqueued successfully', {
                queueName: this.queueName,
                itemId: queueItem.id,
                priority: queueItem.priority,
            });
            return { success: true, id: queueItem.id };
        }
        catch (error) {
            logger_js_1.default.error('Failed to enqueue item', {
                error: error.message,
                queueName: this.queueName,
            });
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('queue_enqueue_error', { success: false });
            return { success: false };
        }
    }
    /**
     * Dequeue item with lease semantics
     */
    async dequeue(workerId, leaseTimeSeconds = 300) {
        try {
            // Get highest priority item
            const items = await this.redis.zPopMax(`queue:${this.queueName}`, 1);
            if (!items.length) {
                return null;
            }
            const queueItem = JSON.parse(items[0].value);
            // Set processing lease
            await this.redis.setEx(`lease:${this.queueName}:${queueItem.id}`, leaseTimeSeconds, workerId);
            // Track processing start
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('queue_item_dequeued', { success: true });
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('queue_depth', await this.getDepth());
            logger_js_1.default.debug('Item dequeued', {
                queueName: this.queueName,
                itemId: queueItem.id,
                workerId,
            });
            return queueItem;
        }
        catch (error) {
            logger_js_1.default.error('Failed to dequeue item', {
                error: error.message,
                queueName: this.queueName,
            });
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('queue_dequeue_error', { success: false });
            return null;
        }
    }
    /**
     * Complete item processing (removes lease)
     */
    async complete(itemId, workerId) {
        try {
            const leaseKey = `lease:${this.queueName}:${itemId}`;
            const currentLease = await this.redis.get(leaseKey);
            if (currentLease !== workerId) {
                logger_js_1.default.warn('Lease mismatch on completion', {
                    itemId,
                    workerId,
                    currentLease,
                });
                return false;
            }
            await this.redis.del(leaseKey);
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('queue_item_completed', { success: true });
            logger_js_1.default.debug('Item completed', {
                queueName: this.queueName,
                itemId,
                workerId,
            });
            return true;
        }
        catch (error) {
            logger_js_1.default.error('Failed to complete item', { error: error.message, itemId });
            return false;
        }
    }
    /**
     * Requeue item with retry logic
     */
    async requeue(item, error) {
        try {
            item.retryCount++;
            if (item.retryCount >= item.maxRetries) {
                await this.quarantineItem(item, `max_retries_exceeded: ${error}`);
                return false;
            }
            // Exponential backoff
            const backoffMs = Math.min(1000 * Math.pow(2, item.retryCount), 60000);
            const score = Date.now() + backoffMs;
            await this.redis.zAdd(`queue:${this.queueName}`, {
                score,
                value: JSON.stringify(item),
            });
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('queue_item_requeued', { success: true });
            logger_js_1.default.info('Item requeued with backoff', {
                itemId: item.id,
                retryCount: item.retryCount,
                backoffMs,
            });
            return true;
        }
        catch (error) {
            logger_js_1.default.error('Failed to requeue item', {
                error: error.message,
                itemId: item.id,
            });
            return false;
        }
    }
    /**
     * Get current queue depth
     */
    async getDepth() {
        return await this.redis.zCard(`queue:${this.queueName}`);
    }
    /**
     * Get queue health metrics
     */
    async getHealthMetrics() {
        try {
            const [depth, quarantinedCount, activeLeases] = await Promise.all([
                this.getDepth(),
                this.redis.lLen(`quarantine:${this.queueName}`),
                this.redis
                    .keys(`lease:${this.queueName}:*`)
                    .then((keys) => keys.length),
            ]);
            // Get oldest item age
            const oldestItems = await this.redis.zRangeWithScores(`queue:${this.queueName}`, 0, 0);
            let oldestItemAge = 0;
            if (oldestItems.length > 0) {
                const oldestItem = JSON.parse(oldestItems[0].value);
                oldestItemAge = Date.now() - new Date(oldestItem.createdAt).getTime();
            }
            return { depth, oldestItemAge, quarantinedCount, activeLeases };
        }
        catch (error) {
            logger_js_1.default.error('Failed to get queue health metrics', {
                error: error.message,
            });
            return {
                depth: 0,
                oldestItemAge: 0,
                quarantinedCount: 0,
                activeLeases: 0,
            };
        }
    }
    async checkDuplicate(idempotencyKey) {
        return await this.redis.get(`idem:${this.queueName}:${idempotencyKey}`);
    }
    async checkPoisonPill(item) {
        for (const rule of this.poisonPillRules) {
            try {
                if (rule.check(item)) {
                    const reason = `poison_pill_rule:${rule.name}`;
                    if (rule.action === 'quarantine') {
                        return { quarantine: true, reason };
                    }
                    else if (rule.action === 'drop') {
                        logger_js_1.default.warn('Item dropped by poison pill rule', {
                            itemId: item.id,
                            rule: rule.name,
                        });
                        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('queue_item_dropped', { success: false });
                        return { quarantine: false };
                    }
                    // retry_later would need additional logic
                }
            }
            catch (error) {
                logger_js_1.default.error('Poison pill rule error', {
                    rule: rule.name,
                    error: error.message,
                });
            }
        }
        return { quarantine: false };
    }
    async quarantineItem(item, reason) {
        const quarantineItem = {
            ...item,
            quarantineReason: reason,
            quarantinedAt: new Date().toISOString(),
        };
        await this.redis.lPush(`quarantine:${this.queueName}`, JSON.stringify(quarantineItem));
        logger_js_1.default.warn('Item quarantined', {
            queueName: this.queueName,
            itemId: item.id,
            reason,
        });
    }
    calculateScore(item) {
        // Higher priority = lower score (for zRange ordering)
        const priorityScore = (10 - Math.min(9, Math.max(1, item.priority))) * 1000000;
        const timeScore = Date.now();
        return priorityScore + timeScore;
    }
    initializePoisonPillRules() {
        return [
            {
                name: 'payload_too_large',
                check: (item) => JSON.stringify(item.payload).length > 1024 * 1024, // 1MB
                action: 'quarantine',
            },
            {
                name: 'invalid_tenant',
                check: (item) => !item.tenantId || item.tenantId.length < 3,
                action: 'quarantine',
            },
            {
                name: 'unknown_expert',
                check: (item) => !['graph_ops', 'rag_retrieval', 'osint_analysis'].includes(item.expert),
                action: 'quarantine',
            },
            {
                name: 'malformed_payload',
                check: (item) => {
                    try {
                        if (typeof item.payload !== 'object' || !item.payload.query) {
                            return true;
                        }
                        return false;
                    }
                    catch {
                        return true;
                    }
                },
                action: 'quarantine',
            },
            {
                name: 'excessive_retries',
                check: (item) => item.retryCount > 10,
                action: 'drop',
            },
        ];
    }
}
exports.IdempotentQueue = IdempotentQueue;
