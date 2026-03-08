"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityResolver = void 0;
exports.createResolver = createResolver;
class EntityResolver {
    threshold = 0.7;
    constructor(threshold = 0.7) {
        this.threshold = threshold;
    }
    match(entityA, entityB) {
        const featureScores = {};
        const explanation = [];
        // Name similarity (exact, Levenshtein, soundex)
        if (entityA.name && entityB.name) {
            const nameScore = this.stringSimilarity(entityA.name, entityB.name);
            featureScores.name = nameScore;
            explanation.push(`Name similarity: ${(nameScore * 100).toFixed(1)}%`);
        }
        // Email exact match
        if (entityA.email && entityB.email) {
            const emailScore = entityA.email.toLowerCase() === entityB.email.toLowerCase() ? 1.0 : 0.0;
            featureScores.email = emailScore;
            explanation.push(`Email match: ${emailScore === 1 ? 'exact' : 'no match'}`);
        }
        // Phone similarity (normalize and compare)
        if (entityA.phone && entityB.phone) {
            const phoneA = this.normalizePhone(entityA.phone);
            const phoneB = this.normalizePhone(entityB.phone);
            const phoneScore = phoneA === phoneB ? 1.0 : 0.0;
            featureScores.phone = phoneScore;
            explanation.push(`Phone match: ${phoneScore === 1 ? 'exact' : 'no match'}`);
        }
        // Weighted average
        const weights = { name: 0.4, email: 0.4, phone: 0.2 };
        let overallScore = 0;
        let totalWeight = 0;
        Object.keys(featureScores).forEach(key => {
            const weight = weights[key] || 0.33;
            overallScore += featureScores[key] * weight;
            totalWeight += weight;
        });
        overallScore = totalWeight > 0 ? overallScore / totalWeight : 0;
        let decision = 'NO_MATCH';
        if (overallScore >= this.threshold) {
            decision = 'MATCH';
        }
        else if (overallScore >= this.threshold * 0.7) {
            decision = 'MANUAL_REVIEW';
        }
        return {
            entityA: entityA.id,
            entityB: entityB.id,
            overallScore,
            featureScores,
            decision,
            explanation,
            threshold: this.threshold,
        };
    }
    stringSimilarity(a, b) {
        if (a === b)
            return 1.0;
        const longer = a.length > b.length ? a : b;
        const shorter = a.length > b.length ? b : a;
        if (longer.length === 0)
            return 1.0;
        const editDistance = this.levenshtein(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    levenshtein(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[b.length][a.length];
    }
    normalizePhone(phone) {
        return phone.replace(/\D/g, '');
    }
    evaluateDataset(entities) {
        // Stub for ROC/PR curve evaluation
        return { tp: 0, fp: 0, tn: 0, fn: 0 };
    }
}
exports.EntityResolver = EntityResolver;
function createResolver(threshold) {
    return new EntityResolver(threshold);
}
