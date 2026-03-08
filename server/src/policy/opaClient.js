"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.opaAllow = opaAllow;
exports.clearOpaDecisionCache = clearOpaDecisionCache;
exports.checkResidency = checkResidency;
const node_fetch_1 = __importDefault(require("node-fetch"));
const node_crypto_1 = require("node:crypto");
const OPA_URL = process.env.OPA_URL || 'http://opa:8181/v1/data';
const DEFAULT_TIMEOUT_MS = Number(process.env.OPA_TIMEOUT_MS || 3000);
const DEFAULT_RETRIES = Number(process.env.OPA_RETRIES || 2);
const DEFAULT_BACKOFF_MS = Number(process.env.OPA_BACKOFF_MS || 100);
const DEFAULT_CACHE_TTL_MS = Number(process.env.OPA_CACHE_TTL_MS || 60_000);
const decisionCache = new Map();
function stableStringify(obj) {
    if (obj === null || typeof obj !== 'object')
        return JSON.stringify(obj);
    if (Array.isArray(obj))
        return `[${obj.map((v) => stableStringify(v)).join(',')}]`;
    const sorted = Object.keys(obj)
        .sort()
        .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
        .join(',');
    return `{${sorted}}`;
}
function buildCacheKey(path, input) {
    const normalizedInput = stableStringify(input);
    const hash = (0, node_crypto_1.createHash)('sha256').update(normalizedInput).digest('hex');
    return `${path}|${input.action}|tenant:${input.tenant || 'none'}|user:${input.user?.id || 'anonymous'}|${hash}`;
}
async function fetchWithTimeout(url, body, timeoutMs, abortController) {
    const controller = abortController ?? new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await (0, node_fetch_1.default)(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body,
            signal: controller.signal,
        });
    }
    finally {
        clearTimeout(timer);
    }
}
async function executeWithRetry(url, body, options) {
    let attempt = 0;
    const start = Date.now();
    let lastError = null;
    while (attempt <= options.maxRetries) {
        try {
            const res = await fetchWithTimeout(url, body, options.timeoutMs);
            if (!res.ok)
                throw new Error(`OPA ${res.status}`);
            const j = await res.json();
            const allow = !!(j.result?.allow ?? j.result === true);
            const reason = j.result?.reason || undefined;
            if (process.env.POLICY_DEBUG === '1') {
                console.log(JSON.stringify({
                    component: 'policy.opa-client',
                    decision: allow ? 'allow' : 'deny',
                    reason,
                    latencyMs: Date.now() - start,
                    attempt,
                }));
            }
            return { allow, reason };
        }
        catch (error) {
            lastError = error;
            if (attempt >= options.maxRetries)
                break;
            const backoff = options.baseBackoffMs * Math.pow(2, attempt);
            await new Promise((res) => setTimeout(res, backoff));
            attempt += 1;
        }
    }
    if (process.env.OPA_FAIL_OPEN === 'true') {
        return { allow: true, reason: 'fail-open' };
    }
    return { allow: false, reason: lastError?.message || 'opa_error' };
}
async function opaAllow(path, input, options = {}) {
    const resolved = {
        timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxRetries: options.maxRetries ?? DEFAULT_RETRIES,
        baseBackoffMs: options.baseBackoffMs ?? DEFAULT_BACKOFF_MS,
        cacheTtlMs: options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
        skipCache: options.skipCache ?? false,
    };
    const url = `${OPA_URL}/${path.replace(/^\//, '')}`;
    const body = JSON.stringify({ input });
    const cacheKey = buildCacheKey(path, input);
    if (!resolved.skipCache) {
        const cached = decisionCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.decision;
        }
    }
    const decision = await executeWithRetry(url, body, resolved);
    if (!resolved.skipCache && resolved.cacheTtlMs > 0) {
        decisionCache.set(cacheKey, {
            expiresAt: Date.now() + resolved.cacheTtlMs,
            decision,
        });
    }
    return decision;
}
function clearOpaDecisionCache() {
    decisionCache.clear();
}
async function checkResidency(meta) {
    const decision = await opaAllow('maestro/residency', {
        action: 'residency',
        meta,
    });
    return decision;
}
