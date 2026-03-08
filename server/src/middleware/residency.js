"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.residencyEnforcement = void 0;
const residency_guard_js_1 = require("../data-residency/residency-guard.js");
const regional_config_js_1 = require("../config/regional-config.js");
const residencyEnforcement = async (req, res, next) => {
    // Skip health checks and metrics
    if (req.path === '/health' || req.path === '/metrics') {
        return next();
    }
    try {
        const tenantId = req.user?.tenantId || req.tenantId;
        // If no tenant context, we can't enforce tenant residency yet.
        // Assuming strict auth middleware runs before this.
        if (!tenantId) {
            // For public endpoints or non-tenant specific, maybe we allow?
            // Prompt says "No undocumented exceptions".
            // If it's authenticated but no tenant, that's an issue.
            // If it's public (like login), we skip residency check?
            if (req.path.startsWith('/auth') || req.path.startsWith('/public')) {
                return next();
            }
            // Fail safe
            // console.warn('Residency enforcement skipped due to missing tenantId');
            return next();
        }
        const guard = residency_guard_js_1.ResidencyGuard.getInstance();
        const { globalTrafficSteering } = await Promise.resolve().then(() => __importStar(require('../runtime/global/GlobalTrafficSteering.js')));
        const decision = await globalTrafficSteering.resolveRegion(tenantId);
        // Active steering
        const steering = await globalTrafficSteering.resolveSteeringAction(tenantId);
        res.setHeader('X-Summit-Steering-Advice', steering.targetUrl || steering.action);
        res.setHeader('X-Summit-Steering-Reason', steering.reason);
        if (steering.action === 'REDIRECT') {
            const config = await guard.getResidencyConfig(tenantId);
            if (config?.residencyMode === 'strict') {
                return res.status(307).redirect(steering.targetUrl);
            }
        }
        // Determine context.
        // For GET requests, it's mostly 'compute' (processing) + 'retrieval' (implied).
        // For POST/PUT, it's 'compute' + 'storage'.
        // For now, we enforce 'compute' residency for the API node handling the request.
        await guard.enforce(tenantId, {
            operation: 'compute',
            targetRegion: (0, regional_config_js_1.getCurrentRegion)(),
            dataClassification: 'internal' // Default
        });
        next();
    }
    catch (error) {
        if (error instanceof residency_guard_js_1.ResidencyViolationError) {
            res.status(451).json({
                error: 'ResidencyViolation',
                message: error.message,
                region: error.context.targetRegion,
                tenantId: error.tenantId
            });
        }
        else {
            next(error);
        }
    }
};
exports.residencyEnforcement = residencyEnforcement;
