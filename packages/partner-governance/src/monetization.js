"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePayout = calculatePayout;
exports.applyEntitlementOverage = applyEntitlementOverage;
function calculatePayout(lineItems) {
    const auditTrail = [];
    let net = 0;
    lineItems.forEach((item) => {
        const share = item.gross * item.sharePercentage;
        const adjustments = item.refunds + item.disputes + item.taxWithholding;
        const itemNet = share - adjustments;
        auditTrail.push(`${item.partnerId}:${item.model} gross=${item.gross.toFixed(2)} share=${share.toFixed(2)} adjustments=${adjustments.toFixed(2)} net=${itemNet.toFixed(2)}`);
        net += itemNet;
    });
    return { net, auditTrail };
}
function applyEntitlementOverage(currentQuota, tier, overagePercent) {
    const maxOverage = tier === 'strategic' ? 0.5 : tier === 'growth' ? 0.25 : 0.1;
    const allowedOverage = Math.min(overagePercent, maxOverage);
    return Math.floor(currentQuota * (1 + allowedOverage));
}
