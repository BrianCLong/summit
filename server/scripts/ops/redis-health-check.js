"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const perf_hooks_1 = require("perf_hooks");
async function main() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD;
    console.log(`Connecting to Redis at ${host}:${port}...`);
    const redis = new ioredis_1.default({
        host,
        port,
        password,
        connectTimeout: 5000,
        retryStrategy: () => null // Don't retry indefinitely
    });
    redis.on('error', (err) => {
        // Suppress unhandled error events during connection
        console.error('Redis connection error:', err.message);
    });
    try {
        // 1. Connectivity
        const startPing = perf_hooks_1.performance.now();
        const ping = await redis.ping();
        const endPing = perf_hooks_1.performance.now();
        if (ping !== 'PONG')
            throw new Error(`Unexpected PING response: ${ping}`);
        console.log(`✅ PING successful (${(endPing - startPing).toFixed(2)}ms)`);
        // 2. Read/Write
        const key = `health-check-${Date.now()}`;
        const value = 'ok';
        const startWrite = perf_hooks_1.performance.now();
        await redis.set(key, value, 'EX', 10);
        const endWrite = perf_hooks_1.performance.now();
        console.log(`✅ WRITE successful (${(endWrite - startWrite).toFixed(2)}ms)`);
        const startRead = perf_hooks_1.performance.now();
        const result = await redis.get(key);
        const endRead = perf_hooks_1.performance.now();
        if (result !== value)
            throw new Error(`Read mismatch: expected ${value}, got ${result}`);
        console.log(`✅ READ successful (${(endRead - startRead).toFixed(2)}ms)`);
        console.log('Redis Health Check: PASSED');
        process.exit(0);
    }
    catch (error) {
        console.error('Redis Health Check: FAILED');
        console.error(error.message);
        process.exit(1);
    }
    finally {
        redis.disconnect();
    }
}
main();
