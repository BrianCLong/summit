"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiInfluenceCampaignEnricher = void 0;
class AiInfluenceCampaignEnricher {
    enrich(campaignData) {
        // Deterministic enrichment
        // Sort array elements to maintain determinism
        const enriched = { ...campaignData };
        if (enriched.actor_ids)
            enriched.actor_ids.sort();
        if (enriched.objectives)
            enriched.objectives.sort();
        if (enriched.tactics) {
            enriched.tactics.sort((a, b) => a.tactic_id.localeCompare(b.tactic_id));
            enriched.tactics.forEach((t) => t.technique_ids.sort());
        }
        if (enriched.ai_usage)
            enriched.ai_usage.sort((a, b) => a.phase.localeCompare(b.phase));
        if (enriched.evidence)
            enriched.evidence.sort((a, b) => a.evidence_id.localeCompare(b.evidence_id));
        return enriched;
    }
}
exports.AiInfluenceCampaignEnricher = AiInfluenceCampaignEnricher;
