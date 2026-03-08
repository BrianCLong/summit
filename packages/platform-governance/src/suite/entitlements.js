"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageRecordSchema = exports.entitlementSchema = void 0;
exports.evaluateEntitlement = evaluateEntitlement;
exports.calculateProratedCredit = calculateProratedCredit;
exports.detectUsageAnomalies = detectUsageAnomalies;
const zod_1 = require("zod");
exports.entitlementSchema = zod_1.z.object({
    planId: zod_1.z.string(),
    module: zod_1.z.string(),
    feature: zod_1.z.string(),
    limit: zod_1.z.number().nonnegative(),
    rollover: zod_1.z.boolean().default(false),
    expiresAt: zod_1.z.date().optional(),
});
exports.usageRecordSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    feature: zod_1.z.string(),
    count: zod_1.z.number().nonnegative(),
    occurredAt: zod_1.z.date(),
});
function evaluateEntitlement(entitlement, usage) {
    const totalUsage = usage
        .filter((record) => record.feature === entitlement.feature)
        .reduce((sum, record) => sum + record.count, 0);
    const remaining = entitlement.limit - totalUsage;
    if (remaining < 0) {
        return { allowed: false, remaining, reason: 'limit exceeded' };
    }
    if (entitlement.expiresAt && entitlement.expiresAt.getTime() < Date.now()) {
        return { allowed: false, remaining, reason: 'entitlement expired' };
    }
    return { allowed: true, remaining };
}
function calculateProratedCredit({ oldLimit, newLimit, daysUsed, daysInPeriod }) {
    const unusedPortion = Math.max(oldLimit - (oldLimit * daysUsed) / daysInPeriod, 0);
    const additionalPortion = Math.max((newLimit - oldLimit) * ((daysInPeriod - daysUsed) / daysInPeriod), 0);
    return Math.round(unusedPortion + additionalPortion);
}
function detectUsageAnomalies(entitlement, usage, threshold = 2) {
    const anomalies = [];
    const totalUsage = usage
        .filter((record) => record.feature === entitlement.feature)
        .reduce((sum, record) => sum + record.count, 0);
    if (totalUsage > entitlement.limit * threshold) {
        anomalies.push({ feature: entitlement.feature, expected: entitlement.limit, actual: totalUsage });
    }
    return anomalies;
}
