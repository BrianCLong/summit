/**
 * Trend Analyzer
 * Analyzes usage trends and generates insights
 */

import {
  PopularAsset,
  TrendDirection,
  Insight,
  InsightType,
  InsightSeverity,
  TimePeriod,
  AssetUsageMetrics,
} from '@intelgraph/data-catalog';

export interface ITrendStore {
  getAssetMetrics(assetId: string, period: TimePeriod): Promise<AssetUsageMetrics[]>;
  getPopularAssets(limit: number, period: TimePeriod): Promise<PopularAsset[]>;
}

export class TrendAnalyzer {
  constructor(private store: ITrendStore) {}

  /**
   * Analyze asset popularity trends
   */
  async analyzePopularityTrends(assetId: string, period: TimePeriod = TimePeriod.MONTH): Promise<TrendDirection> {
    const metrics = await this.store.getAssetMetrics(assetId, period);

    if (metrics.length < 2) {
      return TrendDirection.STABLE;
    }

    const recent = metrics[metrics.length - 1];
    const previous = metrics[metrics.length - 2];

    const recentScore = this.calculateTrendScore(recent);
    const previousScore = this.calculateTrendScore(previous);

    const change = ((recentScore - previousScore) / previousScore) * 100;

    if (change > 10) {
      return TrendDirection.UP;
    } else if (change < -10) {
      return TrendDirection.DOWN;
    } else {
      return TrendDirection.STABLE;
    }
  }

  /**
   * Get top trending assets
   */
  async getTrendingAssets(limit: number = 10, period: TimePeriod = TimePeriod.WEEK): Promise<PopularAsset[]> {
    const popularAssets = await this.store.getPopularAssets(limit * 2, period);

    // Analyze trends for each asset
    const assetsWithTrends = await Promise.all(
      popularAssets.map(async (asset) => ({
        ...asset,
        trend: await this.analyzePopularityTrends(asset.assetId, period),
      }))
    );

    // Filter for trending up
    const trending = assetsWithTrends
      .filter((a) => a.trend === TrendDirection.UP)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return trending;
  }

  /**
   * Generate insights from trends
   */
  async generateInsights(period: TimePeriod = TimePeriod.WEEK): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Get trending assets
    const trending = await this.getTrendingAssets(5, period);

    if (trending.length > 0) {
      insights.push({
        type: InsightType.USAGE_SPIKE,
        title: 'Trending Assets Detected',
        description: `${trending.length} assets are experiencing increased usage`,
        severity: InsightSeverity.INFO,
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
        type: InsightType.USAGE_DROP,
        title: 'Assets with Declining Usage',
        description: `${declining.length} assets are experiencing decreased usage`,
        severity: InsightSeverity.MEDIUM,
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
  async getDecliningAssets(limit: number = 10, period: TimePeriod = TimePeriod.WEEK): Promise<PopularAsset[]> {
    const popularAssets = await this.store.getPopularAssets(limit * 2, period);

    const assetsWithTrends = await Promise.all(
      popularAssets.map(async (asset) => ({
        ...asset,
        trend: await this.analyzePopularityTrends(asset.assetId, period),
      }))
    );

    const declining = assetsWithTrends
      .filter((a) => a.trend === TrendDirection.DOWN)
      .sort((a, b) => a.score - b.score)
      .slice(0, limit);

    return declining;
  }

  /**
   * Calculate trend score from metrics
   */
  private calculateTrendScore(metrics: AssetUsageMetrics): number {
    return (
      metrics.viewCount * 1.0 +
      metrics.downloadCount * 2.0 +
      metrics.commentCount * 1.5 +
      metrics.shareCount * 3.0 +
      metrics.bookmarkCount * 2.5
    );
  }

  /**
   * Detect anomalies in usage patterns
   */
  async detectAnomalies(assetId: string, period: TimePeriod = TimePeriod.MONTH): Promise<Insight[]> {
    const metrics = await this.store.getAssetMetrics(assetId, period);
    const insights: Insight[] = [];

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
        type: InsightType.USAGE_SPIKE,
        title: 'Unusual Activity Spike',
        description: 'Asset is experiencing significantly higher usage than normal',
        severity: InsightSeverity.INFO,
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
        type: InsightType.USAGE_DROP,
        title: 'Unusual Activity Drop',
        description: 'Asset is experiencing significantly lower usage than normal',
        severity: InsightSeverity.MEDIUM,
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
