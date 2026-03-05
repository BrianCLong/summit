// server/src/api/anomalyDetectionController.ts
import { Request, Response } from "express";
import { AnomalyDetectionService } from "../ai/anomalyDetectionService.js";
import { logger } from "../utils/logger.js";

// Security limits to prevent DoS
const MAX_BATCH_SIZE = 1000;
const MAX_TEST_COUNT = 1000;
const MAX_HISTORY_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export class AnomalyDetectionController {
  constructor(private anomalyService: AnomalyDetectionService) {}

  /**
   * Process a single metric data point for anomaly detection
   */
  async processMetricDataPoint(req: Request, res: Response): Promise<void> {
    try {
      const { metric, value, dimensions, timestamp } = req.body;

      if (!metric || value === undefined) {
        res.status(400).json({
          error: "Metric name and value are required",
        });
        return;
      }

      const dataPoint = {
        metric,
        value,
        dimensions,
        timestamp: timestamp || Date.now(),
      };

      const result = await this.anomalyService.processMetricDataPoint(dataPoint);

      res.status(200).json(result);
    } catch (error) {
      logger.error(`Failed to process metric data point`, error);
      res.status(500).json({
        error: "Failed to process metric data point for anomaly detection",
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
        res.status(400).json({
          error: "dataPoints must be an array",
        });
        return;
      }

      if (dataPoints.length > MAX_BATCH_SIZE) {
        res.status(400).json({
          error: `Batch size exceeds limit of ${MAX_BATCH_SIZE} data points`,
        });
        return;
      }

      const results = await this.anomalyService.processBatchMetricDataPoints(dataPoints);

      res.status(200).json(results);
    } catch (error) {
      logger.error(`Failed to process batch metric data points`, error);
      res.status(500).json({
        error: "Failed to process batch metric data points",
      });
    }
  }

  /**
   * Get active anomaly alerts
   */
  async getActiveAnomalyAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;

      let parsedLimit = parseInt(limit as string) || DEFAULT_LIMIT;
      if (parsedLimit > MAX_HISTORY_LIMIT) {
        parsedLimit = MAX_HISTORY_LIMIT;
      }

      const alerts = await this.anomalyService.getActiveAnomalyAlerts(parsedLimit);

      res.status(200).json(alerts);
    } catch (error) {
      logger.error(`Failed to get active anomaly alerts`, error);
      res.status(500).json({
        error: "Failed to retrieve active anomaly alerts",
      });
    }
  }

  /**
   * Get anomaly alert history
   */
  async getAnomalyAlertHistory(req: Request, res: Response): Promise<void> {
    try {
      const { metric, severity, startTime, limit } = req.query;

      let parsedLimit = parseInt(limit as string) || DEFAULT_LIMIT;
      if (parsedLimit > MAX_HISTORY_LIMIT) {
        parsedLimit = MAX_HISTORY_LIMIT;
      }

      const alerts = await this.anomalyService.getAnomalyAlertHistory(
        metric as string,
        severity as "low" | "medium" | "high" | "critical",
        startTime ? parseInt(startTime as string) : undefined,
        parsedLimit
      );

      res.status(200).json(alerts);
    } catch (error) {
      logger.error(`Failed to get anomaly alert history`, error);
      res.status(500).json({
        error: "Failed to retrieve anomaly alert history",
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
        res.status(400).json({
          error: "Alert ID is required",
        });
        return;
      }

      if (!acknowledgedBy) {
        res.status(400).json({
          error: "Acknowledged by user is required",
        });
        return;
      }

      const success = await this.anomalyService.acknowledgeAnomalyAlert(alertId, acknowledgedBy);

      if (success) {
        res.status(200).json({ success: true });
      } else {
        res.status(404).json({
          error: "Alert not found",
          success: false,
        });
      }
    } catch (error) {
      logger.error(`Failed to acknowledge anomaly alert`, error);
      res.status(500).json({
        error: "Failed to acknowledge alert",
        success: false,
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
        res.status(400).json({
          error: "Alert ID is required",
        });
        return;
      }

      if (!resolvedBy) {
        res.status(400).json({
          error: "Resolved by user is required",
        });
        return;
      }

      const success = await this.anomalyService.resolveAnomalyAlert(alertId, resolvedBy);

      if (success) {
        res.status(200).json({ success: true });
      } else {
        res.status(404).json({
          error: "Alert not found",
          success: false,
        });
      }
    } catch (error) {
      logger.error(`Failed to resolve anomaly alert`, error);
      res.status(500).json({
        error: "Failed to resolve alert",
        success: false,
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
        res.status(400).json({
          error: "labeledData must be an array",
        });
        return;
      }

      if (labeledData.length > MAX_BATCH_SIZE) {
        res.status(400).json({
          error: `Training data size exceeds limit of ${MAX_BATCH_SIZE} points`,
        });
        return;
      }

      await this.anomalyService.trainAnomalyModel(labeledData);

      res.status(200).json({
        success: true,
        message: "Model training initiated successfully",
      });
    } catch (error) {
      logger.error(`Failed to train anomaly detection model`, error);
      res.status(500).json({
        error: "Failed to train anomaly detection model",
        success: false,
      });
    }
  }

  /**
   * Get anomaly detection statistics
   */
  async getAnomalyStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.anomalyService.getAnomalyStatistics();

      res.status(200).json(stats);
    } catch (error) {
      logger.error(`Failed to get anomaly detection statistics`, error);
      res.status(500).json({
        error: "Failed to retrieve anomaly detection statistics",
      });
    }
  }

  /**
   * Test anomaly detection with sample data
   */
  async testAnomalyDetection(req: Request, res: Response): Promise<void> {
    try {
      // Generate sample data for testing
      const {
        metric,
        baseValue = 100,
        variation = 10,
        anomalyMultiplier = 3,
        count = 50,
      } = req.body;

      if (!metric) {
        res.status(400).json({ error: "Metric name is required" });
        return;
      }

      if (count > MAX_TEST_COUNT) {
        res.status(400).json({
          error: `Test count exceeds limit of ${MAX_TEST_COUNT} points`,
        });
        return;
      }

      // Create sample data with some anomalies
      const sampleDataPoints = [];
      const now = Date.now();

      for (let i = 0; i < count; i++) {
        let value = baseValue + (Math.random() * variation * 2 - variation);

        // Introduce anomalies at random intervals
        if (Math.random() > 0.9) {
          // ~10% chance of anomaly
          value = baseValue + (Math.random() > 0.5 ? 1 : -1) * variation * anomalyMultiplier;
        }

        sampleDataPoints.push({
          metric,
          value,
          timestamp: now - (count - i) * 60000, // One minute apart
          dimensions: {
            environment: "test",
            source: "simulator",
          },
        });
      }

      const results = await this.anomalyService.processBatchMetricDataPoints(sampleDataPoints);

      res.status(200).json({
        testDataPoints: sampleDataPoints,
        detectionResults: results,
        anomalyCount: results.filter((r) => r.isAnomaly).length,
        totalPoints: results.length,
        message: `Generated ${count} sample data points with anomaly detection`,
      });
    } catch (error) {
      logger.error(`Failed to test anomaly detection`, error);
      res.status(500).json({
        error: "Failed to test anomaly detection",
      });
    }
  }
}
