/**
 * Impact analyzer
 * Analyzes the impact level of an issue (blocker/high/medium/low)
 */
export function analyzeImpact(item, impactRules) {
    // If already has impact from source, use it as baseline
    const baselineImpact = item.impact;
    const text = `${item.title} ${item.description}`.toLowerCase();
    let maxScore = 0;
    let detectedImpact = baselineImpact;
    // Check each impact rule
    for (const rule of impactRules) {
        let ruleScore = 0;
        // Keyword matching
        for (const keyword of rule.keywords) {
            if (text.includes(keyword.toLowerCase())) {
                ruleScore += rule.score * 0.3;
            }
        }
        // Pattern matching
        for (const pattern of rule.patterns) {
            if (pattern.test(text)) {
                ruleScore += rule.score * 0.5;
            }
        }
        // Check priority field
        if (item.priority) {
            const priorityLower = item.priority.toLowerCase();
            for (const keyword of rule.keywords) {
                if (priorityLower.includes(keyword.toLowerCase())) {
                    ruleScore += rule.score * 0.2;
                }
            }
        }
        if (ruleScore > maxScore) {
            maxScore = ruleScore;
            detectedImpact = rule.level;
        }
    }
    // If no strong signal detected, keep baseline
    if (maxScore < 10) {
        maxScore = getBaselineScore(baselineImpact);
    }
    return { impact: detectedImpact, score: maxScore };
}
function getBaselineScore(impact) {
    switch (impact) {
        case 'blocker':
            return 100;
        case 'high':
            return 75;
        case 'medium':
            return 50;
        case 'low':
            return 25;
    }
}
//# sourceMappingURL=impact-analyzer.js.map