"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const zod_1 = require("zod");
const auth_js_1 = require("../middleware/auth.js");
const abac_js_1 = require("../middleware/abac.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const ProvenanceRepo_js_1 = require("../repos/ProvenanceRepo.js");
const database_js_1 = require("../config/database.js");
const TenantService_js_1 = require("../services/TenantService.js");
const ledger_js_1 = require("../provenance/ledger.js");
const evidenceExport_js_1 = require("../provenance/evidenceExport.js");
const archiver_1 = __importDefault(require("archiver"));
const crypto_1 = require("crypto");
const router = (0, express_1.Router)();
const exportRequestSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    timeRange: zod_1.z.object({
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
    }),
});
const exportStatusSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    windowHours: zod_1.z.coerce.number().min(1).max(720).default(168),
});
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
 * @route POST /api/evidence/exports
 * @desc Generate and download an evidence bundle for a tenant
 * @access Protected (Tenant Admin or Platform Admin)
 */
router.post('/exports', auth_js_1.ensureAuthenticated, (0, abac_js_1.ensurePolicy)('read', 'evidence'), // Assuming 'evidence' resource exists in policy
async (req, res) => {
    try {
        const authReq = req;
        const { tenantId, timeRange } = exportRequestSchema.parse(req.body);
        const actorId = authReq.user?.id || 'unknown';
        // Verify access to tenant
        const userTenantId = authReq.user?.tenantId;
        const isSuperAdmin = authReq.user?.role === 'SUPER_ADMIN';
        if (!isSuperAdmin && userTenantId !== tenantId) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        // Fetch Tenant Config for Policy Bundle
        const tenant = await TenantService_js_1.tenantService.getTenant(tenantId);
        if (!tenant) {
            return res.status(404).json({ success: false, error: 'Tenant not found' });
        }
        // Fetch Audit Events
        const repo = new ProvenanceRepo_js_1.ProvenanceRepo((0, database_js_1.getPostgresPool)());
        const filteredEvents = await repo.byTenant(tenantId, { from: timeRange.start, to: timeRange.end }, 1000, 0);
        const evidencePayload = await (0, evidenceExport_js_1.exportEvidencePayload)(tenantId, {
            start: new Date(timeRange.start),
            end: new Date(timeRange.end),
        });
        // Start Stream
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="evidence-${tenantId}-${timeRange.start}.zip"`);
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => {
            logger_js_1.default.error('Archive error', err);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: 'Archive generation failed' });
            }
        });
        archive.pipe(res);
        // Add Metadata
        const metadata = {
            exportId: (0, crypto_1.randomUUID)(),
            tenantId,
            timeRange,
            generatedAt: new Date().toISOString(),
            actorId,
            eventCount: filteredEvents.length,
            accessLogCount: evidencePayload.accessLogs.length,
            adminChangeReceiptCount: evidencePayload.adminChangeReceipts.length,
            policyVersionCount: evidencePayload.policyVersions.length,
            drReceiptCount: evidencePayload.drReceipts.length,
            policyProfile: tenant.settings?.policy_profile || 'unknown',
        };
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
        // Add Events
        archive.append(JSON.stringify(filteredEvents, null, 2), { name: 'audit_events.json' });
        archive.append(JSON.stringify(evidencePayload.accessLogs, null, 2), { name: 'access_logs.json' });
        archive.append(JSON.stringify(evidencePayload.adminChangeReceipts, null, 2), { name: 'admin_change_receipts.json' });
        archive.append(JSON.stringify(evidencePayload.policyVersions, null, 2), { name: 'policy_versions.json' });
        archive.append(JSON.stringify(evidencePayload.drReceipts, null, 2), { name: 'dr_receipts.json' });
        // Add Policy Bundle (Snapshot)
        if (tenant.settings?.policy_bundle) {
            archive.append(JSON.stringify(tenant.settings.policy_bundle, null, 2), { name: 'policy_bundle.json' });
        }
        // Add Receipt
        const bundleHash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify({ metadata, eventCount: filteredEvents.length })) // Simplified hash
            .digest('hex');
        const receipt = buildReceipt('EVIDENCE_EXPORT_GENERATED', tenantId, actorId);
        // Persist to Ledger
        await ledger_js_1.provenanceLedger.appendEntry({
            action: 'EVIDENCE_EXPORT_GENERATED',
            actor: { id: actorId, role: authReq.user?.role || 'user' },
            metadata: {
                tenantId,
                exportId: metadata.exportId,
                timeRange,
                bundleHash,
            },
            artifacts: []
        });
        archive.append(JSON.stringify({ ...receipt, bundleHash }, null, 2), { name: 'receipt.json' });
        await archive.finalize();
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
        }
        logger_js_1.default.error('Error in POST /api/evidence/exports:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
});
/**
 * @route GET /api/evidence/exports/status
 * @desc Check evidence export readiness for a tenant
 * @access Protected (Tenant Admin or Platform Admin)
 */
router.get('/exports/status', auth_js_1.ensureAuthenticated, (0, abac_js_1.ensurePolicy)('read', 'evidence'), async (req, res) => {
    try {
        const authReq = req;
        const { tenantId, windowHours } = exportStatusSchema.parse(req.query);
        const actorId = authReq.user?.id || 'unknown';
        const userTenantId = authReq.user?.tenantId;
        const isSuperAdmin = authReq.user?.role === 'SUPER_ADMIN';
        if (!isSuperAdmin && userTenantId !== tenantId) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        const tenant = await TenantService_js_1.tenantService.getTenant(tenantId);
        if (!tenant) {
            return res.status(404).json({ success: false, error: 'Tenant not found' });
        }
        const windowEnd = new Date();
        const windowStart = new Date(windowEnd.getTime() - windowHours * 60 * 60 * 1000);
        const repo = new ProvenanceRepo_js_1.ProvenanceRepo((0, database_js_1.getPostgresPool)());
        const stats = await repo.getTenantStats(tenantId, {
            from: windowStart.toISOString(),
            to: windowEnd.toISOString(),
        });
        const policyBundleReady = Boolean(tenant.settings?.policy_bundle);
        const ready = policyBundleReady && stats.count > 0;
        return res.json({
            success: true,
            data: {
                tenantId,
                actorId,
                windowStart: windowStart.toISOString(),
                windowEnd: windowEnd.toISOString(),
                eventCount: stats.count,
                lastEventAt: stats.lastEventAt,
                policyBundleReady,
                ready,
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ success: false, error: 'Validation Error', details: error.errors });
        }
        logger_js_1.default.error('Error in GET /api/evidence/exports/status:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
exports.default = router;
