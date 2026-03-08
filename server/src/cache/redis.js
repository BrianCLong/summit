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
exports.RedisService = void 0;
// @ts-nocheck
const ioredis_1 = __importStar(require("ioredis"));
const index_js_1 = __importDefault(require("../config/index.js"));
const logger_js_1 = require("../config/logger.js");
const zlib_1 = __importDefault(require("zlib"));
const util_1 = require("util");
const gzip = (0, util_1.promisify)(zlib_1.default.gzip);
const gunzip = (0, util_1.promisify)(zlib_1.default.gunzip);
const COMPRESSION_THRESHOLD = 1024; // 1KB
const COMPRESSION_PREFIX = '__GZIP__:';
class RedisService {
    client;
    subscriber;
    static instance;
    static getInstance() {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }
    constructor() {
        const redisConfig = index_js_1.default.redis || {};
        const useCluster = redisConfig.useCluster;
        const password = redisConfig.password;
        const tls = redisConfig.tls ? {} : undefined;
        // Common options for robustness
        const commonOptions = {
            password: password,
            connectTimeout: 10000, // 10s
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            tls: tls,
            lazyConnect: true // Don't connect immediately in constructor
        };
        if (useCluster) {
            const nodes = (redisConfig.clusterNodes || []).map((n) => ({
                host: n.host,
                port: n.port
            }));
            if (nodes.length === 0) {
                // Fallback to main host if no cluster nodes specified but useCluster is true
                nodes.push({
                    host: redisConfig.host || 'localhost',
                    port: redisConfig.port || 6379
                });
            }
            const clusterOptions = {
                redisOptions: commonOptions,
                dnsLookup: (address, callback) => callback(null, address),
                scaleReads: 'slave', // Read from slaves if possible
            };
            logger_js_1.logger.info({ nodes }, 'Initializing Redis Cluster');
            this.client = new ioredis_1.Cluster(nodes, clusterOptions);
            this.subscriber = new ioredis_1.Cluster(nodes, clusterOptions);
        }
        else {
            const host = redisConfig.host || 'localhost';
            const port = redisConfig.port || 6379;
            const db = redisConfig.db || 0;
            logger_js_1.logger.info({ host, port, db }, 'Initializing Redis Standalone');
            this.client = new ioredis_1.default({
                ...commonOptions,
                host,
                port,
                db
            });
            this.subscriber = new ioredis_1.default({
                ...commonOptions,
                host,
                port,
                db
            });
        }
        // Error handling
        this.handleErrors(this.client, 'Client');
        this.handleErrors(this.subscriber, 'Subscriber');
    }
    handleErrors(client, name) {
        client.on('error', (err) => {
            logger_js_1.logger.error({ err, client: name }, 'Redis connection error');
        });
        client.on('connect', () => {
            logger_js_1.logger.info({ client: name }, 'Redis connected');
        });
    }
    getClient() {
        return this.client;
    }
    async publish(channel, message) {
        return this.client.publish(channel, message);
    }
    async hgetall(key) {
        return this.client.hgetall(key);
    }
    async hincrby(key, field, increment) {
        return this.client.hincrby(key, field, increment);
    }
    async hdel(key, field) {
        return this.client.hdel(key, field);
    }
    async get(key) {
        const value = await this.client.get(key);
        if (!value)
            return null;
        if (value.startsWith(COMPRESSION_PREFIX)) {
            try {
                const buffer = Buffer.from(value.slice(COMPRESSION_PREFIX.length), 'base64');
                const decompressed = await gunzip(buffer);
                return decompressed.toString();
            }
            catch (e) {
                logger_js_1.logger.error({ key, error: e }, 'Failed to decompress value');
                return null;
            }
        }
        return value;
    }
    async setex(key, seconds, value) {
        // Reuse set logic for compression
        const result = await this.set(key, value, seconds);
        return result || 'OK';
    }
    async ping() {
        return this.client.ping();
    }
    async close() {
        await Promise.all([this.client.quit(), this.subscriber.quit()]);
    }
    async del(key) {
        return this.client.del(key);
    }
    async set(key, value, ttlSeconds) {
        let finalValue = value;
        if (value && value.length > COMPRESSION_THRESHOLD) {
            try {
                const buffer = await gzip(value);
                finalValue = COMPRESSION_PREFIX + buffer.toString('base64');
            }
            catch (e) {
                logger_js_1.logger.warn({ key, error: e }, 'Failed to compress value, storing uncompressed');
            }
        }
        if (ttlSeconds !== undefined) {
            return this.client.set(key, finalValue, 'EX', ttlSeconds);
        }
        return this.client.set(key, finalValue);
    }
    async getKeysByPattern(pattern) {
        return this.client.keys(pattern);
    }
}
exports.RedisService = RedisService;
