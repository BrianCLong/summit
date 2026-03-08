"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.precedentService = exports.PrecedentService = void 0;
const ombuds_service_js_1 = require("./ombuds-service.js");
class PrecedentService {
    /**
     * Search precedent catalog (past decisions)
     */
    async search(query) {
        const all = await ombuds_service_js_1.ombudsService.getAllDecisions();
        return all.filter(d => {
            if (query.trigger && d.trigger !== query.trigger)
                return false;
            if (query.ruling && d.ruling !== query.ruling)
                return false;
            if (query.startDate && d.createdAt < query.startDate)
                return false;
            if (query.endDate && d.createdAt > query.endDate)
                return false;
            if (query.tags && query.tags.length > 0) {
                // Match ALL tags for filtering
                const hasAllTags = query.tags.every(t => d.tags.includes(t));
                if (!hasAllTags)
                    return false;
            }
            if (query.textQuery) {
                const text = (d.rationale.summary + ' ' + d.rationale.text).toLowerCase();
                if (!text.includes(query.textQuery.toLowerCase()))
                    return false;
            }
            return true;
        });
    }
    /**
     * Find similar cases based on heuristic scoring
     */
    async findSimilar(request) {
        const all = await ombuds_service_js_1.ombudsService.getAllDecisions();
        const limit = request.limit || 5;
        const scored = all.map(d => {
            let score = 0;
            const matchReasons = [];
            if (d.trigger === request.trigger) {
                score += 10;
                matchReasons.push('Same trigger type');
            }
            if (request.policyRule && d.tags.includes(request.policyRule)) {
                score += 5;
                matchReasons.push(`Matches policy rule: ${request.policyRule}`);
            }
            if (request.sensitivity && d.tags.includes(request.sensitivity)) {
                score += 5;
                matchReasons.push(`Matches data sensitivity: ${request.sensitivity}`);
            }
            return { decision: d, score, matchReasons };
        });
        // Sort by score desc
        scored.sort((a, b) => b.score - a.score);
        // Return top N, only with some relevance
        return scored.filter(s => s.score > 0).slice(0, limit);
    }
}
exports.PrecedentService = PrecedentService;
exports.precedentService = new PrecedentService();
