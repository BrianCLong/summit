"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeuristicDifficultyScorer = void 0;
class HeuristicDifficultyScorer {
    LENGTH_THRESHOLD_MEDIUM = 100;
    LENGTH_THRESHOLD_HARD = 500;
    COMPLEX_KEYWORDS = ['analyze', 'compare', 'evaluate', 'synthesize', 'design', 'architect'];
    DOMAIN_KEYWORDS = {
        'coding': ['code', 'function', 'class', 'api', 'bug', 'test', 'script', 'python', 'java', 'typescript', 'sql'],
        'math': ['calculate', 'compute', 'equation', 'formula'],
        'writing': ['write', 'draft', 'essay', 'blog', 'article'],
    };
    async estimate(query, context) {
        const reasons = [];
        let score = 0.1; // Baseline
        // 1. Length heuristic
        if (query.length > this.LENGTH_THRESHOLD_HARD) {
            score += 0.4;
            reasons.push('Query length indicates high complexity');
        }
        else if (query.length > this.LENGTH_THRESHOLD_MEDIUM) {
            score += 0.2;
            reasons.push('Query length indicates medium complexity');
        }
        // 2. Keyword heuristic
        const lowerQuery = query.toLowerCase();
        let keywordCount = 0;
        for (const keyword of this.COMPLEX_KEYWORDS) {
            if (lowerQuery.includes(keyword)) {
                keywordCount++;
            }
        }
        if (keywordCount > 0) {
            const increment = Math.min(0.4, keywordCount * 0.1);
            score += increment;
            reasons.push(`Contains ${keywordCount} complexity keywords`);
        }
        // 3. Domain detection
        let detectedDomain = 'general';
        let maxMatches = 0;
        for (const [domain, keywords] of Object.entries(this.DOMAIN_KEYWORDS)) {
            let matches = 0;
            for (const keyword of keywords) {
                if (lowerQuery.includes(keyword)) {
                    matches++;
                }
            }
            if (matches > maxMatches) {
                maxMatches = matches;
                detectedDomain = domain;
            }
        }
        // Coding and math often require more depth
        if (detectedDomain === 'coding' || detectedDomain === 'math') {
            score += 0.1;
            reasons.push(`Domain '${detectedDomain}' implies higher complexity`);
        }
        // Clamp score
        score = Math.min(1, Math.max(0, score));
        // Determine band
        let band = 'easy';
        if (score >= 0.7) {
            band = 'hard';
        }
        else if (score >= 0.4) {
            band = 'medium';
        }
        // Recommended depth
        let recommendedDepth = 1;
        if (band === 'hard')
            recommendedDepth = 3;
        else if (band === 'medium')
            recommendedDepth = 2;
        return {
            score,
            band,
            domain: detectedDomain,
            recommendedDepth,
            reasons,
        };
    }
}
exports.HeuristicDifficultyScorer = HeuristicDifficultyScorer;
