"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEGMENT_THRESHOLDS = exports.DEFAULT_WEIGHTS = void 0;
exports.scoreTier = scoreTier;
exports.determineSegment = determineSegment;
const types_1 = require("./types");
exports.DEFAULT_WEIGHTS = {
    revenueInfluence: 0.4,
    deliveryQuality: 0.25,
    securityPosture: 0.2,
    supportMaturity: 0.15,
};
exports.SEGMENT_THRESHOLDS = {
    [types_1.PartnerSegment.STRATEGIC]: 4.0,
    [types_1.PartnerSegment.GROWTH]: 2.5,
    [types_1.PartnerSegment.LONG_TAIL]: 0,
};
function scoreTier(criteria, weights = exports.DEFAULT_WEIGHTS) {
    const weightedScore = criteria.revenueInfluence * weights.revenueInfluence +
        criteria.deliveryQuality * weights.deliveryQuality +
        criteria.securityPosture * weights.securityPosture +
        criteria.supportMaturity * weights.supportMaturity;
    const maxScore = 5 * weights.revenueInfluence +
        5 * weights.deliveryQuality +
        5 * weights.securityPosture +
        5 * weights.supportMaturity;
    return {
        weightedScore,
        normalizedScore: parseFloat(((weightedScore / maxScore) * 5).toFixed(2)),
        criteriaBreakdown: {
            revenueInfluence: criteria.revenueInfluence * weights.revenueInfluence,
            deliveryQuality: criteria.deliveryQuality * weights.deliveryQuality,
            securityPosture: criteria.securityPosture * weights.securityPosture,
            supportMaturity: criteria.supportMaturity * weights.supportMaturity,
        },
    };
}
function determineSegment(score) {
    if (score.normalizedScore >= exports.SEGMENT_THRESHOLDS[types_1.PartnerSegment.STRATEGIC]) {
        return types_1.PartnerSegment.STRATEGIC;
    }
    if (score.normalizedScore >= exports.SEGMENT_THRESHOLDS[types_1.PartnerSegment.GROWTH]) {
        return types_1.PartnerSegment.GROWTH;
    }
    return types_1.PartnerSegment.LONG_TAIL;
}
