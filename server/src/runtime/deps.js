"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.neo4jDriver = exports.pgPool = void 0;
exports.initDeps = initDeps;
exports.closeDeps = closeDeps;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const neo4j_js_1 = require("../graph/neo4j.js");
const config_js_1 = require("../config.js");
const breakers_js_1 = require("./breakers.js");
let pgPool = null;
exports.pgPool = pgPool;
let neo4jDriver = null;
exports.neo4jDriver = neo4jDriver;
let redisClient = null;
exports.redisClient = redisClient;
// Connection functions
const connectPostgres = async () => {
    if (!pgPool) {
        exports.pgPool = pgPool = new pg_1.Pool({ connectionString: config_js_1.cfg.DATABASE_URL });
    }
    await pgPool.query('SELECT 1');
    console.log('[DEPS] PostgreSQL connected');
};
const connectNeo4j = async () => {
    if (!neo4jDriver) {
        exports.neo4jDriver = neo4jDriver = (0, neo4j_js_1.getDriver)();
    }
    await neo4jDriver.verifyConnectivity();
    console.log('[DEPS] Neo4j connected');
};
const connectRedis = async () => {
    if (!redisClient) {
        exports.redisClient = redisClient = new ioredis_1.default(config_js_1.dbUrls.redis);
    }
    await redisClient.ping();
    console.log('[DEPS] Redis connected');
};
// Circuit breakers
const pgBreaker = (0, breakers_js_1.breaker)(connectPostgres, 'postgres', { timeout: 5000 });
const neoBreaker = (0, breakers_js_1.breaker)(connectNeo4j, 'neo4j', { timeout: 5000 });
const redisBreaker = (0, breakers_js_1.breaker)(connectRedis, 'redis', { timeout: 3000 });
async function initDeps() {
    console.log('[DEPS] Initializing database connections...');
    try {
        await Promise.all([
            pgBreaker.fire(),
            neoBreaker.fire(),
            redisBreaker.fire(),
        ]);
        console.log('[DEPS] All dependencies initialized successfully');
    }
    catch (error) {
        console.error('[DEPS] Failed to initialize dependencies:', error);
        throw error;
    }
}
async function closeDeps() {
    console.log('[DEPS] Closing database connections...');
    const promises = [];
    if (pgPool) {
        promises.push(pgPool.end().then(() => console.log('[DEPS] PostgreSQL closed')));
    }
    if (neo4jDriver) {
        promises.push(neo4jDriver.close().then(() => console.log('[DEPS] Neo4j closed')));
    }
    if (redisClient) {
        promises.push(redisClient.disconnect().then(() => console.log('[DEPS] Redis closed')));
    }
    await Promise.all(promises);
}
