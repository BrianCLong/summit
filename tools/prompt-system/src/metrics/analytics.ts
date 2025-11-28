/**
 * Analytics engine - computes statistics from usage metrics
 */

import type { PromptUsageMetric, TemplateAnalytics } from '../core/types.js';
import { UsageTracker } from './tracker.js';

export class AnalyticsEngine {
  private tracker: UsageTracker;

  constructor() {
    this.tracker = new UsageTracker();
  }

  /**
   * Get analytics for a specific template
   */
  getTemplateAnalytics(templateId: string): TemplateAnalytics {
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
  getAllAnalytics(): TemplateAnalytics[] {
    const metrics = this.tracker.getAll();
    const templateIds = new Set(metrics.map(m => m.templateId));

    return Array.from(templateIds).map(templateId =>
      this.getTemplateAnalytics(templateId)
    );
  }

  /**
   * Get top templates by usage
   */
  getTopByUsage(limit: number = 10): TemplateAnalytics[] {
    return this.getAllAnalytics()
      .sort((a, b) => b.totalUsage - a.totalUsage)
      .slice(0, limit);
  }

  /**
   * Get top templates by success rate
   */
  getTopBySuccessRate(limit: number = 10): TemplateAnalytics[] {
    return this.getAllAnalytics()
      .filter(a => a.totalUsage >= 5) // Minimum usage threshold
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, limit);
  }

  /**
   * Get trending templates
   */
  getTrending(limit: number = 10): TemplateAnalytics[] {
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
