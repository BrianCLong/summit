import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';
import { Redis } from 'ioredis';

export interface MTTTMetrics {
  p50_seconds: number;
  p90_seconds: number;
  p95_seconds: number;
  p99_seconds: number;
  average_seconds: number;
  total_alerts: number;
  period_start: Date;
  period_end: Date;
  by_severity?: Record<string, number>;
  by_analyst?: Record<string, number>;
  trend_direction: 'improving' | 'degrading' | 'stable';
  trend_percentage: number;
}

export interface FalsePositiveMetrics {
  fp_rate: number;
  total_alerts: number;
  false_positives: number;
  true_positives: number;
  unclassified: number;
  period_start: Date;
  period_end: Date;
  by_rule?: Record<string, number>;
  by_category?: Record<string, number>;
  trend_direction: 'improving' | 'degrading' | 'stable';
  trend_percentage: number;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'mttt' | 'false_positive_rate' | 'alert_volume' | 'analyst_performance';
  config: any;
  data: any;
  last_updated: Date;
  refresh_interval_seconds: number;
  enabled: boolean;
}

export interface AnalystPerformanceMetrics {
  analyst_id: string;
  analyst_name: string;
  alerts_triaged: number;
  avg_triage_time_seconds: number;
  accuracy_rate: number;
  escalation_rate: number;
  false_positive_rate: number;
  period_start: Date;
  period_end: Date;
}

export interface AlertVolumeMetrics {
  total_alerts: number;
  by_hour: Record<string, number>;
  by_day: Record<string, number>;
  by_severity: Record<string, number>;
  by_source: Record<string, number>;
  period_start: Date;
  period_end: Date;
}

export class AnalystDashboardService {
  private prisma: PrismaClient;
  private redis: Redis;
  private logger: Logger;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly BASELINE_MTTT_TARGET = 900; // 15 minutes in seconds

  constructor(prisma: PrismaClient, redis: Redis, logger: Logger) {
    this.prisma = prisma;
    this.redis = redis;
    this.logger = logger;
  }

  /**
   * D1 - MTTT + FP widgets
   * AC: time range selectors; export CSV; P50/P90
   */
  async getMTTTMetrics(
    timeRange: '1h' | '24h' | '7d' | '30d' | 'custom',
    startDate?: Date,
    endDate?: Date,
    groupBy?: 'severity' | 'analyst' | 'rule',
  ): Promise<MTTTMetrics> {
    const cacheKey = `mttt:${timeRange}:${startDate?.getTime()}:${endDate?.getTime()}:${groupBy}`;

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const { start, end } = this.getTimeRangeBounds(
        timeRange,
        startDate,
        endDate,
      );

      // Query triage completion times
      const triageData = await this.prisma.$queryRaw`
        SELECT 
          alert_id,
          analyst_id,
          severity,
          rule_id,
          started_at,
          completed_at,
          EXTRACT(EPOCH FROM (completed_at - started_at)) as triage_time_seconds
        FROM alert_triage 
        WHERE completed_at IS NOT NULL 
          AND started_at >= ${start} 
          AND completed_at <= ${end}
          AND triage_status = 'completed'
        ORDER BY triage_time_seconds ASC
      `;

      if (!triageData || triageData.length === 0) {
        return this.getEmptyMTTTMetrics(start, end);
      }

      // Calculate percentiles
      const sortedTimes = triageData
        .map((row) => row.triage_time_seconds)
        .sort((a, b) => a - b);
      const metrics: MTTTMetrics = {
        p50_seconds: this.calculatePercentile(sortedTimes, 0.5),
        p90_seconds: this.calculatePercentile(sortedTimes, 0.9),
        p95_seconds: this.calculatePercentile(sortedTimes, 0.95),
        p99_seconds: this.calculatePercentile(sortedTimes, 0.99),
        average_seconds:
          sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length,
        total_alerts: triageData.length,
        period_start: start,
        period_end: end,
        trend_direction: 'stable',
        trend_percentage: 0,
      };

      // Add grouping if requested
      if (groupBy === 'severity') {
        metrics.by_severity = this.groupMetricsBySeverity(triageData);
      } else if (groupBy === 'analyst') {
        metrics.by_analyst = this.groupMetricsByAnalyst(triageData);
      }

      // Calculate trend
      const previousPeriodMetrics = await this.getPreviousPeriodMTTT(
        start,
        end,
      );
      if (previousPeriodMetrics) {
        const currentAvg = metrics.average_seconds;
        const previousAvg = previousPeriodMetrics.average_seconds;

        metrics.trend_percentage =
          ((currentAvg - previousAvg) / previousAvg) * 100;

        if (Math.abs(metrics.trend_percentage) < 5) {
          metrics.trend_direction = 'stable';
        } else if (metrics.trend_percentage < 0) {
          metrics.trend_direction = 'improving'; // Lower MTTT is better
        } else {
          metrics.trend_direction = 'degrading';
        }
      }

      // Cache result
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));

      this.logger.debug('MTTT metrics calculated', {
        timeRange,
        totalAlerts: metrics.total_alerts,
        p50: metrics.p50_seconds,
        p90: metrics.p90_seconds,
        trend: metrics.trend_direction,
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to calculate MTTT metrics', {
        timeRange,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get false positive rate metrics
   */
  async getFalsePositiveMetrics(
    timeRange: '1h' | '24h' | '7d' | '30d' | 'custom',
    startDate?: Date,
    endDate?: Date,
    groupBy?: 'rule' | 'category' | 'analyst',
  ): Promise<FalsePositiveMetrics> {
    const cacheKey = `fp:${timeRange}:${startDate?.getTime()}:${endDate?.getTime()}:${groupBy}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const { start, end } = this.getTimeRangeBounds(
        timeRange,
        startDate,
        endDate,
      );

      // Query alert classifications
      const classificationData = await this.prisma.$queryRaw`
        SELECT 
          alert_id,
          rule_id,
          category,
          analyst_id,
          classification,
          confidence
        FROM alert_feedback
        WHERE created_at >= ${start} 
          AND created_at <= ${end}
          AND classification IS NOT NULL
      `;

      if (!classificationData || classificationData.length === 0) {
        return this.getEmptyFPMetrics(start, end);
      }

      // Calculate FP metrics
      const totalAlerts = classificationData.length;
      const falsePositives = classificationData.filter(
        (row) => row.classification === 'false_positive',
      ).length;
      const truePositives = classificationData.filter(
        (row) => row.classification === 'true_positive',
      ).length;
      const unclassified = totalAlerts - falsePositives - truePositives;

      const metrics: FalsePositiveMetrics = {
        fp_rate: totalAlerts > 0 ? falsePositives / totalAlerts : 0,
        total_alerts: totalAlerts,
        false_positives: falsePositives,
        true_positives: truePositives,
        unclassified,
        period_start: start,
        period_end: end,
        trend_direction: 'stable',
        trend_percentage: 0,
      };

      // Add grouping if requested
      if (groupBy === 'rule') {
        metrics.by_rule = this.groupFPMetricsByRule(classificationData);
      } else if (groupBy === 'category') {
        metrics.by_category = this.groupFPMetricsByCategory(classificationData);
      }

      // Calculate trend
      const previousPeriodMetrics = await this.getPreviousPeriodFP(start, end);
      if (previousPeriodMetrics) {
        const currentRate = metrics.fp_rate;
        const previousRate = previousPeriodMetrics.fp_rate;

        if (previousRate > 0) {
          metrics.trend_percentage =
            ((currentRate - previousRate) / previousRate) * 100;

          if (Math.abs(metrics.trend_percentage) < 5) {
            metrics.trend_direction = 'stable';
          } else if (metrics.trend_percentage < 0) {
            metrics.trend_direction = 'improving'; // Lower FP rate is better
          } else {
            metrics.trend_direction = 'degrading';
          }
        }
      }

      // Cache result
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));

      this.logger.debug('FP metrics calculated', {
        timeRange,
        totalAlerts: metrics.total_alerts,
        fpRate: metrics.fp_rate,
        trend: metrics.trend_direction,
      });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to calculate FP metrics', {
        timeRange,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get analyst performance metrics
   */
  async getAnalystPerformanceMetrics(
    timeRange: '24h' | '7d' | '30d',
    startDate?: Date,
    endDate?: Date,
  ): Promise<AnalystPerformanceMetrics[]> {
    const { start, end } = this.getTimeRangeBounds(
      timeRange,
      startDate,
      endDate,
    );

    const performanceData = await this.prisma.$queryRaw`
      SELECT 
        at.analyst_id,
        u.name as analyst_name,
        COUNT(*) as alerts_triaged,
        AVG(EXTRACT(EPOCH FROM (at.completed_at - at.started_at))) as avg_triage_time_seconds,
        COUNT(CASE WHEN af.classification = 'true_positive' THEN 1 END)::float / COUNT(af.classification) as accuracy_rate,
        COUNT(CASE WHEN at.triage_status = 'escalated' THEN 1 END)::float / COUNT(*) as escalation_rate,
        COUNT(CASE WHEN af.classification = 'false_positive' THEN 1 END)::float / COUNT(af.classification) as false_positive_rate
      FROM alert_triage at
      LEFT JOIN users u ON at.analyst_id = u.id
      LEFT JOIN alert_feedback af ON at.alert_id = af.alert_id AND at.analyst_id = af.analyst_id
      WHERE at.completed_at >= ${start} 
        AND at.completed_at <= ${end}
        AND at.triage_status IN ('completed', 'escalated')
      GROUP BY at.analyst_id, u.name
      HAVING COUNT(*) >= 5
      ORDER BY avg_triage_time_seconds ASC
    `;

    return performanceData.map((row) => ({
      analyst_id: row.analyst_id,
      analyst_name: row.analyst_name || 'Unknown',
      alerts_triaged: row.alerts_triaged,
      avg_triage_time_seconds: Math.round(row.avg_triage_time_seconds || 0),
      accuracy_rate: Math.round((row.accuracy_rate || 0) * 100) / 100,
      escalation_rate: Math.round((row.escalation_rate || 0) * 100) / 100,
      false_positive_rate:
        Math.round((row.false_positive_rate || 0) * 100) / 100,
      period_start: start,
      period_end: end,
    }));
  }

  /**
   * Get alert volume metrics
   */
  async getAlertVolumeMetrics(
    timeRange: '24h' | '7d' | '30d',
    startDate?: Date,
    endDate?: Date,
  ): Promise<AlertVolumeMetrics> {
    const { start, end } = this.getTimeRangeBounds(
      timeRange,
      startDate,
      endDate,
    );

    const volumeData = await this.prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_alerts,
        EXTRACT(HOUR FROM created_at) as hour,
        EXTRACT(DOW FROM created_at) as day_of_week,
        severity,
        source_system
      FROM alerts
      WHERE created_at >= ${start} 
        AND created_at <= ${end}
      GROUP BY EXTRACT(HOUR FROM created_at), EXTRACT(DOW FROM created_at), severity, source_system
    `;

    const metrics: AlertVolumeMetrics = {
      total_alerts: volumeData.reduce(
        (sum, row) => sum + parseInt(row.total_alerts),
        0,
      ),
      by_hour: {},
      by_day: {},
      by_severity: {},
      by_source: {},
      period_start: start,
      period_end: end,
    };

    // Group by hour, day, severity, source
    volumeData.forEach((row) => {
      const hour = row.hour?.toString() || '0';
      const day = this.getDayName(row.day_of_week);
      const severity = row.severity || 'unknown';
      const source = row.source_system || 'unknown';
      const count = parseInt(row.total_alerts);

      metrics.by_hour[hour] = (metrics.by_hour[hour] || 0) + count;
      metrics.by_day[day] = (metrics.by_day[day] || 0) + count;
      metrics.by_severity[severity] =
        (metrics.by_severity[severity] || 0) + count;
      metrics.by_source[source] = (metrics.by_source[source] || 0) + count;
    });

    return metrics;
  }

  /**
   * Export metrics to CSV format
   */
  async exportMetricsToCSV(
    metricType: 'mttt' | 'fp' | 'analyst_performance' | 'alert_volume',
    timeRange: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<string> {
    let csvData = '';

    switch (metricType) {
      case 'mttt':
        const mtttMetrics = await this.getMTTTMetrics(
          timeRange as any,
          startDate,
          endDate,
        );
        csvData = this.formatMTTTForCSV(mtttMetrics);
        break;

      case 'fp':
        const fpMetrics = await this.getFalsePositiveMetrics(
          timeRange as any,
          startDate,
          endDate,
        );
        csvData = this.formatFPForCSV(fpMetrics);
        break;

      case 'analyst_performance':
        const analystMetrics = await this.getAnalystPerformanceMetrics(
          timeRange as any,
          startDate,
          endDate,
        );
        csvData = this.formatAnalystPerformanceForCSV(analystMetrics);
        break;

      case 'alert_volume':
        const volumeMetrics = await this.getAlertVolumeMetrics(
          timeRange as any,
          startDate,
          endDate,
        );
        csvData = this.formatAlertVolumeForCSV(volumeMetrics);
        break;

      default:
        throw new Error(`Unsupported metric type: ${metricType}`);
    }

    this.logger.info('Metrics exported to CSV', {
      metricType,
      timeRange,
      dataSize: csvData.length,
    });

    return csvData;
  }

  /**
   * Create or update dashboard widget
   */
  async createDashboardWidget(
    title: string,
    type: DashboardWidget['type'],
    config: any,
    userId: string,
  ): Promise<DashboardWidget> {
    const widget: DashboardWidget = {
      id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      type,
      config,
      data: {},
      last_updated: new Date(),
      refresh_interval_seconds: config.refresh_interval || 300, // Default 5 minutes
      enabled: true,
    };

    // Get initial data for widget
    widget.data = await this.getWidgetData(widget);

    // Store widget configuration
    await this.prisma.dashboardWidget.create({
      data: {
        id: widget.id,
        title: widget.title,
        type: widget.type,
        config: JSON.stringify(widget.config),
        user_id: userId,
        refresh_interval_seconds: widget.refresh_interval_seconds,
        enabled: widget.enabled,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    this.logger.info('Dashboard widget created', {
      widgetId: widget.id,
      title: widget.title,
      type: widget.type,
      userId,
    });

    return widget;
  }

  /**
   * D2 - Feature flag & beta cohort
   * AC: allowlist; kill-switch
   */
  async enableBetaCohort(
    userIds: string[],
    featureFlags: string[],
  ): Promise<void> {
    for (const userId of userIds) {
      for (const flag of featureFlags) {
        await this.redis.setex(
          `beta:${flag}:${userId}`,
          86400 * 30, // 30 days
          'enabled',
        );

        this.logger.info('Beta feature enabled for user', {
          userId,
          feature: flag,
        });
      }
    }

    // Store beta cohort metadata
    await this.prisma.betaCohort.create({
      data: {
        id: `cohort_${Date.now()}`,
        name: `Dashboard Beta - ${new Date().toISOString()}`,
        user_ids: JSON.stringify(userIds),
        feature_flags: JSON.stringify(featureFlags),
        enabled: true,
        created_at: new Date(),
      },
    });
  }

  async disableBetaCohort(cohortId: string): Promise<void> {
    const cohort = await this.prisma.betaCohort.findUnique({
      where: { id: cohortId },
    });

    if (!cohort) {
      throw new Error(`Beta cohort not found: ${cohortId}`);
    }

    const userIds = JSON.parse(cohort.user_ids);
    const featureFlags = JSON.parse(cohort.feature_flags);

    // Remove feature flags for all users in cohort
    for (const userId of userIds) {
      for (const flag of featureFlags) {
        await this.redis.del(`beta:${flag}:${userId}`);
      }
    }

    // Disable cohort
    await this.prisma.betaCohort.update({
      where: { id: cohortId },
      data: { enabled: false, updated_at: new Date() },
    });

    this.logger.info('Beta cohort disabled', { cohortId });
  }

  async isBetaFeatureEnabled(
    userId: string,
    feature: string,
  ): Promise<boolean> {
    try {
      const enabled = await this.redis.get(`beta:${feature}:${userId}`);
      return enabled === 'enabled';
    } catch {
      return false;
    }
  }

  async killSwitchFeature(feature: string): Promise<void> {
    // Global kill switch
    await this.redis.setex(`killswitch:${feature}`, 3600, 'disabled'); // 1 hour

    this.logger.warn('Feature kill switch activated', { feature });
  }

  async isFeatureKilled(feature: string): Promise<boolean> {
    try {
      const killed = await this.redis.get(`killswitch:${feature}`);
      return killed === 'disabled';
    } catch {
      return false;
    }
  }

  // Private helper methods

  private getTimeRangeBounds(
    timeRange: string,
    startDate?: Date,
    endDate?: Date,
  ): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date = endDate || now;

    if (timeRange === 'custom' && startDate && endDate) {
      start = startDate;
      end = endDate;
    } else {
      const ranges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };

      const rangeMs = ranges[timeRange] || ranges['24h'];
      start = new Date(now.getTime() - rangeMs);
    }

    return { start, end };
  }

  private calculatePercentile(
    sortedValues: number[],
    percentile: number,
  ): number {
    const index = percentile * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedValues.length) {
      return sortedValues[sortedValues.length - 1];
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private getEmptyMTTTMetrics(start: Date, end: Date): MTTTMetrics {
    return {
      p50_seconds: 0,
      p90_seconds: 0,
      p95_seconds: 0,
      p99_seconds: 0,
      average_seconds: 0,
      total_alerts: 0,
      period_start: start,
      period_end: end,
      trend_direction: 'stable',
      trend_percentage: 0,
    };
  }

  private getEmptyFPMetrics(start: Date, end: Date): FalsePositiveMetrics {
    return {
      fp_rate: 0,
      total_alerts: 0,
      false_positives: 0,
      true_positives: 0,
      unclassified: 0,
      period_start: start,
      period_end: end,
      trend_direction: 'stable',
      trend_percentage: 0,
    };
  }

  private groupMetricsBySeverity(triageData: any[]): Record<string, number> {
    const grouped: Record<string, number[]> = {};

    triageData.forEach((row) => {
      const severity = row.severity || 'unknown';
      if (!grouped[severity]) {
        grouped[severity] = [];
      }
      grouped[severity].push(row.triage_time_seconds);
    });

    const result: Record<string, number> = {};
    Object.keys(grouped).forEach((severity) => {
      const times = grouped[severity];
      result[severity] =
        times.reduce((sum, time) => sum + time, 0) / times.length;
    });

    return result;
  }

  private groupMetricsByAnalyst(triageData: any[]): Record<string, number> {
    const grouped: Record<string, number[]> = {};

    triageData.forEach((row) => {
      const analyst = row.analyst_id || 'unassigned';
      if (!grouped[analyst]) {
        grouped[analyst] = [];
      }
      grouped[analyst].push(row.triage_time_seconds);
    });

    const result: Record<string, number> = {};
    Object.keys(grouped).forEach((analyst) => {
      const times = grouped[analyst];
      result[analyst] =
        times.reduce((sum, time) => sum + time, 0) / times.length;
    });

    return result;
  }

  private groupFPMetricsByRule(
    classificationData: any[],
  ): Record<string, number> {
    const grouped: Record<string, { total: number; fp: number }> = {};

    classificationData.forEach((row) => {
      const rule = row.rule_id || 'unknown';
      if (!grouped[rule]) {
        grouped[rule] = { total: 0, fp: 0 };
      }
      grouped[rule].total++;
      if (row.classification === 'false_positive') {
        grouped[rule].fp++;
      }
    });

    const result: Record<string, number> = {};
    Object.keys(grouped).forEach((rule) => {
      const data = grouped[rule];
      result[rule] = data.total > 0 ? data.fp / data.total : 0;
    });

    return result;
  }

  private groupFPMetricsByCategory(
    classificationData: any[],
  ): Record<string, number> {
    const grouped: Record<string, { total: number; fp: number }> = {};

    classificationData.forEach((row) => {
      const category = row.category || 'unknown';
      if (!grouped[category]) {
        grouped[category] = { total: 0, fp: 0 };
      }
      grouped[category].total++;
      if (row.classification === 'false_positive') {
        grouped[category].fp++;
      }
    });

    const result: Record<string, number> = {};
    Object.keys(grouped).forEach((category) => {
      const data = grouped[category];
      result[category] = data.total > 0 ? data.fp / data.total : 0;
    });

    return result;
  }

  private async getPreviousPeriodMTTT(
    start: Date,
    end: Date,
  ): Promise<MTTTMetrics | null> {
    // Calculate previous period of same duration
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start);

    try {
      return await this.getMTTTMetrics('custom', prevStart, prevEnd);
    } catch {
      return null;
    }
  }

  private async getPreviousPeriodFP(
    start: Date,
    end: Date,
  ): Promise<FalsePositiveMetrics | null> {
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start);

    try {
      return await this.getFalsePositiveMetrics('custom', prevStart, prevEnd);
    } catch {
      return null;
    }
  }

  private getDayName(dayOfWeek: number): string {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return days[dayOfWeek] || 'Unknown';
  }

  private async getWidgetData(widget: DashboardWidget): Promise<any> {
    switch (widget.type) {
      case 'mttt':
        return await this.getMTTTMetrics(widget.config.timeRange || '24h');
      case 'false_positive_rate':
        return await this.getFalsePositiveMetrics(
          widget.config.timeRange || '24h',
        );
      case 'analyst_performance':
        return await this.getAnalystPerformanceMetrics(
          widget.config.timeRange || '7d',
        );
      case 'alert_volume':
        return await this.getAlertVolumeMetrics(
          widget.config.timeRange || '24h',
        );
      default:
        return {};
    }
  }

  // CSV formatting methods

  private formatMTTTForCSV(metrics: MTTTMetrics): string {
    let csv = 'Metric,Value,Unit\n';
    csv += `P50,${metrics.p50_seconds},seconds\n`;
    csv += `P90,${metrics.p90_seconds},seconds\n`;
    csv += `P95,${metrics.p95_seconds},seconds\n`;
    csv += `P99,${metrics.p99_seconds},seconds\n`;
    csv += `Average,${metrics.average_seconds},seconds\n`;
    csv += `Total Alerts,${metrics.total_alerts},count\n`;
    csv += `Trend,${metrics.trend_direction},direction\n`;
    csv += `Trend Percentage,${metrics.trend_percentage},%\n`;

    if (metrics.by_severity) {
      csv += '\nSeverity,Average MTTT (seconds)\n';
      Object.entries(metrics.by_severity).forEach(([severity, time]) => {
        csv += `${severity},${time}\n`;
      });
    }

    return csv;
  }

  private formatFPForCSV(metrics: FalsePositiveMetrics): string {
    let csv = 'Metric,Value\n';
    csv += `False Positive Rate,${(metrics.fp_rate * 100).toFixed(2)}%\n`;
    csv += `Total Alerts,${metrics.total_alerts}\n`;
    csv += `False Positives,${metrics.false_positives}\n`;
    csv += `True Positives,${metrics.true_positives}\n`;
    csv += `Unclassified,${metrics.unclassified}\n`;
    csv += `Trend,${metrics.trend_direction}\n`;

    return csv;
  }

  private formatAnalystPerformanceForCSV(
    metrics: AnalystPerformanceMetrics[],
  ): string {
    let csv =
      'Analyst,Alerts Triaged,Avg Triage Time (seconds),Accuracy Rate,Escalation Rate,FP Rate\n';

    metrics.forEach((analyst) => {
      csv += `${analyst.analyst_name},${analyst.alerts_triaged},${analyst.avg_triage_time_seconds},${analyst.accuracy_rate},${analyst.escalation_rate},${analyst.false_positive_rate}\n`;
    });

    return csv;
  }

  private formatAlertVolumeForCSV(metrics: AlertVolumeMetrics): string {
    let csv = 'Total Alerts,Period Start,Period End\n';
    csv += `${metrics.total_alerts},${metrics.period_start.toISOString()},${metrics.period_end.toISOString()}\n\n`;

    csv += 'Hour,Alert Count\n';
    Object.entries(metrics.by_hour).forEach(([hour, count]) => {
      csv += `${hour},${count}\n`;
    });

    csv += '\nSeverity,Alert Count\n';
    Object.entries(metrics.by_severity).forEach(([severity, count]) => {
      csv += `${severity},${count}\n`;
    });

    return csv;
  }
}
