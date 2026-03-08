"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.operationsRouter = void 0;
const express_1 = require("express");
const rbac_middleware_js_1 = require("../auth/rbac-middleware.js");
const feature_flags_js_1 = require("../config/feature-flags.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const router = (0, express_1.Router)();
exports.operationsRouter = router;
const requireOpsPermission = (0, rbac_middleware_js_1.requireAnyPermission)('admin:*', 'ops:*', 'operations:*');
router.use(rbac_middleware_js_1.authenticateUser);
router.get('/flags', requireOpsPermission, (_req, res) => {
    res.json({ flags: (0, feature_flags_js_1.flagsSnapshot)() });
});
router.post('/pricing/refresh', requireOpsPermission, (req, res) => {
    const flags = (0, feature_flags_js_1.getFeatureFlags)();
    if (!flags.PRICING_REFRESH_ENABLED) {
        (0, feature_flags_js_1.recordPricingRefreshBlocked)();
        logger_js_1.default.warn('Pricing refresh blocked by feature flag', {
            path: req.path,
            tenantId: req.user?.tenantId,
        });
        return res
            .status(409)
            .json({ error: 'pricing refresh disabled by feature flag' });
    }
    logger_js_1.default.info('Pricing refresh accepted', {
        tenantId: req.user?.tenantId,
        hasBody: Boolean(req.body),
    });
    res.status(202).json({ ok: true, message: 'pricing refresh accepted' });
});
