"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intelCorroborationService = exports.IntelCorroborationService = void 0;
/**
 * IntelCorroborationService
 *
 * Aggregates evidence from multiple sources to produce a confidence score
 * and track corroborating and disputing sources. Analysts can also provide
 * manual ratings which are averaged into the final confidence.
 */
class IntelCorroborationService {
    ratings = new Map();
    addAnalystRating(claimId, rating) {
        if (rating < 0 || rating > 1) {
            throw new Error('Rating must be between 0 and 1');
        }
        const current = this.ratings.get(claimId) || { sum: 0, count: 0 };
        current.sum += rating;
        current.count++;
        this.ratings.set(claimId, current);
    }
    getAnalystAverage(claimId) {
        const agg = this.ratings.get(claimId);
        if (!agg || agg.count === 0)
            return null;
        return agg.sum / agg.count;
    }
    evaluateClaim(claimId, evidence) {
        let supportWeight = 0;
        let totalWeight = 0;
        const corroboratedBy = [];
        const disputedBy = [];
        const now = Date.now();
        for (const e of evidence) {
            const ts = typeof e.timestamp === 'number'
                ? e.timestamp
                : new Date(e.timestamp).getTime();
            const ageDays = Math.max(0, (now - ts) / (1000 * 60 * 60 * 24));
            const recency = 1 / (1 + ageDays); // simple time decay
            const weight = (e.trust || 0) * recency;
            totalWeight += weight;
            if (e.supports) {
                supportWeight += weight;
                corroboratedBy.push(e.source);
            }
            else {
                disputedBy.push(e.source);
            }
        }
        const evidenceScore = totalWeight ? supportWeight / totalWeight : 0.5;
        const manual = this.getAnalystAverage(claimId);
        const confidenceScore = manual != null ? (evidenceScore + manual) / 2 : evidenceScore;
        return { confidenceScore, corroboratedBy, disputedBy };
    }
}
exports.IntelCorroborationService = IntelCorroborationService;
exports.intelCorroborationService = new IntelCorroborationService();
