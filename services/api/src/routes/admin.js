"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const auditLog_js_1 = require("../middleware/auditLog.js");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const redis_js_1 = require("../db/redis.js");
const admin_rateLimit_js_1 = require("./admin.rateLimit.js");
const flags = {};
const tenants = [
    { id: 'default', name: 'Default' },
    { id: 'enterprise', name: 'Enterprise' },
];
const users = [
    {
        id: 'u1',
        email: 'analyst@example.com',
        role: 'analyst',
        tenantId: 'default',
    },
];
exports.adminRouter = (0, express_1.Router)();
exports.adminRouter.get('/tenants', (0, auth_js_1.requirePermission)('user:read'), (_req, res) => {
    res.json({ items: tenants });
});
exports.adminRouter.get('/users', (0, auth_js_1.requirePermission)('user:read'), (_req, res) => {
    res.json({ items: users });
});
exports.adminRouter.get('/audit', (0, auth_js_1.requirePermission)('audit:read'), (req, res) => {
    const n = Number(req.query.limit || 200);
    const q = String(req.query.query || '').toLowerCase();
    let items = (0, auditLog_js_1.getAuditEvents)(n);
    if (q) {
        items = items.filter((e) => JSON.stringify(e).toLowerCase().includes(q));
    }
    res.json({ items });
});
exports.adminRouter.get('/flags', (0, auth_js_1.requirePermission)('user:read'), (_req, res) => {
    res.json({ flags });
});
exports.adminRouter.put('/flags/:key', (0, auth_js_1.requirePermission)('user:read'), (req, res) => {
    const key = req.params.key;
    const val = Boolean(req.body?.value);
    flags[key] = val;
    res.json({ ok: true, key, value: val });
});
// Optional audit hook for external scripts (e.g., backup/DR). Protect with token.
exports.adminRouter.post('/audit/record', (0, admin_rateLimit_js_1.rateLimitAudit)(parseInt(process.env.AUDIT_RATE_LIMIT || '60', 10)), async (req, res) => {
    try {
        const expected = process.env.AUDIT_HOOK_TOKEN || '';
        const token = String(req.headers['x-audit-token'] || '');
        if (expected && token !== expected)
            return res.status(401).send('unauthorized');
        const nonce = String(req.headers['x-audit-nonce'] || '');
        const ts = parseInt(String(req.headers['x-audit-ts'] || '0'), 10);
        const windowSec = parseInt(process.env.AUDIT_WINDOW_SEC || '60', 10);
        const now = Math.floor(Date.now() / 1000);
        if (!nonce || !ts || Math.abs(now - ts) > windowSec)
            return res.status(400).send('stale');
        // Redis-based nonce TTL and optional rate-limit
        try {
            await redis_js_1.redisConnection.connect?.();
        }
        catch { }
        const key = `audit:nonce:${nonce}`;
        const exists = await redis_js_1.redisConnection.exists?.(key);
        if (exists) {
            return res.status(409).send('replay');
        }
        await redis_js_1.redisConnection.set?.(key, '1', windowSec);
        const { action, details } = req.body || {};
        (0, auditLog_js_1.auditLog)(req, String(action || 'external.event'), details || {});
        res.status(201).json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
// Policy editor (dev only): read/write policies/policy.rego
exports.adminRouter.get('/policy', (0, auth_js_1.requirePermission)('user:read'), (_req, res) => {
    try {
        const p = node_path_1.default.join(process.cwd(), 'policies', 'policy.rego');
        const content = node_fs_1.default.readFileSync(p, 'utf8');
        res.type('text/plain').send(content);
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
exports.adminRouter.put('/policy', (0, auth_js_1.requirePermission)('user:read'), (req, res) => {
    try {
        const p = node_path_1.default.join(process.cwd(), 'policies', 'policy.rego');
        const content = String(req.body?.content || '');
        node_fs_1.default.writeFileSync(p, content, 'utf8');
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: String(e) });
    }
});
