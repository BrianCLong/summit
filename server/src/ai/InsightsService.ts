// server/src/ai/InsightsService.ts
import { Redis } from 'ioredis';
import { AnalyticsEngine } from './AnalyticsEngine';
import { logger } from '../utils/logger';

export interface InsightGenerationParams {
  metric: string;
  dimensions?: Record<string, string>;
  timeRange?: 'hour' | 'day' | 'week' | 'month';
  includePredictive?: boolean;
  includeAnomalyDetection?: boolean;
  includeTrendAnalysis?: boolean;
}

export interface InsightResult {
  id: string;
  timestamp: number;
  params: InsightGenerationParams;
  insights: {
    performance?: any;
    security?: any;
    featureUsage?: any;
    userBehavior?: any;
    systemHealth?: any;
  };
  summary: string;
  recommendations: string[];
  confidence: number;
}

export interface InsightsServiceConfig {
  redis: Redis;
  analyticsEngine: AnalyticsEngine;
  insightGenerationInterval?: number; // milliseconds
  maxConcurrentInsights?: number;
  insightRetentionDays?: number;
}

export class InsightsService {
  private redis: Redis;
  private analyticsEngine: AnalyticsEngine;
  private readonly insightGenerationInterval: number;
  private readonly maxConcurrentInsights: number;
  private readonly insightRetentionSeconds: number;
  private readonly INSIGHTS_PREFIX = 'insights:';
  private readonly INSIGHT_GENERATION_QUEUE = 'insight_generation_queue';
  private readonly INSIGHT_HISTORY_KEY = 'insights_history';
  private activeWorkers: number = 0;
  private readonly workers: Array<NodeJS.Timeout> = [];
  private isShuttingDown: boolean = false;

  constructor(private config: InsightsServiceConfig) {
    this.redis = config.redis;
    this.analyticsEngine = config.analyticsEngine;
    this.insightGenerationInterval = config.insightGenerationInterval || 300000; // 5 minutes
    this.maxConcurrentInsights = config.maxConcurrentInsights || 5;
    this.insightRetentionSeconds = (config.insightRetentionDays || 30) * 24 * 60 * 60;
  }

  /**
   * Start the insights service with background processing
   */
  async start(): Promise<void> {
    logger.info('Starting Insights Service', {
      intervalMs: this.insightGenerationInterval,
      maxWorkers: this.maxConcurrentInsights,
      retentionDays: this.insightRetentionSeconds / 86400
    });

    // Set up recurring insight generation
    const insightWorker = setInterval(async () => {
      if (this.isShuttingDown) {
        clearInterval(insightWorker);
        return;
      }
      
      await this.processScheduledInsightGenerations();
    }, this.insightGenerationInterval);

    // Set up scheduled insight generation based on registered metrics
    await this.setupScheduledInsights();

    logger.info('Insights Service started successfully');
  }

  /**
   * Stop the insights service gracefully
   */
  async stop(): Promise<void> {
    logger.info('Stopping Insights Service...');
    this.isShuttingDown = true;

    // Clear all scheduled workers
    for (const worker of this.workers) {
      clearInterval(worker);
    }

    logger.info('Insights Service stopped successfully');
  }

  /**
   * Register a metric for regular insight generation
   */
  async registerMetricForInsights(
    metricName: string, 
    schedule: 'hourly' | 'daily' | 'weekly',
    config: Partial<InsightGenerationParams> = {}
  ): Promise<void> {
    try {
      const scheduleKey = `${this.INSIGHTS_PREFIX}scheduled:${schedule}:${metricName}`;
      const insightConfig = {
        metric: metricName,
        dimensions: config.dimensions,
        includePredictive: config.includePredictive ?? true,
        includeAnomalyDetection: config.includeAnomalyDetection ?? true,
        includeTrendAnalysis: config.includeTrendAnalysis ?? true,
        schedule: schedule
      };

      await this.redis.setex(scheduleKey, this.insightRetentionSeconds, JSON.stringify(insightConfig));
      logger.info(`Registered metric for insight generation`, {
        metric: metricName,
        schedule,
        config: insightConfig
      });
    } catch (error) {
      logger.error(`Failed to register metric for insight generation`, error);
      throw error;
    }
  }

  /**
   * Generate insights for a specific metric
   */
  async generateInsights(params: InsightGenerationParams): Promise<InsightResult> {
    const startTime = Date.now();
    const insightId = `insight_${startTime}_${params.metric.replace(/\./g, '_')}`;

    logger.info(`Starting insight generation`, {
      insightId,
      metric: params.metric,
      dimensions: params.dimensions
    });

    try {
      // Get historical data for analysis
      const timeRangeHours = this.getTimeRangeHours(params.timeRange);
      const historicalData = await this.analyticsEngine.getHistoricalData(
        params.metric,
        Date.now() - (timeRangeHours * 60 * 60 * 1000),
        params.dimensions
      );

      if (historicalData.length < 2) {
        throw new Error(`Insufficient historical data for insight generation: ${historicalData.length} data points`);
      }

      // Generate different types of insights based on category
      const category = this.categorizeMetric(params.metric);
      const insights: InsightResult['insights'] = {};
      const recommendations: string[] = [];

      switch (category) {
        case 'performance':
          insights.performance = await this.generatePerformanceInsights(params, historicalData);
          break;
        case 'security':
          insights.security = await this.generateSecurityInsights(params, historicalData);
          break;
        case 'feature-usage':
          insights.featureUsage = await this.generateFeatureUsageInsights(params, historicalData);
          break;
        case 'user-behavior':
          insights.userBehavior = await this.generateUserBehaviorInsights(params, historicalData);
          break;
        case 'system-health':
          insights.systemHealth = await this.generateSystemHealthInsights(params, historicalData);
          break;
      }

      // Perform additional analysis if requested
      if (params.includeAnomalyDetection) {
        const anomalyResults = await this.analyticsEngine.detectAnomalies(params.metric, params.dimensions);
        insights.anomalies = anomalyResults;
        recommendations.push(...this.generateAnomalyRecommendations(anomalyResults));
      }

      if (params.includeTrendAnalysis) {
        const trendResults = await this.analyticsEngine.analyzeTrends(params.metric, params.dimensions);
        insights.trends = trendResults;
        recommendations.push(...this.generateTrendRecommendations(trendResults));
      }

      if (params.includePredictive) {
        const predictions = await this.analyticsEngine.generatePredictions(params.metric, params.dimensions);
        insights.predictions = predictions;
        recommendations.push(...this.generatePredictionRecommendations(predictions));
      }

      // Calculate overall confidence based on data quality and analysis completeness
      const confidence = this.calculateInsightConfidence(historicalData, insights);

      // Create insight summary
      const summary = this.generateInsightSummary(insights, params);

      const result: InsightResult = {
        id: insightId,
        timestamp: Date.now(),
        params,
        insights,
        summary,
        recommendations: [...new Set(recommendations)], // Remove duplicates
        confidence
      };

      // Store the insight
      await this.storeInsight(result);

      const duration = Date.now() - startTime;
      logger.info(`Completed insight generation`, {
        insightId,
        durationMs: duration,
        category,
        confidence,
        recommendationCount: recommendations.length
      });

      return result;
    } catch (error) {
      logger.error(`Failed to generate insights`, error);
      throw error;
    }
  }

  /**
   * Generate performance insights
   */
  private async generatePerformanceInsights(
    params: InsightGenerationParams,
    historicalData: AnalyticsDataPoint[]
  ): Promise<any> {
    try {
      const values = historicalData.map(dp => dp.value);
      const sortedData = [...historicalData].sort((a, b) => a.timestamp - b.timestamp);

      // Calculate performance metrics
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const median = this.calculateMedian(values);

      // Calculate percentiles
      const p95 = this.calculatePercentile(values, 95);
      const p99 = this.calculatePercentile(values, 99);

      // Calculate trend
      let trend: 'improving' | 'degrading' | 'stable' = 'stable';
      if (sortedData.length > 1) {
        const recentAvg = sortedData.slice(-Math.floor(sortedData.length / 4)).reduce((sum, dp) => sum + dp.value, 0) / Math.max(1, Math.floor(sortedData.length / 4));
        const pastAvg = sortedData.slice(0, Math.floor(sortedData.length / 4)).reduce((sum, dp) => sum + dp.value, 0) / Math.max(1, Math.floor(sortedData.length / 4));
        const change = ((recentAvg - pastAvg) / pastAvg) * 100;

        if (change > 10) {
          trend = 'degrading'; // Performance getting worse
        } else if (change < -10) {
          trend = 'improving'; // Performance getting better
        }
      }

      return {
        baseline: {
          average: avg,
          median,
          minimum: min,
          maximum: max,
          p95,
          p99
        },
        trend,
        volatility: this.calculateCoefficientOfVariation(values),
        comparison: {
          currentVsBaseline: avg / avg, // Normalized against itself for now
          changePercentage: trend !== 'stable' ? 
            ((values[values.length - 1] - values[0]) / values[0]) * 100 : 0
        }
      };
    } catch (error) {
      logger.error(`Failed to generate performance insights`, error);
      return { error: 'Failed to analyze performance data' };
    }
  }

  /**
   * Generate security insights
   */
  private async generateSecurityInsights(
    params: InsightGenerationParams,
    historicalData: AnalyticsDataPoint[]
  ): Promise<any> {
    try {
      const values = historicalData.map(dp => dp.value);
      const sortedData = [...historicalData].sort((a, b) => a.timestamp - b.timestamp);

      // Security metrics analysis
      const totalEvents = values.reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
      const avgRate = totalEvents / historicalData.length;

      // Calculate rate of change to detect bursts
      const recentData = sortedData.slice(-Math.floor(sortedData.length / 4));
      const recentRate = recentData.reduce((sum, dp) => sum + dp.value, 0) / Math.max(1, recentData.length);
      const rateChange = ((recentRate - avgRate) / avgRate) * 100;

      // Calculate volatility as potential indicator of anomalies
      const volatility = this.calculateCoefficientOfVariation(values);

      return {
        eventRate: {
          average: avgRate,
          recent: recentRate,
          changePercentage: rateChange,
          isAnomalous: Math.abs(rateChange) > 100 || volatility > 1.0 // High volatility may indicate attack
        },
        riskFactors: {
          volumeSpikes: Math.abs(rateChange) > 200,
          irregularPatterns: volatility > 1.5,
          sustainedActivity: recentRate > avgRate * 1.5 && recentRate > 10 // High rate over extended period
        },
        severity: this.calculateSecuritySeverity(volatility, Math.abs(rateChange))
      };
    } catch (error) {
      logger.error(`Failed to generate security insights`, error);
      return { error: 'Failed to analyze security data' };
    }
  }

  /**
   * Generate feature usage insights
   */
  private async generateFeatureUsageInsights(
    params: InsightGenerationParams,
    historicalData: AnalyticsDataPoint[]
  ): Promise<any> {
    try {
      const values = historicalData.map(dp => dp.value);
      const sortedData = [...historicalData].sort((a, b) => a.timestamp - b.timestamp);

      // Calculate adoption metrics
      const currentValue = sortedData[sortedData.length - 1]?.value || 0;
      const baselineValue = sortedData[0]?.value || 0;
      const adoptionGrowth = ((currentValue - baselineValue) / baselineValue) * 100;

      // Calculate engagement metrics
      const avgWeekly = this.calculateRollingAverage(values, 7);
      const avgDaily = this.calculateRollingAverage(values, 1);

      // Calculate stability
      const volatility = this.calculateCoefficientOfVariation(values);

      return {
        adoption: {
          growthPercentage: adoptionGrowth,
          currentRate: currentValue,
          baselineRate: baselineValue
        },
        engagement: {
          weeklyAverage: avgWeekly,
          dailyAverage: avgDaily
        },
        stability: {
          volatility,
          consistency: 1 - volatility // Invert for consistency metric
        },
        trends: {
          growthTrajectory: adoptionGrowth > 0 ? 'positive' : 'negative',
          momentum: avgDaily > avgWeekly ? 'accelerating' : 'decelerating'
        }
      };
    } catch (error) {
      logger.error(`Failed to generate feature usage insights`, error);
      return { error: 'Failed to analyze feature usage data' };
    }
  }

  /**
   * Generate user behavior insights
   */
  private async generateUserBehaviorInsights(
    params: InsightGenerationParams,
    historicalData: AnalyticsDataPoint[]
  ): Promise<any> {
    try {
      const values = historicalData.map(dp => dp.value);
      const sortedData = [...historicalData].sort((a, b) => a.timestamp - b.timestamp);

      // Calculate behavioral metrics
      const totalSessions = values.reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
      const avgSessions = totalSessions / historicalData.length;
      const uniqueUsers = this.estimateUniqueUsers(historicalData);
      
      // Calculate engagement metrics
      const sessionDuration = this.calculateSessionMetrics(historicalData);
      const peakTimes = this.findPeakActivityTimes(historicalData);
      
      // Calculate retention/pattern detection
      const patterns = this.detectUserBehaviorPatterns(historicalData);

      return {
        engagement: {
          avgSessionsPerPeriod: avgSessions,
          uniqueUsers,
          sessionRate: avgSessions / (uniqueUsers || 1) // Sessions per user
        },
        behavioral: {
          ...sessionDuration,
          ...peakTimes,
          ...patterns
        },
        retention: {
          stability: 1 - this.calculateCoefficientOfVariation(values),
          predictability: this.calculatePredictability(historicalData)
        }
      };
    } catch (error) {
      logger.error(`Failed to generate user behavior insights`, error);
      return { error: 'Failed to analyze user behavior data' };
    }
  }

  /**
   * Generate system health insights
   */
  private async generateSystemHealthInsights(
    params: InsightGenerationParams,
    historicalData: AnalyticsDataPoint[]
  ): Promise<any> {
    try {
      const values = historicalData.map(dp => dp.value);
      const sortedData = [...historicalData].sort((a, b) => a.timestamp - b.timestamp);

      // Calculate health metrics
      const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      const healthIndicator = this.normalizeHealthValue(avgValue, params.metric);
      const stability = 1 - this.calculateCoefficientOfVariation(values);
      
      // Calculate uptime/reliability metrics
      const reliabilityMetrics = this.calculateReliabilityMetrics(values, params.metric);
      
      // Calculate resource utilization
      const resourceMetrics = this.calculateResourceMetrics(sortedData);

      return {
        health: {
          score: healthIndicator,
          baseline: avgValue,
          stability
        },
        reliability: reliabilityMetrics,
        resource: resourceMetrics,
        status: healthIndicator > 0.8 ? 'healthy' : 
                healthIndicator > 0.6 ? 'degraded' : 'critical'
      };
    } catch (error) {
      logger.error(`Failed to generate system health insights`, error);
      return { error: 'Failed to analyze system health data' };
    }
  }

  /**
   * Store insight in Redis
   */
  private async storeInsight(insight: InsightResult): Promise<void> {
    try {
      const insightKey = `${this.INSIGHTS_PREFIX}${insight.id}`;
      await this.redis.setex(insightKey, this.insightRetentionSeconds, JSON.stringify(insight));
      
      // Add to sorted set for chronological retrieval
      await this.redis.zadd(this.INSIGHT_HISTORY_KEY, insight.timestamp, insight.id);
      
      logger.debug(`Stored insight`, { insightId: insight.id });
    } catch (error) {
      logger.error(`Failed to store insight`, error);
      throw error;
    }
  }

  /**
   * Get recent insights
   */
  async getRecentInsights(
    limit = 50,
    category?: 'performance' | 'security' | 'feature-usage' | 'user-behavior' | 'system-health',
    severity?: 'info' | 'warning' | 'alert' | 'critical'
  ): Promise<InsightResult[]> {
    try {
      const insightIds = await this.redis.zrange(
        this.INSIGHT_HISTORY_KEY,
        0,
        -1,
        'REV',  // Reverse order (newest first)
        'LIMIT', 0, limit
      );

      const insights: InsightResult[] = [];
      const pipeline = this.redis.pipeline();

      for (const id of insightIds) {
        const key = `${this.INSIGHTS_PREFIX}${id}`;
        pipeline.get(key);
      }

      const results = await pipeline.exec();
      
      if (results) {
        for (const [, result] of results) {
          if (result?.[1]) {
            try {
              const insight: InsightResult = JSON.parse(result[1] as string);
              
              // Apply filters if specified
              if (category) {
                if (!insight.insights[category]) continue;
              }
              
              if (severity) {
                // For simplicity, we'll filter by confidence as proxy for severity
                // In a real system, we would have explicit severity metadata
                if (insight.confidence < 0.5 && severity === 'critical') continue;
                if (insight.confidence < 0.3 && severity === 'alert') continue;
                if (insight.confidence < 0.1 && severity === 'warning') continue;
              }
              
              insights.push(insight);
            } catch (parseError) {
              logger.error(`Failed to parse insight`, parseError);
            }
          }
        }
      }

      logger.debug(`Retrieved ${insights.length} insights`, { 
        requested: limit, 
        category, 
        severity 
      });

      return insights;
    } catch (error) {
      logger.error(`Failed to retrieve insights`, error);
      throw error;
    }
  }

  /**
   * Calculate insight confidence based on data quality
   */
  private calculateInsightConfidence(historicalData: AnalyticsDataPoint[], insights: any): number {
    let confidence = 0.5; // Base confidence

    // Adjust based on amount of historical data
    if (historicalData.length > 100) {
      confidence += 0.2;
    } else if (historicalData.length > 50) {
      confidence += 0.1;
    } else if (historicalData.length < 10) {
      confidence -= 0.2;
    }

    // Adjust based on data consistency
    const values = historicalData.map(dp => dp.value);
    const cv = this.calculateCoefficientOfVariation(values);
    if (cv < 0.1) {
      confidence += 0.1; // Low variation = more confidence
    } else if (cv > 0.5) {
      confidence -= 0.1; // High variation = less confidence
    }

    // Adjust based on insight completeness
    const insightTypes = Object.values(insights).filter(Boolean).length;
    if (insightTypes === 0) {
      confidence = 0.1; // No insights = low confidence
    } else if (insightTypes >= 3) {
      confidence += 0.1; // Multiple insight types = higher confidence
    }

    return Math.max(0.1, Math.min(0.95, confidence)); // Clamp between 0.1 and 0.95
  }

  /**
   * Generate insight summary
   */
  private generateInsightSummary(insights: InsightResult['insights'], params: InsightGenerationParams): string {
    const summaryParts: string[] = [];

    if (insights.performance) {
      summaryParts.push(`Performance analysis: Baseline avg ${insights.performance.baseline.average.toFixed(2)}, ${insights.performance.trend} trend`);
    }

    if (insights.security) {
      const riskLevel = insights.security.severity;
      summaryParts.push(`Security assessment: Risk level ${riskLevel}, ${insights.security.eventRate.changePercentage.toFixed(2)}% rate change`);
    }

    if (insights.featureUsage) {
      summaryParts.push(`Feature usage: ${insights.featureUsage.adoption.growthPercentage.toFixed(2)}% growth, ${insights.featureUsage.engagement.dailyAverage.toFixed(2)} avg daily`);
    }

    if (insights.userBehavior) {
      summaryParts.push(`User engagement: ${insights.userBehavior.engagement.uniqueUsers} unique users, ${insights.userBehavior.engagement.sessionRate.toFixed(2)} sessions per user`);
    }

    if (insights.systemHealth) {
      summaryParts.push(`System health: ${insights.systemHealth.status} with ${insights.systemHealth.health.score.toFixed(2)} health score`);
    }

    if (summaryParts.length === 0) {
      return 'No significant insights detected for the specified metric.';
    }

    return summaryParts.join('; ');
  }

  /**
   * Get time range in hours based on string
   */
  private getTimeRangeHours(timeRange?: 'hour' | 'day' | 'week' | 'month'): number {
    switch (timeRange) {
      case 'hour': return 1;
      case 'day': return 24;
      case 'week': return 7 * 24;
      case 'month': return 30 * 24;
      default: return 24; // Default to 1 day
    }
  }

  /**
   * Categorize metric for appropriate analysis
   */
  private categorizeMetric(metric: string): 'performance' | 'security' | 'feature-usage' | 'user-behavior' | 'system-health' {
    const lowerMetric = metric.toLowerCase();
    
    if (lowerMetric.includes('latency') || lowerMetric.includes('response') || lowerMetric.includes('error') || lowerMetric.includes('throughput')) {
      return 'performance';
    }
    
    if (lowerMetric.includes('security') || lowerMetric.includes('auth') || lowerMetric.includes('access') || lowerMetric.includes('breach')) {
      return 'security';
    }
    
    if (lowerMetric.includes('feature') || lowerMetric.includes('flag') || lowerMetric.includes('conversion') || lowerMetric.includes('abtest')) {
      return 'feature-usage';
    }
    
    if (lowerMetric.includes('user') || lowerMetric.includes('session') || lowerMetric.includes('page') || lowerMetric.includes('click')) {
      return 'user-behavior';
    }
    
    return 'system-health'; // Default category
  }

  /**
   * Setup scheduled insights generation
   */
  private async setupScheduledInsights(): Promise<void> {
    // Register common metrics for insights
    await this.registerMetricForInsights('api.response_time.p95', 'hourly', {
      includePredictive: true,
      includeAnomalyDetection: true,
      includeTrendAnalysis: true
    });

    await this.registerMetricForInsights('feature_flag.usage_rate', 'daily', {
      includePredictive: true,
      includeAnomalyDetection: true,
      includeTrendAnalysis: true
    });

    await this.registerMetricForInsights('security.event_count', 'hourly', {
      includePredictive: false, // Don't predict security events
      includeAnomalyDetection: true,
      includeTrendAnalysis: true
    });

    logger.info('Scheduled insights setup completed with default metrics');
  }

  /**
   * Process scheduled insight generation
   */
  private async processScheduledInsightGenerations(): Promise<void> {
    if (this.activeWorkers >= this.maxConcurrentInsights) {
      logger.warn('Max concurrent insight workers reached, skipping scheduled generation');
      return;
    }

    try {
      // Get all scheduled insight configurations
      const scheduledKeys = await this.redis.keys(`${this.INSIGHTS_PREFIX}scheduled:*`);
      
      for (const key of scheduledKeys) {
        const configStr = await this.redis.get(key);
        if (configStr) {
          try {
            const config: {
              metric: string;
              dimensions?: Record<string, string>;
              includePredictive: boolean;
              includeAnomalyDetection: boolean;
              includeTrendAnalysis: boolean;
              schedule: 'hourly' | 'daily' | 'weekly';
            } = JSON.parse(configStr);

            // Generate insights for this metric
            await this.generateInsights({
              metric: config.metric,
              dimensions: config.dimensions,
              timeRange: this.scheduleToTimeRange(config.schedule),
              includePredictive: config.includePredictive,
              includeAnomalyDetection: config.includeAnomalyDetection,
              includeTrendAnalysis: config.includeTrendAnalysis
            });
          } catch (error) {
            logger.error(`Failed to generate scheduled insight`, error, { key });
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to process scheduled insight generations`, error);
    }
  }

  /**
   * Helper to convert schedule to time range
   */
  private scheduleToTimeRange(schedule: 'hourly' | 'daily' | 'weekly'): 'hour' | 'day' | 'week' {
    switch (schedule) {
      case 'hourly': return 'hour';
      case 'daily': return 'day';
      case 'weekly': return 'week';
    }
  }

  /**
   * Calculate coefficient of variation
   */
  private calculateCoefficientOfVariation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    if (mean === 0) return Infinity;

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return stdDev / Math.abs(mean);
  }

  /**
   * Calculate median of values
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Calculate rolling average
   */
  private calculateRollingAverage(values: number[], window: number): number {
    if (values.length < window) {
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    
    const recentValues = values.slice(-window);
    return recentValues.reduce((sum, val) => sum + val, 0) / window;
  }

  /**
   * Normalize health value based on metric type
   */
  private normalizeHealthValue(value: number, metric: string): number {
    // Different metrics have different healthy ranges
    if (metric.includes('error') || metric.includes('latency')) {
      // Lower is better for error rates and latency
      if (value < 1) return 0.95; // Excellent
      if (value < 5) return 0.85; // Good
      if (value < 10) return 0.7; // Fair
      return 0.5; // Poor
    } else if (metric.includes('availability') || metric.includes('uptime')) {
      // Higher is better for availability metrics
      if (value > 0.99) return 0.95; // Excellent
      if (value > 0.98) return 0.85; // Good
      if (value > 0.95) return 0.7; // Fair
      return 0.5; // Poor
    } else {
      // Default: assume higher is better
      return Math.min(1.0, Math.max(0.0, value / 100)); // Normalize assuming max value of 100
    }
  }

  /**
   * Calculate security severity level
   */
  private calculateSecuritySeverity(volatility: number, rateChange: number): 'low' | 'medium' | 'high' | 'critical' {
    const combinedRisk = volatility + (Math.abs(rateChange) / 100); // Normalize rate change
    
    if (combinedRisk > 3.0) return 'critical';
    if (combinedRisk > 2.0) return 'high';
    if (combinedRisk > 1.0) return 'medium';
    return 'low';
  }

  /**
   * Calculate reliability metrics
   */
  private calculateReliabilityMetrics(values: number[], metric: string): any {
    // For error-based metrics, lower values indicate higher reliability
    if (metric.includes('error') || metric.includes('failure')) {
      const avgErrors = values.reduce((sum, val) => sum + val, 0) / values.length;
      return {
        errorRate: avgErrors,
        reliability: 1 / (1 + avgErrors) // Higher as errors approach 0
      };
    } else {
      // For success-based metrics, higher values indicate higher reliability
      const avgSuccess = values.reduce((sum, val) => sum + val, 0) / values.length;
      return {
        successRate: avgSuccess,
        reliability: Math.min(1, avgSuccess) // Clamp between 0 and 1
      };
    }
  }

  /**
   * Calculate resource metrics
   */
  private calculateResourceMetrics(data: AnalyticsDataPoint[]): any {
    const values = data.map(dp => dp.value);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    return {
      averageUsage: avg,
      peakUsage: max,
      minimumUsage: min,
      utilizationRatio: avg / max, // How much of peak capacity typically used
      headroom: max > 0 ? (max - avg) / max : 1 // Remaining capacity ratio
    };
  }

  /**
   * Estimate unique users from data points
   */
  private estimateUniqueUsers(data: AnalyticsDataPoint[]): number {
    // In a real implementation, this would aggregate from user-specific dimensions
    // For now, return a placeholder
    if (data.length > 0 && data[0].dimensions?.userId) {
      const userIds = new Set<string>();
      data.forEach(dp => {
        if (dp.dimensions?.userId) {
          userIds.add(dp.dimensions.userId);
        }
      });
      return userIds.size;
    }
    return Math.floor(data.length / 10); // Rough estimate for metrics without user breakdown
  }

  /**
   * Calculate session metrics
   */
  private calculateSessionMetrics(data: AnalyticsDataPoint[]): any {
    // Placeholder for session analysis
    if (data.length < 2) {
      return { avgDuration: 0, consistency: 0 };
    }
    
    // Calculate based on value changes which might represent session lengths
    let totalDuration = 0;
    for (let i = 1; i < data.length; i++) {
      totalDuration += (data[i].timestamp - data[i-1].timestamp);
    }
    
    const avgDuration = totalDuration / Math.max(1, data.length - 1);
    return { avgDuration, consistency: 1 - this.calculateCoefficientOfVariation(data.map(dp => dp.value)) };
  }

  /**
   * Find peak activity times
   */
  private findPeakActivityTimes(data: AnalyticsDataPoint[]): any {
    if (data.length === 0) return { peakHour: 0, peakDay: '' };
    
    // Group by hour of day to find peak usage time
    const hourlyCounts: Record<number, number> = {};
    data.forEach(dp => {
      const hour = new Date(dp.timestamp).getUTCHours();
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    });
    
    let peakHour = 0;
    let maxCount = 0;
    Object.entries(hourlyCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count;
        peakHour = parseInt(hour);
      }
    });
    
    // Determine peak day (simplified)
    const peakDay = new Date(data[data.length - 1].timestamp).getUTCDay();
    
    return { peakHour, peakDay: this.getDayName(peakDay) };
  }

  /**
   * Convert day number to name
   */
  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  }

  /**
   * Detect user behavior patterns
   */
  private detectUserBehaviorPatterns(data: AnalyticsDataPoint[]): any {
    // Simple pattern detection based on time intervals
    if (data.length < 3) return { cyclical: false, periodicity: null };
    
    const intervals: number[] = [];
    for (let i = 1; i < data.length; i++) {
      intervals.push(data[i].timestamp - data[i-1].timestamp);
    }
    
    // Calculate standard deviation of intervals to determine consistency
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // If standard deviation is low relative to mean, it's periodic
    const isCyclical = stdDev / avgInterval < 0.1 && intervals.length > 5;
    
    return {
      cyclical: isCyclical,
      typicalInterval: avgInterval ? avgInterval / 1000 / 60 : 0 // In minutes
    };
  }

  /**
   * Calculate predictability of series
   */
  private calculatePredictability(data: AnalyticsDataPoint[]): number {
    const values = data.map(dp => dp.value);
    if (values.length < 2) return 0;
    
    // Use autocorrelation as a measure of predictability
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    let numerator = 0, denominator = 0;
    
    for (let i = 1; i < values.length; i++) {
      numerator += (values[i] - mean) * (values[i-1] - mean);
      denominator += Math.pow(values[i] - mean, 2);
    }
    
    const autocorrelation = denominator !== 0 ? numerator / denominator : 0;
    return Math.abs(autocorrelation); // Higher values indicate more predictability
  }

  /**
   * Generate recommendations based on anomalies
   */
  private generateAnomalyRecommendations(anomalyResults: any[]): string[] {
    const recommendations: string[] = [];
    
    for (const anomaly of anomalyResults) {
      if (anomaly.isAnomaly && anomaly.severity === 'critical') {
        recommendations.push('Immediate investigation required for critical anomaly');
        recommendations.push('Consider rolling back recent changes');
      } else if (anomaly.isAnomaly && anomaly.severity === 'high') {
        recommendations.push('Investigate potential cause of high-severity anomaly');
        recommendations.push('Monitor related metrics for cascading effects');
      }
    }
    
    return recommendations;
  }

  /**
   * Generate recommendations based on trends
   */
  private generateTrendRecommendations(trendResults: any[]): string[] {
    const recommendations: string[] = [];
    
    for (const trend of trendResults) {
      if (trend.trend === 'degrading' && trend.magnitude > 50) {
        recommendations.push('Trend shows significant degradation, investigate root cause');
        recommendations.push('Consider scaling resources if this is a capacity metric');
      } else if (trend.trend === 'volatile' && trend.period === 'short') {
        recommendations.push('High volatility detected, check for instability');
        recommendations.push('Review recent changes that might be causing fluctuations');
      }
    }
    
    return recommendations;
  }

  /**
   * Generate recommendations based on predictions
   */
  private generatePredictionRecommendations(predictions: any[]): string[] {
    const recommendations: string[] = [];
    
    for (const prediction of predictions) {
      if (prediction.riskLevel === 'high') {
        recommendations.push('High risk prediction detected, prepare mitigation strategies');
        recommendations.push('Review prediction assumptions and data quality');
      } else if (prediction.confidence < 0.5) {
        recommendations.push('Low confidence prediction, gather more data before acting');
        recommendations.push('Validate prediction model with additional historical data');
      }
    }
    
    return recommendations;
  }

  /**
   * Calculate percentile of values
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    if (lower === upper) {
      return sorted[lower];
    }
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}