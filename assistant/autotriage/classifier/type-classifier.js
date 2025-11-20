/**
 * Type classifier
 * Classifies issue type (bug/tech-debt/feature/enhancement)
 */
export function classifyType(item, typeRules) {
    // If already has type from source, use it as baseline
    const baselineType = item.type;
    const text = `${item.title} ${item.description}`.toLowerCase();
    const typeScores = new Map();
    // Check each type rule
    for (const rule of typeRules) {
        let score = 0;
        // Keyword matching
        for (const keyword of rule.keywords) {
            const keywordLower = keyword.toLowerCase();
            if (text.includes(keywordLower)) {
                score += 10;
            }
        }
        // Pattern matching
        for (const pattern of rule.patterns) {
            if (pattern.test(text)) {
                score += 15;
            }
        }
        if (score > 0) {
            typeScores.set(rule.type, score);
        }
    }
    // Return type with highest score
    if (typeScores.size === 0) {
        return baselineType;
    }
    const sortedTypes = Array.from(typeScores.entries()).sort((a, b) => b[1] - a[1]);
    return sortedTypes[0][0];
}
//# sourceMappingURL=type-classifier.js.map