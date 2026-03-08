"use strict";
// @ts-nocheck
// server/src/routes/resources.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quota_manager_js_1 = require("../lib/resources/quota-manager.js");
const budget_tracker_js_1 = require("../lib/resources/budget-tracker.js");
const router = (0, express_1.Router)();
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    }
    else {
        res.status(403).send('Forbidden');
    }
};
router.get('/quotas/:tenantId', (req, res) => {
    const { tenantId } = req.params;
    const quotas = quota_manager_js_1.quotaManager.getTenantQuotas(tenantId);
    if (quotas) {
        res.json(quotas);
    }
    else {
        res.status(404).send('Not Found');
    }
});
router.post('/quotas/:tenantId', adminOnly, (req, res) => {
    const { tenantId } = req.params;
    const newQuotas = req.body;
    quota_manager_js_1.quotaManager.updateTenantQuotas(tenantId, newQuotas);
    res.status(200).send('OK');
});
// A helper function to extract usage from a QuotaMap
const getUsage = (quotaMap) => {
    return Object.entries(quotaMap).reduce((acc, [resource, quota]) => {
        if (quota) {
            acc[resource] = quota.usage;
        }
        return acc;
    }, {});
};
router.get('/usage/:tenantId', (req, res) => {
    const { tenantId } = req.params;
    const quotas = quota_manager_js_1.quotaManager.getTenantQuotas(tenantId);
    if (quotas) {
        const usageReport = {
            org: getUsage(quotas.org),
            team: quotas.team ? Object.entries(quotas.team).reduce((acc, [teamId, teamQuotas]) => {
                acc[teamId] = getUsage(teamQuotas);
                return acc;
            }, {}) : {},
            user: quotas.user ? Object.entries(quotas.user).reduce((acc, [userId, userQuotas]) => {
                acc[userId] = getUsage(userQuotas);
                return acc;
            }, {}) : {},
        };
        res.json(usageReport);
    }
    else {
        res.status(404).send('Not Found');
    }
});
router.get('/budget/:tenantId', (req, res) => {
    const { tenantId } = req.params;
    const budget = budget_tracker_js_1.budgetTracker.getBudgetStatus(tenantId);
    if (budget) {
        res.json(budget);
    }
    else {
        res.status(404).send('Not Found');
    }
});
exports.default = router;
