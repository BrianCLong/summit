"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyStartupDependencies = verifyStartupDependencies;
const postgres_js_1 = require("../db/postgres.js");
const redis_js_1 = require("../db/redis.js");
const neo4j_js_1 = require("../db/neo4j.js");
const logger_js_1 = require("./logger.js");
async function verifyStartupDependencies(options = {}) {
    const { requireRedis = true } = options;
    const missingEnv = [];
    const required = [
        'POSTGRES_HOST',
        'POSTGRES_USER',
        'POSTGRES_PASSWORD',
        'POSTGRES_DB',
        'NEO4J_URI',
        'NEO4J_USERNAME',
        'NEO4J_PASSWORD',
    ];
    required.forEach((key) => {
        if (!process.env[key]) {
            missingEnv.push(key);
        }
    });
    if (requireRedis && !process.env.REDIS_URL && !process.env.REDIS_HOST) {
        missingEnv.push('REDIS_URL');
    }
    if (missingEnv.length > 0) {
        const message = `Missing required environment for startup: ${missingEnv.join(', ')}`;
        logger_js_1.logger.error(message);
        throw new Error(message);
    }
    const failures = [];
    try {
        await (0, neo4j_js_1.initializeNeo4jDriver)();
        await (0, neo4j_js_1.getNeo4jDriver)().verifyConnectivity();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Neo4j error';
        failures.push(`neo4j: ${message}`);
        logger_js_1.logger.error({ error }, 'Neo4j readiness check failed');
    }
    try {
        const pool = (0, postgres_js_1.getPostgresPool)();
        await pool.query('SELECT 1');
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Postgres error';
        failures.push(`postgres: ${message}`);
        logger_js_1.logger.error({ error }, 'Postgres readiness check failed');
    }
    if (requireRedis) {
        try {
            const redis = (0, redis_js_1.getRedisClient)();
            await redis.ping();
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown Redis error';
            failures.push(`redis: ${message}`);
            logger_js_1.logger.error({ error }, 'Redis readiness check failed');
        }
    }
    if (failures.length > 0) {
        throw new Error(`Startup readiness failed: ${failures.join('; ')}`);
    }
    logger_js_1.logger.info('Core dependencies verified for startup');
}
