"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingRoutes = void 0;
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const rbac_middleware_js_1 = require("../auth/rbac-middleware.js");
const pricing_refresh_js_1 = require("../scheduling/pricing-refresh.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const router = express_1.default.Router();
exports.pricingRoutes = router;
router.post('/refresh', (0, rbac_middleware_js_1.requirePermission)('pricing:update'), async (req, res) => {
    try {
        const authReq = req;
        const result = await (0, pricing_refresh_js_1.refreshPricing)({
            actor: authReq.user?.userId || authReq.user?.email,
            tenantId: authReq.user?.tenantId,
        });
        res.json({
            updatedPools: result.updatedPools,
            skippedPools: result.skippedPools,
            effectiveAt: result.effectiveAt.toISOString(),
        });
    }
    catch (error) {
        logger_js_1.default.error('Pricing refresh API failed', {
            error: error.message,
        });
        res.status(500).json({ error: 'Failed to refresh pricing' });
    }
});
