"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.killSwitchGuard = killSwitchGuard;
const opaFeatureFlagClient_js_1 = require("../feature-flags/opaFeatureFlagClient.js");
const context_js_1 = require("../feature-flags/context.js");
function killSwitchGuard(moduleName) {
    return async (req, res, next) => {
        const context = (0, context_js_1.buildContextFromRequest)(req);
        const { decision } = await opaFeatureFlagClient_js_1.featureFlagClient.isKillSwitchActive(moduleName, context);
        if (decision.active) {
            return res.status(503).json({
                message: `Module ${moduleName} is temporarily disabled via kill switch`,
                reason: decision.reason,
                evaluationId: decision.evaluationId,
            });
        }
        return next();
    };
}
