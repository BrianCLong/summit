"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const billing_1 = require("@summit/billing");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.post('/checkout', auth_js_1.ensureAuthenticated, async (req, res) => {
    const { plan } = req.body;
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    if (!tenantId) {
        return res.status(401).json({ error: 'Unauthorized: Tenant context required' });
    }
    try {
        const session = await (0, billing_1.createCheckout)(tenantId, plan);
        res.json({ url: session.url });
    }
    catch (err) {
        logger_js_1.default.error({ err: err.message, tenantId, plan }, 'Failed to create Stripe checkout session');
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
