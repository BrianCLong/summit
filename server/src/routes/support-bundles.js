"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_js_1 = require("../middleware/auth.js");
const featureFlags_js_1 = require("../lib/featureFlags.js");
const index_js_1 = require("../services/support/index.js");
const router = (0, express_1.Router)();
const SupportBundleSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1),
    reason: zod_1.z.string().min(5).max(2000),
    receiptsLimit: zod_1.z.number().min(1).max(200).optional(),
    sloRunbook: zod_1.z.string().min(1).max(100).optional(),
    sloWindow: zod_1.z.string().min(2).max(20).optional(),
});
const requireFeatureFlag = (flagName) => {
    return (req, res, next) => {
        const context = { userId: req.user?.id, tenantId: req.user?.tenantId };
        if (!(0, featureFlags_js_1.isEnabled)(flagName, context)) {
            res.status(403).json({ error: `Feature '${flagName}' is not enabled` });
            return;
        }
        next();
    };
};
/**
 * Generate support diagnostics bundle
 * POST /api/support-bundles:generate
 */
router.post('/support-bundles:generate', auth_js_1.ensureAuthenticated, requireFeatureFlag('support.bundle'), async (req, res, next) => {
    try {
        const payload = SupportBundleSchema.parse(req.body);
        const user = req.user;
        const userTenantId = (user?.tenantId || user?.defaultTenantId);
        const userRole = user?.role;
        const actor = {
            id: user?.id,
            role: userRole,
            tenantId: userTenantId,
            email: user?.email,
        };
        // SECURITY: Validate cross-tenant access authorization
        // Non-admin users can only generate bundles for their own tenant
        const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'admin'].includes(userRole);
        if (!isAdmin && payload.tenantId !== userTenantId) {
            res.status(403).json({
                error: 'Forbidden: Cannot generate support bundle for another tenant'
            });
            return;
        }
        const result = await index_js_1.supportBundleService.generateBundle({
            actor,
            tenantId: payload.tenantId,
            reason: payload.reason,
            receiptsLimit: payload.receiptsLimit,
            sloRunbook: payload.sloRunbook,
            sloWindow: payload.sloWindow,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
