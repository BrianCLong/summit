"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
// @ts-nocheck
const express_1 = require("express");
const archiver_1 = __importDefault(require("archiver"));
const postgres_js_1 = require("../db/postgres.js");
const ProvenanceRepo_js_1 = require("../repos/ProvenanceRepo.js");
const auth_js_1 = require("../middleware/auth.js");
const index_js_1 = require("../audit/index.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const BundleVerifier_js_1 = require("../audit/BundleVerifier.js");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.auditRouter = (0, express_1.Router)();
// Rate limiter for verification endpoint
const verificationLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: 'Too many verification requests from this IP, please try again later',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
// --- Public-Facing Bundle Verifier ---
exports.auditRouter.post('/verify-bundle', verificationLimiter, async (req, res) => {
    if (process.env.AUDIT_VERIFY !== 'true') {
        return res.status(404).json({ error: 'Feature disabled' });
    }
    // Token scope check (simulated)
    const token = req.headers['x-verify-token'];
    if (!token) {
        return res.status(401).json({ error: 'Missing verification token' });
    }
    try {
        const report = await BundleVerifier_js_1.BundleVerifier.getInstance().verify(req.body);
        res.json(report);
    }
    catch (error) {
        logger_js_1.default.error('Bundle verification failed', error);
        res.status(500).json({ error: 'Verification process failed' });
    }
});
// --- Legacy Incident/Investigation Audit Routes ---
exports.auditRouter.get('/incidents/:id/audit-bundle.zip', async (req, res) => {
    const tenant = String(req.headers['x-tenant-id'] ||
        req.headers['x-tenant'] ||
        '');
    if (!tenant)
        return res.status(400).json({ error: 'tenant_required' });
    const { id } = req.params;
    const pg = (0, postgres_js_1.getPostgresPool)();
    const prov = new ProvenanceRepo_js_1.ProvenanceRepo(pg);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="incident-${id}-audit.zip"`);
    const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => res.status(500).end(`Archive error: ${err.message}`));
    archive.pipe(res);
    try {
        const { rows } = await pg.query('SELECT * FROM incidents WHERE id = $1', [
            id,
        ]);
        archive.append(JSON.stringify({ incident: rows[0] ?? null, generatedAt: new Date().toISOString() }, null, 2), { name: 'incident.json' });
    }
    catch {
        archive.append(JSON.stringify({
            warning: 'incidents table not available',
            generatedAt: new Date().toISOString(),
        }, null, 2), { name: 'incident.json' });
    }
    try {
        const events = await prov.by('incident', id, undefined, 5000, 0);
        archive.append(JSON.stringify(events, null, 2), {
            name: 'provenance.json',
        });
    }
    catch {
        archive.append(JSON.stringify({ error: 'failed to load provenance' }, null, 2), {
            name: 'provenance.json',
        });
    }
    await archive.finalize();
});
exports.auditRouter.get('/investigations/:id/audit-bundle.zip', async (req, res) => {
    const tenant = String(req.headers['x-tenant-id'] ||
        req.headers['x-tenant'] ||
        '');
    if (!tenant)
        return res.status(400).json({ error: 'tenant_required' });
    const { id } = req.params;
    const pg = (0, postgres_js_1.getPostgresPool)();
    const prov = new ProvenanceRepo_js_1.ProvenanceRepo(pg);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="investigation-${id}-audit.zip"`);
    const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => res.status(500).end(`Archive error: ${err.message}`));
    archive.pipe(res);
    try {
        const { rows } = await pg.query('SELECT * FROM investigations WHERE id = $1', [id]);
        archive.append(JSON.stringify({
            investigation: rows[0] ?? null,
            generatedAt: new Date().toISOString(),
        }, null, 2), { name: 'investigation.json' });
    }
    catch {
        archive.append(JSON.stringify({
            warning: 'investigations table not available',
            generatedAt: new Date().toISOString(),
        }, null, 2), { name: 'investigation.json' });
    }
    try {
        const events = await prov.by('investigation', id, undefined, 5000, 0);
        archive.append(JSON.stringify(events, null, 2), {
            name: 'provenance.json',
        });
    }
    catch {
        archive.append(JSON.stringify({ error: 'failed to load provenance' }, null, 2), {
            name: 'provenance.json',
        });
    }
    await archive.finalize();
});
// --- New Advanced Audit System Routes ---
// Query audit events
exports.auditRouter.get('/', auth_js_1.ensureAuthenticated, (0, auth_js_1.requirePermission)('audit:read'), // Admin or compliance officer only
async (req, res) => {
    try {
        const { startTime, endTime, eventTypes, levels, userIds, resourceTypes, correlationIds, limit, offset, } = req.query;
        const events = await index_js_1.advancedAuditSystem.queryEvents({
            startTime: startTime ? new Date(startTime) : undefined,
            endTime: endTime ? new Date(endTime) : undefined,
            eventTypes: eventTypes ? eventTypes.split(',') : undefined,
            levels: levels ? levels.split(',') : undefined,
            userIds: userIds ? userIds.split(',') : undefined,
            resourceTypes: resourceTypes ? resourceTypes.split(',') : undefined,
            correlationIds: correlationIds ? correlationIds.split(',') : undefined,
            limit: limit ? parseInt(limit, 10) : 50,
            offset: offset ? parseInt(offset, 10) : 0,
            // Strictly enforce tenant isolation.
            // If req.user.tenantId is missing (e.g. system admin or error), we default to empty array or specific handling.
            // But for "Customer-grade compliance", we want to ensure they ONLY see their own data.
            // Assuming 'system' is only for internal use and shouldn't be the default fallback for a logged-in user without tenantId.
            tenantIds: req.user?.tenantId ? [req.user.tenantId] : [],
        });
        res.json({ data: events });
    }
    catch (error) {
        logger_js_1.default.error('Failed to query audit events', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Generate compliance report
exports.auditRouter.get('/compliance-report', auth_js_1.ensureAuthenticated, (0, auth_js_1.requirePermission)('audit:report'), async (req, res) => {
    try {
        const { framework, startTime, endTime } = req.query;
        if (!framework || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        const report = await index_js_1.advancedAuditSystem.generateComplianceReport(framework, new Date(startTime), new Date(endTime));
        res.json({ data: report });
    }
    catch (error) {
        logger_js_1.default.error('Failed to generate compliance report', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Verify integrity
exports.auditRouter.get('/integrity', auth_js_1.ensureAuthenticated, (0, auth_js_1.requirePermission)('audit:verify'), async (req, res) => {
    try {
        const { startTime, endTime } = req.query;
        const result = await index_js_1.advancedAuditSystem.verifyIntegrity(startTime ? new Date(startTime) : undefined, endTime ? new Date(endTime) : undefined);
        res.json({ data: result });
    }
    catch (error) {
        logger_js_1.default.error('Failed to verify integrity', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = exports.auditRouter;
