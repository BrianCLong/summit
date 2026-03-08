"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const TenantIsolationGuard_js_1 = require("../tenancy/TenantIsolationGuard.js");
const killSwitch_js_1 = require("../tenancy/killSwitch.js");
class InMemoryLimiter {
    buckets = new Map();
    async checkLimit(key, limit, windowMs) {
        const now = Date.now();
        const current = this.buckets.get(key);
        if (!current || current.reset < now) {
            this.buckets.set(key, { count: 1, reset: now + windowMs });
            return {
                allowed: true,
                total: limit,
                remaining: limit - 1,
                reset: now + windowMs,
            };
        }
        current.count += 1;
        const allowed = current.count <= limit;
        this.buckets.set(key, current);
        return {
            allowed,
            total: limit,
            remaining: Math.max(0, limit - current.count),
            reset: current.reset,
        };
    }
}
const baseContext = {
    tenantId: 'tenant-a',
    environment: 'dev',
    privilegeTier: 'standard',
};
const testConfig = {
    defaultWindowMs: 25,
    rateLimits: { api: 1, ingestion: 1, rag: 1, llm: 1 },
    llmSoftCeiling: 1,
};
(0, globals_1.describe)('TenantIsolationGuard', () => {
    (0, globals_1.it)('denies cross-tenant access attempts', () => {
        const guard = new TenantIsolationGuard_js_1.TenantIsolationGuard(new InMemoryLimiter(), new killSwitch_js_1.TenantKillSwitch('/nonexistent'), testConfig);
        const decision = guard.evaluatePolicy(baseContext, {
            action: 'read',
            resourceTenantId: 'tenant-b',
        });
        (0, globals_1.expect)(decision.allowed).toBe(false);
        (0, globals_1.expect)(decision.reason).toContain('Cross-tenant');
    });
    (0, globals_1.it)('enforces per-tenant rate limits', async () => {
        const guard = new TenantIsolationGuard_js_1.TenantIsolationGuard(new InMemoryLimiter(), new killSwitch_js_1.TenantKillSwitch('/nonexistent'), testConfig);
        const first = await guard.enforceRateLimit(baseContext, 'api');
        const second = await guard.enforceRateLimit(baseContext, 'api');
        (0, globals_1.expect)(first.allowed).toBe(true);
        (0, globals_1.expect)(second.allowed).toBe(false);
        (0, globals_1.expect)(second.reset).toBeGreaterThan(Date.now());
    });
    (0, globals_1.it)('honors kill switch config without redeploys', () => {
        const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'tenant-kill-'));
        const killFile = path_1.default.join(tmpDir, 'switch.json');
        const now = Date.now();
        fs_1.default.writeFileSync(killFile, JSON.stringify({ 'tenant-a': true }), 'utf-8');
        // Ensure mtime is older so the next write is seen as new
        fs_1.default.utimesSync(killFile, new Date(now - 10000), new Date(now - 10000));
        const killSwitch = new killSwitch_js_1.TenantKillSwitch(killFile);
        const guard = new TenantIsolationGuard_js_1.TenantIsolationGuard(new InMemoryLimiter(), killSwitch, testConfig);
        const decision = guard.evaluatePolicy(baseContext, { action: 'read' });
        (0, globals_1.expect)(decision.allowed).toBe(false);
        (0, globals_1.expect)(decision.status).toBe(423);
        // Update file and ensure timestamp is newer
        fs_1.default.writeFileSync(killFile, JSON.stringify({ 'tenant-a': false }), 'utf-8');
        fs_1.default.utimesSync(killFile, new Date(now + 1000), new Date(now + 1000));
        const reopened = guard.evaluatePolicy(baseContext, { action: 'read' });
        (0, globals_1.expect)(reopened.allowed).toBe(true);
    });
    (0, globals_1.it)('fails closed when kill-switch config is missing in prod', () => {
        const killSwitch = new killSwitch_js_1.TenantKillSwitch('/definitely/missing.json');
        const guard = new TenantIsolationGuard_js_1.TenantIsolationGuard(new InMemoryLimiter(), killSwitch, testConfig);
        const decision = guard.evaluatePolicy({ ...baseContext, environment: 'prod' }, { action: 'read' });
        (0, globals_1.expect)(decision.allowed).toBe(false);
        (0, globals_1.expect)(decision.reason).toContain('Kill-switch configuration missing');
    });
});
