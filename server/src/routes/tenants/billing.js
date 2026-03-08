"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_js_1 = require("../../middleware/auth.js");
const abac_js_1 = require("../../middleware/abac.js");
const FinopsReportService_js_1 = require("../../services/finops/FinopsReportService.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const http_param_js_1 = require("../../utils/http-param.js");
const router = (0, express_1.Router)({ mergeParams: true });
const BillingExportQuery = zod_1.z.object({
    start: zod_1.z.string().optional(),
    end: zod_1.z.string().optional(),
    format: zod_1.z.enum(['json', 'csv']).default('json'),
});
function attachTenantToBody(req, _res, next) {
    req.body = { ...req.body, tenantId: (0, http_param_js_1.firstStringOr)(req.params.tenantId, '') };
    return next();
}
function ensureTenantScope(req, res, next) {
    const tenantId = (0, http_param_js_1.firstStringOr)(req.params.tenantId, '');
    const userTenant = req.user?.tenantId || req.user?.tenant_id;
    const isSuper = ['SUPER_ADMIN', 'ADMIN', 'admin'].includes(req.user?.role);
    if (!isSuper && userTenant && userTenant !== tenantId) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    return next();
}
router.get('/report', auth_js_1.ensureAuthenticated, ensureTenantScope, attachTenantToBody, (0, abac_js_1.ensurePolicy)('read', 'tenant'), async (req, res) => {
    try {
        const { start, end, format } = BillingExportQuery.parse(req.query);
        const tenantId = (0, http_param_js_1.firstStringOr)(req.params.tenantId, '');
        const report = await FinopsReportService_js_1.finopsReportService.buildReport(tenantId, start, end);
        if (format === 'csv') {
            const csv = FinopsReportService_js_1.finopsReportService.toCsv(report);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="tenant-${tenantId}-billing.csv"`);
            return res.send(csv);
        }
        return res.json({ success: true, data: report });
    }
    catch (error) {
        logger_js_1.default.error({ error }, 'Failed to export tenant billing report');
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
exports.default = router;
