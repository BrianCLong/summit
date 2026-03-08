"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaseManager = void 0;
const crypto_1 = require("crypto");
const errors_js_1 = require("./errors.js");
const logger_js_1 = require("../utils/logger.js");
class LeaseManager {
    redis;
    logger;
    constructor(redis, logger = new logger_js_1.Logger('LeaseManager')) {
        this.redis = redis;
        this.logger = logger;
    }
    async acquire(jobId, queueName, ttlMs) {
        const key = this.buildKey(queueName, jobId);
        const ownerId = (0, crypto_1.randomUUID)();
        const result = await this.redis.set(key, ownerId, 'PX', ttlMs, 'NX');
        if (result !== 'OK') {
            throw new errors_js_1.LeaseAcquisitionError(key);
        }
        this.logger.debug('lease acquired', { key, ownerId, ttlMs });
        return { key, ownerId, ttlMs };
    }
    async renew(lease) {
        const result = await this.redis.set(lease.key, lease.ownerId, 'PX', lease.ttlMs, 'XX');
        return result === 'OK';
    }
    async release(lease) {
        const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      end
      return 0
    `;
        await this.redis.eval(script, 1, lease.key, lease.ownerId);
    }
    startRenewal(lease, intervalMs) {
        let stopped = false;
        let lostLease = false;
        const timer = setInterval(async () => {
            if (stopped)
                return;
            try {
                const ok = await this.renew(lease);
                if (!ok) {
                    lostLease = true;
                    this.logger.warn('lease renewal failed', { key: lease.key });
                }
            }
            catch (error) {
                lostLease = true;
                this.logger.error('lease renewal error', error);
            }
        }, intervalMs);
        return {
            stop: async () => {
                stopped = true;
                clearInterval(timer);
                if (lostLease) {
                    throw new errors_js_1.LeaseExpiredError(lease.key);
                }
            },
            hasLostLease: () => lostLease,
        };
    }
    buildKey(queueName, jobId) {
        return `lease:${queueName}:${jobId}`;
    }
}
exports.LeaseManager = LeaseManager;
