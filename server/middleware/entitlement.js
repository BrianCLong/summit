"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFeature = requireFeature;
const opa_wasm_1 = require("@open-policy-agent/opa-wasm");
function requireFeature(feature) {
    return (req, res, next) => (0, opa_wasm_1.evaluate)('entitlements/allow', { plan: req.tenant.plan, feature })
        ? next()
        : res.status(402).json({ error: 'feature_not_in_plan' });
}
