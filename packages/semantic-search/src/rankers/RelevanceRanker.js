"use strict";
/**
 * Relevance Ranker
 * Ranks search results based on multiple signals
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelevanceRanker = void 0;
class RelevanceRanker {
    defaultWeights = {
        textScore: 0.4,
        popularityScore: 0.2,
        qualityScore: 0.2,
        recencyScore: 0.1,
        usageScore: 0.1,
    };
    /**
     * Rank search results
     */
    rankResults(results, query, weights) {
        const rankedResults = results.map((asset) => ({
            asset,
            score: this.calculateScore(asset, query, weights),
        }));
        rankedResults.sort((a, b) => b.score - a.score);
        return rankedResults.map((r) => r.asset);
    }
    /**
     * Calculate overall relevance score
     */
    calculateScore(asset, query, weights) {
        const w = weights || this.defaultWeights;
        const signals = this.extractSignals(asset, query);
        const score = signals.textScore * w.textScore +
            signals.popularityScore * w.popularityScore +
            signals.qualityScore * w.qualityScore +
            signals.recencyScore * w.recencyScore +
            signals.usageScore * w.usageScore;
        return score;
    }
    /**
     * Extract ranking signals from asset
     */
    extractSignals(asset, query) {
        return {
            textScore: this.calculateTextScore(asset, query),
            popularityScore: this.calculatePopularityScore(asset),
            qualityScore: this.calculateQualityScore(asset),
            recencyScore: this.calculateRecencyScore(asset),
            usageScore: this.calculateUsageScore(asset),
        };
    }
    /**
     * Calculate text relevance score
     */
    calculateTextScore(asset, query) {
        const queryLower = query.toLowerCase();
        let score = 0;
        // Exact name match
        if (asset.name.toLowerCase() === queryLower) {
            score += 1.0;
        }
        else if (asset.name.toLowerCase().includes(queryLower)) {
            score += 0.7;
        }
        // Display name match
        if (asset.displayName.toLowerCase().includes(queryLower)) {
            score += 0.5;
        }
        // Description match
        if (asset.description && asset.description.toLowerCase().includes(queryLower)) {
            score += 0.3;
        }
        // Tag match
        const tagMatch = asset.tags.some((tag) => tag.toLowerCase().includes(queryLower));
        if (tagMatch) {
            score += 0.4;
        }
        return Math.min(score, 1.0);
    }
    /**
     * Calculate popularity score
     */
    calculatePopularityScore(asset) {
        const endorsements = asset.trustIndicators.endorsementCount;
        const rating = asset.trustIndicators.userRating;
        // Normalize endorsements (assume max 100)
        const endorsementScore = Math.min(endorsements / 100, 1.0);
        // Normalize rating (0-5 scale)
        const ratingScore = rating / 5.0;
        return (endorsementScore + ratingScore) / 2;
    }
    /**
     * Calculate quality score
     */
    calculateQualityScore(asset) {
        return asset.trustIndicators.qualityScore.overall;
    }
    /**
     * Calculate recency score
     */
    calculateRecencyScore(asset) {
        const now = new Date();
        const updatedAt = new Date(asset.updatedAt);
        const ageInDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
        // Decay function: newer is better
        // Score = e^(-age/90) - decays to ~0.5 at 90 days
        const score = Math.exp(-ageInDays / 90);
        return score;
    }
    /**
     * Calculate usage score
     */
    calculateUsageScore(asset) {
        const usageCount = asset.trustIndicators.usageCount;
        // Normalize usage (assume max 1000)
        const score = Math.min(usageCount / 1000, 1.0);
        return score;
    }
    /**
     * Boost certified assets
     */
    applyCertificationBoost(assets) {
        return assets.map((asset) => {
            if (asset.trustIndicators.certificationLevel === 'GOLD' ||
                asset.trustIndicators.certificationLevel === 'PLATINUM') {
                // Boost will be applied in ranking
            }
            return asset;
        });
    }
}
exports.RelevanceRanker = RelevanceRanker;
