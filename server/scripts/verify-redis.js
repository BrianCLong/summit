"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_js_1 = require("../src/cache/redis.js");
const index_js_1 = __importDefault(require("../src/config/index.js"));
async function verify() {
    console.log('Starting Redis Verification...');
    console.log('Config:', JSON.stringify(index_js_1.default.redis, null, 2));
    try {
        const redis = redis_js_1.RedisService.getInstance();
        // Ping test
        console.log('Pinging Redis...');
        const pong = await redis.ping();
        console.log('Ping result:', pong);
        if (pong !== 'PONG')
            throw new Error('Ping failed');
        // Write test
        const testKey = 'verify:test:' + Date.now();
        console.log(`Writing key ${testKey}...`);
        await redis.set(testKey, 'verification_value', 60);
        // Read test
        console.log(`Reading key ${testKey}...`);
        const val = await redis.get(testKey);
        console.log('Read result:', val);
        if (val !== 'verification_value')
            throw new Error('Read failed or value mismatch');
        // Clean up
        await redis.del(testKey);
        // Cluster check
        if (index_js_1.default.redis.useCluster) {
            console.log('Verifying Cluster Mode...');
            const client = redis.getClient();
            if (client.constructor.name !== 'Cluster') {
                throw new Error('Configured for cluster but client is not Cluster instance');
            }
            // @ts-ignore
            const nodes = client.nodes();
            console.log(`Cluster has ${nodes.length} nodes known to client.`);
        }
        console.log('✅ Redis Verification Successful');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Redis Verification Failed:', error);
        process.exit(1);
    }
}
verify();
