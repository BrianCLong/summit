"use strict";
/**
 * Analytics Reporter
 * Generates analytics reports and dashboards
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsReporter = void 0;
const data_catalog_1 = require("@intelgraph/data-catalog");
class AnalyticsReporter {
    store;
    insightGenerator;
    constructor(store, insightGenerator) {
        this.store = store;
        this.insightGenerator = insightGenerator;
    }
    /**
     * Generate executive summary
     */
    async generateExecutiveSummary(period = data_catalog_1.TimePeriod.MONTH) {
        const [totalAssets, activeUsers, searchQueries, coverageMetrics, adoptionMetrics, topAssets, insights,] = await Promise.all([
            this.store.getTotalAssets(),
            this.store.getActiveUsers(period),
            this.store.getSearchQueries(period),
            this.store.getCoverageMetrics(),
            this.store.getAdoptionMetrics(period),
            this.store.getPopularAssets(10, period),
            this.insightGenerator?.generateInsights(period) || Promise.resolve([]),
        ]);
        return {
            period,
            totalAssets,
            activeUsers,
            searchQueries,
            coverageMetrics,
            adoptionMetrics,
            topAssets,
            keyInsights: insights,
        };
    }
    /**
     * Generate coverage report
     */
    async generateCoverageReport() {
        return this.store.getCoverageMetrics();
    }
    /**
     * Generate adoption report
     */
    async generateAdoptionReport(period = data_catalog_1.TimePeriod.MONTH) {
        return this.store.getAdoptionMetrics(period);
    }
    /**
     * Generate ROI report
     */
    async generateROIReport(period = data_catalog_1.TimePeriod.QUARTER) {
        return this.store.getROIMetrics(period);
    }
    /**
     * Generate usage dashboard data
     */
    async generateUsageDashboard(period = data_catalog_1.TimePeriod.WEEK) {
        const [activeUsers, totalSearches, topAssets, coverage] = await Promise.all([
            this.store.getActiveUsers(period),
            this.store.getSearchQueries(period),
            this.store.getPopularAssets(10, period),
            this.store.getCoverageMetrics(),
        ]);
        return {
            activeUsers,
            totalSearches,
            topAssets,
            coveragePercentage: coverage.coveragePercentage,
        };
    }
    /**
     * Generate quality metrics report
     */
    async generateQualityReport() {
        const coverage = await this.store.getCoverageMetrics();
        const recommendations = [];
        if (coverage.coveragePercentage < 50) {
            recommendations.push('Improve documentation coverage - less than 50% of assets are documented');
        }
        if (coverage.assetsWithOwners < coverage.totalAssets * 0.8) {
            recommendations.push('Assign owners to assets - over 20% of assets lack ownership');
        }
        if (coverage.certifiedAssets < coverage.totalAssets * 0.3) {
            recommendations.push('Increase asset certification - less than 30% of assets are certified');
        }
        if (coverage.assetsWithLineage < coverage.totalAssets * 0.4) {
            recommendations.push('Enhance lineage tracking - over 60% of assets lack lineage information');
        }
        return {
            coverage,
            recommendations,
        };
    }
    /**
     * Calculate health score
     */
    async calculateHealthScore() {
        const coverage = await this.store.getCoverageMetrics();
        // Weighted health score
        const weights = {
            coverage: 0.3,
            quality: 0.3,
            ownership: 0.2,
            certification: 0.2,
        };
        const score = (coverage.coveragePercentage / 100) * weights.coverage +
            coverage.qualityScore * weights.quality +
            (coverage.assetsWithOwners / coverage.totalAssets) * weights.ownership +
            (coverage.certifiedAssets / coverage.totalAssets) * weights.certification;
        return Math.round(score * 100);
    }
}
exports.AnalyticsReporter = AnalyticsReporter;
