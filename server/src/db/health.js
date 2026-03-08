"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDependencyHealth = getDependencyHealth;
const neo4j_js_1 = require("./neo4j.js");
const postgres_js_1 = require("./postgres.js");
const redis_js_1 = require("./redis.js");
async function getDependencyHealth() {
    const neo4j = await (0, neo4j_js_1.checkNeo4jHealth)();
    const postgres = await getPostgresHealth();
    const redis = await (0, redis_js_1.getRedisHealth)();
    const redisCircuitStatus = redis.circuitState === 'closed' ? 'healthy' : 'degraded';
    const status = coalesceOverallStatus([
        neo4j.healthy ? 'healthy' : 'unhealthy',
        postgres.status,
        redis.healthy ? 'healthy' : 'unhealthy',
        redisCircuitStatus,
    ]);
    const errors = [];
    if (!neo4j.healthy && neo4j.lastError) {
        errors.push({ service: 'neo4j', message: neo4j.lastError });
    }
    if (postgres.lastError) {
        errors.push({ service: 'postgres', message: postgres.lastError });
    }
    if (!redis.healthy && redis.lastError) {
        errors.push({ service: 'redis', message: redis.lastError });
    }
    return {
        status,
        timestamp: new Date().toISOString(),
        services: {
            neo4j: { ...neo4j, status: neo4j.healthy ? 'healthy' : 'unhealthy' },
            postgres,
            redis: { ...redis, status: redis.healthy ? 'healthy' : 'unhealthy' },
        },
        errors,
    };
}
async function getPostgresHealth() {
    let lastError;
    let status = 'healthy';
    let pools = [];
    try {
        const pool = (0, postgres_js_1.getPostgresPool)();
        pools = await pool.healthCheck();
    }
    catch (error) {
        lastError = error.message;
        status = 'unhealthy';
        return { status, pools, lastError };
    }
    const unhealthyPools = pools.filter((p) => !p.healthy);
    const openCircuits = pools.filter((p) => p.circuitState !== 'closed');
    if (unhealthyPools.length > 0 || openCircuits.length > 0) {
        status = unhealthyPools.length === pools.length ? 'unhealthy' : 'degraded';
        lastError = unhealthyPools[0]?.lastError ?? openCircuits[0]?.lastError;
    }
    return { status, pools, lastError };
}
function coalesceOverallStatus(statuses) {
    if (statuses.includes('unhealthy')) {
        return 'unhealthy';
    }
    if (statuses.includes('degraded')) {
        return 'degraded';
    }
    return 'healthy';
}
