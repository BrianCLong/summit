// server/src/api/anomalyDetectionRouter.ts
import express, { Router } from 'express';
import { AnomalyDetectionController } from './anomalyDetectionController.js';
import { AnomalyDetectionService } from '../ai/anomalyDetectionService.js';

export const createAnomalyDetectionRouter = (anomalyService: AnomalyDetectionService): Router => {
  const router = express.Router();
  const controller = new AnomalyDetectionController(anomalyService);

  // Process single metric data point for anomaly detection
  router.post('/process', controller.processMetricDataPoint.bind(controller));

  // Process batch of metric data points
  router.post('/batch-process', controller.processBatchMetricDataPoints.bind(controller));

  // Get active anomaly alerts
  router.get('/alerts/active', controller.getActiveAnomalyAlerts.bind(controller));

  // Get anomaly alert history
  router.get('/alerts/history', controller.getAnomalyAlertHistory.bind(controller));

  // Acknowledge an anomaly alert
  router.post('/alerts/:alertId/acknowledge', controller.acknowledgeAnomalyAlert.bind(controller));

  // Resolve an anomaly alert
  router.post('/alerts/:alertId/resolve', controller.resolveAnomalyAlert.bind(controller));

  // Train the anomaly detection model
  router.post('/train', controller.trainAnomalyModel.bind(controller));

  // Get anomaly detection statistics
  router.get('/statistics', controller.getAnomalyStatistics.bind(controller));

  // Test endpoint with sample data
  router.post('/test', controller.testAnomalyDetection.bind(controller));

  return router;
};