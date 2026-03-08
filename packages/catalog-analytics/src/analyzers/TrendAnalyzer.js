"use strict";
/**
 * Trend Analyzer
 * Analyzes usage trends and generates insights
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendAnalyzer = void 0;
const data_catalog_1 = require("@intelgraph/data-catalog");
class TrendAnalyzer {
    store;
    constructor(store) {
        this.store = store;
    }
    /**
     * Analyze asset popularity trends
     */
    async analyzePopularityTrends(assetId, period = data_catalog_1.TimePeriod.MONTH) {
        const metrics = await this.store.getAssetMetrics(assetId, period);
        if (metrics.length < 2) {
            return data_catalog_1.TrendDirection.STABLE;
        }
        const recent = metrics[metrics.length - 1];
        const previous = metrics[metrics.length - 2];
        const recentScore = this.calculateTrendScore(recent);
        const previousScore = this.calculateTrendScore(previous);
        const change = ((recentScore - previousScore) / previousScore) * 100;
        if (change > 10) {
            return data_catalog_1.TrendDirection.UP;
        }
        else if (change < -10) {
            return data_catalog_1.TrendDirection.DOWN;
        }
        else {
            return data_catalog_1.TrendDirection.STABLE;
        }
    }
    /**
     * Get top trending assets
     */
    async getTrendingAssets(limit = 10, period = data_catalog_1.TimePeriod.WEEK) {
        const popularAssets = await this.store.getPopularAssets(limit * 2, period);
        // Analyze trends for each asset
        const assetsWithTrends = await Promise.all(popularAssets.map(async (asset) => ({
            ...asset,
            trend: await this.analyzePopularityTrends(asset.assetId, period),
        })));
        // Filter for trending up
        const trending = assetsWithTrends
            .filter((a) => a.trend === data_catalog_1.TrendDirection.UP)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        return trending;
    }
    /**
     * Generate insights from trends
     */
    async generateInsights(period = data_catalog_1.TimePeriod.WEEK) {
        const insights = [];
        // Get trending assets
        const trending = await this.getTrendingAssets(5, period);
        if (trending.length > 0) {
            insights.push({
                type: data_catalog_1.InsightType.USAGE_SPIKE,
                title: 'Trending Assets Detected',
                description: `${trending.length} assets are experiencing increased usage`,
                severity: data_catalog_1.InsightSeverity.INFO,
                actionable: false,
                recommendations: [
                    'Review trending assets for quality and documentation',
                    'Consider promoting these assets to other teams',
                ],
            });
        }
        // Get declining assets
        const declining = await this.getDecliningAssets(5, period);
        if (declining.length > 0) {
            insights.push({
                type: data_catalog_1.InsightType.USAGE_DROP,
                title: 'Assets with Declining Usage',
                description: `${declining.length} assets are experiencing decreased usage`,
                severity: data_catalog_1.InsightSeverity.MEDIUM,
                actionable: true,
                recommendations: [
                    'Investigate reasons for declining usage',
                    'Check if assets are deprecated or replaced',
                    'Update documentation to improve discoverability',
                ],
            });
        }
        return insights;
    }
    /**
     * Get assets with declining usage
     */
    async getDecliningAssets(limit = 10, period = data_catalog_1.TimePeriod.WEEK) {
        const popularAssets = await this.store.getPopularAssets(limit * 2, period);
        const assetsWithTrends = await Promise.all(popularAssets.map(async (asset) => ({
            ...asset,
            trend: await this.analyzePopularityTrends(asset.assetId, period),
        })));
        const declining = assetsWithTrends
            .filter((a) => a.trend === data_catalog_1.TrendDirection.DOWN)
            .sort((a, b) => a.score - b.score)
            .slice(0, limit);
        return declining;
    }
    /**
     * Calculate trend score from metrics
     */
    calculateTrendScore(metrics) {
        return (metrics.viewCount * 1.0 +
            metrics.downloadCount * 2.0 +
            metrics.commentCount * 1.5 +
            metrics.shareCount * 3.0 +
            metrics.bookmarkCount * 2.5);
    }
    /**
     * Detect anomalies in usage patterns
     */
    async detectAnomalies(assetId, period = data_catalog_1.TimePeriod.MONTH) {
        const metrics = await this.store.getAssetMetrics(assetId, period);
        const insights = [];
        if (metrics.length < 3) {
            return insights;
        }
        const scores = metrics.map((m) => this.calculateTrendScore(m));
        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        const stdDev = Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length);
        const latest = scores[scores.length - 1];
        // Spike detection (> 2 standard deviations above mean)
        if (latest > avg + 2 * stdDev) {
            insights.push({
                type: data_catalog_1.InsightType.USAGE_SPIKE,
                title: 'Unusual Activity Spike',
                description: 'Asset is experiencing significantly higher usage than normal',
                severity: data_catalog_1.InsightSeverity.INFO,
                actionable: true,
                recommendations: [
                    'Monitor asset performance and availability',
                    'Ensure documentation is up to date',
                ],
            });
        }
        // Drop detection (> 2 standard deviations below mean)
        if (latest < avg - 2 * stdDev) {
            insights.push({
                type: data_catalog_1.InsightType.USAGE_DROP,
                title: 'Unusual Activity Drop',
                description: 'Asset is experiencing significantly lower usage than normal',
                severity: data_catalog_1.InsightSeverity.MEDIUM,
                actionable: true,
                recommendations: [
                    'Check if asset is still accessible',
                    'Review if asset has been deprecated',
                    'Investigate alternative data sources',
                ],
            });
        }
        return insights;
    }
}
exports.TrendAnalyzer = TrendAnalyzer;
