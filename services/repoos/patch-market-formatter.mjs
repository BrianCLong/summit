/**
 * Maps an internal priority score to required classifications: critical, high, medium, low
 */
export function classifyScore(score) {
    if (score >= 0.75) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.45) return 'medium';
    return 'low';
}

/**
 * Generates the recommended action based on classification
 */
export function getRecommendedAction(classification) {
    switch(classification) {
        case 'critical': return 'merge_immediately';
        case 'high': return 'queue_next_cycle';
        case 'medium': return 'standard_review';
        case 'low': return 'defer_or_reject';
        default: return 'review';
    }
}

/**
 * Calculates deterministic next review date based on classification
 * Returns YYYY-MM-DD
 */
export function calculateNextReviewDate(classification, baseDateStr = null) {
    const baseDate = baseDateStr ? new Date(baseDateStr) : new Date();

    let daysToAdd = 1;
    if (classification === 'high') daysToAdd = 2;
    if (classification === 'medium') daysToAdd = 7;
    if (classification === 'low') daysToAdd = 30;

    // Create new date to avoid mutating original
    const nextDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return nextDate.toISOString().split('T')[0];
}

/**
 * Formats raw queue data into the Operator Output Schema
 */
export function formatOperatorJson(queueData, timestamp = null) {
    const baseDate = timestamp || queueData.timestamp || new Date().toISOString();
    const queue = queueData.queue || [];

    const recommendations = queue.map(item => {
        const priorityScore = typeof item.priority === 'number' ? item.priority : 0;
        const classification = classifyScore(priorityScore);

        let evidenceRefs = [];
        if (item.number) evidenceRefs.push(`pr:${item.number}`);
        if (item.scores) {
            // Sort keys to maintain determinism
            const keys = Object.keys(item.scores).sort();
            for (const key of keys) {
                 const value = item.scores[key];
                 if (typeof value === 'number') {
                     evidenceRefs.push(`score:${key}=${value.toFixed(2)}`);
                 }
            }
        }

        return {
            patch_id: item.number ? `PR-${item.number}` : 'UNKNOWN',
            priority_score: Number(priorityScore.toFixed(2)),
            classification: classification,
            evidence_refs: evidenceRefs,
            recommended_action: getRecommendedAction(classification),
            next_review_date: calculateNextReviewDate(classification, baseDate)
        };
    });

    return {
        timestamp: baseDate,
        total_recommendations: recommendations.length,
        recommendations
    };
}

/**
 * Formats the structured JSON into an Operator Markdown Report
 */
export function formatOperatorMarkdown(operatorJson) {
    let md = `# Patch Market Prioritization Report\n\n`;
    md += `*Generated: ${operatorJson.timestamp}*\n\n`;

    md += `| Patch ID | Priority | Classification | Recommended Action | Next Review | Evidence |\n`;
    md += `|---|---|---|---|---|---|\n`;

    for (const rec of operatorJson.recommendations) {
        const evidenceStr = rec.evidence_refs.join('<br>');
        md += `| ${rec.patch_id} | ${rec.priority_score.toFixed(2)} | **${rec.classification.toUpperCase()}** | \`${rec.recommended_action}\` | ${rec.next_review_date} | ${evidenceStr} |\n`;
    }

    return md;
}
