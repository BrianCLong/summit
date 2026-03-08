"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectNeo4j = connectNeo4j;
exports.connectPostgres = connectPostgres;
exports.connectRedis = connectRedis;
exports.getNeo4jDriver = getNeo4jDriver;
exports.getPostgresPool = getPostgresPool;
exports.getRedisClient = getRedisClient;
exports.closeConnections = closeConnections;
// @ts-nocheck
const index_js_1 = __importDefault(require("./index.js"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// @ts-ignore
const ioredis_1 = __importDefault(require("ioredis"));
// Handle optional Redis dependency gracefully
let Redis = ioredis_1.default;
const postgres_js_1 = require("../db/postgres.js");
const neo4j_js_1 = require("../db/neo4j.js");
let neo4jDriver = null;
let postgresPool = null;
let redisClient = null;
let neo4jMigrationsCompleted = false;
let neo4jReadyHookRegistered = false;
// Neo4j Connection
async function connectNeo4j() {
    if (neo4jDriver) {
        return neo4jDriver;
    }
    registerNeo4jReadyHook();
    try {
        await (0, neo4j_js_1.initializeNeo4jDriver)();
    }
    catch (error) {
        logger_js_1.default.error('❌ Failed to establish Neo4j connectivity:', error);
        if (index_js_1.default.requireRealDbs) {
            throw error;
        }
    }
    neo4jDriver = (0, neo4j_js_1.getNeo4jDriver)();
    if ((0, neo4j_js_1.isNeo4jMockMode)()) {
        logger_js_1.default.warn('Neo4j unavailable - operating in mock mode for development.');
        neo4jMigrationsCompleted = false;
        return neo4jDriver;
    }
    const session = neo4jDriver.session();
    try {
        await session.run('RETURN 1');
    }
    finally {
        await session.close();
    }
    if (!neo4jMigrationsCompleted) {
        await runNeo4jMigrations();
        neo4jMigrationsCompleted = true;
    }
    logger_js_1.default.info('✅ Connected to Neo4j');
    return neo4jDriver;
}
async function runNeo4jMigrations() {
    if ((0, neo4j_js_1.isNeo4jMockMode)()) {
        logger_js_1.default.debug('Skipping Neo4j migrations in mock mode.');
        return;
    }
    try {
        // Import migration manager lazily to avoid circular dependencies
        const { migrationManager } = await Promise.resolve().then(() => __importStar(require('../db/migrations/index.js')));
        await migrationManager.migrate();
        logger_js_1.default.info('Neo4j migrations completed successfully');
    }
    catch (error) {
        logger_js_1.default.warn('Migration system not available, falling back to legacy constraints');
        await createNeo4jConstraints();
    }
}
function registerNeo4jReadyHook() {
    if (neo4jReadyHookRegistered) {
        return;
    }
    neo4jReadyHookRegistered = true;
    (0, neo4j_js_1.onNeo4jDriverReady)(async ({ reason }) => {
        if ((0, neo4j_js_1.isNeo4jMockMode)()) {
            neo4jMigrationsCompleted = false;
            return;
        }
        if (reason === 'reconnected' || !neo4jMigrationsCompleted) {
            try {
                await runNeo4jMigrations();
                neo4jMigrationsCompleted = true;
                if (reason === 'reconnected') {
                    logger_js_1.default.info('Neo4j migrations reapplied after driver reconnection.');
                }
            }
            catch (error) {
                logger_js_1.default.error('Failed to run Neo4j migrations after driver recovery:', error);
            }
        }
    });
}
async function createNeo4jConstraints() {
    if (!neo4jDriver)
        throw new Error('Neo4j driver not initialized');
    if ((0, neo4j_js_1.isNeo4jMockMode)()) {
        logger_js_1.default.debug('Skipping Neo4j constraint creation in mock mode.');
        return;
    }
    const session = neo4jDriver.session();
    try {
        const constraints = [
            'CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
            'CREATE CONSTRAINT entity_uuid IF NOT EXISTS FOR (e:Entity) REQUIRE e.uuid IS UNIQUE',
            'CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
            'CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',
            'CREATE CONSTRAINT investigation_id IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE',
            'CREATE CONSTRAINT relationship_id IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() REQUIRE r.id IS UNIQUE',
        ];
        for (const constraint of constraints) {
            try {
                await session.run(constraint);
            }
            catch (error) {
                const err = error;
                if (!err.message.includes('already exists')) {
                    logger_js_1.default.warn('Failed to create constraint:', constraint, err.message);
                }
            }
        }
        const indexes = [
            'CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type)',
            'CREATE INDEX entity_label IF NOT EXISTS FOR (e:Entity) ON (e.label)',
            'CREATE INDEX entity_created IF NOT EXISTS FOR (e:Entity) ON (e.createdAt)',
            'CREATE INDEX investigation_status IF NOT EXISTS FOR (i:Investigation) ON (i.status)',
            'CREATE INDEX user_username IF NOT EXISTS FOR (u:User) ON (u.username)',
            'CREATE FULLTEXT INDEX entity_search IF NOT EXISTS FOR (e:Entity) ON EACH [e.label, e.description]',
            'CREATE FULLTEXT INDEX investigation_search IF NOT EXISTS FOR (i:Investigation) ON EACH [i.title, i.description]',
        ];
        for (const index of indexes) {
            try {
                await session.run(index);
            }
            catch (error) {
                const err = error;
                if (!err.message.includes('already exists')) {
                    logger_js_1.default.warn('Failed to create index:', index, err.message);
                }
            }
        }
        logger_js_1.default.info('Neo4j constraints and indexes created');
    }
    catch (error) {
        logger_js_1.default.error('Failed to create Neo4j constraints:', error);
    }
    finally {
        await session.close();
    }
}
// PostgreSQL Connection
async function connectPostgres() {
    try {
        postgresPool = (0, postgres_js_1.getPostgresPool)();
        const client = await postgresPool.connect();
        try {
            await client.query('SELECT NOW()');
        }
        finally {
            client.release();
        }
        // Tables are now managed by migrations (npm run db:migrate)
        // await createPostgresTables();
        logger_js_1.default.info('✅ Connected to PostgreSQL');
        return postgresPool;
    }
    catch (error) {
        logger_js_1.default.error('❌ Failed to connect to PostgreSQL:', error);
        throw error;
    }
}
// Redis Connection
async function connectRedis() {
    try {
        const redisConfig = {
            host: index_js_1.default.redis.host,
            port: index_js_1.default.redis.port,
            db: index_js_1.default.redis.db,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            connectTimeout: 10000,
            lazyConnect: true,
            keepAlive: 30000,
            family: 4,
            enableOfflineQueue: false,
            reconnectOnError: (err) => {
                const targetError = 'READONLY';
                return err.message.includes(targetError);
            },
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        };
        // Add password if provided
        if (index_js_1.default.redis.password) {
            redisConfig.password = index_js_1.default.redis.password;
        }
        redisClient = new Redis(redisConfig);
        redisClient.on('error', (error) => {
            logger_js_1.default.error('Redis error:', error.message);
        });
        redisClient.on('connect', () => {
            logger_js_1.default.info('Redis connected');
        });
        redisClient.on('ready', () => {
            logger_js_1.default.info('✅ Redis ready');
        });
        redisClient.on('reconnecting', () => {
            logger_js_1.default.info('Redis reconnecting...');
        });
        redisClient.on('end', () => {
            logger_js_1.default.warn('Redis connection ended');
        });
        await redisClient.connect();
        await redisClient.ping();
        logger_js_1.default.info('✅ Connected to Redis');
        return redisClient;
    }
    catch (error) {
        const err = error;
        logger_js_1.default.error('❌ Failed to connect to Redis:', err.message);
        // Don't throw error to allow server to start without Redis if needed
        logger_js_1.default.warn('Server will continue without Redis caching');
        return null;
    }
}
function getNeo4jDriver() {
    return (0, neo4j_js_1.getNeo4jDriver)();
}
function getPostgresPool() {
    if (!postgresPool) {
        postgresPool = (0, postgres_js_1.getPostgresPool)();
    }
    return postgresPool;
}
function getRedisClient() {
    if (!redisClient) {
        logger_js_1.default.warn('Redis client not available');
        return null;
    }
    return redisClient;
}
async function closeConnections() {
    if (neo4jDriver) {
        await neo4jDriver.close();
        logger_js_1.default.info('Neo4j connection closed');
        neo4jDriver = null;
        neo4jMigrationsCompleted = false;
    }
    if (postgresPool) {
        await (0, postgres_js_1.closePostgresPool)();
        postgresPool = null;
        logger_js_1.default.info('PostgreSQL connection closed');
    }
    if (redisClient) {
        redisClient.disconnect();
        logger_js_1.default.info('Redis connection closed');
    }
}
