"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportRouter = void 0;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const node_module_1 = require("node:module");
const postgres_js_1 = require("../db/postgres.js");
const ProvenanceRepo_js_1 = require("../repos/ProvenanceRepo.js");
const tenantHeader_js_1 = require("../middleware/tenantHeader.js");
const require = (0, node_module_1.createRequire)(import.meta.url);
function sign(params, secret) {
    const base = Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join('&');
    return crypto_1.default.createHmac('sha256', secret).update(base).digest('hex');
}
function verify(params, sig, secret) {
    const expected = sign(params, secret);
    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(sig);
    if (expectedBuf.length !== sigBuf.length)
        return false;
    try {
        return crypto_1.default.timingSafeEqual(expectedBuf, sigBuf);
    }
    catch {
        return false;
    }
}
function redactForeignTenantIdentifiers(value, tenantId) {
    if (Array.isArray(value)) {
        return value.map((item) => redactForeignTenantIdentifiers(item, tenantId));
    }
    if (value && typeof value === 'object') {
        return Object.entries(value).reduce((acc, [key, val]) => {
            const normalizedKey = key.toLowerCase();
            if (typeof val === 'string' &&
                normalizedKey.includes('tenant') &&
                val !== tenantId) {
                acc[key] = '[redacted:foreign-tenant]';
                return acc;
            }
            acc[key] = redactForeignTenantIdentifiers(val, tenantId);
            return acc;
        }, {});
    }
    if (typeof value === 'string' &&
        value.startsWith('tenant-') &&
        value !== tenantId) {
        return '[redacted:foreign-tenant]';
    }
    return value;
}
// Optional Redis cache/ratelimit
let redis = null;
try {
    const Redis = require('ioredis');
    if (process.env.REDIS_URL)
        redis = new Redis(process.env.REDIS_URL);
}
catch { }
exports.exportRouter = (0, express_1.Router)();
exports.exportRouter.use((0, tenantHeader_js_1.tenantHeader)());
exports.exportRouter.get('/provenance', async (req, res) => {
    try {
        const scope = String(req.query.scope || '');
        const id = String(req.query.id || '');
        const format = String(req.query.format || 'json').toLowerCase();
        const ts = Number(req.query.ts || 0);
        const sig = String(req.query.sig || '');
        const reasonCodeIn = String(req.query.reasonCodeIn || '');
        const kindIn = String(req.query.kindIn || '');
        const sourceIn = String(req.query.sourceIn || '');
        const tenant = String(req.query.tenant || '');
        const headerTenant = String(req.tenantId || '');
        const from = req.query.from ? String(req.query.from) : undefined;
        const to = req.query.to ? String(req.query.to) : undefined;
        const contains = req.query.contains
            ? String(req.query.contains)
            : undefined;
        if (!['incident', 'investigation'].includes(scope) || !id) {
            return res.status(400).json({ error: 'invalid_scope_or_id' });
        }
        if (!tenant)
            return res.status(400).json({ error: 'tenant_required' });
        if (!headerTenant || headerTenant !== tenant)
            return res.status(403).json({ error: 'tenant_mismatch' });
        // Rate limit per-tenant: 5/minute
        if (redis) {
            try {
                const rk = `rate:export:${tenant}:${Math.floor(Date.now() / 60000)}`;
                const c = await redis.incr(rk);
                if (c === 1)
                    await redis.expire(rk, 60);
                if (c > 5)
                    return res
                        .status(429)
                        .json({ error: 'rate_limited', reasonCode: 'RATE_LIMIT' });
            }
            catch { }
        }
        const secret = process.env.EXPORT_SIGNING_SECRET || 'dev-secret';
        const params = {
            scope,
            id,
            format,
            ts: String(ts),
            tenant,
            reasonCodeIn,
            ...(kindIn ? { kindIn } : {}),
            ...(sourceIn ? { sourceIn } : {}),
            ...(from ? { from } : {}),
            ...(to ? { to } : {}),
            ...(contains ? { contains } : {}),
        };
        if (!sig || !verify(params, sig, secret))
            return res.status(403).json({ error: 'invalid_signature' });
        if (Math.abs(Date.now() - ts) > 15 * 60 * 1000)
            return res.status(403).json({ error: 'expired' });
        const pg = (0, postgres_js_1.getPostgresPool)();
        const repo = new ProvenanceRepo_js_1.ProvenanceRepo(pg);
        const filter = {};
        if (reasonCodeIn)
            filter.reasonCodeIn = reasonCodeIn.split(',').filter(Boolean);
        if (kindIn)
            filter.kindIn = kindIn.split(',').filter(Boolean);
        if (sourceIn)
            filter.sourceIn = sourceIn.split(',').filter(Boolean);
        if (from)
            filter.from = from;
        if (to)
            filter.to = to;
        if (contains)
            filter.contains = contains;
        const first = Math.min(Number(req.query.first || 1000), 5000);
        const offset = Math.max(Number(req.query.offset || 0), 0);
        // Cache JSON responses 60s
        const cacheKey = `exp:${crypto_1.default
            .createHash('sha1')
            .update(JSON.stringify({ scope, id, filter, first, offset, tenant }))
            .digest('hex')}`;
        if (format === 'json' && redis) {
            try {
                const hit = await redis.get(cacheKey);
                if (hit)
                    return res.json(JSON.parse(hit));
            }
            catch { }
        }
        const rows = await repo.by(scope, id, filter, first, offset, tenant);
        const scopedRows = rows
            .filter((row) => !row.tenantId || row.tenantId === tenant)
            .map((row) => ({
            ...row,
            metadata: redactForeignTenantIdentifiers(row.metadata, tenant),
        }));
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('X-Row-Count', String(scopedRows.length));
            res.write('id,kind,createdAt,reasonCode\n');
            for (const r of scopedRows) {
                const line = `${r.id || ''},${r.kind || ''},${new Date(r.createdAt || Date.now()).toISOString()},${(r.metadata && (r.metadata.reasonCode || r.metadata.reason_code)) ||
                    ''}\n`;
                res.write(line);
            }
            return res.end();
        }
        const payload = { count: scopedRows.length, data: scopedRows };
        if (redis && format === 'json') {
            try {
                await redis.setex(cacheKey, 60, JSON.stringify(payload));
            }
            catch { }
        }
        return res.json(payload);
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'export_failed' });
    }
});
exports.default = exports.exportRouter;
