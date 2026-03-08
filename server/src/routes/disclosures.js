"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = require("fs");
const zod_1 = require("zod");
const export_service_js_1 = require("../disclosure/export-service.js");
const disclosureMetrics_js_1 = require("../metrics/disclosureMetrics.js");
const runtime_evidence_js_1 = require("../disclosure/runtime-evidence.js");
const auth_js_1 = require("../middleware/auth.js");
const router = express_1.default.Router();
router.use(express_1.default.json());
router.use(auth_js_1.ensureAuthenticated);
router.use((0, auth_js_1.requirePermission)('export:investigations'));
const analyticsSchema = zod_1.z.object({
    event: zod_1.z.enum(['view', 'start']),
    tenantId: zod_1.z.string().min(1),
    context: zod_1.z.record(zod_1.z.any()).optional(),
});
function resolveTenant(req) {
    const header = req.headers['x-tenant-id']?.trim();
    const requestTenant = req.tenantId;
    return header || requestTenant;
}
router.post('/analytics', (req, res) => {
    try {
        const payload = analyticsSchema.parse(req.body ?? {});
        const tenantHeader = resolveTenant(req) ?? payload.tenantId;
        if (tenantHeader !== payload.tenantId) {
            return res.status(403).json({ error: 'tenant_mismatch' });
        }
        disclosureMetrics_js_1.disclosureMetrics.uiEvent(payload.event, tenantHeader);
        return res.status(202).json({ ok: true });
    }
    catch (error) {
        return res
            .status(400)
            .json({ error: 'invalid_payload', details: error?.message });
    }
});
router.post('/export', async (req, res) => {
    try {
        const tenantHeader = resolveTenant(req);
        if (!tenantHeader) {
            return res.status(400).json({ error: 'tenant_required' });
        }
        const bodyTenant = req.body?.tenantId;
        const effectiveTenant = bodyTenant ?? tenantHeader;
        if (effectiveTenant !== tenantHeader) {
            return res.status(403).json({ error: 'tenant_mismatch' });
        }
        const job = await export_service_js_1.disclosureExportService.createJob({
            ...req.body,
            tenantId: effectiveTenant,
        });
        return res.status(202).json({ job });
    }
    catch (error) {
        const status = error?.message === 'window_too_large' ||
            error?.message === 'end_before_start'
            ? 400
            : 500;
        return res
            .status(status)
            .json({ error: error?.message || 'export_failed' });
    }
});
router.get('/export', (req, res) => {
    const tenantHeader = resolveTenant(req);
    if (!tenantHeader) {
        return res.status(400).json({ error: 'tenant_required' });
    }
    const jobs = export_service_js_1.disclosureExportService.listJobsForTenant(tenantHeader);
    return res.json({ jobs });
});
router.get('/export/:jobId', (req, res) => {
    const tenantHeader = resolveTenant(req);
    if (!tenantHeader) {
        return res.status(400).json({ error: 'tenant_required' });
    }
    const job = export_service_js_1.disclosureExportService.getJob(req.params.jobId);
    if (!job) {
        return res.status(404).json({ error: 'not_found' });
    }
    if (job.tenantId !== tenantHeader) {
        return res.status(403).json({ error: 'tenant_mismatch' });
    }
    return res.json({ job });
});
router.get('/export/:jobId/download', (req, res) => {
    const tenantHeader = resolveTenant(req);
    if (!tenantHeader) {
        return res.status(400).json({ error: 'tenant_required' });
    }
    const download = export_service_js_1.disclosureExportService.getDownload(req.params.jobId);
    if (!download) {
        return res.status(404).json({ error: 'not_ready' });
    }
    if (download.job.tenantId !== tenantHeader) {
        return res.status(403).json({ error: 'tenant_mismatch' });
    }
    if (download.job.status !== 'completed') {
        return res
            .status(409)
            .json({ error: 'not_completed', status: download.job.status });
    }
    return res.download(download.filePath, `disclosure-${download.job.id}.zip`);
});
router.post('/runtime-bundle', async (req, res) => {
    const tenantHeader = resolveTenant(req);
    const bodyTenant = req.body?.tenantId;
    if (!tenantHeader && !bodyTenant) {
        return res.status(400).json({ error: 'tenant_required' });
    }
    const effectiveTenant = bodyTenant ?? tenantHeader;
    if (tenantHeader && tenantHeader !== effectiveTenant) {
        return res.status(403).json({ error: 'tenant_mismatch' });
    }
    try {
        const bundle = await runtime_evidence_js_1.runtimeEvidenceService.createBundle({
            tenantId: effectiveTenant,
            startTime: req.body?.startTime,
            endTime: req.body?.endTime,
            auditPaths: req.body?.auditPaths,
            policyPaths: req.body?.policyPaths,
            sbomPaths: req.body?.sbomPaths,
            provenancePaths: req.body?.provenancePaths,
            deployedVersion: req.body?.deployedVersion,
        });
        const base = `${req.protocol}://${req.get('host')}${req.baseUrl}/runtime-bundle/${bundle.id}`;
        const downloadUrl = `${base}/download`;
        const manifestUrl = `${base}/manifest`;
        const checksumsUrl = `${base}/checksums`;
        return res.status(201).json({
            bundle: {
                ...bundle,
                downloadUrl,
                manifestUrl,
                checksumsUrl,
            },
        });
    }
    catch (error) {
        const status = error?.message === 'invalid_date' ? 400 : 500;
        return res.status(status).json({
            error: 'runtime_bundle_failed',
            message: error?.message ?? 'unknown_error',
        });
    }
});
router.get('/runtime-bundle/:bundleId/download', async (req, res) => {
    const tenantHeader = resolveTenant(req);
    if (!tenantHeader) {
        return res.status(400).json({ error: 'tenant_required' });
    }
    const bundle = runtime_evidence_js_1.runtimeEvidenceService.getBundle(req.params.bundleId);
    if (!bundle) {
        return res.status(404).json({ error: 'not_found' });
    }
    if (bundle.tenantId !== tenantHeader) {
        return res.status(403).json({ error: 'tenant_mismatch' });
    }
    const exists = await fs_1.promises
        .access(bundle.bundlePath)
        .then(() => true)
        .catch(() => false);
    if (!exists) {
        return res.status(410).json({ error: 'bundle_missing' });
    }
    return res.download(bundle.bundlePath, `runtime-evidence-${bundle.id}.tar.gz`);
});
router.get('/runtime-bundle/:bundleId/manifest', async (req, res) => {
    const tenantHeader = resolveTenant(req);
    if (!tenantHeader) {
        return res.status(400).json({ error: 'tenant_required' });
    }
    const bundle = runtime_evidence_js_1.runtimeEvidenceService.getBundle(req.params.bundleId);
    if (!bundle) {
        return res.status(404).json({ error: 'not_found' });
    }
    if (bundle.tenantId !== tenantHeader) {
        return res.status(403).json({ error: 'tenant_mismatch' });
    }
    const exists = await fs_1.promises
        .access(bundle.manifestPath)
        .then(() => true)
        .catch(() => false);
    if (!exists) {
        return res.status(410).json({ error: 'bundle_missing' });
    }
    return res.download(bundle.manifestPath, `runtime-evidence-${bundle.id}-manifest.json`);
});
router.get('/runtime-bundle/:bundleId/checksums', async (req, res) => {
    const tenantHeader = resolveTenant(req);
    if (!tenantHeader) {
        return res.status(400).json({ error: 'tenant_required' });
    }
    const bundle = runtime_evidence_js_1.runtimeEvidenceService.getBundle(req.params.bundleId);
    if (!bundle) {
        return res.status(404).json({ error: 'not_found' });
    }
    if (bundle.tenantId !== tenantHeader) {
        return res.status(403).json({ error: 'tenant_mismatch' });
    }
    const exists = await fs_1.promises
        .access(bundle.checksumsPath)
        .then(() => true)
        .catch(() => false);
    if (!exists) {
        return res.status(410).json({ error: 'bundle_missing' });
    }
    return res.download(bundle.checksumsPath, `runtime-evidence-${bundle.id}-checksums.txt`);
});
exports.default = router;
