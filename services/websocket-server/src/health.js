"use strict";
/**
 * Health Check Implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthChecker = void 0;
const logger_js_1 = require("./utils/logger.js");
class HealthChecker {
    redis;
    connectionManager;
    startTime;
    constructor(redis, connectionManager) {
        this.redis = redis;
        this.connectionManager = connectionManager;
        this.startTime = Date.now();
    }
    async check() {
        const checks = await Promise.allSettled([
            this.checkRedis(),
            this.checkMemory(),
            this.checkConnections(),
        ]);
        const redisCheck = checks[0].status === 'fulfilled' ? checks[0].value : null;
        const memoryCheck = checks[1].status === 'fulfilled' ? checks[1].value : null;
        const connectionsCheck = checks[2].status === 'fulfilled' ? checks[2].value : null;
        // Determine overall status
        let status = 'healthy';
        if (!redisCheck?.connected) {
            status = 'unhealthy';
        }
        else if (memoryCheck && memoryCheck.percentage > 90) {
            status = 'degraded';
        }
        return {
            status,
            timestamp: Date.now(),
            uptime: Date.now() - this.startTime,
            connections: connectionsCheck || {
                total: 0,
                byTenant: {},
            },
            redis: redisCheck || {
                connected: false,
            },
            memory: memoryCheck || {
                used: 0,
                total: 0,
                percentage: 0,
            },
        };
    }
    async checkRedis() {
        try {
            const start = Date.now();
            await this.redis.ping();
            const latency = Date.now() - start;
            return {
                connected: true,
                latency,
            };
        }
        catch (error) {
            logger_js_1.logger.error({ error: error.message }, 'Redis health check failed');
            return {
                connected: false,
            };
        }
    }
    checkMemory() {
        const usage = process.memoryUsage();
        const totalMemory = require('os').totalmem();
        const usedMemory = usage.heapUsed;
        const percentage = (usedMemory / totalMemory) * 100;
        return {
            used: usedMemory,
            total: totalMemory,
            percentage,
        };
    }
    checkConnections() {
        return {
            total: this.connectionManager.getTotalConnections(),
            byTenant: this.connectionManager.getConnectionsByTenant(),
        };
    }
}
exports.HealthChecker = HealthChecker;
