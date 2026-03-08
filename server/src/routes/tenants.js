"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const zod_1 = require("zod");
const TenantService_js_1 = require("../services/TenantService.js");
const auth_js_1 = require("../middleware/auth.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const abac_js_1 = require("../middleware/abac.js");
const ProvenanceRepo_js_1 = require("../repos/ProvenanceRepo.js");
const database_js_1 = require("../config/database.js");
const archiver_1 = __importDefault(require("archiver"));
const crypto_1 = require("crypto");
const provision_js_1 = __importDefault(require("./tenants/provision.js"));
const TenantUsageService_js_1 = require("../services/TenantUsageService.js");
const router = (0, express_1.Router)();
const settingsSchema = zod_1.z.object({
    settings: zod_1.z.record(zod_1.z.any()),
});
const disableSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3).optional(),
});
const auditQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().min(1).max(200).default(50),
    offset: zod_1.z.coerce.number().min(0).default(0),
});
const usageQuerySchema = zod_1.z.object({
    range: zod_1.z.string().optional(),
});
router.use('/provision', provision_js_1.default);
function policyGate() {
    return (req, _res, next) => {
        const authReq = req;
        req.body = { ...req.body, tenantId: req.params.id };
        next();
    };
}
function ensureTenantScope(req, res, next) {
    const authReq = req;
    const tenantId = req.params.id;
    const userTenant = authReq.user?.tenantId || authReq.user?.tenant_id;
    const isSuper = ['SUPER_ADMIN', 'ADMIN', 'admin'].includes(authReq.user?.role || '');
    if (!isSuper && userTenant && userTenant !== tenantId) {
        res.status(403).json({ success: false, error: 'Forbidden' });
        return;
    }
    next();
}
function buildReceipt(action, tenantId, actorId) {
    const issuedAt = new Date().toISOString();
    const payload = `${action}:${tenantId}:${actorId}:${issuedAt}`;
    const hash = (0, crypto_1.createHash)('sha256').update(payload).digest('hex');
    return {
        id: (0, crypto_1.randomUUID)(),
        action,
        tenantId,
        actorId,
        issuedAt,
        hash,
        policy: 'abac.ensurePolicy',
    };
}
/**
 * @route POST /api/tenants
 * @desc Create a new tenant (Self-Serve)
 * @access Protected (Requires Authentication)
 */
router.post('/', auth_js_1.ensureAuthenticated, (0, abac_js_1.ensurePolicy)('create', 'tenant'), async (req, res) => {
    try {
        const authReq = req;
        // Validate request body
        const input = TenantService_js_1.createTenantSchema.parse(req.body);
        // Get actor from authenticated user
        const actorId = authReq.user?.id;
        if (!actorId) {
            return res.status(401).json({ success: false, error: 'Unauthorized: No user ID found' });
        }
        const tenant = await TenantService_js_1.tenantService.createTenant(input, actorId);
        res.status(201).json({
            success: true,
            data: tenant,
            receipt: buildReceipt('TENANT_CREATED', tenant.id, actorId),
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({
                success: false,
                error: 'Validation Error',
                details: error.errors,
            });
        }
        else if (error instanceof Error && error.message.includes('already taken')) {
            res.status(409).json({
                success: false,
                error: error.message
            });
        }
        else {
            logger_js_1.default.error('Error in POST /api/tenants:', error);
            res.status(500).json({
                success: false,
                error: 'Internal Server Error',
            });
        }
    }
});
/**
 * @route GET /api/tenants/:id
 * @desc Get tenant details
 * @access Protected
 */
router.get('/:id', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const authReq = req;
        const tenantId = req.params.id;
        const tenant = await TenantService_js_1.tenantService.getTenant(tenantId);
        if (!tenant) {
            return res.status(404).json({ success: false, error: 'Tenant not found' });
        }
        const userId = authReq.user?.id;
        const userTenantId = authReq.user?.tenantId || authReq.user?.tenant_id; // Check both standard props
        // Authorization:
        // 1. User is the creator of the tenant
        // 2. User belongs to the tenant
        // 3. User is a platform super-admin
        const isCreator = tenant.createdBy === userId;
        const isMember = userTenantId === tenant.id;
        const isSuperAdmin = authReq.user?.role === 'SUPER_ADMIN';
        if (!isCreator && !isMember && !isSuperAdmin) {
            logger_js_1.default.warn(`Access denied for user ${userId} to tenant ${tenantId}`);
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        res.json({ success: true, data: tenant });
    }
    catch (error) {
        logger_js_1.default.error('Error in GET /api/tenants/:id:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
router.get('/:id/settings', auth_js_1.ensureAuthenticated, ensureTenantScope, policyGate(), (0, abac_js_1.ensurePolicy)('read', 'tenant'), async (req, res) => {
    try {
        const authReq = req;
        const tenantId = req.params.id;
        const data = await TenantService_js_1.tenantService.getTenantSettings(tenantId);
        return res.json({
            success: true,
            data,
            receipt: buildReceipt('TENANT_SETTINGS_VIEWED', tenantId, authReq.user?.id || 'unknown'),
        });
    }
    catch (error) {
        logger_js_1.default.error('Error in GET /api/tenants/:id/settings:', error);
        if (error instanceof Error && error.message === 'Tenant not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
router.put('/:id/settings', auth_js_1.ensureAuthenticated, ensureTenantScope, policyGate(), (0, abac_js_1.ensurePolicy)('update', 'tenant'), async (req, res) => {
    try {
        const authReq = req;
        const body = settingsSchema.parse(req.body);
        const tenantId = req.params.id;
        const actorId = authReq.user?.id || 'unknown';
        const updated = await TenantService_js_1.tenantService.updateSettings(tenantId, body.settings, actorId);
        return res.json({
            success: true,
            data: updated,
            receipt: buildReceipt('TENANT_SETTINGS_UPDATED', tenantId, actorId),
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
        }
        if (error instanceof Error && error.message === 'Tenant not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        logger_js_1.default.error('Error in PUT /api/tenants/:id/settings:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
router.post('/:id/disable', auth_js_1.ensureAuthenticated, ensureTenantScope, policyGate(), (0, abac_js_1.ensurePolicy)('update', 'tenant'), async (req, res) => {
    try {
        const authReq = req;
        const { reason } = disableSchema.parse(req.body);
        const tenantId = req.params.id;
        const actorId = authReq.user?.id || 'unknown';
        const updated = await TenantService_js_1.tenantService.disableTenant(tenantId, actorId, reason);
        return res.json({
            success: true,
            data: updated,
            receipt: buildReceipt('TENANT_DISABLED', tenantId, actorId),
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
        }
        if (error instanceof Error && error.message === 'Tenant not found') {
            return res.status(404).json({ success: false, error: error.message });
        }
        logger_js_1.default.error('Error in POST /api/tenants/:id/disable:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
router.get('/:id/usage', auth_js_1.ensureAuthenticated, ensureTenantScope, policyGate(), (0, abac_js_1.ensurePolicy)('read', 'tenant'), async (req, res) => {
    try {
        const authReq = req;
        const tenantId = req.params.id;
        const { range } = usageQuerySchema.parse(req.query);
        const usage = await TenantUsageService_js_1.tenantUsageService.getTenantUsage(tenantId, range);
        return res.json({
            success: true,
            data: usage,
            receipt: buildReceipt('TENANT_USAGE_VIEWED', tenantId, authReq.user?.id || 'unknown'),
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
        }
        if (error instanceof Error && error.message.startsWith('Invalid range')) {
            return res.status(400).json({ success: false, error: error.message });
        }
        logger_js_1.default.error('Error in GET /api/tenants/:id/usage:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
router.get('/:id/audit', auth_js_1.ensureAuthenticated, ensureTenantScope, policyGate(), (0, abac_js_1.ensurePolicy)('read', 'tenant'), async (req, res) => {
    try {
        const authReq = req;
        const query = auditQuerySchema.parse(req.query);
        const tenantId = req.params.id;
        const repo = new ProvenanceRepo_js_1.ProvenanceRepo((0, database_js_1.getPostgresPool)());
        const events = await repo.by('investigation', tenantId, undefined, query.limit, query.offset, tenantId);
        return res.json({
            success: true,
            data: events,
            receipt: buildReceipt('TENANT_AUDIT_VIEWED', tenantId, authReq.user?.id || 'unknown'),
        });
    }
    catch (error) {
        logger_js_1.default.error('Error in GET /api/tenants/:id/audit:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
router.get('/:id/audit/export', auth_js_1.ensureAuthenticated, ensureTenantScope, policyGate(), (0, abac_js_1.ensurePolicy)('read', 'tenant'), async (req, res) => {
    try {
        const authReq = req;
        const tenantId = req.params.id;
        const repo = new ProvenanceRepo_js_1.ProvenanceRepo((0, database_js_1.getPostgresPool)());
        const events = await repo.by('investigation', tenantId, undefined, 500, 0, tenantId);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="tenant-${tenantId}-evidence.zip"`);
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => {
            logger_js_1.default.error('Archive error', err);
            res.status(500).end(`Archive error: ${err.message}`);
        });
        archive.pipe(res);
        const actorId = authReq.user?.id || 'unknown';
        const metadata = {
            tenantId,
            exportedAt: new Date().toISOString(),
            actorId,
            eventCount: events.length,
        };
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
        archive.append(JSON.stringify(events, null, 2), { name: 'events.json' });
        const bundleHash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify({ metadata, events }))
            .digest('hex');
        archive.append(JSON.stringify({
            receipt: buildReceipt('TENANT_EVIDENCE_EXPORTED', tenantId, actorId),
            bundleHash,
        }, null, 2), { name: 'receipt.json' });
        await archive.finalize();
    }
    catch (error) {
        logger_js_1.default.error('Error in GET /api/tenants/:id/audit/export:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
exports.default = router;
