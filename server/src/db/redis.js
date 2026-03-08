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
exports.getRedisClient = getRedisClient;
exports.redisHealthCheck = redisHealthCheck;
exports.closeRedisClient = closeRedisClient;
// @ts-nocheck
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv = __importStar(require("dotenv"));
const pino_1 = __importDefault(require("pino"));
dotenv.config();
const logger = pino_1.default();
const comprehensive_telemetry_js_1 = require("../lib/telemetry/comprehensive-telemetry.js");
// Map to store multiple Redis clients
const clients = new Map();
function getConfig(name) {
    const prefix = name === 'default' ? 'REDIS' : `REDIS_${name.toUpperCase()}`;
    // Fallback to default REDIS_* vars if specific ones aren't set
    const getVar = (suffix) => process.env[`${prefix}_${suffix}`] || process.env[`REDIS_${suffix}`];
    const host = getVar('HOST') || 'redis';
    const port = parseInt(getVar('PORT') || '6379', 10);
    const useCluster = getVar('USE_CLUSTER') === 'true';
    const clusterNodes = getVar('CLUSTER_NODES') || '';
    const tlsEnabled = getVar('TLS_ENABLED') === 'true';
    let password = getVar('PASSWORD');
    if (process.env.NODE_ENV === 'production' &&
        (!password || password === 'devpassword')) {
        throw new Error(`Security Error: REDIS_PASSWORD (for ${name}) must be set and cannot be "devpassword" in production`);
    }
    return {
        host,
        port,
        password: password || 'devpassword',
        useCluster,
        clusterNodes,
        tlsEnabled
    };
}
function getRedisClient(name = 'default') {
    if (!clients.has(name)) {
        try {
            const config = getConfig(name);
            let client;
            if (config.useCluster) {
                if (!config.clusterNodes) {
                    throw new Error(`Redis Cluster enabled for ${name} but CLUSTER_NODES is not defined`);
                }
                const nodes = config.clusterNodes.split(',').map((node) => {
                    const [host, port] = node.split(':');
                    return { host, port: parseInt(port, 10) };
                });
                logger.info({ nodes, name }, 'Initializing Redis Cluster');
                client = new ioredis_1.default.Cluster(nodes, {
                    redisOptions: {
                        password: config.password,
                        tls: config.tlsEnabled ? {} : undefined,
                        connectTimeout: 10000,
                        maxRetriesPerRequest: null,
                    },
                    scaleReads: 'slave',
                    clusterRetryStrategy: (times) => {
                        const delay = Math.min(times * 100, 3000);
                        return delay;
                    },
                    enableOfflineQueue: true,
                });
            }
            else {
                logger.info({ host: config.host, port: config.port, name }, 'Initializing Redis Client');
                client = new ioredis_1.default({
                    host: config.host,
                    port: config.port,
                    password: config.password,
                    tls: config.tlsEnabled ? {} : undefined,
                    connectTimeout: 10000,
                    lazyConnect: true,
                    retryStrategy: (times) => {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    },
                    maxRetriesPerRequest: null,
                });
            }
            client.on('connect', () => logger.info(`Redis client '${name}' connected.`));
            client.on('error', (err) => {
                logger.warn(`Redis connection '${name}' failed - using mock responses. Error: ${err.message}`);
                // Replace the failed client in the map with a mock
                // Note: This replaces the reference for future calls, but existing references might be broken?
                // Actually, we usually just return the mock here.
                // But since we are assigning to 'client' which is local, we need to update the map?
                // The pattern in the original code was: redisClient = createMock...
                clients.set(name, createMockRedisClient(name));
            });
            // Attach Telemetry
            const originalGet = client.get.bind(client);
            client.get = async (key) => {
                const value = await originalGet(key);
                if (value) {
                    comprehensive_telemetry_js_1.telemetry.subsystems.cache.hits.add(1);
                }
                else {
                    comprehensive_telemetry_js_1.telemetry.subsystems.cache.misses.add(1);
                }
                return value;
            };
            const originalSet = client.set.bind(client);
            client.set = async (key, value) => {
                comprehensive_telemetry_js_1.telemetry.subsystems.cache.sets.add(1);
                return await originalSet(key, value);
            };
            const originalDel = client.del.bind(client);
            client.del = (async (...keys) => {
                comprehensive_telemetry_js_1.telemetry.subsystems.cache.dels.add(1);
                return await originalDel(...keys);
            });
            clients.set(name, client);
        }
        catch (error) {
            logger.warn(`Redis initialization for '${name}' failed - using development mode. Error: ${error.message}`);
            clients.set(name, createMockRedisClient(name));
        }
    }
    return clients.get(name);
}
function createMockRedisClient(name) {
    return {
        get: async (key) => {
            logger.debug(`Mock Redis (${name}) GET: Key: ${key}`);
            return null;
        },
        set: async (key, value, ...args) => {
            logger.debug(`Mock Redis (${name}) SET: Key: ${key}, Value: ${value}`);
            return 'OK';
        },
        del: async (...keys) => {
            logger.debug(`Mock Redis (${name}) DEL: Keys: ${keys.join(', ')}`);
            return keys.length;
        },
        exists: async (...keys) => {
            logger.debug(`Mock Redis (${name}) EXISTS: Keys: ${keys.join(', ')}`);
            return 0;
        },
        expire: async (key, seconds) => {
            logger.debug(`Mock Redis (${name}) EXPIRE: Key: ${key}, Seconds: ${seconds}`);
            return 1;
        },
        quit: async () => { },
        on: () => { },
        connect: async () => { },
        options: { keyPrefix: 'summit:' },
        duplicate: () => createMockRedisClient(name),
    };
}
async function redisHealthCheck() {
    // Check default client at least
    const defaultClient = clients.get('default');
    if (!defaultClient)
        return false;
    try {
        await defaultClient.ping();
        return true;
    }
    catch {
        return false;
    }
}
async function closeRedisClient() {
    for (const [name, client] of clients.entries()) {
        if (client) {
            await client.quit();
            logger.info(`Redis client '${name}' closed.`);
        }
    }
    clients.clear();
}
