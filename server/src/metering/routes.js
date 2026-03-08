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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meteringRouter = void 0;
const express_1 = __importDefault(require("express"));
const persistence_js_1 = require("./persistence.js");
const quotas_js_1 = require("./quotas.js");
const plans_js_1 = require("../usage/plans.js");
const auth_js_1 = require("../middleware/auth.js");
exports.meteringRouter = express_1.default.Router();
// Middleware to ensure admin access
const ensureAdmin = (req, res, next) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    // Check for admin role
    if (user.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
    }
    next();
};
// GET /summary?tenantId=&from=&to=
exports.meteringRouter.get('/summary', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { tenantId, from, to } = req.query;
        const targetTenantId = tenantId || req.user?.tenantId;
        if (!targetTenantId) {
            res.status(400).json({ error: 'Tenant ID required' });
            return;
        }
        // Tenant Isolation
        const currentUser = req.user;
        if (currentUser?.tenantId && currentUser.tenantId !== targetTenantId) {
            // Unless admin
            if (currentUser.role !== 'admin') {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }
        }
        const usage = await persistence_js_1.persistentUsageRepository.list(targetTenantId, from, to);
        // Also fetch Plan and Effective Limits
        const plan = await plans_js_1.planService.getPlanForTenant(targetTenantId);
        const limits = await quotas_js_1.quotaManager.getEffectiveQuota(targetTenantId);
        res.json({
            plan: {
                id: plan.id,
                name: plan.name,
                limits: plan.limits
            },
            effectiveQuotas: limits,
            usage: usage
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /finops/usage?tenant_id=&from=&to=
exports.meteringRouter.get('/finops/usage', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { tenant_id, from, to } = req.query;
        const targetTenantId = tenant_id || req.user?.tenantId;
        if (!targetTenantId) {
            return res.status(400).json({ error: 'tenant_id required' });
        }
        // Auth check
        const user = req.user;
        if (user.role !== 'admin' && user.tenantId !== targetTenantId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const usage = await persistence_js_1.persistentUsageRepository.list(targetTenantId, from, to);
        res.json({
            tenantId: targetTenantId,
            from,
            to,
            data: usage,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /finops/costs?tenant_id=&from=&to=
exports.meteringRouter.get('/finops/costs', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { tenant_id, from, to } = req.query;
        const targetTenantId = tenant_id || req.user?.tenantId;
        if (!targetTenantId) {
            return res.status(400).json({ error: 'tenant_id required' });
        }
        // Auth check
        const user = req.user;
        if (user.role !== 'admin' && user.tenantId !== targetTenantId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        // In a real system, we'd join usage to pricing.
        // For MVP, we use the BudgetManager spending report if available.
        const { costAwareScheduler } = await Promise.resolve().then(() => __importStar(require('../conductor/scheduling/cost-aware-scheduler.js')));
        const report = await costAwareScheduler.getSpendingReport(targetTenantId);
        res.json({
            tenantId: targetTenantId,
            currency: 'USD',
            totalCost: report.totalSpend,
            breakdown: report.topCostDrivers,
            daily: report.dailyBreakdown,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /quotas (Admin only) - Sets overrides
exports.meteringRouter.post('/quotas', auth_js_1.ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const { tenantId, config } = req.body;
        if (!tenantId || !config) {
            res.status(400).json({ error: 'Missing tenantId or config' });
            return;
        }
        await quotas_js_1.quotaManager.setQuotaOverride(tenantId, config);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /plans/assign (Admin only)
exports.meteringRouter.post('/plans/assign', auth_js_1.ensureAuthenticated, ensureAdmin, async (req, res) => {
    try {
        const { tenantId, planId } = req.body;
        if (!tenantId || !planId) {
            res.status(400).json({ error: 'Missing tenantId or planId' });
            return;
        }
        await plans_js_1.planService.setPlanForTenant(tenantId, planId);
        res.json({ success: true, message: `Plan ${planId} assigned to ${tenantId}` });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
