"use strict";
/**
 * Health Check Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = healthRoutes;
const registry_js_1 = require("../providers/registry.js");
const time_js_1 = require("../utils/time.js");
const startTime = Date.now();
async function healthRoutes(fastify) {
    /**
     * Basic health check
     */
    fastify.get('/health', async (request, reply) => {
        const response = {
            status: 'healthy',
            timestamp: (0, time_js_1.now)(),
            version: '1.0.0',
            uptime: Date.now() - startTime,
        };
        return reply.status(200).send(response);
    });
    /**
     * Readiness check
     */
    fastify.get('/health/ready', async (request, reply) => {
        const providerHealth = await registry_js_1.providerRegistry.checkAllProvidersHealth();
        const allHealthy = Array.from(providerHealth.values()).every((h) => h.status === 'available' || h.status === 'degraded');
        const response = {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: (0, time_js_1.now)(),
            version: '1.0.0',
            uptime: Date.now() - startTime,
            checks: {
                providers: Object.fromEntries(Array.from(providerHealth.entries()).map(([k, v]) => [k, v.status])),
            },
        };
        return reply.status(allHealthy ? 200 : 503).send(response);
    });
    /**
     * Liveness check
     */
    fastify.get('/health/live', async (request, reply) => {
        const response = {
            status: 'healthy',
            timestamp: (0, time_js_1.now)(),
            version: '1.0.0',
            uptime: Date.now() - startTime,
        };
        return reply.status(200).send(response);
    });
    /**
     * Detailed health check
     */
    fastify.get('/health/detailed', async (request, reply) => {
        const providerHealth = await registry_js_1.providerRegistry.checkAllProvidersHealth();
        const checks = {
            providers: Object.fromEntries(providerHealth),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
        };
        const allHealthy = Array.from(providerHealth.values()).every((h) => h.status === 'available' || h.status === 'degraded');
        const response = {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: (0, time_js_1.now)(),
            version: '1.0.0',
            uptime: Date.now() - startTime,
            checks,
        };
        return reply.status(200).send(response);
    });
}
