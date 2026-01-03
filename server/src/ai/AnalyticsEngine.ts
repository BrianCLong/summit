// server/src/ai/AnalyticsEngine.ts
import { Redis } from 'ioredis';
import { logger } from '../utils/logger';

export interface AnalyticsDataPoint {
  timestamp: number;
  metric: string;
  value: number;
  dimensions?: Record<string, string>;
  anomalyScore?: number; // 0-1 confidence in anomaly
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  confidence: number; // 0-1
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  suggestedActions: string[];
  affectedDimensions?: Record<string, string>;
}

export interface TrendAnalysisResult {
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  confidence: number; // 0-1
  magnitude: number; // Percent change
  period: 'short' | 'medium' | 'long';
  explanation: string;
}

export interface PredictiveInsight {
  prediction: string;
  confidence: number; // 0-1
  timeframe: 'short' | 'medium' | 'long';
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface AnalyticsInsight {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'security' | 'feature-usage' | 'user-behavior' | 'system-health';
  severity: 'info' | 'warning' | 'alert' | 'critical';
  timestamp: number;
  confidence: number;
  dataPoints: AnalyticsDataPoint[];
  anomalyResult?: AnomalyDetectionResult;
  trendResult?: TrendAnalysisResult;
  predictiveInsights?: PredictiveInsight[];
  source: string; // Which system generated the insight
  relatedMetrics?: string[]; // Related metrics for correlation
  actionsTaken?: string[]; // Any automated actions taken
}

export interface AnalyticsEngineConfig {
  redis: Redis;
  insightRetentionDays?: number;
  anomalyThreshold?: number; // Default 0.7
  trendThreshold?: number; // Default 0.1 (10% change)
  minDataPointsForAnalysis?: number; // Default 10
  analysisWindowMinutes?: number; // Default 60 minutes
  predictionHorizonMinutes?: number; // Default 30 minutes
}

export class AnalyticsEngine {
  private redis: Redis;
  private readonly insightRetentionSeconds: number;
  private readonly anomalyThreshold: number;
  private readonly trendThreshold: number;
  private readonly minDataPointsForAnalysis: number;
  private readonly analysisWindowMs: number;
  private readonly predictionHorizonMs: number;
  private readonly ANALYTICS_PREFIX = 'analytics:';
  private readonly INSIGHTS_HISTORY_KEY = 'insights_history';
  private readonly ANOMALY_DETECTION_MODEL_KEY = 'anomaly_model'; // For model state

  constructor(private config: AnalyticsEngineConfig) {
    this.redis = config.redis;
    this.insightRetentionSeconds = (config.insightRetentionDays || 30) * 24 * 60 * 60;
    this.anomalyThreshold = config.anomalyThreshold || 0.7;
    this.trendThreshold = config.trendThreshold || 0.1;
    this.minDataPointsForAnalysis = config.minDataPointsForAnalysis || 10;
    this.analysisWindowMs = (config.analysisWindowMinutes || 60) * 60 * 1000;
    this.predictionHorizonMs = (config.predictionHorizonMinutes || 30) * 60 * 1000;
  }

  /**
   * Ingest analytics data points for processing
   */
  async ingestDataPoint(dataPoint: AnalyticsDataPoint): Promise<void> {
    try {
      // Store the data point
      const key = `${this.ANALYTICS_PREFIX}datapoints:${dataPoint.metric}:${Math.floor(dataPoint.timestamp / 60000)}`; // Group by minute
      await this.redis.rpush(key, JSON.stringify(dataPoint));
      await this.redis.expire(key, Math.ceil(this.analysisWindowMs / 1000) * 2); // Keep for 2x window
      
      // Process for anomalies and insights
      await this.processInsightForDataPoint(dataPoint);
      
      logger.debug(`Ingested analytics data point`, {
        metric: dataPoint.metric,
        value: dataPoint.value,
        dimensions: dataPoint.dimensions
      });
    } catch (error) {
      logger.error(`Failed to ingest analytics data point`, error);
      throw error;
    }
  }

  /**
   * Ingest batch of analytics data points
   */
  async ingestBatchDataPoints(dataPoints: AnalyticsDataPoint[]): Promise<void> {
    if (dataPoints.length === 0) return;

    try {
      const pipeline = this.redis.pipeline();

      for (const dataPoint of dataPoints) {
        // Group data points by minute to reduce storage
        const key = `${this.ANALYTICS_PREFIX}datapoints:${dataPoint.metric}:${Math.floor(dataPoint.timestamp / 60000)}`;
        pipeline.rpush(key, JSON.stringify(dataPoint));
        pipeline.expire(key, Math.ceil(this.analysisWindowMs / 1000) * 2);
      }

      await pipeline.exec();

      // Process insights for each data point
      for (const dataPoint of dataPoints) {
        await this.processInsightForDataPoint(dataPoint);
      }

      logger.debug(`Ingested batch of ${dataPoints.length} analytics data points`);
    } catch (error) {
      logger.error(`Failed to ingest batch analytics data points`, error);
      throw error;
    }
  }

  /**
   * Process insight generation for a single data point
   */
  private async processInsightForDataPoint(dataPoint: AnalyticsDataPoint): Promise<void> {
    try {
      // Check for anomalies in the metric
      const anomalyResult = await this.detectAnomaly(dataPoint);
      
      // Analyze trends for the metric
      const trendResult = await this.analyzeTrend(dataPoint.metric, dataPoint.dimensions);
      
      if (anomalyResult.isAnomaly || trendResult.trend !== 'stable') {
        // Create an insight from the analysis
        const insight: AnalyticsInsight = {
          id: `insight_${Date.now()}_${dataPoint.metric}`,
          title: anomalyResult.isAnomaly ? 
            `Anomaly Detected in ${dataPoint.metric}` : 
            `${dataPoint.metric} Showing ${trendResult.trend.charAt(0).toUpperCase() + trendResult.trend.slice(1)} Trend`,
          description: anomalyResult.isAnomaly ? 
            anomalyResult.explanation : 
            trendResult.explanation,
          category: this.categorizeMetric(dataPoint.metric),
          severity: this.determineSeverity(anomalyResult, trendResult),
          timestamp: Date.now(),
          confidence: Math.max(anomalyResult.confidence || 0, trendResult.confidence),
          dataPoints: [dataPoint],
          anomalyResult: anomalyResult.isAnomaly ? anomalyResult : undefined,
          trendResult: trendResult.trend !== 'stable' ? trendResult : undefined,
          source: 'analytics-engine',
          relatedMetrics: await this.findRelatedMetrics(dataPoint.metric),
          actionsTaken: []
        };

        // Store the insight
        await this.storeInsight(insight);

        // Log for monitoring
        logger.info(`Generated analytics insight`, {
          insightId: insight.id,
          title: insight.title,
          severity: insight.severity,
          confidence: insight.confidence
        });
      }
    } catch (error) {
      logger.error(`Failed to process insight for data point`, error);
    }
  }

  /**
   * Detect anomalies in a single data point
   */
  private async detectAnomaly(dataPoint: AnalyticsDataPoint): Promise<AnomalyDetectionResult> {
    try {
      // Get historical data for the metric in the analysis window
      const historicalData = await this.getHistoricalData(
        dataPoint.metric, 
        Date.now() - this.analysisWindowMs, 
        dataPoint.dimensions
      );

      if (historicalData.length < this.minDataPointsForAnalysis) {
        return {
          isAnomaly: false,
          confidence: 0,
          severity: 'low',
          explanation: 'Insufficient historical data for anomaly detection',
          suggestedActions: ['Collect more data before performing anomaly detection']
        };
      }

      // Calculate statistical measures
      const values = historicalData.map(dp => dp.value);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev === 0) {
        // If all values are the same, check against mean directly
        const deviation = Math.abs(dataPoint.value - mean);
        const isAnomaly = deviation > 2 * Math.abs(mean * 0.1); // 10% variation threshold
        
        return {
          isAnomaly,
          confidence: isAnomaly ? 0.8 : 0.1,
          severity: isAnomaly ? (deviation > 3 * Math.abs(mean * 0.1) ? 'critical' : 'high') : 'low',
          explanation: isAnomaly 
            ? `Value ${dataPoint.value} deviates significantly from historical norm (${mean})`
            : `Value ${dataPoint.value} is within normal range (${mean})`,
          suggestedActions: isAnomaly 
            ? ['Investigate potential cause of unusual metric value', 'Check dependent systems']
            : []
        };
      }

      // Use z-score for anomaly detection
      const zScore = Math.abs((dataPoint.value - mean) / stdDev);
      const isAnomaly = zScore > 2.5; // Standard threshold
      const confidence = Math.min(0.95, zScore / 4); // Normalize confidence
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (zScore > 3.5) severity = 'critical';
      else if (zScore > 3) severity = 'high';
      else if (zScore > 2.5) severity = 'medium';

      return {
        isAnomaly,
        confidence,
        severity,
        explanation: isAnomaly 
          ? `Anomaly detected: value ${dataPoint.value} is ${zScore.toFixed(2)} standard deviations from mean (${mean.toFixed(2)})`
          : `Normal value: ${dataPoint.value} is ${zScore.toFixed(2)} standard deviations from mean (${mean.toFixed(2)})`,
        suggestedActions: isAnomaly 
          ? ['Review recent changes in system', 'Check system logs', 'Verify dependent services']
          : [],
        affectedDimensions: dataPoint.dimensions
      };
    } catch (error) {
      logger.error(`Failed to detect anomaly for data point`, error);
      return {
        isAnomaly: false,
        confidence: 0,
        severity: 'low',
        explanation: 'Error processing anomaly detection',
        suggestedActions: ['Retry anomaly detection', 'Check system health']
      };
    }
  }

  /**
   * Analyze trends for a metric
   */
  private async analyzeTrend(metric: string, dimensions?: Record<string, string>): Promise<TrendAnalysisResult> {
    try {
      // Get historical data for trend analysis
      const historicalData = await this.getHistoricalData(
        metric,
        Date.now() - this.analysisWindowMs,
        dimensions
      );

      if (historicalData.length < 3) {
        return {
          trend: 'stable',
          confidence: 0,
          magnitude: 0,
          period: 'short',
          explanation: 'Insufficient data points for trend analysis'
        };
      }

      // Sort data points by timestamp
      const sortedData = historicalData.sort((a, b) => a.timestamp - b.timestamp);
      const values = sortedData.map(dp => dp.value);
      const timestamps = sortedData.map(dp => dp.timestamp);

      // Perform linear regression to determine trend
      const n = values.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

      for (let i = 0; i < n; i++) {
        const x = timestamps[i];
        const y = values[i];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      }

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const baseline = (sumY - slope * sumX) / n;

      // Calculate R-squared for confidence
      const meanY = sumY / n;
      let ssTot = 0, ssReg = 0;
      for (let i = 0; i < n; i++) {
        const yObs = values[i];
        const yPred = baseline + slope * timestamps[i];
        ssReg += Math.pow(yPred - meanY, 2);
        ssTot += Math.pow(yObs - meanY, 2);
      }
      const rSquared = ssTot !== 0 ? ssReg / ssTot : 0;
      const confidence = Math.sqrt(Math.abs(rSquared)); // Use sqrt for more conservative confidence

      // Determine trend direction and magnitude
      const startValue = sortedData[0].value;
      const endValue = sortedData[sortedData.length - 1].value;
      const magnitude = startValue !== 0 ? (endValue - startValue) / Math.abs(startValue) * 100 : 0;

      let trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
      let period: 'short' | 'medium' | 'long' = 'short';

      if (Math.abs(magnitude) >= 10) {
        period = 'long';
      } else if (Math.abs(magnitude) >= 5) {
        period = 'medium';
      } else {
        period = 'short';
      }

      if (slope > this.trendThreshold) {
        trend = 'increasing';
      } else if (slope < -this.trendThreshold) {
        trend = 'decreasing';
      } else {
        trend = 'stable';
      }

      // Determine if it's volatile (high variation despite small trend)
      const volatility = this.calculateCoefficientOfVariation(values);
      if (volatility > 0.3 && Math.abs(magnitude) < 5) {
        trend = 'volatile';
      }

      return {
        trend,
        confidence,
        magnitude,
        period,
        explanation: `Trend analysis: ${trend} trend with ${magnitude.toFixed(2)}% change over selected period`
      };
    } catch (error) {
      logger.error(`Failed to analyze trend for metric`, error);
      return {
        trend: 'stable',
        confidence: 0,
        magnitude: 0,
        period: 'short',
        explanation: 'Error processing trend analysis'
      };
    }
  }

  /**
   * Calculate coefficient of variation for volatility measurement
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
   * Get historical data for analysis
   */
  private async getHistoricalData(
    metric: string,
    startTime: number,
    dimensions?: Record<string, string>,
    endTime?: number
  ): Promise<AnalyticsDataPoint[]> {
    const endTimeMs = endTime || Date.now();
    const startMinute = Math.floor(startTime / 60000);
    const endMinute = Math.floor(endTimeMs / 60000);

    const dataPoints: AnalyticsDataPoint[] = [];
    const pipeline = this.redis.pipeline();

    // Fetch data points for all minutes in the range
    for (let minute = startMinute; minute <= endMinute; minute++) {
      const key = `${this.ANALYTICS_PREFIX}datapoints:${metric}:${minute}`;
      pipeline.lrange(key, 0, -1);
    }

    const results = await pipeline.exec();
    
    if (results) {
      for (const [err, result] of results) {
        if (err) {
          logger.error(`Error fetching historical data`, err);
          continue;
        }

        if (Array.isArray(result)) {
          for (const item of result) {
            if (typeof item === 'string') {
              try {
                const dataPoint: AnalyticsDataPoint = JSON.parse(item);
                
                // Filter by timestamp and dimensions if specified
                if (dataPoint.timestamp >= startTime && dataPoint.timestamp <= endTimeMs) {
                  if (dimensions) {
                    let matches = true;
                    for (const [key, value] of Object.entries(dimensions)) {
                      if (dataPoint.dimensions?.[key] !== value) {
                        matches = false;
                        break;
                      }
                    }
                    if (matches) {
                      dataPoints.push(dataPoint);
                    }
                  } else {
                    dataPoints.push(dataPoint);
                  }
                }
              } catch (parseError) {
                logger.error(`Error parsing historical data point`, parseError);
              }
            }
          }
        }
      }
    }

    return dataPoints;
  }

  /**
   * Store an insight in Redis
   */
  private async storeInsight(insight: AnalyticsInsight): Promise<void> {
    try {
      const insightKey = `${this.ANALYTICS_PREFIX}insight:${insight.id}`;
      await this.redis.setex(insightKey, this.insightRetentionSeconds, JSON.stringify(insight));
      
      // Add to ordered list of insights
      await this.redis.zadd(this.INSIGHTS_HISTORY_KEY, insight.timestamp, insight.id);
      
      // Maintain a reasonable history size
      const count = await this.redis.zcard(this.INSIGHTS_HISTORY_KEY);
      if (count > 10000) { // Keep only the most recent 10000 insights
        const toRemove = count - 10000;
        await this.redis.zremrangebyrank(this.INSIGHTS_HISTORY_KEY, 0, toRemove - 1);
      }
      
      logger.info(`Stored analytics insight`, {
        insightId: insight.id,
        category: insight.category,
        severity: insight.severity
      });
    } catch (error) {
      logger.error(`Failed to store analytics insight`, error);
      throw error;
    }
  }

  /**
   * Retrieve insights by criteria
   */
  async getInsights(
    category?: string,
    severity?: 'info' | 'warning' | 'alert' | 'critical',
    startDate?: number,
    endDate?: number,
    limit = 50
  ): Promise<AnalyticsInsight[]> {
    try {
      // Get insight IDs from the sorted set within the time range
      const startTimestamp = startDate || Date.now() - (7 * 24 * 60 * 60 * 1000); // Last 7 days
      const endTimestamp = endDate || Date.now();
      
      const insightIds = await this.redis.zrangebyscore(
        this.INSIGHTS_HISTORY_KEY,
        startTimestamp,
        endTimestamp,
        'WITHSCORES',
        'LIMIT', 0, limit
      );

      // Convert pairs of [id, timestamp] to just IDs, then reverse to get newest first
      const ids = [];
      for (let i = 0; i < insightIds.length; i += 2) {
        ids.unshift(insightIds[i]); // Unshift to reverse order (newest first)
      }

      // Fetch insight details
      const insights: AnalyticsInsight[] = [];
      const pipeline = this.redis.pipeline();
      
      for (const id of ids) {
        const key = `${this.ANALYTICS_PREFIX}insight:${id}`;
        pipeline.get(key);
      }
      
      const results = await pipeline.exec();
      
      if (results) {
        for (const [err, result] of results) {
          if (err) {
            logger.error(`Error fetching insight details`, err);
            continue;
          }
          
          if (result && typeof result === 'string') {
            try {
              const insight: AnalyticsInsight = JSON.parse(result);
              
              // Apply filters
              if (category && insight.category !== category) continue;
              if (severity && insight.severity !== severity) continue;
              
              insights.push(insight);
            } catch (parseError) {
              logger.error(`Error parsing insight details`, parseError);
            }
          }
        }
      }
      
      logger.debug(`Retrieved ${insights.length} insights`, {
        category,
        severity,
        count: insights.length
      });
      
      return insights;
    } catch (error) {
      logger.error(`Failed to retrieve insights`, error);
      throw error;
    }
  }

  /**
   * Get insights summary by category and severity
   */
  async getInsightsSummary(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    recentCount: number; // Last 24 hours
  }> {
    try {
      const now = Date.now();
      const yesterday = now - (24 * 60 * 60 * 1000);
      
      // Get all insight IDs
      const allInsightIds = await this.redis.zrangebyscore(
        this.INSIGHTS_HISTORY_KEY,
        '-inf', '+inf'
      );
      
      // Get recent insight IDs (last 24 hours)
      const recentInsightIds = await this.redis.zrangebyscore(
        this.INSIGHTS_HISTORY_KEY,
        yesterday, now
      );
      
      // Fetch insight details to categorize them
      const byCategory: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      
      const pipeline = this.redis.pipeline();
      for (const id of allInsightIds) {
        const key = `${this.ANALYTICS_PREFIX}insight:${id}`;
        pipeline.get(key);
      }
      
      const results = await pipeline.exec();
      
      let total = 0;
      if (results) {
        for (const [err, result] of results) {
          if (err || !result || typeof result !== 'string') continue;
          
          try {
            const insight: AnalyticsInsight = JSON.parse(result);
            
            // Count by category
            byCategory[insight.category] = (byCategory[insight.category] || 0) + 1;
            
            // Count by severity
            bySeverity[insight.severity] = (bySeverity[insight.severity] || 0) + 1;
            
            total++;
          } catch (parseError) {
            logger.error(`Error parsing insight for summary`, parseError);
          }
        }
      }
      
      return {
        total,
        byCategory,
        bySeverity,
        recentCount: recentInsightIds.length
      };
    } catch (error) {
      logger.error(`Failed to get insights summary`, error);
      throw error;
    }
  }

  /**
   * Categorize metric based on its name
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
   * Determine severity based on anomaly and trend results
   */
  private determineSeverity(anomalyResult?: AnomalyDetectionResult, trendResult?: TrendAnalysisResult): 'info' | 'warning' | 'alert' | 'critical' {
    if (anomalyResult?.severity === 'critical') return 'critical';
    if (trendResult?.trend === 'volatile') return 'warning';
    if (anomalyResult?.severity === 'high') return 'alert';
    if (anomalyResult?.isAnomaly) return 'warning';
    if (trendResult?.magnitude > 50 || trendResult?.magnitude < -50) return 'alert';
    if (trendResult?.magnitude > 20 || trendResult?.magnitude < -20) return 'warning';
    return 'info';
  }

  /**
   * Find related metrics based on name similarity or correlation
   */
  private async findRelatedMetrics(metric: string): Promise<string[]> {
    try {
      // This would typically use a more sophisticated approach like:
      // 1. Correlation analysis between metrics
      // 2. Metric name similarity
      // 3. System dependency mapping
      
      // For now, using name similarity approach
      const allKeys = await this.redis.keys(`${this.ANALYTICS_PREFIX}datapoints:*`);
      const relatedMetrics = new Set<string>();
      
      const baseMetric = metric.split('.')[0]; // Take first segment
      
      for (const key of allKeys) {
        const parts = key.split(':');
        if (parts.length >= 2) {
          const otherMetric = parts[1];
          if (otherMetric.startsWith(baseMetric) && otherMetric !== metric) {
            relatedMetrics.add(otherMetric);
          }
        }
      }
      
      return Array.from(relatedMetrics).slice(0, 5); // Return max 5 related metrics
    } catch (error) {
      logger.error(`Failed to find related metrics`, error);
      return [];
    }
  }

  /**
   * Generate predictive insights for a metric
   */
  async generatePredictiveInsights(metric: string, dimensions?: Record<string, string>): Promise<PredictiveInsight[]> {
    try {
      // Get historical data to identify patterns
      const historicalData = await this.getHistoricalData(
        metric,
        Date.now() - (7 * 24 * 60 * 60 * 1000), // Last 7 days
        dimensions
      );

      if (historicalData.length < this.minDataPointsForAnalysis) {
        return [{
          prediction: 'Insufficient data for predictions',
          confidence: 0.1,
          timeframe: 'short',
          riskLevel: 'low',
          recommendation: 'Continue collecting data to enable predictive insights'
        }];
      }

      // Analyze patterns in the data
      const sortedData = historicalData.sort((a, b) => a.timestamp - b.timestamp);
      const values = sortedData.map(dp => dp.value);
      
      // Calculate rolling averages to identify patterns
      const windowSize = Math.max(5, Math.floor(values.length / 10)); // 10% of data points
      const rollingAverages: number[] = [];
      
      for (let i = windowSize; i <= values.length; i++) {
        const window = values.slice(i - windowSize, i);
        const average = window.reduce((sum, val) => sum + val, 0) / window.length;
        rollingAverages.push(average);
      }
      
      if (rollingAverages.length < 2) {
        return [{
          prediction: 'Insufficient pattern data for predictions',
          confidence: 0.2,
          timeframe: 'short',
          riskLevel: 'low',
          recommendation: 'More data needed to identify patterns'
        }];
      }
      
      // Determine trend in the rolling averages
      const recentAverage = rollingAverages[rollingAverages.length - 1];
      const prevAverage = rollingAverages[rollingAverages.length - 2];
      const trend = (recentAverage - prevAverage) / Math.abs(prevAverage);
      
      let prediction: string;
      let riskLevel: 'low' | 'medium' | 'high';
      let confidence: number;
      let timeframe: 'short' | 'medium' | 'long';
      let recommendation: string;
      
      // Base prediction on trend and volatility
      const volatility = this.calculateCoefficientOfVariation(values);
      
      if (Math.abs(trend) > 0.1) { // Significant trend
        timeframe = volatility > 0.2 ? 'short' : 'medium'; // High volatility = shorter timeframe
        confidence = Math.min(0.9, 0.5 + Math.abs(trend) * 2); // Higher trend = higher confidence
        riskLevel = volatility > 0.3 ? 'high' : 'medium';
        
        if (trend > 0) {
          prediction = `Metric likely to continue increasing over the next ${timeframe} period`;
          recommendation = 'Monitor closely for continued growth';
        } else {
          prediction = `Metric likely to continue decreasing over the next ${timeframe} period`;
          recommendation = 'Prepare for potential impact and investigate causes';
        }
      } else if (volatility > 0.3) { // High volatility
        timeframe = 'short';
        confidence = 0.7;
        riskLevel = 'high';
        prediction = 'High volatility detected - unpredictable behavior expected';
        recommendation = 'Investigate root causes of variability and stabilize system';
      } else { // Stable with low volatility
        timeframe = 'long';
        confidence = 0.8;
        riskLevel = 'low';
        prediction = 'Metric expected to remain stable';
        recommendation = 'Continue standard monitoring practices';
      }
      
      return [{
        prediction,
        confidence,
        timeframe,
        riskLevel,
        recommendation
      }];
    } catch (error) {
      logger.error(`Failed to generate predictive insights for metric`, error);
      return [{
        prediction: 'Error generating predictions',
        confidence: 0.1,
        timeframe: 'short',
        riskLevel: 'high',
        recommendation: 'Check system health and data collection'
      }];
    }
  }
}