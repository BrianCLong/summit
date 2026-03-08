"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConductorCache = void 0;
// import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
const ioredis_1 = __importDefault(require("ioredis"));
const cacheMetrics_js_1 = require("../metrics/cacheMetrics.js");
const crypto_1 = require("crypto");
function redisFromEnv() {
    if (process.env.REDIS_URL)
        return new ioredis_1.default(process.env.REDIS_URL, {
            name: process.env.REDIS_CLIENT_NAME || 'maestro-cache',
        });
    const host = process.env.REDIS_HOST || 'redis';
    const port = Number(process.env.REDIS_PORT || 6379);
    const db = Number(process.env.REDIS_DB || 2);
    const tls = process.env.REDIS_TLS === 'true'
        ? { rejectUnauthorized: false }
        : undefined;
    const password = process.env.REDIS_PASSWORD || undefined;
    return new ioredis_1.default({
        host,
        port,
        db,
        password,
        tls,
        name: process.env.REDIS_CLIENT_NAME || 'maestro-cache',
    });
}
const redis = redisFromEnv();
// function s3FromEnv() {
//   const region = process.env.AWS_REGION || 'us-east-1';
//   const endpoint = process.env.S3_ENDPOINT || undefined;
//   const forcePathStyle = !!endpoint;
//   const creds = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
//     ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
//     : undefined;
//   return new S3Client({ region, endpoint, forcePathStyle, credentials: creds as any });
// }
// const s3 = s3FromEnv();
class ConductorCache {
    bucket;
    indexPrefix;
    indexTtl;
    negTtl;
    constructor(opts = {}) {
        this.bucket =
            opts.bucket ||
                process.env.CACHE_BUCKET ||
                process.env.S3_BUCKET ||
                'intelgraph-cache';
        this.indexPrefix = (opts.indexPrefix ||
            process.env.CACHE_INDEX_PREFIX ||
            'cache:index:');
        this.indexTtl = Number(opts.indexTtlSec || process.env.CACHE_INDEX_TTL_SEC || 86400);
        this.negTtl = Number(opts.negTtlSec || process.env.CACHE_NEG_TTL_SEC || 300);
    }
    /**
     * Normalizes a cache key to ensure consistent lookups.
     * Sorts query params (if key looks like URL) or JSON keys, and hashes if too long.
     */
    normalizeKey(key) {
        // 1. If key is JSON-like, parse and sort keys
        try {
            if (key.trim().startsWith('{') || key.trim().startsWith('[')) {
                const obj = JSON.parse(key);
                // Canonical JSON stringify
                const canonical = JSON.stringify(obj, Object.keys(obj).sort());
                return (0, crypto_1.createHash)('sha256').update(canonical).digest('hex');
            }
        }
        catch {
            // Not JSON
        }
        // 2. If it's a long string, hash it
        if (key.length > 256) {
            return (0, crypto_1.createHash)('sha256').update(key).digest('hex');
        }
        return key;
    }
    indexKey(key) {
        return `${this.indexPrefix}${this.normalizeKey(key)}`;
    }
    async lookup(key, tenant) {
        const idxKey = this.indexKey(key);
        const head = await redis.get(idxKey);
        if (head === '__MISS__')
            return null;
        let meta = null;
        let s3key = null;
        if (head) {
            try {
                const j = JSON.parse(head);
                meta = j.meta;
                s3key = j.s3key;
            }
            catch {
                /* ignore */
            }
        }
        if (!s3key)
            return null;
        // try {
        //   await s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: s3key }));
        //   const obj = await s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: s3key }));
        //   const body = await streamToBuffer(obj.Body as any);
        //   recHit('redis+s3', 'get', tenant);
        //   return { meta, body };
        // } catch {
        //   await redis.set(idxKey, '__MISS__', 'EX', this.negTtl);
        //   recMiss('redis+s3', 'get', tenant);
        //   return null;
        // }
        return null;
    }
    async write(key, body, meta, ttlSec, tenant) {
        const normKey = this.normalizeKey(key);
        const s3key = `cache/${normKey}.bin`;
        // await s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: s3key, Body: body }));
        await redis.set(this.indexKey(key), JSON.stringify({ s3key, meta }), 'EX', ttlSec ? Number(ttlSec) : this.indexTtl);
        (0, cacheMetrics_js_1.recSet)('redis+s3', 'set', tenant);
    }
}
exports.ConductorCache = ConductorCache;
function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}
