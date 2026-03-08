"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const zod_1 = require("zod");
const access_control_js_1 = require("../reporting/access-control.js");
const service_js_1 = require("../reporting/service.js");
const templates_js_1 = require("../reporting/templates.js");
const report_store_js_1 = require("../reporting/report-store.js");
const router = express_1.default.Router();
const defaultRules = [
    { resource: 'report', action: 'view', roles: ['user', 'admin'] },
    { resource: 'report', action: 'create', roles: ['editor', 'admin'] },
    { resource: 'report', action: 'update', roles: ['editor', 'admin'] },
    { resource: 'report', action: 'deliver', roles: ['admin'] },
];
const reportingService = (0, service_js_1.createReportingService)(new access_control_js_1.AccessControlService(defaultRules));
const reportStore = new report_store_js_1.ReportStore();
const generateReportSchema = zod_1.z.object({
    reportType: zod_1.z.enum([
        'approval-risk',
        'incident-evidence-manifest',
        'policy-coverage',
    ]),
    format: zod_1.z.enum(['json', 'pdf']).default('json'),
    tenantId: zod_1.z.string().optional(),
    tenantName: zod_1.z.string().optional(),
    window: zod_1.z
        .object({
        start: zod_1.z.string().optional(),
        end: zod_1.z.string().optional(),
    })
        .optional(),
    data: zod_1.z.record(zod_1.z.unknown()).optional(),
});
router.use((req, res, next) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
    }
    req.accessContext = {
        userId: user.sub || user.id,
        roles: user.roles || [user.role] || ['user'],
        tenantId: user.tenantId,
    };
    next();
});
router.post('/reports:generate', async (req, res) => {
    try {
        const input = generateReportSchema.parse(req.body);
        const reportId = crypto_1.default.randomUUID();
        const access = req.accessContext;
        // SECURITY: Always use authenticated tenant context - never allow user input to override
        // This prevents IDOR attacks where a user could generate reports for other tenants
        const tenantId = access.tenantId;
        if (!tenantId) {
            res.status(400).json({ error: 'tenantId is required for report generation' });
            return;
        }
        const payload = {
            reportId,
            reportType: input.reportType,
            tenantId,
            tenantName: input.tenantName,
            generatedAt: new Date().toISOString(),
            window: input.window || {},
            data: input.data || {},
        };
        const template = (0, templates_js_1.getReportTemplate)(input.reportType, input.format);
        const request = {
            template,
            context: {
                payload: JSON.stringify(payload, null, 2),
                report: payload,
            },
        };
        const artifact = await reportingService.generate(request, access);
        const record = await reportStore.record({
            reportId,
            reportType: input.reportType,
            templateId: template.id,
            tenantId,
            artifact,
        });
        res.status(201).json({
            reportId: record.id,
            downloadUrl: `/api/reports/${record.id}/download`,
            manifest: record.manifest,
            signature: record.signature,
            receipt: record.receipt,
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get('/reports/:id', (req, res) => {
    const access = req.accessContext;
    if (!access?.tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
    }
    const record = reportStore.get(req.params.id, access.tenantId);
    if (!record) {
        res.status(404).json({ error: 'Report not found' });
        return;
    }
    res.json({
        reportId: record.id,
        reportType: record.reportType,
        templateId: record.templateId,
        createdAt: record.createdAt,
        format: record.format,
        manifest: record.manifest,
        signature: record.signature,
        receipt: record.receipt,
    });
});
router.get('/reports/:id/download', (req, res) => {
    const access = req.accessContext;
    if (!access?.tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
    }
    const record = reportStore.get(req.params.id, access.tenantId);
    if (!record) {
        res.status(404).json({ error: 'Report not found' });
        return;
    }
    res.setHeader('Content-Type', record.artifact.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${record.artifact.fileName}"`);
    res.setHeader('X-Report-Id', record.id);
    res.send(record.artifact.buffer);
});
exports.default = router;
