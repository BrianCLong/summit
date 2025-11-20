/**
 * Analytics Reporter
 * Generates analytics reports and dashboards
 */

import {
  ExecutiveSummary,
  CoverageMetrics,
  AdoptionMetrics,
  ROIMetrics,
  TimePeriod,
  PopularAsset,
  Insight,
} from '@intelgraph/data-catalog';

export interface IAnalyticsStore {
  getCoverageMetrics(): Promise<CoverageMetrics>;
  getAdoptionMetrics(period: TimePeriod): Promise<AdoptionMetrics>;
  getROIMetrics(period: TimePeriod): Promise<ROIMetrics>;
  getPopularAssets(limit: number, period: TimePeriod): Promise<PopularAsset[]>;
  getTotalAssets(): Promise<number>;
  getActiveUsers(period: TimePeriod): Promise<number>;
  getSearchQueries(period: TimePeriod): Promise<number>;
}

export interface IInsightGenerator {
  generateInsights(period: TimePeriod): Promise<Insight[]>;
}

export class AnalyticsReporter {
  constructor(
    private store: IAnalyticsStore,
    private insightGenerator?: IInsightGenerator
  ) {}

  /**
   * Generate executive summary
   */
  async generateExecutiveSummary(period: TimePeriod = TimePeriod.MONTH): Promise<ExecutiveSummary> {
    const [
      totalAssets,
      activeUsers,
      searchQueries,
      coverageMetrics,
      adoptionMetrics,
      topAssets,
      insights,
    ] = await Promise.all([
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
  async generateCoverageReport(): Promise<CoverageMetrics> {
    return this.store.getCoverageMetrics();
  }

  /**
   * Generate adoption report
   */
  async generateAdoptionReport(period: TimePeriod = TimePeriod.MONTH): Promise<AdoptionMetrics> {
    return this.store.getAdoptionMetrics(period);
  }

  /**
   * Generate ROI report
   */
  async generateROIReport(period: TimePeriod = TimePeriod.QUARTER): Promise<ROIMetrics> {
    return this.store.getROIMetrics(period);
  }

  /**
   * Generate usage dashboard data
   */
  async generateUsageDashboard(period: TimePeriod = TimePeriod.WEEK): Promise<{
    activeUsers: number;
    totalSearches: number;
    topAssets: PopularAsset[];
    coveragePercentage: number;
  }> {
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
  async generateQualityReport(): Promise<{
    coverage: CoverageMetrics;
    recommendations: string[];
  }> {
    const coverage = await this.store.getCoverageMetrics();
    const recommendations: string[] = [];

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
  async calculateHealthScore(): Promise<number> {
    const coverage = await this.store.getCoverageMetrics();

    // Weighted health score
    const weights = {
      coverage: 0.3,
      quality: 0.3,
      ownership: 0.2,
      certification: 0.2,
    };

    const score =
      (coverage.coveragePercentage / 100) * weights.coverage +
      coverage.qualityScore * weights.quality +
      (coverage.assetsWithOwners / coverage.totalAssets) * weights.ownership +
      (coverage.certifiedAssets / coverage.totalAssets) * weights.certification;

    return Math.round(score * 100);
  }
}
