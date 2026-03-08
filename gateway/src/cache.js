"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
const redis_1 = require("redis");
let client = null;
function getClient() {
    if (!client) {
        client = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
        client.on('error', (err) => console.error('Redis error', err));
        client.connect().catch(() => { });
    }
    return client;
}
async function cacheGet(key) {
    return getClient().get(key);
}
async function cacheSet(key, value, ttlSeconds) {
    await getClient().set(key, value, { EX: ttlSeconds });
}
