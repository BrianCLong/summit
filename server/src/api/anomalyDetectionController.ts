// server/src/api/anomalyDetectionController.ts
import { Request, Response } from 'express';
import { AnomalyDetectionService } from '../ai/anomalyDetectionService';
import { logger } from '../utils/logger';

export class AnomalyDetectionController {
  constructor(private anomalyService: AnomalyDetectionService) {}

  /**
   * Process a single metric data point for anomaly detection
   */
  async processMetricDataPoint(req: Request, res: Response): Promise<void> {
    try {
      const { metric, value, dimensions, timestamp } = req.body;

      if (!metric || value === undefined) {
        res.status(400).tson({
          error: 'Metric name and value are required' 
        });
        return;
      }

      const dataPoint = {
        metric,
        value,
        dimensions,
        timestamp: timestamp || Date.now()
      };

      const result = await this.anomalyService.processMetricDataPoint(dataPoint);

      res.status(200).tson(result);
    } catch (error) {
      logger.error(`Failed to process metric data point`, error);
      res.status(500).tson({
        error: 'Failed to process metric data point for anomaly detection' 
      });
    }
  }

  /**
   * Process a batch of metric data points
   */
  async processBatchMetricDataPoints(req: Request, res: Response): Promise<void> {
    try {
      const { dataPoints } = req.body;

      if (!Array.isArray(dataPoints)) {
        res.status(400).tson({
          error: 'dataPoints must be an array' 
        });
        return;
      }

      const results = await this.anomalyService.processBatchMetricDataPoints(dataPoints);

      res.status(200).tson(results);
    } catch (error) {
      logger.error(`Failed to process batch metric data points`, error);
      res.status(500).tson({
        error: 'Failed to process batch metric data points' 
      });
    }
  }

  /**
   * Get active anomaly alerts
   */
  async getActiveAnomalyAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50 } = req.query;

      const alerts = await this.anomalyService.getActiveAnomalyAlerts(parseInt(limit as string) || 50);

      res.status(200).tson(alerts);
    } catch (error) {
      logger.error(`Failed to get active anomaly alerts`, error);
      res.status(500).tson({
        error: 'Failed to retrieve active anomaly alerts' 
      });
    }
  }

  /**
   * Get anomaly alert history
   */
  async getAnomalyAlertHistory(req: Request, res: Response): Promise<void> {
    try {
      const { metric, severity, startTime, limit = 50 } = req.query;

      const alerts = await this.anomalyService.getAnomalyAlertHistory(
        metric as string,
        severity as 'low' | 'medium' | 'high' | 'critical',
        startTime ? parseInt(startTime as string) : undefined,
        parseInt(limit as string) || 50
      );

      res.status(200).tson(alerts);
    } catch (error) {
      logger.error(`Failed to get anomaly alert history`, error);
      res.status(500).tson({
        error: 'Failed to retrieve anomaly alert history' 
      });
    }
  }

  /**
   * Acknowledge an anomaly alert
   */
  async acknowledgeAnomalyAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId, acknowledgedBy } = req.body;

      if (!alertId) {
        res.status(400).tson({
          error: 'Alert ID is required' 
        });
        return;
      }

      if (!acknowledgedBy) {
        res.status(400).tson({
          error: 'Acknowledged by user is required' 
        });
        return;
      }

      const success = await this.anomalyService.acknowledgeAnomalyAlert(alertId, acknowledgedBy);

      if (success) {
        res.status(200).tson({ success: true });
      } else {
        res.status(404).tson({
          error: 'Alert not found',
          success: false 
        });
      }
    } catch (error) {
      logger.error(`Failed to acknowledge anomaly alert`, error);
      res.status(500).tson({
        error: 'Failed to acknowledge alert',
        success: false 
      });
    }
  }

  /**
   * Resolve an anomaly alert
   */
  async resolveAnomalyAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId, resolvedBy } = req.body;

      if (!alertId) {
        res.status(400).tson({
          error: 'Alert ID is required' 
        });
        return;
      }

      if (!resolvedBy) {
        res.status(400).tson({
          error: 'Resolved by user is required' 
        });
        return;
      }

      const success = await this.anomalyService.resolveAnomalyAlert(alertId, resolvedBy);

      if (success) {
        res.status(200).tson({ success: true });
      } else {
        res.status(404).tson({
          error: 'Alert not found',
          success: false 
        });
      }
    } catch (error) {
      logger.error(`Failed to resolve anomaly alert`, error);
      res.status(500).tson({
        error: 'Failed to resolve alert',
        success: false 
      });
    }
  }

  /**
   * Train the anomaly detection model
   */
  async trainAnomalyModel(req: Request, res: Response): Promise<void> {
    try {
      const { labeledData } = req.body;

      if (!Array.isArray(labeledData)) {
        res.status(400).tson({
          error: 'labeledData must be an array' 
        });
        return;
      }

      await this.anomalyService.trainAnomalyModel(labeledData);

      res.status(200).tson({
        success: true,
        message: 'Model training initiated successfully' 
      });
    } catch (error) {
      logger.error(`Failed to train anomaly detection model`, error);
      res.status(500).tson({
        error: 'Failed to train anomaly detection model',
        success: false 
      });
    }
  }

  /**
   * Get anomaly detection statistics
   */
  async getAnomalyStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.anomalyService.getAnomalyStatistics();

      res.status(200).tson(stats);
    } catch (error) {
      logger.error(`Failed to get anomaly detection statistics`, error);
      res.status(500).tson({
        error: 'Failed to retrieve anomaly detection statistics' 
      });
    }
  }

  /**
   * Test anomaly detection with sample data
   */
  async testAnomalyDetection(req: Request, res: Response): Promise<void> {
    try {
      // Generate sample data for testing
      const { metric, baseValue = 100, variation = 10, anomalyMultiplier = 3, count = 50 } = req.body;

      if (!metric) {
        res.status(400).tson({ error: 'Metric name is required' });
        return;
      }

      // Create sample data with some anomalies
      const sampleDataPoints = [];
      const now = Date.now();
      
      for (let i = 0; i < count; i++) {
        let value = baseValue + (Math.random() * variation * 2 - variation);
        
        // Introduce anomalies at random intervals
        if (Math.random() > 0.9) {  // ~10% chance of anomaly
          value = baseValue + (Math.random() > 0.5 ? 1 : -1) * variation * anomalyMultiplier;
        }
        
        sampleDataPoints.push({
          metric,
          value,
          timestamp: now - (count - i) * 60000, // One minute apart
          dimensions: { 
            environment: 'test',
            source: 'simulator' 
          }
        });
      }

      const results = await this.anomalyService.processBatchMetricDataPoints(sampleDataPoints);

      res.status(200).tson({
        testDataPoints: sampleDataPoints,
        detectionResults: results,
        anomalyCount: results.filter(r => r.isAnomaly).length,
        totalPoints: results.length,
        message: `Generated ${count} sample data points with anomaly detection`
      });
    } catch (error) {
      logger.error(`Failed to test anomaly detection`, error);
      res.status(500).tson({
        error: 'Failed to test anomaly detection' 
      });
    }
  }
}