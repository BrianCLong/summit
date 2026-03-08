"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const commitment_js_1 = require("./commitment.js");
const proof_js_1 = require("./proof.js");
const audit_js_1 = require("./audit.js");
const types_js_1 = require("./types.js");
const safety_js_1 = require("./safety.js");
const metrics_js_1 = require("./metrics.js");
/**
 * ZK Deconfliction API Server
 */
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json());
const metrics = new metrics_js_1.ZkdMetrics();
const commitmentGen = new commitment_js_1.CommitmentGenerator();
const zkProof = new proof_js_1.ZKSetProof();
const auditLogger = new audit_js_1.AuditLogger();
// In-memory salt storage (use secure storage in production)
const saltStore = new Map();
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 120;
const rateLimitStore = new Map();
function enforceRateLimit(tenantId) {
    const now = Date.now();
    const windowStart = now - rateLimitWindowMs;
    const existing = rateLimitStore.get(tenantId) || [];
    const recent = existing.filter((ts) => ts >= windowStart);
    if (recent.length >= rateLimitMaxRequests) {
        throw new safety_js_1.SafetyError('rate_limited', 'rate limit exceeded for tenant; retry after cool-down', 429);
    }
    recent.push(now);
    rateLimitStore.set(tenantId, recent);
}
// Lightweight latency + active session tracking
app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    metrics.incrementActive();
    res.on('finish', () => {
        const durationNs = Number(process.hrtime.bigint() - start);
        metrics.observeLatency(durationNs / 1_000_000_000);
        metrics.decrementActive();
    });
    next();
});
/**
 * POST /zk/salt
 * Generate a new salt for a tenant
 */
app.post('/zk/salt', (req, res) => {
    const { tenantId } = req.body;
    if (!tenantId) {
        res.status(400).json({ error: 'tenantId required' });
        return;
    }
    const salt = commitmentGen.generateSalt(tenantId);
    saltStore.set(tenantId, salt);
    res.json({
        tenantId: salt.tenantId,
        salt: salt.salt,
        createdAt: salt.createdAt,
    });
});
/**
 * POST /zk/commit
 * Create commitments for a set of values
 */
app.post('/zk/commit', (req, res) => {
    const { tenantId, values } = req.body;
    if (!tenantId || !values || !Array.isArray(values)) {
        res.status(400).json({ error: 'tenantId and values array required' });
        return;
    }
    const salt = saltStore.get(tenantId);
    if (!salt) {
        res.status(404).json({
            error: 'Salt not found for tenant. Generate salt first via POST /zk/salt',
        });
        return;
    }
    const commitmentSet = commitmentGen.commitSet(values, tenantId, salt.salt);
    res.json({
        tenantId: commitmentSet.tenantId,
        commitments: commitmentSet.commitments.map((c) => c.hash),
        count: commitmentSet.count,
        merkleRoot: commitmentSet.merkleRoot,
    });
});
/**
 * POST /zk/deconflict
 * Check for selector overlaps between two tenants WITHOUT revealing values
 */
app.post('/zk/deconflict', (req, res) => {
    try {
        const parsed = types_js_1.DeconflictRequestSchema.parse({
            revealMode: 'cardinality',
            ...req.body,
        });
        const { tenantAId, tenantBId, tenantACommitments, tenantBCommitments, auditContext, } = parsed;
        (0, safety_js_1.guardDeconflictRequest)(parsed, {
            maxSetSize: 100_000,
            maxCommitmentLength: 256,
        });
        enforceRateLimit(tenantAId);
        enforceRateLimit(tenantBId);
        // Check overlap
        const { hasOverlap, count } = zkProof.checkOverlap(tenantACommitments, tenantBCommitments);
        // Generate proof
        const proof = zkProof.generateProof(tenantAId, tenantBId, tenantACommitments, tenantBCommitments, hasOverlap, count);
        // Audit log
        const auditEntry = auditLogger.log(tenantAId, tenantBId, hasOverlap, count, proof, auditContext);
        res.json({
            hasOverlap,
            overlapCount: count,
            proof,
            auditLogId: auditEntry.id,
            timestamp: auditEntry.timestamp,
            mode: parsed.revealMode,
        });
    }
    catch (error) {
        if (error instanceof safety_js_1.SafetyError) {
            metrics.recordDenial(error.reason);
            res.status(error.statusCode).json({
                error: error.message,
                reason: error.reason,
            });
            return;
        }
        res.status(400).json({ error: String(error) });
    }
});
/**
 * GET /zk/audit
 * Retrieve audit logs
 */
app.get('/zk/audit', (req, res) => {
    const { tenantId } = req.query;
    if (tenantId) {
        const logs = auditLogger.getLogsByTenant(tenantId);
        res.json({ logs, count: logs.length });
    }
    else {
        const logs = auditLogger.getLogs();
        res.json({ logs, count: logs.length });
    }
});
/**
 * GET /zk/audit/:id
 * Retrieve specific audit log entry
 */
app.get('/zk/audit/:id', (req, res) => {
    const { id } = req.params;
    const log = auditLogger.getLogById(id);
    if (!log) {
        res.status(404).json({ error: 'Audit log not found' });
        return;
    }
    res.json(log);
});
/**
 * GET /health
 */
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'zk-deconfliction',
        timestamp: new Date().toISOString(),
    });
});
/**
 * GET /metrics
 * Prometheus-compatible metrics for Grafana dashboards
 */
app.get('/metrics', (_req, res) => {
    res.type('text/plain').send(metrics.snapshotPrometheus());
});
const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
    console.log(`ZK Deconfliction service running on port ${PORT}`);
    console.log(`Endpoints:`);
    console.log(`  POST /zk/salt          - Generate tenant salt`);
    console.log(`  POST /zk/commit        - Create commitments`);
    console.log(`  POST /zk/deconflict    - Check overlap (ZK)`);
    console.log(`  GET  /zk/audit         - Retrieve audit logs`);
    console.log(`  GET  /zk/audit/:id     - Get specific log`);
    console.log(`  GET  /health           - Health check`);
    console.log(`  GET  /metrics          - Prometheus metrics`);
});
