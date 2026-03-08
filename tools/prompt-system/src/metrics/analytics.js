"use strict";
/**
 * Analytics engine - computes statistics from usage metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsEngine = void 0;
const tracker_js_1 = require("./tracker.js");
class AnalyticsEngine {
    tracker;
    constructor() {
        this.tracker = new tracker_js_1.UsageTracker();
    }
    /**
     * Get analytics for a specific template
     */
    getTemplateAnalytics(templateId) {
        const metrics = this.tracker.getForTemplate(templateId);
        if (metrics.length === 0) {
            return {
                templateId,
                totalUsage: 0,
                successRate: 0,
                avgDuration: 0,
                avgQuality: 0,
                avgEffectiveness: 0,
                lastUsed: 'never',
                trendingScore: 0,
            };
        }
        const withOutcome = metrics.filter(m => m.outcome);
        const successCount = withOutcome.filter(m => m.outcome === 'success').length;
        const successRate = withOutcome.length > 0 ? (successCount / withOutcome.length) * 100 : 0;
        const withDuration = metrics.filter(m => m.duration);
        const avgDuration = withDuration.length > 0
            ? withDuration.reduce((sum, m) => sum + (m.duration || 0), 0) / withDuration.length
            : 0;
        const withFeedback = metrics.filter(m => m.feedback);
        const avgQuality = withFeedback.length > 0
            ? withFeedback.reduce((sum, m) => sum + (m.feedback?.quality || 0), 0) / withFeedback.length
            : 0;
        const avgEffectiveness = withFeedback.length > 0
            ? withFeedback.reduce((sum, m) => sum + (m.feedback?.effectiveness || 0), 0) / withFeedback.length
            : 0;
        const timestamps = metrics.map(m => new Date(m.timestamp).getTime());
        const lastUsed = new Date(Math.max(...timestamps)).toISOString();
        // Trending score: recent usage + success rate
        const recentMetrics = this.tracker.getForPeriod(7).filter(m => m.templateId === templateId);
        const recentUsage = recentMetrics.length;
        const trendingScore = (recentUsage * 10) + successRate;
        return {
            templateId,
            totalUsage: metrics.length,
            successRate,
            avgDuration,
            avgQuality,
            avgEffectiveness,
            lastUsed,
            trendingScore,
        };
    }
    /**
     * Get analytics for all templates
     */
    getAllAnalytics() {
        const metrics = this.tracker.getAll();
        const templateIds = new Set(metrics.map(m => m.templateId));
        return Array.from(templateIds).map(templateId => this.getTemplateAnalytics(templateId));
    }
    /**
     * Get top templates by usage
     */
    getTopByUsage(limit = 10) {
        return this.getAllAnalytics()
            .sort((a, b) => b.totalUsage - a.totalUsage)
            .slice(0, limit);
    }
    /**
     * Get top templates by success rate
     */
    getTopBySuccessRate(limit = 10) {
        return this.getAllAnalytics()
            .filter(a => a.totalUsage >= 5) // Minimum usage threshold
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, limit);
    }
    /**
     * Get trending templates
     */
    getTrending(limit = 10) {
        return this.getAllAnalytics()
            .sort((a, b) => b.trendingScore - a.trendingScore)
            .slice(0, limit);
    }
    /**
     * Get overall statistics
     */
    getOverallStats() {
        const metrics = this.tracker.getAll();
        const analytics = this.getAllAnalytics();
        const totalUsage = metrics.length;
        const uniqueTemplates = analytics.length;
        const withOutcome = metrics.filter(m => m.outcome);
        const successCount = withOutcome.filter(m => m.outcome === 'success').length;
        const overallSuccessRate = withOutcome.length > 0
            ? (successCount / withOutcome.length) * 100
            : 0;
        const withFeedback = metrics.filter(m => m.feedback);
        const avgQuality = withFeedback.length > 0
            ? withFeedback.reduce((sum, m) => sum + (m.feedback?.quality || 0), 0) / withFeedback.length
            : 0;
        return {
            totalUsage,
            uniqueTemplates,
            overallSuccessRate,
            avgQuality,
            mostUsed: this.getTopByUsage(1)[0]?.templateId || 'none',
            trending: this.getTrending(3).map(a => a.templateId),
        };
    }
}
exports.AnalyticsEngine = AnalyticsEngine;
