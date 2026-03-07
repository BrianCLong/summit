export class AiInfluenceCampaignEnricher {
  enrich(campaignData: any): any {
    // Deterministic enrichment
    // Sort array elements to maintain determinism
    const enriched = { ...campaignData };
    if (enriched.actor_ids) enriched.actor_ids.sort();
    if (enriched.objectives) enriched.objectives.sort();
    if (enriched.tactics) {
      enriched.tactics.sort((a: any, b: any) => a.tactic_id.localeCompare(b.tactic_id));
      enriched.tactics.forEach((t: any) => t.technique_ids.sort());
    }
    if (enriched.ai_usage) enriched.ai_usage.sort((a: any, b: any) => a.phase.localeCompare(b.phase));
    if (enriched.evidence) enriched.evidence.sort((a: any, b: any) => a.evidence_id.localeCompare(b.evidence_id));

    return enriched;
  }
}
