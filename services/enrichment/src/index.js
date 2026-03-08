"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const redis_1 = require("redis");
const rateLimiter_js_1 = require("./rateLimiter.js");
const circuitBreaker_js_1 = require("./circuitBreaker.js");
const normalizer_js_1 = require("./normalizer.js");
const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
const quotaPath = path_1.default.resolve(__dirname, '../../../ops/enrichment/quota.json');
const breakerPath = path_1.default.resolve(__dirname, '../../../ops/enrichment/circuit-breaker.json');
const quotaConfig = JSON.parse((0, fs_1.readFileSync)(quotaPath, 'utf8'));
const breakerConfig = JSON.parse((0, fs_1.readFileSync)(breakerPath, 'utf8'));
const redis = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
await redis.connect();
const buckets = new Map();
const breakers = new Map();
const jobs = new Map();
for (const [provider, cfg] of Object.entries(quotaConfig)) {
    buckets.set(provider, new rateLimiter_js_1.TokenBucket(cfg.capacity, cfg.refillPerSecond));
}
for (const [provider, cfg] of Object.entries(breakerConfig)) {
    breakers.set(provider, new circuitBreaker_js_1.CircuitBreaker(cfg.failureThreshold, cfg.resetTimeoutMs));
}
/**
 * Signs a cache key using HMAC-SHA256 for security.
 * Prevents cache key tampering and ensures consistent key generation.
 *
 * @param key - The cache key to sign
 * @returns The hexadecimal HMAC signature of the key
 */
function signKey(key) {
    const secret = process.env.CACHE_SIGNING_KEY || 'dev';
    return crypto_1.default.createHmac('sha256', secret).update(key).digest('hex');
}
/**
 * Retrieves a value from the Redis cache.
 * Keys are signed for security before lookup.
 *
 * @param key - The cache key to retrieve
 * @returns The cached value if found, null otherwise
 */
async function getCache(key) {
    const v = await redis.get(signKey(key));
    return v ? JSON.parse(v) : null;
}
/**
 * Stores a value in the Redis cache with a 1-hour expiration.
 * Keys are signed for security before storage.
 *
 * @param key - The cache key to store under
 * @param value - The value to cache (will be JSON serialized)
 */
async function setCache(key, value) {
    await redis.set(signKey(key), JSON.stringify(value), { EX: 3600 });
}
/**
 * Executes a function with exponential backoff retry logic.
 * Useful for resilient external API calls that may experience transient failures.
 *
 * @template T - The return type of the function
 * @param fn - The async function to execute with retries
 * @param retries - Maximum number of retry attempts (default: 3)
 * @returns The result of the function
 * @throws The last error if all retry attempts fail
 */
async function fetchWithRetry(fn, retries = 3) {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        }
        catch (err) {
            if (attempt >= retries)
                throw err;
            await new Promise((r) => setTimeout(r, 2 ** attempt * 100));
            attempt += 1;
        }
    }
}
/**
 * Calls an external enrichment provider with rate limiting and circuit breaker protection.
 * Ensures compliance with provider API quotas and automatically opens circuit on repeated failures.
 *
 * @param provider - The name of the enrichment provider (must be configured in quota.json)
 * @param query - The query parameters to send to the provider
 * @returns Normalized enrichment data with source='live' indicator
 * @throws Error if provider is unknown, rate limit exceeded, or circuit is open
 */
async function callProvider(provider, query) {
    const bucket = buckets.get(provider);
    const breaker = breakers.get(provider);
    if (!bucket || !breaker)
        throw new Error('unknown provider');
    if (!bucket.take())
        throw new Error('rate limit exceeded');
    if (!breaker.canRequest())
        throw new Error('circuit open');
    try {
        // Placeholder for real provider call using env license keys
        const raw = { query };
        const normalized = (0, normalizer_js_1.normalize)(provider, raw);
        breaker.success();
        return { ...normalized, source: 'live' };
    }
    catch (e) {
        breaker.failure();
        throw e;
    }
}
/**
 * Processes an enrichment job asynchronously.
 * For each item in the job, checks cache first, then calls the provider if needed.
 * Uses retry logic for resilience and caches results for future requests.
 *
 * @param jobId - The unique identifier for this job
 * @param body - Array of enrichment items with provider and query properties
 */
async function processJob(jobId, body) {
    const results = [];
    for (const item of body || []) {
        const cacheKey = `${item.provider}:${item.query}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            results.push({ ...cached, source: 'cache' });
            continue;
        }
        const res = await fetchWithRetry(() => callProvider(item.provider, item.query));
        await setCache(cacheKey, res);
        results.push(res);
    }
    jobs.set(jobId, { status: 'completed', result: results });
    // TODO: emit to enrichment.results.v1
}
const server = http_1.default.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/enrich') {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });
        req.on('end', () => {
            const jobId = crypto_1.default.randomUUID();
            jobs.set(jobId, { status: 'running', result: [] });
            processJob(jobId, JSON.parse(data).items).catch(() => {
                jobs.set(jobId, { status: 'error', result: [] });
            });
            res.writeHead(202, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ jobId }));
        });
        return;
    }
    const match = req.url?.match(/^\/enrich\/(.+)$/);
    if (req.method === 'GET' && match) {
        const job = jobs.get(match[1]);
        if (!job) {
            res.writeHead(404);
            res.end();
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(job));
        return;
    }
    res.writeHead(404);
    res.end();
});
if (process.env.NODE_ENV !== 'test') {
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    server.listen(port);
}
exports.default = server;
