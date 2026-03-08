"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWeeklyThroughputReport = buildWeeklyThroughputReport;
exports.buildToilReport = buildToilReport;
exports.evaluatePrs = evaluatePrs;
exports.summarizeCost = summarizeCost;
exports.sanitizeAlerts = sanitizeAlerts;
const guardrails_js_1 = require("./guardrails.js");
function buildWeeklyThroughputReport(completedItems, blockedItems, mitigations) {
    const blockedReasons = {};
    for (const blocked of blockedItems) {
        blockedReasons[blocked.reason] = (blockedReasons[blocked.reason] ?? 0) + 1;
    }
    return {
        shippedCount: completedItems.reduce((acc, metric) => acc + metric.wipCount, 0),
        blockedCount: blockedItems.length,
        blockedReasons,
        mitigations,
        flow: completedItems,
    };
}
function buildToilReport(toilItems, budgetConfig) {
    const census = toilItems.map((item) => ({
        item,
        needsAutomation: !item.automated || !item.auditLogging || !item.rollbackPlan || !item.dryRunSupported,
    }));
    const budgetBreaches = (0, guardrails_js_1.enforceToilBudget)(toilItems, budgetConfig)
        .filter((breach) => breach.breached)
        .map((breach) => ({ owner: breach.owner, hours: breach.hours, budget: breach.budget }));
    return { census, budgetBreaches };
}
function evaluatePrs(prs, lineLimit, fileLimit) {
    return prs.map((pr) => (0, guardrails_js_1.enforcePrGuardrails)(pr, lineLimit, fileLimit));
}
function summarizeCost(entries) {
    const byService = {};
    const byTenant = {};
    let total = 0;
    for (const entry of entries) {
        byService[entry.service] = (byService[entry.service] ?? 0) + entry.amount;
        byTenant[entry.tenant] = (byTenant[entry.tenant] ?? 0) + entry.amount;
        total += entry.amount;
    }
    return { byService, byTenant, total };
}
function sanitizeAlerts(alerts, noiseThreshold) {
    const afterDedup = (0, guardrails_js_1.deduplicateAlerts)(alerts);
    return (0, guardrails_js_1.autoCloseNoisyAlerts)(afterDedup, noiseThreshold);
}
