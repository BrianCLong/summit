// server/src/ai/anomalyDetectionService.ts
import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

export interface AnomalyDetectionConfig {
  redis: Redis;
  anomalyThreshold?: number; // 0-1, default 0.7 (70% confidence)
  minDataPointsForAnalysis?: number; // Minimum data points needed, default 10
  analysisWindowMinutes?: number; // Time window for analysis, default 60
  alertCooldownMinutes?: number; // Time between alerts for same metric, default 15
  sensitivity?: 'low' | 'medium' | 'high'; // Sensitivity level, default 'medium'
}

export interface MetricDataPoint {
  metric: string;
  value: number;
  timestamp?: number; // defaults to Date.now()
  dimensions?: Record<string, string>; // Optional dimensions like environment, region
}

export interface AnomalyDetectionResult {
  id: string;
  metric: MetricDataPoint;
  isAnomaly: boolean;
  confidence: number; // 0-1 certainty of anomaly
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedRange?: { min: number; max: number };
  deviation?: number;
  timestamp: number;
}

export interface AnomalyAlert {
  id: string;
  metric: string;
  dimensions?: Record<string, string>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
}

export class AnomalyDetectionService {
  private redis: Redis;
  private readonly anomalyThreshold: number;
  private readonly minDataPointsForAnalysis: number;
  private readonly analysisWindowMs: number;
  private readonly alertCooldownMs: number;
  private readonly sensitivityMultiplier: number;
  private readonly DATA_POINTS_KEY = 'anomaly_detection:data_points';
  private readonly ALERTS_KEY = 'anomaly_detection:alerts';
  private readonly ALERT_HISTORY_KEY = 'anomaly_detection:alert_history';
  private readonly MODEL_KEY = 'anomaly_detection:model_params';

  constructor(private config: AnomalyDetectionConfig) {
    this.redis = config.redis;
    this.anomalyThreshold = config.anomalyThreshold || 0.7;
    this.minDataPointsForAnalysis = config.minDataPointsForAnalysis || 10;
    this.analysisWindowMs = (config.analysisWindowMinutes || 60) * 60 * 1000; // Convert to ms
    this.alertCooldownMs = (config.alertCooldownMinutes || 15) * 60 * 1000; // Convert to ms
    
    // Sensitivity multiplier adjusts threshold based on sensitivity level
    this.sensitivityMultiplier = config.sensitivity === 'high' ? 0.8 : 
                                config.sensitivity === 'low' ? 1.5 : 1.0; // Medium
  }

  /**
   * Process a single metric data point for anomaly detection
   */
  async processMetricDataPoint(dataPoint: MetricDataPoint): Promise<AnomalyDetectionResult> {
    try {
      // Use current time if not provided
      const pointWithTimestamp: MetricDataPoint = {
        ...dataPoint,
        timestamp: dataPoint.timestamp || Date.now()
      };

      // Store the data point for historical analysis
      await this.storeDataPoint(pointWithTimestamp);

      // Get historical data for statistical analysis
      const historicalData = await this.getHistoricalData(
        dataPoint.metric,
        dataPoint.dimensions,
        Date.now() - this.analysisWindowMs
      );

      if (historicalData.length < this.minDataPointsForAnalysis) {
        // Not enough data for reliable anomaly detection
        return {
          id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          metric: pointWithTimestamp,
          isAnomaly: false,
          confidence: 0,
          severity: 'low',
          description: `Insufficient data for anomaly detection (${historicalData.length} of ${this.minDataPointsForAnalysis} minimum points)`,
          timestamp: Date.now()
        };
      }

      // Perform statistical analysis to detect anomalies
      const analysis = this.performStatisticalAnalysis(
        historicalData.map(dp => dp.value),
        pointWithTimestamp.value
      );

      // Calculate confidence score based on the analysis
      const confidence = this.calculateAnomalyConfidence(
        analysis,
        historicalData.length,
        this.sensitivityMultiplier
      );

      // Determine if this constitutes an anomaly
      const isAnomaly = confidence > (this.anomalyThreshold * this.sensitivityMultiplier);

      // Determine severity based on confidence and deviation
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (confidence > 0.9) severity = 'critical';
      else if (confidence > 0.8) severity = 'high';
      else if (confidence > 0.7) severity = 'medium';

      const result: AnomalyDetectionResult = {
        id: `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metric: pointWithTimestamp,
        isAnomaly,
        confidence,
        severity,
        description: this.generateAnomalyDescription(
          analysis,
          pointWithTimestamp,
          severity
        ),
        expectedRange: {
          min: analysis.mean - (analysis.stdDev * 2),
          max: analysis.mean + (analysis.stdDev * 2)
        },
        deviation: analysis.deviation,
        timestamp: Date.now()
      };

      // If it's an anomaly, create an alert
      if (isAnomaly) {
        await this.createAnomalyAlert(result);
      }

      logger.info(`Anomaly detection processed`, {
        metric: pointWithTimestamp.metric,
        value: pointWithTimestamp.value,
        isAnomaly,
        confidence,
        severity
      });

      return result;
    } catch (error) {
      logger.error(`Error processing metric data point for anomaly detection`, error);
      throw error;
    }
  }

  /**
   * Process batch of metric data points
   */
  async processBatchMetricDataPoints(dataPoints: MetricDataPoint[]): Promise<AnomalyDetectionResult[]> {
    const results: AnomalyDetectionResult[] = [];
    
    for (const point of dataPoints) {
      try {
        const result = await this.processMetricDataPoint(point);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to process data point in batch`, error, { point });
      }
    }
    
    return results;
  }

  /**
   * Get active anomaly alerts
   */
  async getActiveAnomalyAlerts(limit: number = 50): Promise<AnomalyAlert[]> {
    try {
      // Get all alert IDs from the sorted set
      const alertIds = await this.redis.zrange(
        this.ALERT_HISTORY_KEY,
        0,
        -1,
        'REV', // Reverse order (most recent first)
        'LIMIT',
        0,
        limit
      );

      const alerts: AnomalyAlert[] = [];
      const pipeline = this.redis.pipeline();

      // Fetch each alert by ID
      for (const alertId of alertIds) {
        const key = `${this.ALERTS_KEY}:${alertId}`;
        pipeline.get(key);
      }

      const results = await pipeline.exec();
      
      if (results) {
        for (const [, result] of results) {
          if (result?.[1] && typeof result[1] === 'string') {
            try {
              const alert: AnomalyAlert = JSON.parse(result[1]);
              // Only return alerts that are not resolved
              if (!alert.resolved) {
                alerts.push(alert);
              }
            } catch (parseError) {
              logger.error(`Failed to parse alert from Redis`, parseError);
            }
          }
        }
      }

      logger.info(`Retrieved ${alerts.length} active anomaly alerts`, { limit });

      return alerts;
    } catch (error) {
      logger.error(`Failed to retrieve active anomaly alerts`, error);
      throw error;
    }
  }

  /**
   * Get anomaly alert history
   */
  async getAnomalyAlertHistory(
    metric?: string,
    severity?: 'low' | 'medium' | 'high' | 'critical',
    startTime?: number,
    limit: number = 50
  ): Promise<AnomalyAlert[]> {
    try {
      const cutoffTime = startTime || Date.now() - (7 * 24 * 60 * 60 * 1000); // Default to 7 days ago
      const alertIds = await this.redis.zrangebyscore(
        this.ALERT_HISTORY_KEY,
        cutoffTime,
        Date.now(),
        'REV', // Reverse order (most recent first)
        'LIMIT',
        0,
        limit
      );

      const alerts: AnomalyAlert[] = [];
      const pipeline = this.redis.pipeline();

      // Fetch each alert by ID
      for (const alertId of alertIds) {
        const key = `${this.ALERTS_KEY}:${alertId}`;
        pipeline.get(key);
      }

      const results = await pipeline.exec();
      
      if (results) {
        for (const [, result] of results) {
          if (result?.[1] && typeof result[1] === 'string') {
            try {
              const alert: AnomalyAlert = JSON.parse(result[1]);
              
              // Apply filters if specified
              if (metric && alert.metric !== metric) continue;
              if (severity && alert.severity !== severity) continue;
              
              alerts.push(alert);
            } catch (parseError) {
              logger.error(`Failed to parse alert for history`, parseError);
            }
          }
        }
      }

      logger.info(`Retrieved ${alerts.length} anomaly alerts from history`, {
        metric,
        severity,
        limit,
        dateRange: {
          start: new Date(cutoffTime).toISOString(),
          end: new Date().toISOString()
        }
      });

      return alerts;
    } catch (error) {
      logger.error(`Failed to retrieve anomaly alert history`, error);
      throw error;
    }
  }

  /**
   * Acknowledge an anomaly alert
   */
  async acknowledgeAnomalyAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    try {
      const alertKey = `${this.ALERTS_KEY}:${alertId}`;
      const alertStr = await this.redis.get(alertKey);
      
      if (!alertStr) {
        logger.warn(`Cannot acknowledge non-existent alert`, { alertId });
        return false;
      }

      const alert: AnomalyAlert = JSON.parse(alertStr);
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      alert.acknowledgedBy = acknowledgedBy;

      // Update the alert in Redis
      await this.redis.setex(
        alertKey,
        Math.ceil(this.alertCooldownMs * 2 / 1000), // Expire after 2x alert cooldown period
        JSON.stringify(alert)
      );

      logger.info(`Alert acknowledged`, {
        alertId,
        acknowledgedBy,
        metric: alert.metric
      });

      return true;
    } catch (error) {
      logger.error(`Failed to acknowledge anomaly alert`, error);
      throw error;
    }
  }

  /**
   * Resolve an anomaly alert
   */
  async resolveAnomalyAlert(alertId: string, resolvedBy: string): Promise<boolean> {
    try {
      const alertKey = `${this.ALERTS_KEY}:${alertId}`;
      const alertStr = await this.redis.get(alertKey);
      
      if (!alertStr) {
        logger.warn(`Cannot resolve non-existent alert`, { alertId });
        return false;
      }

      const alert: AnomalyAlert = JSON.parse(alertStr);
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      alert.resolvedBy = resolvedBy;

      // Update the alert in Redis
      await this.redis.setex(
        alertKey,
        Math.ceil(this.alertCooldownMs * 2 / 1000), // Expire after 2x alert cooldown period
        JSON.stringify(alert)
      );

      logger.info(`Alert resolved`, {
        alertId,
        resolvedBy,
        metric: alert.metric
      });

      return true;
    } catch (error) {
      logger.error(`Failed to resolve anomaly alert`, error);
      throw error;
    }
  }

  /**
   * Train the anomaly detection model with labeled data
   */
  async trainAnomalyModel(labeledData: Array<{ value: number; isAnomaly: boolean; metric?: string; dimensions?: Record<string, string> }>): Promise<void> {
    try {
      logger.info(`Training model with ${labeledData.length} data points`, {
        anomalyCount: labeledData.filter(d => d.isAnomaly).length,
        normalCount: labeledData.filter(d => !d.isAnomaly).length
      });

      // In a real implementation, this would train a machine learning model
      // For this implementation, we'll update statistical parameters based on the labeled data
      const anomalyData = labeledData.filter(d => d.isAnomaly);
      const normalData = labeledData.filter(d => !d.isAnomaly);

      // Calculate new statistical parameters based on training data
      const anomalyMean = anomalyData.reduce((sum, d) => sum + d.value, 0) / Math.max(1, anomalyData.length);
      const normalMean = normalData.reduce((sum, d) => sum + d.value, 0) / Math.max(1, normalData.length);
      
      // Store these parameters in Redis for use in future detection
      await this.redis.setex(
        this.MODEL_KEY,
        Math.ceil(this.analysisWindowMs * 2 / 1000), // Keep model data for 2x analysis window
        JSON.stringify({
          anomalyMean,
          normalMean,
          trainingDate: new Date().toISOString(),
          trainingDataCount: labeledData.length
        })
      );

      logger.info('Anomaly detection model trained successfully', {
        anomalyMean,
        normalMean,
        trainingDataCount: labeledData.length
      });
    } catch (error) {
      logger.error(`Failed to train anomaly detection model`, error);
      throw error;
    }
  }

  /**
   * Get anomaly detection statistics
   */
  async getAnomalyStatistics(): Promise<{
    totalAlerts: number;
    activeAlerts: number;
    resolvedAlerts: number;
    bySeverity: { low: number; medium: number; high: number; critical: number };
    byMetric: Record<string, number>;
    detectionRate: number; // Alerts per hour
    modelAccuracy?: number; // If model has been trained
  }> {
    try {
      // Get all alert IDs from history
      const allAlertIds = await this.redis.zrange(this.ALERT_HISTORY_KEY, 0, -1);
      
      const bySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
      const byMetric: Record<string, number> = {};
      let activeCount = 0;
      let resolvedCount = 0;
      
      const pipeline = this.redis.pipeline();
      for (const alertId of allAlertIds) {
        const key = `${this.ALERTS_KEY}:${alertId}`;
        pipeline.get(key);
      }
      
      const results = await pipeline.exec();
      
      if (results) {
        for (const [, result] of results) {
          if (result?.[1] && typeof result[1] === 'string') {
            try {
              const alert: AnomalyAlert = JSON.parse(result[1]);
              
              // Count by severity
              bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
              
              // Count by metric
              byMetric[alert.metric] = (byMetric[alert.metric] || 0) + 1;
              
              // Count active vs resolved
              if (alert.resolved) {
                resolvedCount++;
              } else {
                activeCount++;
              }
            } catch (parseError) {
              logger.error(`Failed to parse alert for statistics`, parseError);
            }
          }
        }
      }
      
      // Calculate detection rate (alerts per hour in last 24 hours)
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      const recentAlertIds = await this.redis.zrangebyscore(
        this.ALERT_HISTORY_KEY,
        twentyFourHoursAgo,
        Date.now()
      );
      const detectionRate = recentAlertIds.length / 24; // Per hour

      // Try to get model accuracy if it exists
      let modelAccuracy: number | undefined;
      const modelParamsStr = await this.redis.get(this.MODEL_KEY);
      if (modelParamsStr) {
        try {
          const modelParams = JSON.parse(modelParamsStr);
          // In a real system, model accuracy would be computed from validation data
          // For now we'll just include the fact that it was trained
        } catch (parseError) {
          logger.warn(`Could not parse model parameters for accuracy`, parseError);
        }
      }

      return {
        totalAlerts: allAlertIds.length,
        activeAlerts: activeCount,
        resolvedAlerts: resolvedCount,
        bySeverity,
        byMetric,
        detectionRate,
        modelAccuracy
      };
    } catch (error) {
      logger.error(`Failed to retrieve anomaly statistics`, error);
      throw error;
    }
  }

  /**
   * Store data point for historical analysis
   */
  private async storeDataPoint(dataPoint: MetricDataPoint): Promise<void> {
    try {
      const key = `${this.DATA_POINTS_KEY}:${dataPoint.metric}`;
      const dataPointStr = JSON.stringify({
        ...dataPoint,
        timestamp: dataPoint.timestamp
      });
      
      // Add to sorted set by timestamp for chronological access
      await this.redis.zadd(key, dataPoint.timestamp!, dataPointStr);
      
      // Remove data points outside the analysis window
      const cutoffTime = Date.now() - this.analysisWindowMs;
      await this.redis.zremrangebyscore(key, '-inf', cutoffTime);
      
      // Set expiration to clean up memory automatically
      await this.redis.expire(key, Math.ceil(this.analysisWindowMs * 2 / 1000));
    } catch (error) {
      logger.error(`Failed to store data point`, error);
      throw error;
    }
  }

  /**
   * Get historical data for analysis
   */
  private async getHistoricalData(
    metric: string,
    dimensions?: Record<string, string>,
    startTime?: number
  ): Promise<MetricDataPoint[]> {
    try {
      const key = `${this.DATA_POINTS_KEY}:${metric}`;
      const minTime = startTime || Date.now() - this.analysisWindowMs;
      
      // Get data points from the specified time window
      const dataPointEntries = await this.redis.zrangebyscore(
        key,
        minTime,
        Date.now(),
        'WITHSCORES'
      );

      const dataPoints: MetricDataPoint[] = [];
      
      // Process the returned entries (value, score)
      for (let i = 0; i < dataPointEntries.length; i += 2) {
        const dataPointStr = dataPointEntries[i];
        const timestamp = parseInt(dataPointEntries[i + 1]);
        
        try {
          const dataPoint: MetricDataPoint = JSON.parse(dataPointStr);
          dataPoint.timestamp = timestamp;
          
          // If dimensions were specified, filter by matching dimensions
          if (dimensions && dataPoint.dimensions) {
            let matches = true;
            for (const [dimKey, dimValue] of Object.entries(dimensions)) {
              if (dataPoint.dimensions[dimKey] !== dimValue) {
                matches = false;
                break;
              }
            }
            if (matches) {
              dataPoints.push(dataPoint);
            }
          } else if (!dimensions && !dataPoint.dimensions) {
            // If no dimensions specified and data point has no dimensions, include it
            dataPoints.push(dataPoint);
          } else {
            // If no filter dimensions or data point has no dimensions, include it
            dataPoints.push(dataPoint);
          }
        } catch (parseError) {
          logger.error(`Failed to parse historical data point`, parseError);
        }
      }
      
      return dataPoints;
    } catch (error) {
      logger.error(`Failed to retrieve historical data for analysis`, error);
      throw error;
    }
  }

  /**
   * Perform statistical analysis to detect anomalies
   */
  private performStatisticalAnalysis(historicalValues: number[], currentValue: number): {
    mean: number;
    stdDev: number;
    multiplier: number; // How many standard deviations from mean
    deviation: number; // Absolute deviation
    zScore?: number;
  } {
    if (historicalValues.length === 0) {
      return {
        mean: 0,
        stdDev: 0,
        multiplier: 0,
        deviation: Math.abs(currentValue - 0),
        zScore: 0
      };
    }

    // Calculate mean
    const mean = historicalValues.reduce((sum, value) => sum + value, 0) / historicalValues.length;

    // Calculate standard deviation
    const squaredDifferences = historicalValues.map(value => Math.pow(value - mean, 2));
    const variance = squaredDifferences.reduce((sum, sqDiff) => sum + sqDiff, 0) / historicalValues.length;
    const stdDev = Math.sqrt(variance);

    // Calculate deviation and z-score
    const deviation = Math.abs(currentValue - mean);
    const zScore = stdDev !== 0 ? Math.abs((currentValue - mean) / stdDev) : 0;
    const multiplier = stdDev !== 0 ? deviation / stdDev : 0;

    return {
      mean,
      stdDev,
      multiplier,
      deviation,
      zScore
    };
  }

  /**
   * Calculate confidence in anomaly detection
   */
  private calculateAnomalyConfidence(
    analysis: ReturnType<typeof this.performStatisticalAnalysis>,
    historicalDataSize: number,
    sensitivityMultiplier: number
  ): number {
    // Base confidence on statistical significance (z-score)
    let confidence = Math.min(1.0, (analysis.zScore ?? 0) / 3); // 3 z-scores = 100% confidence

    // Boost confidence with larger historical datasets
    const dataConfidence = Math.min(0.3, Math.log10(Math.max(1, historicalDataSize)) / 10);
    confidence = Math.min(1.0, confidence + dataConfidence);

    // Adjust for sensitivity level
    confidence = confidence / sensitivityMultiplier;

    return Math.min(1.0, confidence);
  }

  /**
   * Generate descriptive text for the anomaly
   */
  private generateAnomalyDescription(
    analysis: ReturnType<typeof this.performStatisticalAnalysis>,
    dataPoint: MetricDataPoint,
    severity: string
  ): string {
    const percentChange = analysis.mean !== 0 ? Math.abs(((dataPoint.value - analysis.mean) / analysis.mean) * 100) : 0;
    
    if (dataPoint.value > analysis.mean) {
      return `Anomaly detected: Value ${dataPoint.value} is ${(analysis.multiplier).toFixed(2)} standard deviations above mean (${analysis.mean.toFixed(2)}), a ${percentChange.toFixed(2)}% increase`;
    } else {
      return `Anomaly detected: Value ${dataPoint.value} is ${(analysis.multiplier).toFixed(2)} standard deviations below mean (${analysis.mean.toFixed(2)}), a ${percentChange.toFixed(2)}% decrease`;
    }
  }

  /**
   * Create an anomaly alert
   */
  private async createAnomalyAlert(result: AnomalyDetectionResult): Promise<void> {
    try {
      // Check if there's been a recent alert for this same metric to prevent spam
      const recentAlertExists = await this.hasRecentAlertForMetric(result.metric.metric, result.metric.dimensions);
      
      if (recentAlertExists) {
        logger.debug(`Recent alert exists for metric, skipping new alert`, {
          metric: result.metric.metric,
          dimensions: result.metric.dimensions
        });
        return;
      }

      // Create the alert object
      const alert: AnomalyAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metric: result.metric.metric,
        dimensions: result.metric.dimensions,
        severity: result.severity,
        description: result.description,
        confidence: result.confidence,
        timestamp: result.timestamp,
        acknowledged: false,
        resolved: false
      };

      // Store the alert in Redis
      const alertKey = `${this.ALERTS_KEY}:${alert.id}`;
      await this.redis.setex(
        alertKey,
        Math.ceil(this.alertCooldownMs * 2 / 1000), // Expire after 2x alert cooldown period
        JSON.stringify(alert)
      );

      // Add to sorted set for querying
      await this.redis.zadd(this.ALERT_HISTORY_KEY, alert.timestamp, alert.id);

      // Log the alert creation
      logger.warn(`Anomaly alert created`, {
        alertId: alert.id,
        metric: alert.metric,
        severity: alert.severity,
        confidence: alert.confidence,
        timestamp: new Date(alert.timestamp).toISOString()
      });

      // Optionally, publish to pub/sub for real-time notifications
      await this.redis.publish('anomaly_alerts', JSON.stringify(alert));
    } catch (error) {
      logger.error(`Failed to create anomaly alert`, error);
      throw error;
    }
  }

  /**
   * Check if there's been a recent alert for the same metric/dimensions to prevent spam
   */
  private async hasRecentAlertForMetric(metric: string, dimensions?: Record<string, string>): Promise<boolean> {
    try {
      // Get recent alert IDs from the history sorted set
      const cutoffTime = Date.now() - this.alertCooldownMs;
      const recentAlertIds = await this.redis.zrangebyscore(
        this.ALERT_HISTORY_KEY,
        cutoffTime,
        Date.now()
      );

      // Check each recent alert to see if it matches our metric/dimensions
      for (const alertId of recentAlertIds) {
        const alertKey = `${this.ALERTS_KEY}:${alertId}`;
        const alertStr = await this.redis.get(alertKey);
        
        if (alertStr) {
          try {
            const alert: AnomalyAlert = JSON.parse(alertStr);
            
            // Check if the metric matches
            if (alert.metric === metric) {
              // If dimensions are specified, check if they match too
              if (dimensions && alert.dimensions) {
                let dimensionsMatch = true;
                for (const [key, value] of Object.entries(dimensions)) {
                  if (alert.dimensions[key] !== value) {
                    dimensionsMatch = false;
                    break;
                  }
                }
                
                if (dimensionsMatch) {
                  return true; // Found a recent matching alert
                }
              } else if (!dimensions && !alert.dimensions) {
                // Both have no dimensions, so it's a match
                return true;
              } else if (!dimensions && alert.dimensions) {
                // This is for general metric without dimensions vs. one with dimensions
                // In our implementation, these are considered separate metrics
                continue;
              } else if (dimensions && !alert.dimensions) {
                // Similar to above
                continue;
              } else {
                // Both have dimensions but we didn't specify when checking, so match by metric only
                return true;
              }
            }
          } catch (parseError) {
            logger.error(`Failed to parse alert for recent check`, parseError);
          }
        }
      }

      // No recent matching alerts found
      return false;
    } catch (error) {
      logger.error(`Failed to check for recent alerts`, error);
      // Fail gracefully - assume no recent alerts to allow this alert to be created
      return false;
    }
  }
}