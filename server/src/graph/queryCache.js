"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeQuery = normalizeQuery;
exports.stableHash = stableHash;
exports.buildGraphCacheKey = buildGraphCacheKey;
exports.runWithGraphQueryCache = runWithGraphQueryCache;
exports.invalidateGraphQueryCache = invalidateGraphQueryCache;
exports.recordCacheBypass = recordCacheBypass;
const node_crypto_1 = __importDefault(require("node:crypto"));
const responseCache_js_1 = require("../cache/responseCache.js");
const cacheMetrics_js_1 = require("../metrics/cacheMetrics.js");
const DEFAULT_CACHE_TTL_SECONDS = parseInt(process.env.GRAPH_QUERY_CACHE_TTL || '15', 10);
function normalizeQuery(query) {
    return query.replace(/\s+/g, ' ').trim();
}
function stableHash(input) {
    return node_crypto_1.default.createHash('sha1').update(stableStringify(input)).digest('hex');
}
function stableStringify(value) {
    if (value === null || value === undefined)
        return String(value);
    if (typeof value !== 'object')
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map((v) => stableStringify(v)).join(',')}]`;
    const obj = value;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}
function buildGraphCacheKey(ctx) {
    const tenantId = ctx.tenantId || 'global';
    const caseId = ctx.caseId || 'global';
    const permissionsHash = ctx.permissionsHash || 'open';
    const normalizedQuery = normalizeQuery(ctx.query);
    const paramsHash = stableHash(ctx.params || {});
    const composite = `${tenantId}:${caseId}:${normalizedQuery}:${paramsHash}:${permissionsHash}`;
    const cacheKey = `graph:query:${node_crypto_1.default.createHash('sha1').update(composite).digest('hex')}`;
    const tags = [
        'graph:query',
        `graph:query:tenant:${tenantId}`,
        `graph:query:case:${tenantId}:${caseId}`,
        `graph:query:perm:${permissionsHash}`,
    ];
    return {
        cacheKey,
        tags,
        tenantId,
        caseId,
        permissionsHash,
        normalizedQuery,
        paramsHash,
    };
}
async function runWithGraphQueryCache(ctx, fetcher) {
    const { cacheKey, tags, tenantId } = buildGraphCacheKey(ctx);
    const ttlSeconds = ctx.ttlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
    const op = ctx.op || 'graph-query';
    const tenantLabel = tenantId || 'unknown';
    const start = Date.now();
    const cached = await (0, responseCache_js_1.getCachedJson)(cacheKey, { ttlSeconds });
    if (cached !== null) {
        (0, cacheMetrics_js_1.recHit)('graph-cache', op, tenantLabel);
        cacheMetrics_js_1.cacheLatencySeconds
            ?.labels?.(op, 'hit', tenantLabel)
            ?.observe?.((Date.now() - start) / 1000);
        return cached;
    }
    (0, cacheMetrics_js_1.recMiss)('graph-cache', op, tenantLabel);
    const fresh = await fetcher();
    await (0, responseCache_js_1.setCachedJson)(cacheKey, fresh, { ttlSeconds, indexPrefixes: tags });
    (0, cacheMetrics_js_1.recSet)('graph-cache', op, tenantLabel);
    cacheMetrics_js_1.cacheLatencySeconds
        ?.labels?.(op, 'miss', tenantLabel)
        ?.observe?.((Date.now() - start) / 1000);
    return fresh;
}
async function invalidateGraphQueryCache(options) {
    const tenantId = options.tenantId || 'global';
    const caseId = options.caseId || 'global';
    const permissionsHash = options.permissionsHash;
    const tags = new Set();
    tags.add('graph:query');
    tags.add(`graph:query:tenant:${tenantId}`);
    tags.add(`graph:query:case:${tenantId}:${caseId}`);
    if (permissionsHash) {
        tags.add(`graph:query:perm:${permissionsHash}`);
    }
    for (const tag of tags) {
        await (0, responseCache_js_1.invalidateCache)(tag, tenantId);
    }
    (0, responseCache_js_1.flushLocalCache)();
}
function recordCacheBypass(reason, op, tenantId) {
    cacheMetrics_js_1.cacheBypassTotal
        ?.labels?.(op, reason, tenantId || 'unknown')
        ?.inc?.();
}
